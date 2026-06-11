"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export function PasswordGate({
  slug,
  clientName,
}: {
  slug: string;
  clientName: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/portal/${slug}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Incorrect password.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <span className="slug">(LR.s — Private)</span>
      <h1 className="mt-6 text-3xl font-medium tracking-display">
        {clientName}
      </h1>
      <p className="mt-3 text-fg-muted">
        This delivery is private. Enter the password to continue.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-3 text-left">
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {error ? <p className="text-sm text-fg">{error}</p> : null}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Unlocking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
