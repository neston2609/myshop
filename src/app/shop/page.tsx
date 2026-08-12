import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
};

const productsPerPage = 16;

function shopHref(input: { page?: number; category?: string; q?: string }) {
  const params = new URLSearchParams();
  if (input.category) params.set("category", input.category);
  if (input.q) params.set("q", input.q);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const requestedPage = Number(params.page || "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const productWhere: Prisma.ProductWhereInput = {
    active: true,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.category ? { category: { slug: params.category } } : {}),
  };
  const productCount = await prisma.product.count({ where: productWhere });
  const totalPages = Math.max(1, Math.ceil(productCount / productsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const visiblePages = paginationPages(safePage, totalPages);
  const products = await prisma.product.findMany({
    where: productWhere,
    orderBy: { createdAt: "desc" },
    include: { category: true, media: { orderBy: { sortOrder: "asc" } } },
    skip: (safePage - 1) * productsPerPage,
    take: productsPerPage,
  });

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <section className="mb-6 rounded-lg border border-black/10 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Shop</h1>
              <p className="mt-1 text-sm text-slate-500">เลือกหมวดหมู่สินค้า</p>
            </div>
            <Link
              href={shopHref({ q })}
              className={`inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                !params.category ? "bg-[#17201c] text-white" : "border border-black/10 bg-white text-slate-700"
              }`}
            >
              All categories
            </Link>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={shopHref({ category: category.slug, q })}
                className={`shrink-0 rounded-md border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 ${
                  params.category === category.slug
                    ? "border-[#0f766e] bg-[#0f766e] text-white"
                    : "border-black/10 bg-slate-50 text-slate-700 hover:bg-white"
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
            <input name="q" defaultValue={q} placeholder="Search products" className="h-11 rounded-md border border-black/10 px-3" />
            <button className="h-11 rounded-md bg-[#17201c] px-5 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
              Search
            </button>
          </form>
        </section>
        <div className="mb-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">{productCount} products</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {products.length === 0 ? (
              <p className="rounded-lg border border-black/10 bg-white p-6 text-slate-600">No products found.</p>
            ) : null}
            {productCount > productsPerPage ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-sm">
                <span className="text-slate-500">Page {safePage} of {totalPages}</span>
                <div className="flex flex-wrap gap-2">
                  {safePage > 1 ? (
                    <Link href={shopHref({ page: safePage - 1, category: params.category, q })} className="inline-flex h-10 items-center rounded-md border border-black/10 px-4 font-semibold transition hover:bg-slate-50 active:translate-y-px">
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
                          href={shopHref({ page, category: params.category, q })}
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
                    <Link href={shopHref({ page: safePage + 1, category: params.category, q })} className="inline-flex h-10 items-center rounded-md bg-[#17201c] px-4 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                      Next
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </>
  );
}
