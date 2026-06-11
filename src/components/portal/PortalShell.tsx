"use client";

import { useState } from "react";
import { Wordmark } from "@/components/Wordmark";

type Surface = "ink" | "paper";

export function PortalShell({
  initialSurface,
  children,
}: {
  initialSurface: Surface;
  children: React.ReactNode;
}) {
  const [surface, setSurface] = useState<Surface>(initialSurface);

  function choose(next: Surface) {
    setSurface(next);
    document.cookie = `portal-surface=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div
      data-surface={surface}
      className="flex min-h-screen flex-col bg-bg text-fg transition-colors duration-300"
    >
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark slug="DELIVER" />
        <div
          className="inline-flex border border-border"
          role="group"
          aria-label="Surface"
        >
          {(["ink", "paper"] as Surface[]).map((s) => (
            <button
              key={s}
              onClick={() => choose(s)}
              aria-pressed={surface === s}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-meta transition-colors ${
                surface === s
                  ? "bg-fg text-bg"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-10">
        {children}
      </main>

      <footer className="px-6 py-8 sm:px-10">
        <span className="slug">©2026 LightRoast.studio</span>
      </footer>
    </div>
  );
}
