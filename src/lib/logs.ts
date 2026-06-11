import type { Prisma } from "@prisma/client";

/** Shared filter for the download log — used by the logs page and CSV export. */
export function buildLogWhere(opts: {
  clientId?: string | null;
  from?: string | null;
  to?: string | null;
}): Prisma.DownloadEventWhereInput {
  const where: Prisma.DownloadEventWhereInput = {};

  if (opts.clientId) {
    where.file = { project: { clientId: opts.clientId } };
  }

  const downloadedAt: Prisma.DateTimeFilter = {};
  if (opts.from) {
    const d = new Date(opts.from);
    if (!Number.isNaN(d.getTime())) downloadedAt.gte = d;
  }
  if (opts.to) {
    const d = new Date(opts.to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      downloadedAt.lte = d;
    }
  }
  if (downloadedAt.gte || downloadedAt.lte) {
    where.downloadedAt = downloadedAt;
  }

  return where;
}
