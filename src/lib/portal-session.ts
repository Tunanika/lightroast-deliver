// Per-portal unlock cookie. Session-scoped (clears when the browser closes).
// Used only in server components and Node route handlers (never middleware).
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const ALG = "HS256";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function key(): Uint8Array {
  return new TextEncoder().encode(env.jwtSecret);
}

// Binds a token to the current password. Changing/removing the password changes
// this value, instantly invalidating every previously issued unlock token.
function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export function portalCookieName(slug: string): string {
  return `lr_portal_${slug}`;
}

export async function signPortalToken(
  slug: string,
  passwordHash: string,
): Promise<string> {
  return new SignJWT({ scope: "portal", slug, pv: passwordVersion(passwordHash) })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifyPortalToken(
  slug: string,
  token: string,
  passwordHash: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: [ALG] });
    return (
      payload.scope === "portal" &&
      payload.slug === slug &&
      payload.pv === passwordVersion(passwordHash)
    );
  } catch {
    return false;
  }
}

/**
 * Reads the unlock cookie for a portal (server components + route handlers).
 * `passwordHash` is the client's current bcrypt hash; the token is only valid
 * while it still matches, so a password change forces a re-unlock.
 */
export async function isPortalUnlocked(
  slug: string,
  passwordHash: string,
): Promise<boolean> {
  const store = await cookies();
  const token = store.get(portalCookieName(slug))?.value;
  if (!token) return false;
  return verifyPortalToken(slug, token, passwordHash);
}

export const portalCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.cookieSecure,
  path: "/",
  // No maxAge / expires → a session cookie that clears with the browser. The
  // JWT's own exp still bounds how long the unlock lasts.
};
