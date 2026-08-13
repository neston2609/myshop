import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const categories = await prisma.downloadCategory.findMany({
    where: { enabled: true, source: { enabled: true } },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h1 className="text-3xl font-semibold">Downloads</h1>
          <Link href="/wii-game-selector" className="inline-flex h-10 items-center justify-center rounded-md border border-blue-600 bg-white px-4 text-sm font-semibold text-blue-600">
            Nintendo Wii Game Selector
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/downloads/${category.slug}`} className="overflow-hidden rounded-lg border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative aspect-square bg-slate-100">
                {category.imageUrl ? (
                  <Image src={category.imageUrl} alt={category.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-black text-slate-300">{category.name.slice(0, 2).toUpperCase()}</div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-semibold">{category.name}</h2>
                {category.description ? <p className="mt-1 text-sm text-slate-600">{category.description}</p> : null}
              </div>
            </Link>
          ))}
        </div>
        {categories.length === 0 ? (
          <p className="mt-6 rounded-lg border border-black/10 bg-white p-6 text-slate-600">No download categories available yet.</p>
        ) : null}
      </main>
    </>
  );
}
