// Best-effort client IP from proxy headers.
// Behind Cloudflare Tunnel the real visitor IP is in cf-connecting-ip; otherwise
// fall back to x-forwarded-for / x-real-ip. "unknown" when none are present.
export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
