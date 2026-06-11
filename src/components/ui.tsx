// Presentational primitives — no hooks, safe in server + client components.
// Monochrome, flat, sharp-cornered. One accent (Slate) for primary actions.
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const buttonBase =
  "inline-flex items-center justify-center h-9 px-4 text-sm font-medium tracking-heading transition-opacity duration-200 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const buttonVariants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  outline: "border border-border-strong text-fg hover:bg-bg-soft",
  ghost: "text-fg-muted hover:text-fg",
  danger:
    "border border-border-strong text-fg-muted hover:text-fg hover:border-fg",
};

export function Button({
  variant = "outline",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 w-full rounded-sm border border-border bg-bg-soft px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-9 w-full rounded-sm border border-border bg-bg-soft px-3 text-sm text-fg outline-none transition-colors focus:border-accent ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="slug block">{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs text-fg-subtle">{hint}</span>
      ) : null}
    </label>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="slug">{children}</span>;
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-bg ${className}`}>{children}</div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border border-border bg-bg p-6">
      <div className="slug">{label}</div>
      <div className="mt-3 font-mono text-4xl font-medium tracking-heading text-fg">
        {value}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border bg-bg px-6 py-16 text-center">
      <p className="text-fg">{title}</p>
      {hint ? <p className="mt-2 text-sm text-fg-muted">{hint}</p> : null}
    </div>
  );
}
