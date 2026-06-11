import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  let body: {
    name?: string;
    slug?: string;
    // string = set new password; null = remove protection; undefined = leave.
    password?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const data: {
    name?: string;
    slug?: string;
    password?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    data.name = name;
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!isValidSlug(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase letters, numbers, and dashes." },
        { status: 400 },
      );
    }
    if (slug !== client.slug) {
      const clash = await prisma.client.findUnique({ where: { slug } });
      if (clash) {
        return NextResponse.json(
          { error: "That slug is already in use." },
          { status: 409 },
        );
      }
    }
    data.slug = slug;
  }

  if (body.password !== undefined) {
    if (body.password === null || body.password.trim() === "") {
      data.password = null; // remove protection
    } else {
      data.password = await bcrypt.hash(body.password.trim(), 10);
    }
  }

  await prisma.client.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  // Cascade removes projects, files, and download events for this client.
  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
