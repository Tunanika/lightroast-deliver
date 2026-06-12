import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "LightRoast Deliver";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await prisma.client.findUnique({
    where: { slug },
    select: { name: true, accessEnabled: true },
  });
  const name = client && client.accessEnabled ? client.name : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#f5f5f0",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 44, fontWeight: 600 }}>LightRoast</div>
          <div style={{ fontSize: 28, letterSpacing: 6, opacity: 0.65 }}>
            DELIVER
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 24, letterSpacing: 4, opacity: 0.55 }}>
            {name ? "(LR.S — DELIVERY)" : "(LR.S)"}
          </div>
          <div
            style={{
              fontSize: name && name.length > 22 ? 64 : 88,
              fontWeight: 600,
              lineHeight: 1.05,
            }}
          >
            {name ?? "Private file delivery"}
          </div>
          <div style={{ fontSize: 28, opacity: 0.65 }}>
            {name ? "Your files, ready to download." : ""}
          </div>
        </div>
        <div style={{ fontSize: 22, letterSpacing: 3, opacity: 0.45 }}>
          ©2026 LIGHTROAST.STUDIO
        </div>
      </div>
    ),
    size,
  );
}
