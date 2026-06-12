import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { Stat, EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const [clients, files, downloads, previews, recent] = await Promise.all([
    prisma.client.count(),
    prisma.file.count(),
    prisma.downloadEvent.count({ where: { kind: "download" } }),
    prisma.downloadEvent.count({ where: { kind: "preview" } }),
    prisma.downloadEvent.findMany({
      take: 50,
      orderBy: { downloadedAt: "desc" },
      include: { file: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader slug="(LR.s — Dashboard)" title="Overview." />

      <div className="space-y-10 p-8">
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-4">
          <Stat label="Clients" value={clients} />
          <Stat label="Files" value={files} />
          <Stat label="Downloads" value={downloads} />
          <Stat label="Previews" value={previews} />
        </div>

        <section className="space-y-4">
          <h2 className="slug">Recent activity · last 50</h2>
          {recent.length === 0 ? (
            <EmptyState
              title="No activity yet."
              hint="Events appear here the moment a client previews or downloads a file."
            />
          ) : (
            <Table>
              <THead>
                <Th>File</Th>
                <Th>Type</Th>
                <Th>Portal</Th>
                <Th>When</Th>
                <Th>IP</Th>
              </THead>
              <tbody>
                {recent.map((event) => (
                  <Tr key={event.id}>
                    <Td className="text-fg">{event.file.name}</Td>
                    <Td className="font-mono text-fg-muted">{event.kind}</Td>
                    <Td className="font-mono text-fg-muted">
                      {event.clientSlug}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-fg-muted">
                      {formatDateTime(event.downloadedAt)}
                    </Td>
                    <Td className="font-mono text-fg-muted">{event.ip}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
