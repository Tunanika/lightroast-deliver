// NAS path resolution + safety. Node-only (node:fs, node:path).
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";
import { formatBytes } from "./format";

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
 * Resolves the real mount + a candidate absolute path for an input that may be
 * absolute-under-the-mount or relative to it. Accepts the mount's realpath
 * prefix too, so stored realpaths work even when the mount itself is a symlink
 * (e.g. /tmp → /private/tmp on macOS). Relative inputs are joined under the
 * real mount.
 */
function resolveUnderMount(
  raw: string,
):
  | { ok: true; realMount: string; candidate: string }
  | { ok: false; error: string } {
  const mount = path.resolve(env.nasMountPath);
  let realMount: string;
  try {
    realMount = fs.realpathSync(mount);
  } catch {
    return { ok: false, error: `NAS mount not found: ${mount}` };
  }
  const underMount = (p: string) =>
    p === mount ||
    p.startsWith(mount + path.sep) ||
    p === realMount ||
    p.startsWith(realMount + path.sep);
  const candidate =
    path.isAbsolute(raw) && underMount(raw)
      ? path.normalize(raw)
      : path.normalize(path.join(realMount, raw.replace(/^[/\\]+/, "")));
  return { ok: true, realMount, candidate };
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

  const base = resolveUnderMount(raw);
  if (!base.ok) return { ok: false, error: base.error };
  const { realMount, candidate } = base;

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

export interface NasEntry {
  name: string;
  type: "dir" | "file";
  size?: string; // formatted, files only
}

export interface BrowseResult {
  /** Directory (relative to the mount) whose children are listed. */
  baseDir: string;
  entries: NasEntry[];
  /** Whether the full input itself is a valid file. */
  isFile: boolean;
  /** Whether the full input itself is an existing directory. */
  isDirectory: boolean;
  fileInfo?: { size: string; mimeType: string };
  truncated: boolean;
}

const MAX_ENTRIES = 50;

// OS metadata junk that shouldn't clutter the path picker.
const IGNORED_NAMES = new Set([
  ".DS_Store",
  ".Spotlight-V100",
  ".Trashes",
  ".fseventsd",
  ".TemporaryItems",
  ".DocumentRevisions-V100",
  "Thumbs.db",
  "desktop.ini",
  "@eaDir", // Synology/QNAP thumbnail dirs
]);

function isIgnored(name: string): boolean {
  return IGNORED_NAMES.has(name) || name.startsWith("._");
}

/**
 * Lists NAS entries for a (possibly partial) admin-entered path, plus the
 * validity of the full input. Powers the Add file typeahead. The directory to
 * list is derived from the input: a trailing slash (or empty input) lists that
 * directory; otherwise the last segment is treated as a filter prefix.
 */
export function browseNas(
  input: string,
): { ok: true; result: BrowseResult } | { ok: false; error: string } {
  const raw = (input ?? "").trim();
  if (hasTraversal(raw)) {
    return { ok: false, error: "Path may not contain '..' segments." };
  }

  const mount = path.resolve(env.nasMountPath);
  let realMount: string;
  try {
    realMount = fs.realpathSync(mount);
  } catch {
    return { ok: false, error: `NAS mount not found: ${mount}` };
  }

  // Reduce the input to a path relative to the mount (matching the configured
  // path or its realpath, so symlinked mounts work).
  let rel = raw;
  if (path.isAbsolute(rel)) {
    if (rel === mount || rel === realMount) rel = "";
    else if (rel.startsWith(mount + path.sep)) rel = rel.slice(mount.length + 1);
    else if (rel.startsWith(realMount + path.sep))
      rel = rel.slice(realMount.length + 1);
    else rel = rel.replace(/^[/\\]+/, "");
  } else {
    rel = rel.replace(/^[/\\]+/, "");
  }

  const endsWithSep = /[/\\]$/.test(raw);
  let listRel: string;
  let prefix: string;
  if (rel === "" || endsWithSep) {
    listRel = rel.replace(/[/\\]+$/, "");
    prefix = "";
  } else {
    listRel = path.dirname(rel);
    if (listRel === ".") listRel = "";
    prefix = path.basename(rel);
  }

  const absListDir = path.normalize(path.join(realMount, listRel));
  if (absListDir !== realMount && !absListDir.startsWith(realMount + path.sep)) {
    return { ok: false, error: "Path resolves outside the NAS mount." };
  }

  const entries: NasEntry[] = [];
  let truncated = false;
  try {
    const lowerPrefix = prefix.toLowerCase();
    const names = fs
      .readdirSync(absListDir, { withFileTypes: true })
      .filter((d) => !isIgnored(d.name))
      .filter((d) => d.name.toLowerCase().startsWith(lowerPrefix))
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));

    for (const name of names) {
      let type: "dir" | "file" | null = null;
      let size: string | undefined;
      try {
        const st = fs.statSync(path.join(absListDir, name));
        if (st.isDirectory()) type = "dir";
        else if (st.isFile()) {
          type = "file";
          size = formatBytes(st.size);
        }
      } catch {
        continue;
      }
      if (!type) continue;
      entries.push({ name, type, size });
      if (entries.length >= MAX_ENTRIES) {
        truncated = true;
        break;
      }
    }
  } catch {
    // Directory does not exist (yet) — leave entries empty.
  }

  // Folders first, then files; alphabetical within each (stable sort).
  entries.sort((a, b) => (a.type === b.type ? 0 : a.type === "dir" ? -1 : 1));

  // Validity of the full input.
  let isFile = false;
  let isDirectory = false;
  let fileInfo: { size: string; mimeType: string } | undefined;
  if (rel !== "") {
    const full = path.normalize(path.join(realMount, rel));
    if (full === realMount || full.startsWith(realMount + path.sep)) {
      try {
        const st = fs.statSync(full);
        if (st.isDirectory()) isDirectory = true;
        else if (st.isFile()) {
          isFile = true;
          fileInfo = { size: formatBytes(st.size), mimeType: guessMimeType(full) };
        }
      } catch {
        // not found
      }
    }
  }

  return {
    ok: true,
    result: { baseDir: listRel, entries, isFile, isDirectory, fileInfo, truncated },
  };
}

