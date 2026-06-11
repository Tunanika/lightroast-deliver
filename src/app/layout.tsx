import type { Metadata } from "next";
import { Host_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

// Host Grotesk does everything; Geist Mono handles meta, IDs, sizes, slugs.
const host = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-host",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LightRoast Deliver",
  description: "Private file delivery for LightRoast.studio clients.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${host.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
