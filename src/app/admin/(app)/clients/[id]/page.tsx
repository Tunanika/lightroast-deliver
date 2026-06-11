import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { EditClientForm } from "@/components/admin/EditClientForm";
import { NewProjectForm } from "@/components/admin/NewProjectForm";
import { RenameProject } from "@/components/admin/RenameProject";
import { CopyButton } from "@/components/admin/CopyButton";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { Button, Panel, EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { files: true } } },
      },
    },
  });
  if (!client) notFound();

  const downloads = await prisma.downloadEvent.findMany({
    where: { file: { project: { clientId: id } } },
    orderBy: { downloadedAt: "desc" },
    take: 100,
    include: { file: { select: { name: true } } },
  });

  const portalPath = `/c/${client.slug}`;

  return (
    <>
      <PageHeader
        slug="(LR.s — Client)"
        title={client.name}
        description={<span className="font-mono">{portalPath}</span>}
        actions={
          <>
            <CopyButton path={portalPath} />
            <a href={portalPath} target="_blank" rel="noreferrer">
              <Button variant="ghost">Open portal</Button>
            </a>
          </>
        }
      />

      <div className="space-y-14 p-8">
        <section className="max-w-2xl space-y-4">
          <h2 className="slug">Details</h2>
          <EditClientForm
            client={{
              id: client.id,
              name: client.name,
              slug: client.slug,
              hasPassword: !!client.password,
            }}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="slug">Projects · {client.projects.length}</h2>
            <NewProjectForm clientId={client.id} />
          </div>
          {client.projects.length === 0 ? (
            <EmptyState
              title="No projects yet."
              hint="Group the client's deliverables into a project."
            />
          ) : (
            <Table>
              <THead>
                <Th>Project</Th>
                <Th className="text-right">Files</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <tbody>
                {client.projects.map((project) => (
                  <Tr key={project.id}>
                    <Td>
                      <Link
                        href={`/admin/clients/${client.id}/projects/${project.id}`}
                        className="text-fg underline-offset-4 hover:underline"
                      >
                        {project.name}
                      </Link>
                    </Td>
                    <Td className="text-right font-mono text-fg-muted">
                      {project._count.files}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-fg-muted">
                      {formatDate(project.createdAt)}
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <RenameProject
                          projectId={project.id}
                          currentName={project.name}
                        />
                        <ConfirmDelete
                          endpoint={`/api/admin/projects/${project.id}`}
                          heading="Delete project"
                          body="Removes this project and its files (the DB references only — NAS files are untouched)."
                          label="Delete"
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="slug">Download log · last 100</h2>
          {downloads.length === 0 ? (
            <EmptyState title="No downloads from this portal yet." />
          ) : (
            <Table>
              <THead>
                <Th>File</Th>
                <Th>When</Th>
                <Th>IP</Th>
                <Th>User agent</Th>
              </THead>
              <tbody>
                {downloads.map((event) => (
                  <Tr key={event.id}>
                    <Td className="text-fg">{event.file.name}</Td>
                    <Td className="whitespace-nowrap font-mono text-fg-muted">
                      {formatDateTime(event.downloadedAt)}
                    </Td>
                    <Td className="font-mono text-fg-muted">{event.ip}</Td>
                    <Td className="max-w-xs truncate text-fg-subtle">
                      {event.userAgent}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="slug">Danger zone</h2>
          <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-fg">Delete this client.</p>
              <p className="mt-1 text-sm text-fg-muted">
                Removes the portal, its projects, files, and download history.
                The files on the NAS are untouched.
              </p>
            </div>
            <ConfirmDelete
              endpoint={`/api/admin/clients/${client.id}`}
              heading="Delete client"
              body="This permanently removes the portal and all of its history."
              requireText={client.slug}
              label="Delete client"
              redirectTo="/admin/clients"
            />
          </Panel>
        </section>
      </div>
    </>
  );
}
