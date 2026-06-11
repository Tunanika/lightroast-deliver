import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { signAdminToken, ADMIN_COOKIE, adminCookieOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/client-ip";

export const runtime = "nodejs";

// Constant-time string comparison (avoids a timing oracle on credentials).
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = rateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { username, password } = body;
  const valid =
    !!username &&
    !!password &&
    safeEqual(username, env.adminUsername) &&
    safeEqual(password, env.adminPassword);

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const token = await signAdminToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions);
  return res;
}
