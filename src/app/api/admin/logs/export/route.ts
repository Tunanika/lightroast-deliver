import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { buildLogWhere } from "@/lib/logs";
import { formatIsoSeconds } from "@/lib/format";

export const runtime = "nodejs";

function csvCell(value: string): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const where = buildLogWhere({
    clientId: searchParams.get("clientId"),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });

  const events = await prisma.downloadEvent.findMany({
    where,
    orderBy: { downloadedAt: "desc" },
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
  });

  const header = [
    "Timestamp (UTC)",
    "File",
    "Project",
    "Client",
    "Portal",
    "IP",
    "User Agent",
  ];

  const rows = events.map((e) =>
    [
      formatIsoSeconds(e.downloadedAt),
      e.file.name,
      e.file.project.name,
      e.file.project.client.name,
      e.clientSlug,
      e.ip,
      e.userAgent,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lightroast-downloads-${stamp}.csv"`,
    },
  });
}
