// Portal page-view logging. Node-only (crypto).
//
// Visitors are counted via a daily-rotating hash of ip+ua, so uniques work
// without storing a durable cross-day identifier. Rows older than
// ANALYTICS_RETENTION_DAYS (default 365) are pruned opportunistically, so the
// table can't grow forever.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getClientIp } from "@/lib/client-ip";
import { parseUa } from "@/lib/ua";

const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastPrune = 0;

function retentionDays(): number {
  const days = Number(process.env.ANALYTICS_RETENTION_DAYS);
  return Number.isFinite(days) && days > 0 ? days : 365;
}

function visitorId(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${env.jwtSecret}:${day}:${ip}:${ua}`)
    .digest("hex")
    .slice(0, 16);
}

export async function logPageView(
  clientSlug: string,
  headers: Headers,
): Promise<void> {
  try {
    const ua = headers.get("user-agent") ?? "";
    const ip = getClientIp(headers);
    const parsed = parseUa(ua);
    const referrer = headers.get("referer");

    await prisma.pageView.create({
      data: {
        clientSlug,
        visitorId: visitorId(ip, ua),
        ip,
        country: headers.get("cf-ipcountry"),
        referrer: referrer ? referrer.slice(0, 500) : null,
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        userAgent: ua.slice(0, 500),
        isBot: parsed.isBot,
      },
    });

    const now = Date.now();
    if (now - lastPrune > PRUNE_INTERVAL_MS) {
      lastPrune = now;
      const cutoff = new Date(now - retentionDays() * 24 * 60 * 60 * 1000);
      await prisma.pageView.deleteMany({ where: { viewedAt: { lt: cutoff } } });
    }
  } catch {
    // Analytics must never break the portal.
  }
}
