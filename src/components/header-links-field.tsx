"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { parseHeaderLinks, serializeHeaderLinks, type HeaderLinkItem, type HeaderLinkTarget } from "@/lib/header-links";

type HeaderLinkRow = HeaderLinkItem & {
  id: string;
};

function createRow(link?: Partial<HeaderLinkItem>, index = 0): HeaderLinkRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    label: link?.label || "",
    href: link?.href || "",
    target: link?.target || "_self",
  };
}

export function HeaderLinksField({ defaultValue }: { defaultValue?: string | null }) {
  const initialRows = useMemo(() => {
    const parsed = parseHeaderLinks(defaultValue);
    return parsed.length ? parsed.map((link, index) => createRow(link, index)) : [createRow()];
  }, [defaultValue]);
  const [rows, setRows] = useState<HeaderLinkRow[]>(initialRows);

  const serialized = serializeHeaderLinks(rows);

  function updateRow(id: string, updates: Partial<HeaderLinkItem>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => {
      const next = current.filter((row) => row.id !== id);
      return next.length ? next : [createRow()];
    });
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="headerLinks" value={serialized} />
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 rounded-md border border-black/10 bg-slate-50 p-3 lg:grid-cols-[1fr_1.4fr_180px_44px]">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Menu label
              <input
                value={row.label}
                onChange={(event) => updateRow(row.id, { label: event.target.value })}
                placeholder={index === 0 ? "About" : "Menu label"}
                className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-normal text-slate-950"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              URL
              <input
                value={row.href}
                onChange={(event) => updateRow(row.id, { href: event.target.value })}
                placeholder={index === 0 ? "/about or https://example.com" : "URL"}
                className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-normal text-slate-950"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Open behavior
              <select
                value={row.target}
                onChange={(event) => updateRow(row.id, { target: event.target.value as HeaderLinkTarget })}
                className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-normal text-slate-950"
              >
                <option value="_self">Same page</option>
                <option value="_blank">New tab</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="mt-auto flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 active:translate-y-0"
              aria-label="Remove header link"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((current) => [...current, createRow({}, current.length)])}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0"
      >
        <Plus size={16} />
        Add header link
      </button>
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <ExternalLink size={14} />
        Existing links without a behavior keep opening in the same page.
      </p>
    </div>
  );
}
