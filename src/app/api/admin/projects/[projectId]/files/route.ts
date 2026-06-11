import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { resolveNasPath, collectFolderFiles, pathKind } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let body: { name?: string; path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const inputPath = body.path?.trim();
  if (!inputPath) {
    return NextResponse.json(
      { error: "A NAS path is required." },
      { status: 400 },
    );
  }

  const kind = pathKind(inputPath);

  // --- Folder import: add every file inside (recursively). ---
  if (kind.kind === "dir") {
    const folder = collectFolderFiles(inputPath);
    if (!folder.ok) {
      return NextResponse.json({ error: folder.error }, { status: 400 });
    }

    // Skip files already referenced in this project (idempotent re-import).
    const existing = new Set(
      (
        await prisma.file.findMany({
          where: { projectId },
          select: { path: true },
        })
      ).map((f) => f.path),
    );
    const toCreate = folder.files.filter((f) => !existing.has(f.absolutePath));

    if (toCreate.length > 0) {
      await prisma.file.createMany({
        data: toCreate.map((f) => ({
          name: f.relativeName,
          path: f.absolutePath,
          size: f.size,
          mimeType: f.mimeType,
          projectId,
        })),
      });
    }

    return NextResponse.json(
      {
        added: toCreate.length,
        skipped: folder.files.length - toCreate.length,
      },
      { status: 201 },
    );
  }

  // --- Single file. ---
  if (kind.kind === "file") {
    const resolved = resolveNasPath(inputPath);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const displayName =
      body.name?.trim() || path.basename(resolved.file.absolutePath);

    const file = await prisma.file.create({
      data: {
        name: displayName,
        path: resolved.file.absolutePath,
        size: resolved.file.size,
        mimeType: resolved.file.mimeType,
        projectId,
      },
    });
    return NextResponse.json(
      { added: 1, id: file.id, resolvedPath: resolved.file.absolutePath },
      { status: 201 },
    );
  }

  return NextResponse.json(
    { error: kind.error ?? "Invalid path." },
    { status: 400 },
  );
}