/** Resolves an input under the mount and reports whether it's a file or folder. */
export function pathKind(
  input: string,
): { kind: "file" | "dir" | "missing" | "invalid"; error?: string } {
  const raw = (input ?? "").trim();
  if (!raw) return { kind: "invalid", error: "Path is required." };
  if (hasTraversal(raw)) {
    return { kind: "invalid", error: "Path may not contain '..' segments." };
  }

  const base = resolveUnderMount(raw);
  if (!base.ok) return { kind: "invalid", error: base.error };
  const { realMount, candidate } = base;

  let real: string;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    return { kind: "missing", error: "Nothing exists at that path." };
  }
  if (real !== realMount && !real.startsWith(realMount + path.sep)) {
    return { kind: "invalid", error: "Path resolves outside the NAS mount." };
  }

  let st: fs.Stats;
  try {
    st = fs.statSync(real);
  } catch {
    return { kind: "missing", error: "Nothing exists at that path." };
  }
  if (st.isDirectory()) return { kind: "dir" };
  if (st.isFile()) return { kind: "file" };
  return { kind: "invalid", error: "Path is neither a file nor a folder." };
}

const MAX_FOLDER_FILES = 2000;

export interface FolderFile {
  absolutePath: string;
  size: bigint;
  mimeType: string;
  /** Path relative to the selected folder (posix separators). */
  relativeName: string;
}

export type FolderResult =
  | { ok: true; baseDir: string; files: FolderFile[] }
  | { ok: false; error: string };

/**
 * Recursively collects every file inside a NAS folder. Skips OS junk, resolves
 * + containment-checks each entry (symlinks can't escape the mount), and caps
 * the count so a huge tree can't be imported by accident.
 */
export function collectFolderFiles(input: string): FolderResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Folder path is required." };
  if (hasTraversal(raw)) {
    return { ok: false, error: "Path may not contain '..' segments." };
  }

  const base = resolveUnderMount(raw);
  if (!base.ok) return { ok: false, error: base.error };
  const { realMount, candidate } = base;

  let realDir: string;
  try {
    realDir = fs.realpathSync(candidate);
  } catch {
    return { ok: false, error: "No folder exists at that path." };
  }
  if (realDir !== realMount && !realDir.startsWith(realMount + path.sep)) {
    return { ok: false, error: "Path resolves outside the NAS mount." };
  }
  let dirStat: fs.Stats;
  try {
    dirStat = fs.statSync(realDir);
  } catch {
    return { ok: false, error: "No folder exists at that path." };
  }
  if (!dirStat.isDirectory()) {
    return { ok: false, error: "That path is a file, not a folder." };
  }

  const files: FolderFile[] = [];
  const stack: string[] = [realDir];
  let overflow = false;

  while (stack.length > 0 && !overflow) {
    const dir = stack.pop()!;
    let dirents: fs.Dirent[];
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of dirents) {
      if (isIgnored(d.name)) continue;
      const full = path.join(dir, d.name);
      let realFull: string;
      let st: fs.Stats;
      try {
        realFull = fs.realpathSync(full);
        st = fs.statSync(realFull);
      } catch {
        continue;
      }
      if (realFull !== realMount && !realFull.startsWith(realMount + path.sep)) {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!st.isFile()) continue;
      if (files.length >= MAX_FOLDER_FILES) {
        overflow = true;
        break;
      }
      files.push({
        absolutePath: realFull,
        size: BigInt(st.size),
        mimeType: guessMimeType(full),
        relativeName: path.relative(realDir, full).split(path.sep).join("/"),
      });
    }
  }

  if (overflow) {
    return {
      ok: false,
      error: `Folder has more than ${MAX_FOLDER_FILES} files. Add subfolders instead.`,
    };
  }
  if (files.length === 0) {
    return { ok: false, error: "That folder has no files." };
  }

  files.sort((a, b) => a.relativeName.localeCompare(b.relativeName));
  const baseDir = path.relative(realMount, realDir).split(path.sep).join("/");
  return { ok: true, baseDir, files };
}
