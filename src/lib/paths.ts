// NAS path resolution + safety. Node-only (node:fs, node:path).
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

const MIME_BY_EXT: Record<string, string> = {
  // video
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".mxf": "application/mxf",
  // image
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".dng": "image/x-adobe-dng",
  ".cr2": "image/x-canon-cr2",
  ".arw": "image/x-sony-arw",
  // audio
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".aiff": "audio/aiff",
  // documents / archives
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".txt": "text/plain",
};

export function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export interface ResolvedFile {
  absolutePath: string;
  size: bigint;
  mimeType: string;
}

export type PathResult =
  | { ok: true; file: ResolvedFile }
  | { ok: false; error: string };

function hasTraversal(input: string): boolean {
  return input.split(/[\\/]+/).some((segment) => segment === "..");
}

/**
 * Resolves an admin-entered path under the NAS mount, then validates it.
 *
 * Accepts either an absolute path already inside NAS_MOUNT_PATH
 * (e.g. /mnt/nas/haven/v3.mp4) or a path relative to the mount
 * (e.g. haven/v3.mp4). Rejects any '..' segment, resolves symlinks, confirms
 * the real target stays inside the mount, and requires it to be a file.
 */
export function resolveNasPath(input: string): PathResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Path is required." };
  if (hasTraversal(raw)) {
    return { ok: false, error: "Path may not contain '..' segments." };
  }

  const mount = path.resolve(env.nasMountPath);

  let candidate: string;
  if (path.isAbsolute(raw) && (raw === mount || raw.startsWith(mount + path.sep))) {
    candidate = path.normalize(raw);
  } else {
    candidate = path.normalize(path.join(mount, raw.replace(/^[/\\]+/, "")));
  }

  let realMount: string;
  try {
    realMount = fs.realpathSync(mount);
  } catch {
    return { ok: false, error: `NAS mount not found: ${mount}` };
  }

  let realPath: string;
  try {
    realPath = fs.realpathSync(candidate);
  } catch {
    return { ok: false, error: "No file exists at that path." };
  }

  // Containment check after symlink resolution.
  if (realPath !== realMount && !realPath.startsWith(realMount + path.sep)) {
    return { ok: false, error: "Path resolves outside the NAS mount." };
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(realPath);
  } catch {
    return { ok: false, error: "No file exists at that path." };
  }
  if (!stat.isFile()) {
    return { ok: false, error: "Path is a directory, not a file." };
  }

  return {
    ok: true,
    file: {
      absolutePath: realPath,
      size: BigInt(stat.size),
      mimeType: guessMimeType(realPath),
    },
  };
}
