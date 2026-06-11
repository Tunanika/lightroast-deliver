import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { Stat, EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";
import { formatDateTime } from "@/lib/format";

export default async function DashboardPage() {
  const [clients, files, downloads, recent] = await Promise.all([
    prisma.client.count(),
    prisma.file.count(),
    prisma.downloadEvent.count(),
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
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
          <Stat label="Clients" value={clients} />
          <Stat label="Files" value={files} />
          <Stat label="Downloads" value={downloads} />
        </div>

        <section className="space-y-4">
          <h2 className="slug">Recent downloads · last 50</h2>
          {recent.length === 0 ? (
            <EmptyState
              title="No downloads yet."
              hint="Events appear here the moment a client downloads a file."
            />
          ) : (
            <Table>
              <THead>
                <Th>File</Th>
                <Th>Portal</Th>
                <Th>When</Th>
                <Th>IP</Th>
              </THead>
              <tbody>
                {recent.map((event) => (
                  <Tr key={event.id}>
                    <Td className="text-fg">{event.file.name}</Td>
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
