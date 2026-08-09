import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ShopPageProps = {
  searchParams: Promise<{ q?: string; category?: string; stock?: string; sort?: string }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { description: { contains: params.q, mode: "insensitive" } },
              { sku: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params.category ? { category: { slug: params.category } } : {}),
      ...(params.stock === "in" ? { stock: { gt: 0 } } : {}),
    },
    orderBy: params.sort === "price" ? { price: "asc" } : { createdAt: "desc" },
    include: { category: true, media: { orderBy: { sortOrder: "asc" } } },
  });

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="mb-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-black/10 bg-white p-4">
            <h1 className="text-xl font-semibold">Shop</h1>
            <form className="mt-5 grid gap-3">
              <input name="q" defaultValue={params.q} placeholder="Search products" className="h-11 rounded-md border border-black/10 px-3" />
              <select name="category" defaultValue={params.category || ""} className="h-11 rounded-md border border-black/10 px-3">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                ))}
              </select>
              <select name="stock" defaultValue={params.stock || ""} className="h-11 rounded-md border border-black/10 px-3">
                <option value="">Any stock</option>
                <option value="in">In stock</option>
              </select>
              <select name="sort" defaultValue={params.sort || "new"} className="h-11 rounded-md border border-black/10 px-3">
                <option value="new">Newest</option>
                <option value="price">Price low to high</option>
              </select>
              <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white">Apply filters</button>
              <Link href="/shop" className="text-center text-sm text-slate-500">Clear filters</Link>
            </form>
          </aside>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">{products.length} products</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
