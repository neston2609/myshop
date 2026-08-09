import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
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
    prisma.category.findMany({ where: { active: true }, take: 4 }),
    prisma.siteSettings.findFirst(),
  ]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-black/10 bg-white">
          <div className="container-shell grid gap-10 py-14 lg:grid-cols-[1fr_0.86fr] lg:items-center">
            <div className="space-y-7">
              <div className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white p-5 soft-shadow sm:h-64 sm:w-64 lg:h-80 lg:w-80">
                {settings?.logoUrl ? (
                  <Image
                    src={settings.logoUrl}
                    alt={`${settings.shopName} logo`}
                    width={320}
                    height={320}
                    priority
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Package className="text-[#17201c]" size={112} />
                )}
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
                Minimal commerce, ready to grow
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-tight text-slate-950 md:text-7xl">
                Shop essentials with a calmer checkout.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-600">
                A modern storefront with guest checkout, customer accounts, secure admin controls, uploads, SMTP, payments, and AI configuration.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#17201c] px-5 font-semibold text-white">
                  Browse products <ArrowRight size={17} />
                </Link>
                <Link href="/admin" className="inline-flex h-12 items-center justify-center rounded-md border border-black/10 px-5 font-semibold">
                  Admin dashboard
                </Link>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg bg-[#e7f0ec] p-4 soft-shadow">
              {categories.map((category) => (
                <Link key={category.id} href={`/shop?category=${category.slug}`} className="flex items-center justify-between rounded-md bg-white p-4">
                  <span>
                    <span className="block font-semibold">{category.name}</span>
                    <span className="text-sm text-slate-500">{category.description}</span>
                  </span>
                  <ArrowRight size={18} />
                </Link>
              ))}
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
