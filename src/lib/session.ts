// Server-only admin session reader (uses next/headers — not for middleware).
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken, type AdminPayload } from "./auth";

export async function getAdminSession(): Promise<AdminPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
