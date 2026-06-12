"use client";

import { useState } from "react";
import { PreviewLightbox, type PreviewFile } from "./PreviewLightbox";

interface FileItem extends PreviewFile {
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
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

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
          onPreview={setPreviewFile}
        />
      ))}
      {previewFile ? (
        <PreviewLightbox
          slug={slug}
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      ) : null}
    </div>
  );
}

function ProjectRow({
  project,
  slug,
  defaultOpen,
  onPreview,
}: {
  project: ProjectItem;
  slug: string;
  defaultOpen: boolean;
  onPreview: (file: FileItem) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = project.files.length;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-4 py-5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
          aria-expanded={open}
        >
          <span className="truncate text-lg tracking-heading text-fg">
            {project.name}
          </span>
          <span className="slug shrink-0">
            {count} {count === 1 ? "file" : "files"} · {open ? "−" : "+"}
          </span>
        </button>
        {count > 0 ? (
          <a
            href={`/api/download/project/${project.id}?portal=${encodeURIComponent(slug)}`}
            className="inline-flex h-8 shrink-0 items-center border border-border-strong px-3 text-xs tracking-heading text-fg transition-colors hover:bg-bg-soft"
          >
            Download all
          </a>
        ) : null}
      </div>
      {open ? (
        <ul className="animate-fade-up pb-3">
          {project.files.map((file) => (
            <FileRow key={file.id} file={file} slug={slug} onPreview={onPreview} />
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

function FileRow({
  file,
  slug,
  onPreview,
}: {
  file: FileItem;
  slug: string;
  onPreview: (file: FileItem) => void;
}) {
  const [thumbBroken, setThumbBroken] = useState(false);
  const portal = encodeURIComponent(slug);

  return (
    <li className="flex items-center justify-between gap-4 border-t border-border py-4">
      <div className="flex min-w-0 items-center gap-4">
        {file.preview === "image" && !thumbBroken ? (
          <button
            onClick={() => onPreview(file)}
            aria-label={`Preview ${file.name}`}
            className="shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/thumb/${file.id}?portal=${portal}`}
              alt=""
              loading="lazy"
              onError={() => setThumbBroken(true)}
              className="h-12 w-12 border border-border object-cover"
            />
          </button>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-fg">{file.name}</p>
          <p className="mt-0.5 font-mono text-xs text-fg-subtle">{file.size}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {file.preview === "pdf" ? (
          <a
            href={`/api/download/${file.id}?portal=${portal}&inline=1`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center border border-border-strong px-3 text-sm tracking-heading text-fg transition-colors hover:bg-bg-soft"
          >
            View
          </a>
        ) : file.preview && !(file.preview === "image" && thumbBroken) ? (
          <button
            onClick={() => onPreview(file)}
            className="inline-flex h-9 items-center border border-border-strong px-3 text-sm tracking-heading text-fg transition-colors hover:bg-bg-soft"
          >
            Preview
          </button>
        ) : null}
        <a
          href={`/api/download/${file.id}?portal=${portal}`}
          className="inline-flex h-9 items-center bg-accent px-4 text-sm font-medium tracking-heading text-accent-fg transition-opacity duration-200 hover:opacity-90"
        >
          Download
        </a>
      </div>
    </li>
  );
}
