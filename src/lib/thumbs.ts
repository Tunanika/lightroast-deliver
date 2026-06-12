// On-demand thumbnail renditions with a bounded disk cache.
//
// One WebP rendition per file (1280px long edge) serves both the portal grid
// and the lightbox. Nothing is generated eagerly; the cache is capped
// (THUMB_CACHE_MAX_MB, default 512) and evicted oldest-first, so disk use
// stays bounded no matter how many files come and go. Node-only.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const RENDITION_EDGE = 1280;
const WEBP_QUALITY = 72;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_CONCURRENT = 2;
const NEGATIVE_TTL_MS = 10 * 60 * 1000;
const EVICT_INTERVAL_MS = 60 * 1000;

function cacheDir(): string {
  return path.resolve(process.env.THUMB_CACHE_DIR || "data/thumbs");
}

function cacheMaxBytes(): number {
  const mb = Number(process.env.THUMB_CACHE_MAX_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : 512) * 1024 * 1024;
}

// Sources that recently failed to decode (e.g. HEIC without libheif) — skip
// retrying on every portal render. Expired entries are pruned on insert.
const failed = new Map<string, number>();

function markFailed(key: string): void {
  const now = Date.now();
  for (const [k, at] of failed) {
    if (now - at >= NEGATIVE_TTL_MS) failed.delete(k);
  }
  failed.set(key, now);
}

let active = 0;
const waiters: (() => void)[] = [];

function acquire(): Promise<void> {
  return new Promise((resolve) => {
    const attempt = () => {
      if (active < MAX_CONCURRENT) {
        active++;
        resolve();
      } else {
        waiters.push(attempt);
      }
    };
    attempt();
  });
}

function release(): void {
  active--;
  waiters.shift()?.();
}

export type ThumbResult =
  | { ok: true; path: string; etag: string }
  | { ok: false; reason: "too-large" | "failed" };

/** Cache key tied to source identity — a replaced NAS file gets a new key. */
export function thumbKey(
  fileId: string,
  sourceStat: { mtimeMs: number; size: number },
): string {
  return `${fileId}-${Math.round(sourceStat.mtimeMs)}-${sourceStat.size}`;
}

export async function getThumb(
  fileId: string,
  sourcePath: string,
): Promise<ThumbResult> {
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(sourcePath);
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (stat.size > MAX_SOURCE_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  const key = thumbKey(fileId, stat);
  const dir = cacheDir();
  const finalPath = path.join(dir, `${key}.webp`);

  try {
    await fsp.access(finalPath);
    // Touch so eviction treats recently-served thumbs as fresh.
    fsp.utimes(finalPath, new Date(), new Date()).catch(() => {});
    return { ok: true, path: finalPath, etag: key };
  } catch {
    // not cached yet
  }

  const failedAt = failed.get(key);
  if (failedAt && Date.now() - failedAt < NEGATIVE_TTL_MS) {
    return { ok: false, reason: "failed" };
  }
  failed.delete(key);

  await acquire();
  try {
    // Another request may have generated it while we waited.
    try {
      await fsp.access(finalPath);
      return { ok: true, path: finalPath, etag: key };
    } catch {}

    await fsp.mkdir(dir, { recursive: true });
    const tmpPath = path.join(dir, `.${key}.${process.pid}.tmp`);
    try {
      await sharp(sourcePath)
        .rotate()
        .resize({
          width: RENDITION_EDGE,
          height: RENDITION_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(tmpPath);
      await fsp.rename(tmpPath, finalPath);
    } catch {
      await fsp.unlink(tmpPath).catch(() => {});
      markFailed(key);
      return { ok: false, reason: "failed" };
    }

    await dropStaleSiblings(dir, fileId, key);
    evictIfOverCap(dir).catch(() => {});
    return { ok: true, path: finalPath, etag: key };
  } finally {
    release();
  }
}

/**
 * Removes every cached rendition for the given files. Called when files,
 * projects, or clients are deleted, so thumbnails never outlive their source.
 */
export async function deleteThumbsFor(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;
  const dir = cacheDir();
  let names: string[];
  try {
    names = await fsp.readdir(dir);
  } catch {
    return;
  }
  const ids = new Set(fileIds);
  await Promise.all(
    names
      .filter((n) => ids.has(n.split("-")[0]))
      .map((n) => fsp.unlink(path.join(dir, n)).catch(() => {})),
  );
}

/** Removes renditions of the same file made from an older source version. */
async function dropStaleSiblings(dir: string, fileId: string, keep: string) {
  let names: string[];
  try {
    names = await fsp.readdir(dir);
  } catch {
    return;
  }
  const prefix = `${fileId}-`;
  await Promise.all(
    names
      .filter((n) => n.startsWith(prefix) && n !== `${keep}.webp`)
      .map((n) => fsp.unlink(path.join(dir, n)).catch(() => {})),
  );
}

let lastEvict = 0;

const TMP_MAX_AGE_MS = 60 * 60 * 1000;

/** Oldest-first eviction down to 90% of the cap. Throttled; best-effort. */
async function evictIfOverCap(dir: string) {
  const now = Date.now();
  if (now - lastEvict < EVICT_INTERVAL_MS) return;
  lastEvict = now;

  let names: string[];
  try {
    names = await fsp.readdir(dir);
  } catch {
    return;
  }

  const entries: { path: string; size: number; mtimeMs: number }[] = [];
  for (const name of names) {
    const p = path.join(dir, name);
    // Temp files left by a crash mid-generation: sweep once they're stale.
    if (name.endsWith(".tmp")) {
      try {
        const st = await fsp.stat(p);
        if (now - st.mtimeMs > TMP_MAX_AGE_MS) await fsp.unlink(p);
      } catch {}
      continue;
    }
    if (!name.endsWith(".webp")) continue;
    try {
      const st = await fsp.stat(p);
      entries.push({ path: p, size: st.size, mtimeMs: st.mtimeMs });
    } catch {}
  }

  const max = cacheMaxBytes();
  let total = entries.reduce((sum, e) => sum + e.size, 0);
  if (total <= max) return;

  entries.sort((a, b) => a.mtimeMs - b.mtimeMs);
  const target = max * 0.9;
  for (const entry of entries) {
    if (total <= target) break;
    try {
      await fsp.unlink(entry.path);
      total -= entry.size;
    } catch {}
  }
}
