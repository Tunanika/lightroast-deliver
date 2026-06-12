import type { Metadata } from "next";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { isPortalUnlocked } from "@/lib/portal-session";
import { logPageView } from "@/lib/analytics";
import { formatBytes } from "@/lib/format";
import { previewKind, isNativeImage } from "@/lib/preview";
import { PortalShell } from "@/components/portal/PortalShell";
import { PasswordGate } from "@/components/portal/PasswordGate";
import { ProjectList } from "@/components/portal/ProjectList";

export const dynamic = "force-dynamic";

// One DB hit per request: generateMetadata and the page body share this via
// React's request-scoped cache.
const loadPortalClient = cache((slug: string) =>
  prisma.client.findUnique({
    where: { slug },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: { files: { orderBy: { createdAt: "asc" } } },
      },
    },
  }),
);

/**
 * Absolute base for Open Graph URLs. Prefers PUBLIC_PORTAL_URL; otherwise
 * derives it from the request host so link previews still resolve their image
 * when the env var isn't set.
 */
async function publicBase(): Promise<URL | undefined> {
  if (env.publicPortalUrl) return new URL(env.publicPortalUrl);
  const h = await headers();
  const host = h.get("host");
  if (!host) return undefined;
  const proto = h.get("x-forwarded-proto") ?? "https";
  try {
    return new URL(`${proto}://${host}`);
  } catch {
    return undefined;
  }
}

// Link previews (WhatsApp, Instagram, iMessage…) show the client's name
// instead of an empty card. File names are never exposed here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await loadPortalClient(slug);
  const base = await publicBase();

  const title =
    client && client.accessEnabled
      ? `${client.name} — LightRoast Deliver`
      : "LightRoast Deliver";
  const description =
    client && client.accessEnabled
      ? `Delivery for ${client.name}. Your files, ready to download.`
      : "Private file delivery.";

  return {
    title,
    description,
    ...(base ? { metadataBase: base } : {}),
    openGraph: {
      title,
      description,
      siteName: "LightRoast Deliver",
      type: "website",
      url: `/c/${slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const client = await loadPortalClient(slug);
  if (!client) notFound();

  const store = await cookies();
  const surface =
    store.get("portal-surface")?.value === "paper" ? "paper" : "ink";

  // Disabled portals show an unavailable notice instead of any files.
  if (!client.accessEnabled) {
    return (
      <PortalShell initialSurface={surface}>
        <div className="mx-auto max-w-sm py-12 text-center">
          <span className="slug">(LR.s — Unavailable)</span>
          <h1 className="mt-6 text-3xl font-medium tracking-display">
            {client.name}
          </h1>
          <p className="mt-3 text-fg-muted">
            This delivery is currently unavailable. Please contact us if you
            need access.
          </p>
        </div>
      </PortalShell>
    );
  }

  const locked =
    !!client.password && !(await isPortalUnlocked(slug, client.password));
  if (locked) {
    return (
      <PortalShell initialSurface={surface}>
        <PasswordGate slug={slug} clientName={client.name} />
      </PortalShell>
    );
  }

  // Log the view only once the visitor reaches the actual delivery — past the
  // disabled and locked gates — so a single human visit is one page view.
  await logPageView(client.slug, await headers());

  // Pre-format sizes so the client component receives plain serializable data
  // (BigInt cannot cross the server/client boundary).
  const projects = client.projects.map((p) => ({
    id: p.id,
    name: p.name,
    files: p.files.map((f) => ({
      id: f.id,
      name: f.name,
      size: formatBytes(f.size),
      preview: previewKind(f.mimeType),
      nativeImage: isNativeImage(f.mimeType),
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
