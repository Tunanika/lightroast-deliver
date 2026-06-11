import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth — middleware already gates, but never render admin
  // chrome without a valid session.
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div
      data-surface="ink"
      className="flex min-h-screen bg-bg text-fg"
    >
      <Sidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
