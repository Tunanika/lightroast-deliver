import { NextRequest } from "next/server";
import archiver from "archiver";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { resolveNasPath } from "@/lib/paths";
import { isPortalUnlocked } from "@/lib/portal-session";
import { getClientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function zipFilename(name: string): string {
  const base = name.replace(/[^\p{L}\p{N}\-_. ]/gu, "_").trim() || "delivery";
  const ascii = base.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}.zip"; filename*=UTF-8''${encodeURIComponent(base)}.zip`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const portal = req.nextUrl.searchParams.get("portal");
  if (!portal) return new Response("Missing portal.", { status: 400 });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { client: true, files: { orderBy: { name: "asc" } } },
  });
  if (!project) return new Response("Not found.", { status: 404 });

  const client = project.client;
  // Cross-portal guard: the project must belong to the requesting portal.
  if (client.slug !== portal) return new Response("Not found.", { status: 404 });

  // Disabled portals serve nothing.
  if (!client.accessEnabled) {
    return new Response("This portal is unavailable.", { status: 403 });
  }

  // Password-protected portals require a valid unlock session.
  if (client.password && !(await isPortalUnlocked(client.slug, client.password))) {
    return new Response("This portal is locked.", { status: 403 });
  }

  // Resolve + validate each file; skip anything missing or escaped.
  const used = new Set<string>();
  const valid: { id: string; absolutePath: string; entryName: string }[] = [];
  for (const f of project.files) {
    const resolved = resolveNasPath(f.path);
    if (!resolved.ok) continue;
    // Ensure unique entry names within the zip.
    let entryName = f.name;
    let n = 1;
    while (used.has(entryName)) {
      const dot = f.name.lastIndexOf(".");
      entryName =
        dot > 0
          ? `${f.name.slice(0, dot)} (${n})${f.name.slice(dot)}`
          : `${f.name} (${n})`;
      n++;
    }
    used.add(entryName);
    valid.push({ id: f.id, absolutePath: resolved.file.absolutePath, entryName });
  }

  if (valid.length === 0) {
    return new Response("No files available.", { status: 404 });
  }

  // Log one download event per file in the bundle (each file is delivered).
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  try {
    await prisma.downloadEvent.createMany({
      data: valid.map((v) => ({
        fileId: v.id,
        clientSlug: client.slug,
        ip,
        userAgent,
      })),
    });
  } catch {
    // Never let logging block the delivery.
  }

  // store = no compression: media is already compressed, so this is fast and
  // low-CPU; zip64 kicks in automatically for very large files/counts.
  const archive = archiver("zip", { store: true });
  archive.on("error", () => archive.destroy());
  for (const v of valid) {
    archive.file(v.absolutePath, { name: v.entryName });
  }
  void archive.finalize();

  const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": zipFilename(project.name),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
