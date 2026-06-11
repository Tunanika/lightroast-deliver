"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field } from "@/components/ui";
import { slugify } from "@/lib/slug";

export function EditClientForm({
  client,
}: {
  client: {
    id: string;
    name: string;
    slug: string;
    hasPassword: boolean;
    accessEnabled: boolean;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [password, setPassword] = useState("");
  const [accessEnabled, setAccessEnabled] = useState(client.accessEnabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleAccess() {
    const next = !accessEnabled;
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessEnabled: next }),
    });
    if (res.ok) {
      setAccessEnabled(next);
      setMessage(next ? "Access enabled." : "Access disabled.");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save.");
    }
    setBusy(false);
  }

  async function patch(payload: Record<string, unknown>, okMessage: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage(okMessage);
      setPassword("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save.");
    }
    setBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = { name, slug };
    if (password) payload.password = password;
    await patch(payload, "Saved.");
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label="Slug"
          hint={<span className="font-mono">/c/{slug || "your-slug"}</span>}
        >
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </Field>
      </div>

      <Field
        label="Password"
        hint={
          client.hasPassword
            ? "This portal is protected. Type a new password to change it."
            : "This portal is open. Type a password to protect it."
        }
      >
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={client.hasPassword ? "Leave blank to keep" : "••••••••"}
        />
      </Field>

      {error ? <p className="text-sm text-fg">{error}</p> : null}
      {message ? <p className="text-sm text-fg-muted">{message}</p> : null}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        {client.hasPassword ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => patch({ password: null }, "Password removed.")}
          >
            Remove password
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-fg">
            Portal access ·{" "}
            <span className={accessEnabled ? "text-fg-muted" : "text-fg"}>
              {accessEnabled ? "Enabled" : "Disabled"}
            </span>
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {accessEnabled
              ? "The client can open the portal and download files."
              : "The portal is unavailable — no viewing or downloading."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={toggleAccess}
        >
          {accessEnabled ? "Disable access" : "Enable access"}
        </Button>
      </div>
    </form>
  );
}
