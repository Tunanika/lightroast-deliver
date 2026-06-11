"use client";

import { useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-black/70"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md animate-fade-up border border-border bg-bg p-6">
        {title ? (
          <h3 className="mb-5 text-lg font-medium tracking-heading text-fg">
            {title}
          </h3>
        ) : null}
        {children}
      </div>
    </div>
  );
}
