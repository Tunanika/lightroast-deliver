import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-border bg-bg">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-bg-soft text-left">
      <tr>{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th className={`slug px-4 py-3 font-normal ${className}`}>{children}</th>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 hover:bg-bg-soft ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className = "",
  title,
}: {
  children?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} title={title}>
      {children}
    </td>
  );
}
