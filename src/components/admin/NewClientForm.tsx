"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field } from "@/components/ui";
import { Modal } from "./Modal";
import { slugify } from "@/lib/slug";

export function NewClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setSlug("");
    setSlugDirty(false);
    setPassword("");
    setError(null);
  }

  function onName(value: string) {
    setName(value);
    if (!slugDirty) setSlug(slugify(value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, password: password || undefined }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setOpen(false);
      reset();
      router.push(`/admin/clients/${id}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create client.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        New client
      </Button>
      {open ? (
        <Modal
          title="New client"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={submit} className="space-y-4">
            <Field label="Name">
              <Input
                autoFocus
                value={name}
                onChange={(e) => onName(e.target.value)}
                placeholder="Haven Documentary"
              />
            </Field>
            <Field
              label="Slug"
              hint={
                <span className="font-mono">
                  /c/{slug || "your-slug"}
                </span>
              }
            >
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugDirty(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="haven-documentary"
              />
            </Field>
            <Field
              label="Password"
              hint="Optional. Leave blank for an open portal."
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error ? <p className="text-sm text-fg">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Creating…" : "Create client"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
