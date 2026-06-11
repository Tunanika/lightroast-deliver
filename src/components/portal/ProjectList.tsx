"use client";

import { useState } from "react";

interface FileItem {
  id: string;
  name: string;
  size: string;
}

interface ProjectItem {
  id: string;
  name: string;
  files: FileItem[];
}

export function ProjectList({
  slug,
  projects,
}: {
  slug: string;
  projects: ProjectItem[];
}) {
  const hasFiles = projects.some((p) => p.files.length > 0);
  if (projects.length === 0 || !hasFiles) {
    return (
      <div className="border border-dashed border-border px-6 py-16 text-center text-fg-muted">
        Files are on their way.
      </div>
    );
  }

  return (
    <div className="border-y border-border">
      {projects.map((project, i) => (
        <ProjectRow
          key={project.id}
          project={project}
          slug={slug}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}

function ProjectRow({
  project,
  slug,
  defaultOpen,
}: {
  project: ProjectItem;
  slug: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = project.files.length;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-lg tracking-heading text-fg">{project.name}</span>
        <span className="slug shrink-0">
          {count} {count === 1 ? "file" : "files"} · {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <ul className="animate-fade-up pb-3">
          {project.files.map((file) => (
            <FileRow key={file.id} file={file} slug={slug} />
          ))}
          {count === 0 ? (
            <li className="border-t border-border py-4 text-sm text-fg-muted">
              No files in this project yet.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

function FileRow({ file, slug }: { file: FileItem; slug: string }) {
  return (
    <li className="flex items-center justify-between gap-4 border-t border-border py-4">
      <div className="min-w-0">
        <p className="truncate text-fg">{file.name}</p>
        <p className="mt-0.5 font-mono text-xs text-fg-subtle">{file.size}</p>
      </div>
      <a
        href={`/api/download/${file.id}?portal=${encodeURIComponent(slug)}`}
        className="inline-flex h-9 shrink-0 items-center bg-accent px-4 text-sm font-medium tracking-heading text-accent-fg transition-opacity duration-200 hover:opacity-90"
      >
        Download
      </a>
    </li>
  );
}
