"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";

export function LogsFilter({
  clients,
  initial,
}: {
  clients: { id: string; name: string }[];
  initial: { clientId: string; from: string; to: string };
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initial.clientId);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function query() {
    const p = new URLSearchParams();
    if (clientId) p.set("clientId", clientId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const q = query();
    router.push(`/admin/logs${q ? `?${q}` : ""}`);
  }

  const q = query();
  const exportHref = `/api/admin/logs/export${q ? `?${q}` : ""}`;
  const hasFilters = !!(clientId || from || to);

  return (
    <form onSubmit={apply} className="flex flex-wrap items-end gap-3">
      <label className="space-y-1.5">
        <span className="slug block">Client</span>
        <Select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-56"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
      <a href={exportHref}>
        <Button type="button" variant="primary">
          Export CSV
        </Button>
      </a>
      {hasFilters ? (
        <a href="/admin/logs">
          <Button type="button" variant="ghost">
            Clear
          </Button>
        </a>
      ) : null}
    </form>
  );
}
