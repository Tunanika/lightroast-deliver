import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { deleteThumbsFor } from "@/lib/thumbs";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileId } = await params;

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // Removes only the DB reference. The file on the NAS is never touched.
  await prisma.file.delete({ where: { id: fileId } });
  await deleteThumbsFor([fileId]);
  return NextResponse.json({ ok: true });
}
