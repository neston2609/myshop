import Image from "next/image";
import Link from "next/link";
import { Download, Folder, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { formatBytes, listDownloadEntries, type DownloadEntry } from "@/lib/download-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DownloadCategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ path?: string; page?: string; perPage?: string }>;
};

const pageSizeOptions = [25, 50, 75, 100];

function parentPath(value: string) {
  const segments = value.split("/").filter(Boolean);
  segments.pop();
  return segments.join("/");
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

export default async function DownloadCategoryPage({ params, searchParams }: DownloadCategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const currentPath = (query.path || "").replace(/^\/+|\/+$/g, "");
  const requestedPerPage = Number(query.perPage || pageSizeOptions[0]);
  const perPage = pageSizeOptions.includes(requestedPerPage) ? requestedPerPage : pageSizeOptions[0];
  const requestedPage = Number(query.page || "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const category = await prisma.downloadCategory.findUnique({
    where: { slug },
    include: { source: true },
  });

  if (!category || !category.enabled) {
    return (
      <>
        <SiteHeader />
        <main className="container-shell py-10">
          <p className="rounded-lg border border-black/10 bg-white p-6 text-slate-600">Download category not found.</p>
        </main>
      </>
    );
  }

  let entries: DownloadEntry[] = [];
  let error = "";
  try {
    entries = await listDownloadEntries(category, currentPath);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load downloads.";
  }

  const segments = currentPath.split("/").filter(Boolean);
  const totalItems = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const visiblePages = paginationPages(safePage, totalPages);
  const paginatedEntries = entries.slice((safePage - 1) * perPage, safePage * perPage);
  const firstItem = totalItems ? (safePage - 1) * perPage + 1 : 0;
  const lastItem = Math.min(safePage * perPage, totalItems);

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link href="/downloads" className="text-sm font-semibold text-[#0f766e]">Downloads</Link>
            <h1 className="mt-1 text-3xl font-semibold">{category.name}</h1>
            {category.description ? <p className="mt-2 text-slate-600">{category.description}</p> : null}
          </div>
          {currentPath ? (
            <Link href={downloadHref(slug, { path: parentPath(currentPath), perPage })} className="h-10 rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold">
              Up folder
            </Link>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link href={downloadHref(slug, { perPage })} className={`rounded-md px-3 py-1.5 ${currentPath ? "bg-white" : "bg-[#17201c] text-white"}`}>{category.name}</Link>
          {segments.map((segment, index) => {
            const target = segments.slice(0, index + 1).join("/");
            return (
              <Link key={target} href={downloadHref(slug, { path: target, perPage })} className={`rounded-md px-3 py-1.5 ${index === segments.length - 1 ? "bg-[#17201c] text-white" : "bg-white"}`}>
                {segment}
              </Link>
            );
          })}
        </div>

        {error ? <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {!error ? (
          <form className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm">
            {currentPath ? <input type="hidden" name="path" value={currentPath} /> : null}
            <span className="text-slate-600">
              Showing {firstItem}-{lastItem} of {totalItems} items
            </span>
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <span>Items per page</span>
              <select name="perPage" defaultValue={perPage} className="h-10 rounded-md border border-black/10 bg-white px-3">
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <button className="h-10 rounded-md bg-[#17201c] px-4 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                Apply
              </button>
            </label>
          </form>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-lg border border-black/10 bg-white">
          {paginatedEntries.map((entry) => (
            <div key={entry.path} className="grid gap-3 border-b border-black/10 p-4 last:border-b-0 md:grid-cols-[1fr_120px_140px] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                {entry.type === "dir" ? (
                  entry.thumb ? (
                    <Image src={`/api/downloads/${slug}/thumb?path=${encodeURIComponent(entry.thumb)}`} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-md border border-black/10 object-cover" />
                  ) : (
                    <Folder className="shrink-0 text-[#0f766e]" size={28} />
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
          ))}
          {!error && entries.length === 0 ? <p className="p-6 text-slate-600">This folder is empty.</p> : null}
        </div>

        {!error && totalItems > perPage ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm">
            <span className="text-slate-500">Page {safePage} of {totalPages}</span>
            <div className="flex flex-wrap gap-2">
              {safePage > 1 ? (
                <Link href={downloadHref(slug, { path: currentPath, perPage, page: safePage - 1 })} className="inline-flex h-10 items-center rounded-md border border-black/10 px-4 font-semibold transition hover:bg-slate-50 active:translate-y-px">
                  Previous
                </Link>
              ) : null}
              {visiblePages.map((page, index) => {
                const previous = visiblePages[index - 1];
                const showGap = previous && page - previous > 1;
                return (
                  <span key={page} className="flex items-center gap-2">
                    {showGap ? <span className="px-1 text-slate-400">...</span> : null}
                    <Link
                      href={downloadHref(slug, { path: currentPath, perPage, page })}
                      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 font-semibold transition active:translate-y-px ${
                        page === safePage ? "bg-[#17201c] text-white" : "border border-black/10 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </Link>
                  </span>
                );
              })}
              {safePage < totalPages ? (
                <Link href={downloadHref(slug, { path: currentPath, perPage, page: safePage + 1 })} className="inline-flex h-10 items-center rounded-md bg-[#17201c] px-4 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
