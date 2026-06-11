import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const NAS = process.env.NAS_MOUNT_PATH || "/tmp/lr-nas-test";

/**
 * Writes a sample media file under the NAS mount so the portal + download
 * flow has something real (and large enough to exercise Range requests) to
 * stream during local verification.
 */
function ensureSampleFile(relPath: string, sizeBytes: number): string {
  const abs = path.join(NAS, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!fs.existsSync(abs) || fs.statSync(abs).size !== sizeBytes) {
    const chunk = Buffer.alloc(64 * 1024, 0x4c); // 'L'
    const fd = fs.openSync(abs, "w");
    let written = 0;
    while (written < sizeBytes) {
      const n = Math.min(chunk.length, sizeBytes - written);
      fs.writeSync(fd, chunk, 0, n);
      written += n;
    }
    fs.closeSync(fd);
  }
  return abs;
}

async function main() {
  console.log(`Seeding demo data (NAS mount: ${NAS})...`);

  // Idempotent: clear the demo clients first (cascades to projects/files/events)
  // so re-running the seed always yields the same clean state.
  await prisma.client.deleteMany({
    where: { slug: { in: ["haven-documentary", "acme-brand"] } },
  });

  // Two sample files (~2 MB each) under the mount.
  const havenPath = ensureSampleFile("haven/export/haven_v3.mp4", 2 * 1024 * 1024);
  const acmePath = ensureSampleFile("acme/brand_film_v2.mp4", 2 * 1024 * 1024);

  // Open portal — no password.
  const haven = await prisma.client.upsert({
    where: { slug: "haven-documentary" },
    update: {},
    create: { name: "Haven Documentary", slug: "haven-documentary" },
  });

  // Password-protected portal — password "preview123".
  const acme = await prisma.client.upsert({
    where: { slug: "acme-brand" },
    update: {},
    create: {
      name: "Acme Brand",
      slug: "acme-brand",
      password: await bcrypt.hash("preview123", 10),
    },
  });

  const havenProject = await prisma.project.create({
    data: { name: "Final Delivery", clientId: haven.id },
  });

  const acmeProject = await prisma.project.create({
    data: { name: "Brand Film 2026", clientId: acme.id },
  });

  await prisma.file.create({
    data: {
      name: "Haven — Final Cut v3.mp4",
      path: havenPath,
      size: BigInt(fs.statSync(havenPath).size),
      mimeType: "video/mp4",
      projectId: havenProject.id,
    },
  });

  await prisma.file.create({
    data: {
      name: "Acme — Brand Film v2.mp4",
      path: acmePath,
      size: BigInt(fs.statSync(acmePath).size),
      mimeType: "video/mp4",
      projectId: acmeProject.id,
    },
  });

  console.log("Seed complete.");
  console.log("  Open portal:      /c/haven-documentary");
  console.log("  Locked portal:    /c/acme-brand  (password: preview123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
