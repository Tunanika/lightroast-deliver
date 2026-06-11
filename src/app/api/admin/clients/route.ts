import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; slug?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!slug || !isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, numbers, and dashes." },
      { status: 400 },
    );
  }

  const existing = await prisma.client.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "That slug is already in use." },
      { status: 409 },
    );
  }

  const client = await prisma.client.create({
    data: {
      name,
      slug,
      password: password ? await bcrypt.hash(password, 10) : null,
    },
  });

  return NextResponse.json({ id: client.id }, { status: 201 });
}
