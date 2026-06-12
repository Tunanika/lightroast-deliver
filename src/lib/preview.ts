// What the portal can preview, by mime type. Anything not listed falls back
// to download-only.

export type PreviewKind = "image" | "video" | "audio" | "pdf";

// Image types sharp can decode into the cached WebP rendition. HEIC decode
// depends on the libvips build — failures degrade to download-only at runtime.
const THUMBABLE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/heic",
]);

// Image types browsers render natively; the lightbox shows the original for
// these and the cached rendition for the rest (TIFF, HEIC).
const NATIVE_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Containers/codecs browsers reliably play. Masters in other formats
// (ProRes, MXF…) are download-only — no server-side transcoding.
const PLAYABLE_VIDEO = new Set(["video/mp4", "video/webm", "video/x-m4v"]);

const PLAYABLE_AUDIO = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/aac",
  "audio/flac",
]);

export function isThumbable(mime: string): boolean {
  return THUMBABLE.has(mime);
}

export function isNativeImage(mime: string): boolean {
  return NATIVE_IMAGE.has(mime);
}

export function previewKind(mime: string): PreviewKind | null {
  if (THUMBABLE.has(mime)) return "image";
  if (PLAYABLE_VIDEO.has(mime)) return "video";
  if (PLAYABLE_AUDIO.has(mime)) return "audio";
  if (mime === "application/pdf") return "pdf";
  return null;
}
