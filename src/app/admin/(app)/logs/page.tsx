import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { LogsFilter } from "@/components/admin/LogsFilter";
import { EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";
import { buildLogWhere } from "@/lib/logs";
import { formatDateTime } from "@/lib/format";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const where = buildLogWhere({
    clientId: sp.clientId,
    from: sp.from,
    to: sp.to,
  });

  const [clients, events] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.downloadEvent.findMany({
      where,
      orderBy: { downloadedAt: "desc" },
      take: 1000,
      include: {
        file: {
          select: {
            name: true,
            project: {
              select: { name: true, client: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        slug={`(LR.s — Logs · ${events.length})`}
        title="Download log."
      />

      <div className="space-y-6 p-8">
        <LogsFilter
          clients={clients}
          initial={{
            clientId: sp.clientId ?? "",
            from: sp.from ?? "",
            to: sp.to ?? "",
          }}
        />

        {events.length === 0 ? (
          <EmptyState
            title="No download events match."
            hint="Adjust the filters, or wait for a client to download a file."
          />
        ) : (
          <Table>
            <THead>
              <Th>When</Th>
              <Th>File</Th>
              <Th>Project</Th>
              <Th>Client</Th>
              <Th>Portal</Th>
              <Th>IP</Th>
              <Th>User agent</Th>
            </THead>
            <tbody>
              {events.map((event) => (
                <Tr key={event.id}>
                  <Td className="whitespace-nowrap font-mono text-fg-muted">
                    {formatDateTime(event.downloadedAt)}
                  </Td>
                  <Td className="text-fg">{event.file.name}</Td>
                  <Td className="text-fg-muted">{event.file.project.name}</Td>
                  <Td className="text-fg-muted">
                    {event.file.project.client.name}
                  </Td>
                  <Td className="font-mono text-fg-muted">{event.clientSlug}</Td>
                  <Td className="font-mono text-fg-muted">{event.ip}</Td>
                  <Td className="max-w-xs truncate text-fg-subtle">
                    {event.userAgent}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
