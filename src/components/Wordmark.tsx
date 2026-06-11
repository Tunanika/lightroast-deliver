// The wordmark IS the name set in Host Grotesk. No symbol.
export function Wordmark({
  slug = "DELIVER",
  className = "",
}: {
  slug?: string | null;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-medium tracking-heading text-fg">LightRoast</span>
      {slug ? <span className="slug">{slug}</span> : null}
    </span>
  );
}
