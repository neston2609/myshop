/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DownloadEntryList, type DownloadListEntry } from "@/components/download-entry-list";
import { SiteHeader } from "@/components/site-header";
import { findDownloadFolderCover, listDownloadEntries, type DownloadEntry } from "@/lib/download-sources";
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
  let folderCover: { file: string; source: "cover" } | null = null;
  let error = "";
  try {
    entries = await listDownloadEntries(category, currentPath);
    folderCover = await findDownloadFolderCover(category, currentPath).catch(() => null);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load downloads.";
  }

  const segments = currentPath.split("/").filter(Boolean);
  const listEntries: DownloadListEntry[] = entries.map((entry) => ({
    name: entry.name,
    path: entry.path,
    size: entry.size,
    thumb: entry.thumb,
    thumbSource: entry.thumbSource,
    type: entry.type,
  }));

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
          <>
            {folderCover ? (
              <section className="mt-5 flex flex-col gap-4 rounded-lg border border-black/10 bg-white p-4 sm:flex-row sm:items-center">
                <img
                  src={`/api/downloads/${slug}/thumb?${new URLSearchParams({ path: folderCover.file, source: folderCover.source }).toString()}`}
                  alt=""
                  width={168}
                  height={168}
                  className="aspect-square h-40 w-40 shrink-0 rounded-md border border-black/10 object-cover"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold">{segments[segments.length - 1]}</h2>
                </div>
              </section>
            ) : null}
            <DownloadEntryList
              entries={listEntries}
              initialPage={currentPage}
              initialPerPage={perPage}
              hasCoverMapping={Boolean(category.coverPath)}
              slug={slug}
            />
          </>
        ) : null}
      </main>
    </>
  );
}
