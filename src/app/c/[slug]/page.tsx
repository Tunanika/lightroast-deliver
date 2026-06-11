import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPortalUnlocked } from "@/lib/portal-session";
import { formatBytes } from "@/lib/format";
import { PortalShell } from "@/components/portal/PortalShell";
import { PasswordGate } from "@/components/portal/PasswordGate";
import { ProjectList } from "@/components/portal/ProjectList";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const client = await prisma.client.findUnique({
    where: { slug },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: { files: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!client) notFound();

  const store = await cookies();
  const surface =
    store.get("portal-surface")?.value === "paper" ? "paper" : "ink";

  const locked = !!client.password && !(await isPortalUnlocked(slug));
  if (locked) {
    return (
      <PortalShell initialSurface={surface}>
        <PasswordGate slug={slug} clientName={client.name} />
      </PortalShell>
    );
  }

  // Pre-format sizes so the client component receives plain serializable data
  // (BigInt cannot cross the server/client boundary).
  const projects = client.projects.map((p) => ({
    id: p.id,
    name: p.name,
    files: p.files.map((f) => ({
      id: f.id,
      name: f.name,
      size: formatBytes(f.size),
    })),
  }));

  return (
    <PortalShell initialSurface={surface}>
      <header className="mb-12">
        <span className="slug">(LR.s — Delivery)</span>
        <h1 className="mt-5 text-4xl font-medium tracking-display text-fg sm:text-5xl">
          {client.name}
        </h1>
        <p className="mt-4 text-fg-muted">
          Your files, ready to download. Select a project to expand it.
        </p>
      </header>
      <ProjectList slug={slug} projects={projects} />
    </PortalShell>
  );
}
