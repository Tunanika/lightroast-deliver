"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/logs", label: "Logs" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-bg">
      <div className="border-b border-border px-6 py-6">
        <Link href="/admin" className="outline-none">
          <Wordmark slug="DELIVER" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block border-l-2 py-2 pl-3 text-sm tracking-heading transition-colors ${
                active
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              {item.label},
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <button
          onClick={logout}
          className="py-2 pl-3 text-sm tracking-heading text-fg-muted transition-colors hover:text-fg"
        >
          Sign out,
        </button>
      </div>
    </aside>
  );
}
