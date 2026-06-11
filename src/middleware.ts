import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

// Runs on every request except Next's static assets and a few public files.
// Applies security headers + a nonce-based CSP site-wide, and gates the admin
// app + admin API behind the JWT cookie.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
  ],
};

const isProd = process.env.NODE_ENV === "production";
const isSecure = process.env.COOKIE_SECURE === "true";

function buildCsp(nonce: string): string {
  // Production locks scripts to a per-request nonce; dev needs eval/inline for HMR.
  const scriptSrc = isProd
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `'self' 'unsafe-inline' 'unsafe-eval'`;

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `media-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  // Only upgrade to HTTPS when actually served over HTTPS — would break LAN HTTP.
  if (isSecure) directives.push(`upgrade-insecure-requests`);
  return directives.join("; ");
}

function applySecurityHeaders(res: NextResponse, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  // Private delivery — keep everything out of search engines.
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (isSecure) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }
}

export async function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Pass nonce + CSP to Next via request headers so it nonces its own scripts.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const { pathname } = req.nextUrl;
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAuthPath =
    pathname === "/admin/login" || pathname === "/api/admin/login";

  if (isAdmin && !isAuthPath) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const session = token ? await verifyAdminToken(token) : null;
    if (!session) {
      let res: NextResponse;
      if (pathname.startsWith("/api/")) {
        res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      } else {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.search = "";
        if (pathname !== "/admin") url.searchParams.set("from", pathname);
        res = NextResponse.redirect(url);
      }
      applySecurityHeaders(res, csp);
      return res;
    }
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(res, csp);
  return res;
}
