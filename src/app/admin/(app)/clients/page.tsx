import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { NewClientForm } from "@/components/admin/NewClientForm";
import { EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";

export default async function ClientsPage() {
  const [clients, downloadCounts] = await Promise.all([
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { projects: true } },
        projects: { select: { _count: { select: { files: true } } } },
      },
    }),
    prisma.downloadEvent.groupBy({
      by: ["clientSlug"],
      _count: { _all: true },
    }),
  ]);

  const downloadsBySlug = new Map(
    downloadCounts.map((d) => [d.clientSlug, d._count._all]),
  );

  return (
    <>
      <PageHeader
        slug={`(LR.s — Clients · ${clients.length})`}
        title="Clients."
        actions={<NewClientForm />}
      />

      <div className="p-8">
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet."
            hint="Create a client to open their private delivery portal."
          />
        ) : (
          <Table>
            <THead>
              <Th>Name</Th>
              <Th>Portal</Th>
              <Th>Privacy</Th>
              <Th>Access</Th>
              <Th className="text-right">Projects</Th>
              <Th className="text-right">Files</Th>
              <Th className="text-right">Downloads</Th>
            </THead>
            <tbody>
              {clients.map((client) => {
                const files = client.projects.reduce(
                  (sum, p) => sum + p._count.files,
                  0,
                );
                const downloads = downloadsBySlug.get(client.slug) ?? 0;
                return (
                  <Tr key={client.id}>
                    <Td>
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-fg underline-offset-4 hover:underline"
                      >
                        {client.name}
                      </Link>
                    </Td>
                    <Td className="font-mono text-fg-muted">/c/{client.slug}</Td>
                    <Td className="slug">
                      {client.password ? "Protected" : "Open"}
                    </Td>
                    <Td className="slug">
                      <span className={client.accessEnabled ? "" : "text-fg"}>
                        {client.accessEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </Td>
                    <Td className="text-right font-mono text-fg-muted">
                      {client._count.projects}
                    </Td>
                    <Td className="text-right font-mono text-fg-muted">
                      {files}
                    </Td>
                    <Td className="text-right font-mono text-fg-muted">
                      {downloads}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
