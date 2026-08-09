import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
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
      <SiteHeader />
      <main>
        <section className="overflow-hidden border-b border-[var(--border)] bg-[var(--page)]">
          <div className="container-shell grid gap-10 py-10 lg:grid-cols-[410px_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-14 xl:gap-16">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-5 soft-shadow sm:p-7">
              <div className="relative mx-auto aspect-square w-full max-w-[330px] overflow-hidden">
                {settings?.logoUrl ? (
                  <Image
                    src={settings.logoUrl}
                    alt={`${settings.shopName} logo`}
                    width={340}
                    height={340}
                    priority
                    className="h-full w-full object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.18)]"
                  />
                ) : (
                  <Package className="m-auto h-full w-28 text-[var(--muted)]" />
                )}
              </div>
              <div className="mt-7 grid gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">Categories</p>
                  <Link href="/shop" className="text-xs font-semibold text-[var(--accent)]">
                    View all
                  </Link>
                </div>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={category.slug ? `/shop?category=${category.slug}` : "/shop"}
                    className="group grid min-h-[74px] grid-cols-[58px_1fr_24px] items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-[var(--text)]"
                  >
                    <span className="relative h-[58px] w-[58px] overflow-hidden rounded-md bg-[var(--surface-soft)]">
                      {category.imageUrl ? (
                        <Image src={category.imageUrl} alt={category.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <Package className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--muted)]" size={20} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{category.name}</span>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-[var(--muted)]">
                        {category.description || `${category._count.products} products`}
                      </span>
                    </span>
                    <ArrowRight className="transition group-hover:translate-x-1" size={17} />
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col py-2 lg:py-10">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
                Minimal commerce, ready to grow
              </p>
              <h1 className="mt-7 max-w-[590px] text-5xl font-semibold leading-[1.04] text-[var(--text)] md:text-7xl">
                Shop essentials with a calmer checkout.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
                A modern storefront with guest checkout, customer accounts, secure admin controls, uploads, SMTP, payments, and AI configuration.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--text)] px-5 font-semibold text-[var(--surface)]">
                  Browse products <ArrowRight size={17} />
                </Link>
                <Link href="/admin" className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold text-[var(--text)]">
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
              <div key={item.title} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                <Icon className="mb-4 text-[var(--accent)]" size={22} />
                <h2 className="font-semibold text-[var(--text)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </div>
            );
          })}
        </section>
        <section className="container-shell space-y-6 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Featured</p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Latest products</h2>
            </div>
            <Link href="/shop" className="hidden text-sm font-semibold text-[var(--accent)] md:block">View all</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      </main>
    </>
  );
}
