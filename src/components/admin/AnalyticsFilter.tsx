"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";

export function AnalyticsFilter({
  clients,
  initial,
}: {
  clients: { slug: string; name: string }[];
  initial: { clientSlug: string; device: string; from: string; to: string };
}) {
  const router = useRouter();
  const [clientSlug, setClientSlug] = useState(initial.clientSlug);
  const [device, setDevice] = useState(initial.device);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (clientSlug) p.set("clientSlug", clientSlug);
    if (device) p.set("device", device);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const q = p.toString();
    router.push(`/admin/analytics${q ? `?${q}` : ""}`);
  }

  const hasFilters = !!(clientSlug || device || from || to);

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <label className="space-y-1.5">
        <span className="slug block">Portal</span>
        <Select
          value={clientSlug}
          onChange={(e) => setClientSlug(e.target.value)}
          className="w-56"
        >
          <option value="">All portals</option>
          {clients.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1.5">
        <span className="slug block">Device</span>
        <Select
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="w-40"
        >
          <option value="">All devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </Select>
      </label>
      <label className="space-y-1.5">
        <span className="slug block">From</span>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-44"
        />
      </label>
      <label className="space-y-1.5">
        <span className="slug block">To</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-44"
        />
      </label>
      <Button type="submit" variant="outline">
        Apply
      </Button>
      {hasFilters ? (
        <a href="/admin/analytics">
          <Button type="button" variant="ghost">
            Clear
          </Button>
        </a>
      ) : null}
    </form>
  );
}
