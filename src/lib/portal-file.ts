// Shared access gate for portal file endpoints (download, thumbnail).
import { prisma } from "@/lib/prisma";
import { isPortalUnlocked } from "@/lib/portal-session";
import type { Client, File, Project } from "@prisma/client";

export type PortalFileResult =
  | { ok: true; file: File & { project: Project & { client: Client } } }
  | { ok: false; response: Response };

/**
 * Loads a file and enforces every portal access rule: the file must belong to
 * the requesting portal's client, the portal must be enabled, and locked
 * portals need a valid unlock session.
 */
export async function loadPortalFile(
  fileId: string,
  portal: string | null,
): Promise<PortalFileResult> {
  if (!portal) {
    return { ok: false, response: new Response("Missing portal.", { status: 400 }) };
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { project: { include: { client: true } } },
  });
  if (!file) {
    return { ok: false, response: new Response("Not found.", { status: 404 }) };
  }

  const client = file.project.client;

  if (client.slug !== portal) {
    return { ok: false, response: new Response("Not found.", { status: 404 }) };
  }
  if (!client.accessEnabled) {
    return {
      ok: false,
      response: new Response("This portal is unavailable.", { status: 403 }),
    };
  }
  if (client.password && !(await isPortalUnlocked(client.slug, client.password))) {
    return {
      ok: false,
      response: new Response("This portal is locked.", { status: 403 }),
    };
  }

  return { ok: true, file };
}
