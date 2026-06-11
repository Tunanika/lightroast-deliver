import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/client-ip";
import {
  signPortalToken,
  portalCookieName,
  portalCookieOptions,
} from "@/lib/portal-session";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Max 10 attempts per IP per 15 minutes.
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`portal-unlock:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { slug } });
  if (!client) {
    return NextResponse.json({ error: "Portal not found." }, { status: 404 });
  }

  // Disabled portals can't be unlocked or accessed at all.
  if (!client.accessEnabled) {
    return NextResponse.json(
      { error: "This portal is unavailable." },
      { status: 403 },
    );
  }

  // Open portal — nothing to unlock.
  if (!client.password) {
    return NextResponse.json({ ok: true });
  }

  const valid =
    !!body.password && (await bcrypt.compare(body.password, client.password));
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await signPortalToken(slug, client.password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(portalCookieName(slug), token, portalCookieOptions);
  return res;
}
