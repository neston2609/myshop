import Image from "next/image";
import Link from "next/link";
import { Download, Folder, FileText } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { formatBytes, listDownloadEntries, type DownloadEntry } from "@/lib/download-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DownloadCategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ path?: string }>;
};

function parentPath(value: string) {
  const segments = value.split("/").filter(Boolean);
  segments.pop();
  return segments.join("/");
}

export default async function DownloadCategoryPage({ params, searchParams }: DownloadCategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const currentPath = (query.path || "").replace(/^\/+|\/+$/g, "");
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
            <Link href={`/downloads/${slug}${parentPath(currentPath) ? `?path=${encodeURIComponent(parentPath(currentPath))}` : ""}`} className="h-10 rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold">
              Up folder
            </Link>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <Link href={`/downloads/${slug}`} className={`rounded-md px-3 py-1.5 ${currentPath ? "bg-white" : "bg-[#17201c] text-white"}`}>{category.name}</Link>
          {segments.map((segment, index) => {
            const target = segments.slice(0, index + 1).join("/");
            return (
              <Link key={target} href={`/downloads/${slug}?path=${encodeURIComponent(target)}`} className={`rounded-md px-3 py-1.5 ${index === segments.length - 1 ? "bg-[#17201c] text-white" : "bg-white"}`}>
                {segment}
              </Link>
            );
          })}
        </div>

        {error ? <p className="mt-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 overflow-hidden rounded-lg border border-black/10 bg-white">
          {entries.map((entry) => (
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
                <Link href={`/downloads/${slug}?path=${encodeURIComponent(entry.path)}`} className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-slate-50">
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
      </main>
    </>
  );
}
