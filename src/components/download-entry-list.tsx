"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, FileText, Folder, Search } from "lucide-react";

export type DownloadListEntry = {
  name: string;
  type: "dir" | "file";
  size?: number | null;
  path: string;
  thumb?: string;
  thumbSource?: "folder" | "cover";
};

type DownloadEntryListProps = {
  entries: DownloadListEntry[];
  initialPage: number;
  initialPerPage: number;
  hasCoverMapping?: boolean;
  slug: string;
};

const pageSizeOptions = [25, 50, 75, 100];

function formatBytes(size?: number | null) {
  if (size == null) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(size);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function downloadHref(slug: string, input: { path?: string; page?: number; perPage?: number }) {
  const params = new URLSearchParams();
  if (input.path) params.set("path", input.path);
  if (input.perPage && input.perPage !== pageSizeOptions[0]) params.set("perPage", String(input.perPage));
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return `/downloads/${slug}${query ? `?${query}` : ""}`;
}

function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

export function DownloadEntryList({ entries, initialPage, initialPerPage, hasCoverMapping = false, slug }: DownloadEntryListProps) {
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(pageSizeOptions.includes(initialPerPage) ? initialPerPage : pageSizeOptions[0]);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredEntries = normalizedSearch
    ? entries.filter((entry) => `${entry.name} ${entry.path} ${entry.type}`.toLowerCase().includes(normalizedSearch))
    : entries;
  const totalItems = filteredEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(page, totalPages);
  const visiblePages = paginationPages(safePage, totalPages);
  const paginatedEntries = filteredEntries.slice((safePage - 1) * perPage, safePage * perPage);
  const firstItem = totalItems ? (safePage - 1) * perPage + 1 : 0;
  const lastItem = Math.min(safePage * perPage, totalItems);

  return (
    <>
      <div className="mt-5 grid gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="grid gap-1.5 font-semibold text-slate-700">
          <span>Search downloads</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Type to filter this list"
              className="h-11 w-full rounded-md border border-black/10 bg-white pl-10 pr-3 font-normal text-slate-900"
            />
          </span>
        </label>
        <label className="flex flex-wrap items-center gap-2 font-semibold text-slate-700 lg:justify-end">
          <span>Items per page</span>
          <select
            value={perPage}
            onChange={(event) => {
              setPerPage(Number(event.target.value));
              setPage(1);
            }}
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <span className="text-slate-600 lg:col-span-2">
          Showing {firstItem}-{lastItem} of {totalItems} items
          {search ? <span className="text-slate-400"> filtered from {entries.length}</span> : null}
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-black/10 bg-white">
        {paginatedEntries.map((entry) => {
          const imageSizeClass = hasCoverMapping && entry.type === "dir" ? "h-28 w-28" : "h-16 w-16";
          const iconSize = hasCoverMapping && entry.type === "dir" ? 58 : 28;
          const thumbParams = new URLSearchParams({ path: entry.thumb || "" });
          if (entry.thumbSource === "cover") thumbParams.set("source", "cover");
          return (
            <div key={entry.path} className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 md:grid-cols-[1fr_120px_140px] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                {entry.type === "dir" ? (
                  entry.thumb ? (
                    <img src={`/api/downloads/${slug}/thumb?${thumbParams.toString()}`} alt="" width={112} height={112} className={`${imageSizeClass} shrink-0 rounded-md border border-black/10 object-cover`} />
                  ) : (
                    <Folder className="shrink-0 text-[#0f766e]" size={iconSize} />
                  )
                ) : (
                  <FileText className="shrink-0 text-slate-500" size={26} />
                )}
                <span className="truncate font-medium">{entry.name}{entry.type === "dir" ? "/" : ""}</span>
              </div>
              <span className="text-sm text-slate-500">{entry.type === "file" ? formatBytes(entry.size) : ""}</span>
              {entry.type === "dir" ? (
                <Link href={downloadHref(slug, { path: entry.path, perPage })} className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-slate-50">
                  Open
                </Link>
              ) : (
                <a href={`/api/downloads/${slug}/file?path=${encodeURIComponent(entry.path)}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#115e59]">
                  <Download size={16} />
                  Download
                </a>
              )}
            </div>
          );
        })}
        {entries.length === 0 ? <p className="p-6 text-slate-600">This folder is empty.</p> : null}
        {entries.length > 0 && filteredEntries.length === 0 ? <p className="p-6 text-slate-600">No downloads match your search.</p> : null}
      </div>

      {totalItems > perPage ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm">
          <span className="text-slate-500">Page {safePage} of {totalPages}</span>
          <div className="flex flex-wrap gap-2">
            {safePage > 1 ? (
              <button type="button" onClick={() => setPage(safePage - 1)} className="inline-flex h-10 items-center rounded-md border border-black/10 px-4 font-semibold transition hover:bg-slate-50 active:translate-y-px">
                Previous
              </button>
            ) : null}
            {visiblePages.map((pageNumber, index) => {
              const previous = visiblePages[index - 1];
              const showGap = previous && pageNumber - previous > 1;
              return (
                <span key={pageNumber} className="flex items-center gap-2">
                  {showGap ? <span className="px-1 text-slate-400">...</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 font-semibold transition active:translate-y-px ${
                      pageNumber === safePage ? "bg-[#17201c] text-white" : "border border-black/10 hover:bg-slate-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                </span>
              );
            })}
            {safePage < totalPages ? (
              <button type="button" onClick={() => setPage(safePage + 1)} className="inline-flex h-10 items-center rounded-md bg-[#17201c] px-4 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                Next
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
