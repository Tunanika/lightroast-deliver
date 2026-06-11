import { NextRequest } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { resolveNasPath } from "@/lib/paths";
import { isPortalUnlocked } from "@/lib/portal-session";
import { getClientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(name: string): string {
  // HTTP headers are latin1 — the plain filename must be ASCII-only.
  // filename* carries the full UTF-8 name (em dashes, accents, etc.).
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const portal = req.nextUrl.searchParams.get("portal");
  if (!portal) {
    return new Response("Missing portal.", { status: 400 });
  }

  // Load the file with its owning client.
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { project: { include: { client: true } } },
  });
  if (!file) {
    return new Response("Not found.", { status: 404 });
  }

  const client = file.project.client;

  // Cross-portal guard: the file must belong to the requesting portal's client.
  if (client.slug !== portal) {
    return new Response("Not found.", { status: 404 });
  }

  // Password-protected portals require a valid unlock session.
  if (client.password && !(await isPortalUnlocked(client.slug))) {
    return new Response("This portal is locked.", { status: 403 });
  }

  // Re-validate the path stays inside the NAS mount and still exists.
  const resolved = resolveNasPath(file.path);
  if (!resolved.ok) {
    return new Response("File is no longer available.", { status: 410 });
  }

  const filePath = resolved.file.absolutePath;
  const totalSize = Number(resolved.file.size);

  // --- Range handling (critical for large video: pause/resume + preview). ---
  const rangeHeader = req.headers.get("range");
  let start = 0;
  let end = totalSize - 1;
  let status = 200;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      return new Response("Invalid range.", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }
    const startStr = match[1];
    const endStr = match[2];

    if (startStr === "" && endStr === "") {
      return new Response("Invalid range.", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    if (startStr === "") {
      // Suffix range: last N bytes.
      const suffix = Number(endStr);
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else {
      start = Number(startStr);
      end = endStr === "" ? totalSize - 1 : Number(endStr);
    }

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start > end ||
      start >= totalSize
    ) {
      return new Response("Range not satisfiable.", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }
    end = Math.min(end, totalSize - 1);
    status = 206;
  }

  const chunkSize = end - start + 1;

  // --- Log one DownloadEvent per download. A Range request that starts at
  // byte 0 (or no Range at all) marks the start of a fresh download; later
  // range chunks from video scrubbing/resume start at >0 and are not logged.
  if (!rangeHeader || start === 0) {
    try {
      await prisma.downloadEvent.create({
        data: {
          fileId: file.id,
          clientSlug: client.slug,
          ip: getClientIp(req.headers),
          userAgent: req.headers.get("user-agent") ?? "unknown",
        },
      });
    } catch {
      // Never let a logging failure block the delivery.
    }
  }

  const nodeStream = fs.createReadStream(filePath, { start, end });
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  const headers = new Headers({
    "Content-Type": file.mimeType || "application/octet-stream",
    "Content-Length": String(chunkSize),
    "Accept-Ranges": "bytes",
    "Content-Disposition": contentDisposition(file.name),
    "Cache-Control": "private, no-store",
  });
  if (status === 206) {
    headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  }

  return new Response(webStream, { status, headers });
}
