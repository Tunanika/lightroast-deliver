import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/admin/PageHeader";
import { AddFileForm } from "@/components/admin/AddFileForm";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { EmptyState } from "@/components/ui";
import { Table, THead, Th, Tr, Td } from "@/components/admin/Table";
import { formatBytes } from "@/lib/format";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: { select: { name: true } },
      files: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { downloads: true } } },
      },
    },
  });
  if (!project || project.clientId !== id) notFound();

  return (
    <>
      <PageHeader
        slug="(LR.s — Project)"
        title={project.name}
        description={
          <Link
            href={`/admin/clients/${id}`}
            className="underline-offset-4 hover:text-fg hover:underline"
          >
            ← {project.client.name}
          </Link>
        }
        actions={
          <>
            <AddFileForm projectId={project.id} mountPath={env.nasMountPath} />
            <ConfirmDelete
              endpoint={`/api/admin/projects/${project.id}`}
              heading="Delete project"
              body="Removes this project and its files (DB references only — NAS files are untouched)."
              label="Delete project"
              redirectTo={`/admin/clients/${id}`}
            />
          </>
        }
      />

      <div className="p-8">
        {project.files.length === 0 ? (
          <EmptyState
            title="No files yet."
            hint="Add a file by entering its path on the NAS mount."
          />
        ) : (
          <Table>
            <THead>
              <Th>Name</Th>
              <Th className="text-right">Size</Th>
              <Th>Path</Th>
              <Th className="text-right">Downloads</Th>
              <Th className="text-right">Actions</Th>
            </THead>
            <tbody>
              {project.files.map((file) => (
                <Tr key={file.id}>
                  <Td className="text-fg">{file.name}</Td>
                  <Td className="whitespace-nowrap text-right font-mono text-fg-muted">
                    {formatBytes(file.size)}
                  </Td>
                  <Td
                    className="max-w-sm truncate font-mono text-xs text-fg-subtle"
                    title={file.path}
                  >
                    {file.path}
                  </Td>
                  <Td className="text-right font-mono text-fg-muted">
                    {file._count.downloads}
                  </Td>
                  <Td className="text-right">
                    <ConfirmDelete
                      endpoint={`/api/admin/files/${file.id}`}
                      heading="Remove file"
                      body="Removes this file from the portal (the NAS file is untouched)."
                      label="Remove"
                    />
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
