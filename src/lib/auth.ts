// Admin auth core — edge-safe (jose + process.env only).
// Safe to import from middleware. No next/headers, no Node APIs here.
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

export const ADMIN_COOKIE = "lr_admin";
const ALG = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function key(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

export interface AdminPayload {
  sub: string;
  role: "admin";
}

export async function signAdminToken(username: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: ALG })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: [ALG] });
    if (payload.role !== "admin" || typeof payload.sub !== "string") {
      return null;
    }
    return { sub: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.cookieSecure,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
