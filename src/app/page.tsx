import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, categories, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { category: true, media: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.category.findMany({
      where: { active: true },
      take: 4,
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.siteSettings.findFirst(),
  ]);

  return (
    <>
      <main>
        <section className="overflow-hidden border-b border-black/10 bg-white">
          <div className="mx-auto grid w-[min(1180px,calc(100%-32px))] gap-10 py-4 sm:w-[min(1180px,calc(100%-64px))] lg:w-[min(1180px,calc(100%-104px))] lg:grid-cols-[370px_minmax(0,1fr)] lg:gap-12 lg:py-0 xl:gap-16">
            <div className="relative min-h-[500px] pb-8 pt-3 sm:min-h-[540px] lg:min-h-[560px]">
              <div className="absolute bottom-0 left-[-32px] right-[-32px] top-[318px] bg-black lg:left-[calc((1180px-100vw)/2)] lg:right-0" />
              <div className="relative z-10 flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white p-5 soft-shadow sm:max-w-[340px]">
                {settings?.logoUrl ? (
                  <Image
                    src={settings.logoUrl}
                    alt={`${settings.shopName} logo`}
                    width={340}
                    height={340}
                    priority
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Package className="text-[#17201c]" size={112} />
                )}
              </div>
              <div className="relative z-10 mt-7 grid gap-3 pr-0 sm:max-w-[340px]">
                <div className="flex items-center justify-between text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Categories</p>
                  <Link href="/shop" className="text-xs font-semibold text-white/80 hover:text-white">
                    View all
                  </Link>
                </div>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={category.slug ? `/shop?category=${category.slug}` : "/shop"}
                    className="group grid min-h-[72px] grid-cols-[56px_1fr_24px] items-center gap-3 rounded-md border border-white/15 bg-white/8 p-2 text-white backdrop-blur"
                  >
                    <span className="relative h-14 w-14 overflow-hidden rounded-md bg-white/12">
                      {category.imageUrl ? (
                        <Image src={category.imageUrl} alt={category.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <Package className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/70" size={20} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{category.name}</span>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-white/62">
                        {category.description || `${category._count.products} products`}
                      </span>
                    </span>
                    <ArrowRight className="transition group-hover:translate-x-1" size={17} />
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col pb-12 pt-2 lg:min-h-[560px] lg:pb-14 lg:pt-10">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#007275]">
                Minimal commerce, ready to grow
              </p>
              <h1 className="mt-8 max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight text-slate-950 md:text-7xl">
                Shop essentials with a calmer checkout.
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">
                A modern storefront with guest checkout, customer accounts, secure admin controls, uploads, SMTP, payments, and AI configuration.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#17201c] px-5 font-semibold text-white">
                  Browse products <ArrowRight size={17} />
                </Link>
                <Link href="/admin" className="inline-flex h-12 items-center justify-center rounded-md border border-black/10 px-5 font-semibold">
                  Admin dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="container-shell grid gap-4 py-10 md:grid-cols-3">
          {[
            { icon: Truck, title: "Configurable shipping", body: "Enable regions, delivery fees, and checkout options from admin." },
            { icon: ShieldCheck, title: "Secure by default", body: "Hashed passwords, signed sessions, validation, and encrypted secrets." },
            { icon: Sparkles, title: "AI-ready operations", body: "Choose providers and models for descriptions, SEO text, and assistant features." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg border border-black/10 bg-white p-5">
                <Icon className="mb-4 text-[#0f766e]" size={22} />
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
              </div>
            );
          })}
        </section>
        <section className="container-shell space-y-6 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f766e]">Featured</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Latest products</h2>
            </div>
            <Link href="/shop" className="hidden text-sm font-semibold text-[#0f766e] md:block">View all</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      </main>
    </>
  );
}
