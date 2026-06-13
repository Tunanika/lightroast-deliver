import type { Prisma } from "@prisma/client";

export interface AnalyticsFilters {
  clientSlug?: string | null;
  device?: string | null;
  from?: string | null;
  to?: string | null;
}

const DEFAULT_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_DEVICES = new Set(["desktop", "mobile", "tablet"]);

export interface ResolvedAnalytics {
  start: Date;
  end: Date;
  /** Window + portal + device filters, WITHOUT the isBot constraint so callers
   *  can reuse it for both human and bot counts. */
  where: Prisma.PageViewWhereInput;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Turns raw query params into a validated date window + Prisma filter. Defaults
 * to the last 30 days; clamps an inverted range so a bad `from`/`to` can never
 * produce an empty or reversed window.
 */
export function resolveAnalytics(opts: AnalyticsFilters): ResolvedAnalytics {
  const now = new Date();

  const toDate = parseDate(opts.to);
  const end = toDate ?? now;
  if (toDate) end.setHours(23, 59, 59, 999);

  const fromDate = parseDate(opts.from);
  let start = fromDate ?? new Date(end.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS);
  if (start > end) start = new Date(end.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS);

  const where: Prisma.PageViewWhereInput = {
    viewedAt: { gte: start, lte: end },
  };
  if (opts.clientSlug) where.clientSlug = opts.clientSlug;
  if (opts.device && VALID_DEVICES.has(opts.device)) where.device = opts.device;

  return { start, end, where };
}
