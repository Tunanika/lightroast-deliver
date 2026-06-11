"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Field } from "@/components/ui";
import { Modal } from "./Modal";

interface NasEntry {
  name: string;
  type: "dir" | "file";
  size?: string;
}
interface BrowseResult {
  baseDir: string;
  entries: NasEntry[];
  isFile: boolean;
  isDirectory: boolean;
  fileInfo?: { size: string; mimeType: string };
  truncated: boolean;
}

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
  const [done, setDone] = useState<string | null>(null);

  const [browse, setBrowse] = useState<BrowseResult | null>(null);
  const reqId = useRef(0);

  // Debounced live lookup of the typed path (suggestions + validity).
  useEffect(() => {
    if (!open || done) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/nas?path=${encodeURIComponent(filePath)}`,
        );
        if (id !== reqId.current) return; // superseded by a newer request
        if (res.ok) setBrowse(await res.json());
        else setBrowse(null);
      } catch {
        if (id === reqId.current) setBrowse(null);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [filePath, open, done]);

  function close() {
    if (busy) return;
    setOpen(false);
    setName("");
    setFilePath("");
    setBrowse(null);
    setError(null);
    setDone(null);
  }

  function pick(entry: NasEntry) {
    const base = browse?.baseDir ? `${browse.baseDir}/` : "";
    setFilePath(`${base}${entry.name}${entry.type === "dir" ? "/" : ""}`);
  }

  const isFolder = !!browse?.isDirectory;
  const canSubmit = !!(browse?.isFile || browse?.isDirectory);

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
      const data = await res.json().catch(() => ({}));
      const added = data.added ?? 0;
      const skipped = data.skipped ?? 0;
      router.refresh();
      setDone(
        added === 1 && !skipped
          ? "File added."
          : `Added ${added} file${added === 1 ? "" : "s"}` +
              (skipped ? ` · ${skipped} already present` : "") +
              ".",
      );
      setBusy(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not add.");
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Add files
      </Button>
      {open ? (
        <Modal title="Add files" onClose={close}>
          {done ? (
            <div className="space-y-5">
              <p className="text-fg">{done}</p>
              <div className="flex justify-end">
                <Button variant="primary" onClick={close}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field
                label="NAS path"
                hint={
                  <>
                    Type to browse <span className="font-mono">{mountPath}</span>
                    . Pick a file, or a folder to add everything inside it.
                  </>
                }
              >
                <Input
                  autoFocus
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="haven/export/"
                  className="font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>

              <PathStatus browse={browse} path={filePath} />

              {browse && browse.entries.length > 0 ? (
                <div className="max-h-56 overflow-auto border border-border bg-bg-soft">
                  {browse.entries.map((entry) => (
                    <button
                      type="button"
                      key={`${entry.type}:${entry.name}`}
                      onClick={() => pick(entry)}
                      className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left font-mono text-xs transition-colors last:border-b-0 hover:bg-bg"
                    >
                      <span className="truncate text-fg">
                        {entry.name}
                        {entry.type === "dir" ? "/" : ""}
                      </span>
                      <span className="shrink-0 text-fg-subtle">
                        {entry.type === "dir" ? "folder" : entry.size}
                      </span>
                    </button>
                  ))}
                  {browse.truncated ? (
                    <div className="px-3 py-2 text-xs text-fg-subtle">
                      More results · keep typing to narrow.
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!isFolder ? (
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
              ) : null}

              {error ? <p className="text-sm text-fg">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={close}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy || !canSubmit}
                >
                  {busy
                    ? isFolder
                      ? "Adding folder…"
                      : "Adding…"
                    : isFolder
                      ? "Add folder"
                      : "Add file"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      ) : null}
    </>
  );
}

function PathStatus({
  browse,
  path,
}: {
  browse: BrowseResult | null;
  path: string;
}) {
  if (!path.trim()) {
    return <p className="slug">Pick a file or folder from the list below.</p>;
  }
  if (browse?.isFile && browse.fileInfo) {
    return (
      <p className="text-sm text-fg">
        File{" "}
        <span className="text-fg-muted">
          · {browse.fileInfo.size} · {browse.fileInfo.mimeType}
        </span>
      </p>
    );
  }
  if (browse?.isDirectory) {
    return (
      <p className="text-sm text-fg">
        Folder{" "}
        <span className="text-fg-muted">
          · adds every file inside, recursively
        </span>
      </p>
    );
  }
  return <p className="text-sm text-fg-muted">No file or folder here yet.</p>;
}
