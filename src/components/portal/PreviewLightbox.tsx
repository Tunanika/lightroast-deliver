"use client";

import { useEffect, useState } from "react";
import type { PreviewKind } from "@/lib/preview";

export interface PreviewFile {
  id: string;
  name: string;
  preview: PreviewKind | null;
  nativeImage: boolean;
}

export function PreviewLightbox({
  slug,
  file,
  onClose,
}: {
  slug: string;
  file: PreviewFile;
  onClose: () => void;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const portal = encodeURIComponent(slug);
  const inlineUrl = `/api/download/${file.id}?portal=${portal}&inline=1`;
  const thumbUrl = `/api/thumb/${file.id}?portal=${portal}`;
  const downloadUrl = `/api/download/${file.id}?portal=${portal}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/85 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={file.name}
    >
      <div className="flex items-center justify-between gap-4 text-white">
        <p className="min-w-0 truncate font-mono text-sm">{file.name}</p>
        <div className="flex shrink-0 items-center gap-4">
          <a
            href={downloadUrl}
            onClick={(e) => e.stopPropagation()}
            className="text-xs tracking-heading underline-offset-4 hover:underline"
          >
            Download
          </a>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
      <div
        className="mt-4 flex min-h-0 flex-1 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {broken ? (
          <p className="text-sm text-white/70">
            Preview unavailable — download the file instead.
          </p>
        ) : file.preview === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.nativeImage ? inlineUrl : thumbUrl}
            alt={file.name}
            onError={() => setBroken(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : file.preview === "video" ? (
          <video
            src={inlineUrl}
            controls
            preload="metadata"
            onError={() => setBroken(true)}
            className="max-h-full max-w-full"
          />
        ) : file.preview === "audio" ? (
          <audio
            src={inlineUrl}
            controls
            preload="metadata"
            onError={() => setBroken(true)}
            className="w-full max-w-xl"
          />
        ) : null}
      </div>
    </div>
  );
}
