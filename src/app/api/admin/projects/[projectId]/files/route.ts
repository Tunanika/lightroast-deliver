import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { resolveNasPath } from "@/lib/paths";

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

  // Validate the path exists, is a file, and stays inside the NAS mount.
  const resolved = resolveNasPath(inputPath);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const displayName = body.name?.trim() || path.basename(resolved.file.absolutePath);

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
    { id: file.id, resolvedPath: resolved.file.absolutePath },
    { status: 201 },
  );
}
