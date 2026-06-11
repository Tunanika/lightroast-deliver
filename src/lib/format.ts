// Display formatting — pure, usable in server + client components.

export function formatBytes(bytes: bigint | number): string {
  const n = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const value = n / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDateTime(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/** YYYY-MM-DD HH:MM:SS in UTC — stable form for CSV exports. */
export function formatIsoSeconds(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toISOString().replace("T", " ").slice(0, 19);
}
