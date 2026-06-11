"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field } from "@/components/ui";
import { Modal } from "./Modal";

export function AddFileForm({
  projectId,
  mountPath,
}: {
  projectId: string;
  mountPath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/projects/${projectId}/files`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || undefined, path: filePath }),
    });
    if (res.ok) {
      setOpen(false);
      setName("");
      setFilePath("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not add file.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Add file
      </Button>
      {open ? (
        <Modal
          title="Add file"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <form onSubmit={submit} className="space-y-4">
            <Field
              label="NAS path"
              hint={
                <>
                  Absolute (
                  <span className="font-mono">{mountPath}/…</span>) or relative
                  to the mount. The path is validated before saving.
                </>
              }
            >
              <Input
                autoFocus
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder={`${mountPath}/haven/export/haven_v3.mp4`}
                className="font-mono"
              />
            </Field>
            <Field
              label="Display name"
              hint="Optional. Defaults to the file name on disk."
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Haven — Final Cut v3.mp4"
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
                {busy ? "Validating…" : "Add file"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
