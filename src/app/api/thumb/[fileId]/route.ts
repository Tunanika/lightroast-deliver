import { NextRequest } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { resolveNasPath } from "@/lib/paths";
import { loadPortalFile } from "@/lib/portal-file";
import { isThumbable } from "@/lib/preview";
import { getThumb } from "@/lib/thumbs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const portal = req.nextUrl.searchParams.get("portal");

  const access = await loadPortalFile(fileId, portal);
  if (!access.ok) return access.response;
  const file = access.file;

  if (!isThumbable(file.mimeType)) {
    return new Response("No preview for this file type.", { status: 415 });
  }

  const resolved = resolveNasPath(file.path);
  if (!resolved.ok) {
    return new Response("File is no longer available.", { status: 410 });
  }

  const thumb = await getThumb(file.id, resolved.file.absolutePath);
  if (!thumb.ok) {
    return new Response("Preview unavailable.", { status: 415 });
  }

  const etag = `"${thumb.etag}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "private, max-age=86400" },
    });
  }

  // The rendition can be evicted (or its file deleted) between getThumb and
  // here — fall through cleanly rather than throwing a 500.
  let stat: fs.Stats;
  try {
    stat = fs.statSync(thumb.path);
  } catch {
    return new Response("Preview unavailable.", { status: 415 });
  }
  const nodeStream = fs.createReadStream(thumb.path);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=86400",
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
