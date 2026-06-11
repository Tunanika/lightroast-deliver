"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function CopyButton({
  value,
  path,
  label = "Copy portal link",
}: {
  value?: string;
  /** When set, copies `${origin}${path}` — resolves the full portal URL client-side. */
  path?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = path ? `${window.location.origin}${path}` : value ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts (plain HTTP on a LAN).
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button variant="outline" onClick={copy}>
      {copied ? "Copied." : label}
    </Button>
  );
}
