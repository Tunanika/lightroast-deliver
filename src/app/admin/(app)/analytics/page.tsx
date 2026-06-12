import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { Stat, EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";

const DAYS = 30;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function topOf(
  rows: { key: string | null; count: number }[],
  limit = 6,
): { key: string; count: number }[] {
  return rows
    .filter((r): r is { key: string; count: number } => !!r.key)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export default async function AnalyticsPage() {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const where = { isBot: false, viewedAt: { gte: since } };

  const [views, botViews] = await Promise.all([
    prisma.pageView.findMany({
      where,
      select: {
        visitorId: true,
        clientSlug: true,
        device: true,
        browser: true,
        os: true,
        country: true,
        referrer: true,
        viewedAt: true,
      },
    }),
    prisma.pageView.count({
      where: { isBot: true, viewedAt: { gte: since } },
    }),
  ]);

  const visitors = new Set(views.map((v) => v.visitorId)).size;

  // Daily buckets, oldest → newest, including empty days.
  const byDay = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    byDay.set(dayKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)), 0);
  }
  for (const v of views) {
    const key = dayKey(v.viewedAt);
    if (byDay.has(key)) byDay.set(key, byDay.get(key)! + 1);
  }
  const days = [...byDay.entries()];
  const peak = Math.max(1, ...days.map(([, n]) => n));

  const count = (pick: (v: (typeof views)[number]) => string | null) => {
    const acc = new Map<string | null, number>();
    for (const v of views) {
      const key = pick(v);
      acc.set(key, (acc.get(key) ?? 0) + 1);
    }
    return [...acc.entries()].map(([key, n]) => ({ key, count: n }));
  };

  const portals = topOf(count((v) => v.clientSlug));
  const devices = topOf(count((v) => v.device));
  const browsers = topOf(count((v) => v.browser));
  const countries = topOf(count((v) => v.country));
  const referrers = topOf(
    count((v) => {
      if (!v.referrer) return null;
      try {
        return new URL(v.referrer).host || null;
      } catch {
        return null;
      }
    }),
  );

  return (
    <>
      <PageHeader
        slug={`(LR.s — Analytics · last ${DAYS} days)`}
        title="Portal analytics."
      />

      <div className="space-y-10 p-8">
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
          <Stat label="Page views" value={views.length} />
          <Stat label="Unique visitors" value={visitors} />
          <Stat label="Bot / preview hits" value={botViews} />
        </div>

        <section className="space-y-4">
          <h2 className="slug">Views per day</h2>
          {views.length === 0 ? (
            <EmptyState
              title="No portal views yet."
              hint="Views appear when a client opens their portal link."
            />
          ) : (
            <div className="border border-border bg-bg p-6">
              <svg
                viewBox={`0 0 ${DAYS * 20} 120`}
                className="h-32 w-full text-accent"
                preserveAspectRatio="none"
                role="img"
                aria-label={`Daily portal views, last ${DAYS} days`}
              >
                {days.map(([key, n], i) => (
                  <rect
                    key={key}
                    x={i * 20 + 3}
                    y={120 - (n / peak) * 112 - 2}
                    width={14}
                    height={(n / peak) * 112 + 2}
                    fill="currentColor"
                    opacity={n === 0 ? 0.15 : 0.9}
                  >
                    <title>{`${key}: ${n} view${n === 1 ? "" : "s"}`}</title>
                  </rect>
                ))}
              </svg>
              <div className="mt-3 flex justify-between font-mono text-xs text-fg-subtle">
                <span>{days[0]?.[0]}</span>
                <span>{days[days.length - 1]?.[0]}</span>
              </div>
            </div>
          )}
        </section>

        {views.length > 0 ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <Breakdown title="Portals" rows={portals} />
            <Breakdown title="Devices" rows={devices} />
            <Breakdown title="Browsers" rows={browsers} />
            <Breakdown title="Countries" rows={countries} />
            <Breakdown title="Referrers" rows={referrers} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; count: number }[];
}) {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <section className="space-y-4">
      <h2 className="slug">{title}</h2>
      <Table>
        <THead>
          <Th>{title.replace(/s$/, "")}</Th>
          <Th className="text-right">Views</Th>
          <Th className="text-right">Share</Th>
        </THead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.key}>
              <Td className="text-fg">{row.key}</Td>
              <Td className="text-right font-mono text-fg-muted">
                {row.count}
              </Td>
              <Td className="text-right font-mono text-fg-muted">
                {Math.round((row.count / total) * 100)}%
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
