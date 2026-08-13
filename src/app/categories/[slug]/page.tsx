import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, seoBrandName, truncateSeoText } from "@/lib/seo";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ sub?: string }>;
};

function categoryDescription(name: string, description?: string | null) {
  if (description?.trim()) return truncateSeoText(description);
  return `เลือกซื้อ ${name} ของเล่นญี่ปุ่น อาร์ตทอย ฟิกเกอร์สะสม และสินค้าคอลเลกชันของแท้จาก ${seoBrandName} พร้อมจัดส่งทั่วไทย`;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, slug: true, description: true, active: true, imageUrl: true },
  });

  if (!category || !category.active) {
    return {
      title: "ไม่พบหมวดหมู่",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${category.name} | ของเล่นญี่ปุ่น POP MART และ Art Toy`;
  const description = categoryDescription(category.name, category.description);

  return {
    title,
    description,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
    openGraph: {
      title: `${title} | ${seoBrandName}`,
      description,
      url: `/categories/${category.slug}`,
      type: "website",
      images: category.imageUrl ? [{ url: absoluteUrl(category.imageUrl), alt: category.name }] : undefined,
    },
    twitter: {
      card: category.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: category.imageUrl ? [absoluteUrl(category.imageUrl)] : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { sub } = searchParams ? await searchParams : {};
  const [category, categories] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      include: {
        subCategories: { where: { active: true }, orderBy: { name: "asc" } },
        products: {
          where: {
            active: true,
            ...(sub ? { subCategory: { slug: sub, active: true } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 24,
          include: { category: true, media: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!category || !category.active) notFound();
  const selectedSubCategory = sub ? category.subCategories.find((item) => item.slug === sub) : null;
  if (sub && !selectedSubCategory) notFound();

  const description = categoryDescription(category.name, category.description);
  const categoryUrl = absoluteUrl(`/categories/${category.slug}`);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} จาก ${seoBrandName}`,
    description,
    url: categoryUrl,
    inLanguage: "th-TH",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: category.products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: product.name,
        url: absoluteUrl(`/products/${product.slug}`),
      })),
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "หน้าแรก",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: categoryUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[collectionJsonLd, breadcrumbJsonLd]} />
      <SiteHeader />
      <main className="container-shell py-10">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="font-semibold text-[#0f766e]">หน้าแรก</Link>
          <span>/</span>
          <Link href="/shop" className="font-semibold text-[#0f766e]">Shop</Link>
          <span>/</span>
          <span>{category.name}</span>
        </nav>

        <nav aria-label="Categories" className="mb-6 rounded-lg border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">เปลี่ยนหมวดหมู่</h2>
            <Link href="/shop" className="text-sm font-semibold text-[#0f766e]">สินค้าทั้งหมด</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Link
                key={item.id}
                href={`/categories/${item.slug}`}
                aria-current={item.id === category.id ? "page" : undefined}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  item.id === category.id
                    ? "border-[#17201c] bg-[#17201c] text-white"
                    : "border-black/10 bg-slate-50 text-slate-700 hover:border-[#0f766e]"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        <section className="rounded-lg border border-black/10 bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f766e]">ของเล่นญี่ปุ่นและอาร์ตทอย</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">{category.name}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-slate-600">{description}</p>
          {category.subCategories.length ? (
            <div className="mt-5 border-t border-black/10 pt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">Sub Categories</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/categories/${category.slug}`}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${!selectedSubCategory ? "border-[#0f766e] bg-teal-50 text-[#0f766e]" : "border-black/10 text-slate-600"}`}
                >
                  ทั้งหมด
                </Link>
                {category.subCategories.map((item) => (
                  <Link
                    key={item.id}
                    href={`/categories/${category.slug}?sub=${encodeURIComponent(item.slug)}`}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${selectedSubCategory?.id === item.id ? "border-[#0f766e] bg-teal-50 text-[#0f766e]" : "border-black/10 text-slate-600"}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              {selectedSubCategory?.description ? <p className="mt-3 text-sm leading-6 text-slate-500">{selectedSubCategory.description}</p> : null}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link href="/shop" className="rounded-md border border-black/10 bg-slate-50 px-4 py-2 font-semibold text-slate-700">
              ดูสินค้าทั้งหมด
            </Link>
            <Link href={`/shop?q=${encodeURIComponent(category.name)}`} className="rounded-md bg-[#17201c] px-4 py-2 font-semibold text-white">
              ค้นหา {category.name}
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">สินค้าในหมวด {category.name}{selectedSubCategory ? ` / ${selectedSubCategory.name}` : ""}</h2>
              <p className="mt-1 text-sm text-slate-500">{category.products.length} รายการล่าสุด</p>
            </div>
          </div>
          {category.products.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          ) : (
            <p className="rounded-lg border border-black/10 bg-white p-6 text-slate-600">ยังไม่มีสินค้าในหมวดนี้</p>
          )}
        </section>
      </main>
    </>
  );
}
