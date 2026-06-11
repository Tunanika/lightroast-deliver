import type { ReactNode } from "react";

export function PageHeader({
  slug,
  title,
  description,
  actions,
}: {
  slug?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border px-8 py-7">
      <div className="min-w-0">
        {slug ? <div className="slug mb-2">{slug}</div> : null}
        <h1 className="truncate text-2xl font-medium tracking-heading text-fg">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
