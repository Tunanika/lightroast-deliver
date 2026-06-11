import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { Wordmark } from "@/components/Wordmark";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <Wordmark slug="DELIVER" className="text-lg" />
          <p className="mt-6 slug">(LR.s — Admin)</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-12 text-center slug">©2026 LightRoast.studio</p>
      </div>
    </main>
  );
}
