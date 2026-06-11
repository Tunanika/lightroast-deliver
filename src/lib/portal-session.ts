// Per-portal unlock cookie. Session-scoped (clears when the browser closes).
// Used only in server components and Node route handlers (never middleware).
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const ALG = "HS256";

function key(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

export function portalCookieName(slug: string): string {
  return `lr_portal_${slug}`;
}

export async function signPortalToken(slug: string): Promise<string> {
  return new SignJWT({ scope: "portal", slug })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .sign(key());
}

export async function verifyPortalToken(
  slug: string,
  token: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: [ALG] });
    return payload.scope === "portal" && payload.slug === slug;
  } catch {
    return false;
  }
}

/** Reads the unlock cookie for a portal (server components + route handlers). */
export async function isPortalUnlocked(slug: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(portalCookieName(slug))?.value;
  if (!token) return false;
  return verifyPortalToken(slug, token);
}

export const portalCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.cookieSecure,
  path: "/",
  // No maxAge / expires → a session cookie that clears with the browser.
};
