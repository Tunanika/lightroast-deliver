"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { Modal } from "./Modal";

export function ConfirmDelete({
  endpoint,
  heading,
  body,
  requireText,
  label = "Delete",
  redirectTo,
}: {
  endpoint: string;
  heading: string;
  body?: string;
  /** If set, the admin must type this exact value to enable deletion. */
  requireText?: string;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = !requireText || text === requireText;

  function close() {
    if (busy) return;
    setOpen(false);
    setText("");
    setError(null);
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch(endpoint, { method: "DELETE" });
    if (res.ok) {
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open ? (
        <Modal title={heading} onClose={close}>
          <div className="space-y-4">
            {body ? <p className="text-sm text-fg-muted">{body}</p> : null}
            {requireText ? (
              <div className="space-y-1.5">
                <p className="text-sm text-fg-muted">
                  Type{" "}
                  <span className="font-mono text-fg">{requireText}</span> to
                  confirm.
                </p>
                <Input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={requireText}
                />
              </div>
            ) : null}
            {error ? <p className="text-sm text-fg">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={!canConfirm || busy}
              >
                {busy ? "Deleting…" : label}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
