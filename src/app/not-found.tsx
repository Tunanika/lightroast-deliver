export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center text-fg">
      <span className="slug">(LR.s — 404)</span>
      <h1 className="text-3xl font-medium tracking-heading">Not found.</h1>
      <p className="text-fg-muted">This page does not exist.</p>
      <p className="mt-8 slug">©2026 LightRoast.studio</p>
    </main>
  );
}
