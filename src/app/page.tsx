import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CornerDownRight, Package, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { CopyDiscountCodeButton } from "@/components/copy-discount-code-button";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, defaultSeoDescription, defaultSeoTitle, seoBrandName } from "@/lib/seo";
import { parseShopDescriptionFaqs } from "@/lib/shop-description";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: defaultSeoTitle,
  },
  description: defaultSeoDescription,
  alternates: {
    canonical: "/",
  },
};

const defaultHero = {
  eyebrow: "ของเล่นญี่ปุ่นและอาร์ตทอยของแท้",
  title: "POP MART, Labubu, Space Molly และฟิกเกอร์สะสมคัดมาให้แฟนตัวจริง",
  subtitle: "เลือกซื้อของเล่นญี่ปุ่น กล่องสุ่ม และสินค้าสะสมยอดนิยม พร้อมข้อมูลสินค้า รูปภาพจริง และจัดส่งทั่วไทย",
};

const defaultFeatures = [
  { icon: Truck, title: "จัดส่งทั่วไทย", body: "แพ็กสินค้าอย่างระมัดระวัง พร้อมตัวเลือกจัดส่งและโปรโมชันค่าส่งตามเงื่อนไขร้าน" },
  { icon: ShieldCheck, title: "ชำระเงินปลอดภัย", body: "รองรับการชำระเงินผ่านช่องทางที่ร้านเปิดใช้งาน พร้อมระบบคำสั่งซื้อที่ตรวจสอบย้อนหลังได้" },
  { icon: Sparkles, title: "คัดสินค้าสะสมน่าเก็บ", body: "รวมของเล่นญี่ปุ่น POP MART อาร์ตทอย ฟิกเกอร์ และสินค้าคอลเลกชันยอดนิยมสำหรับนักสะสม" },
];

const seoFaqs = [
  {
    question: "Japan Toy Shop ขายสินค้าอะไร?",
    answer: "Japan Toy Shop รวมของเล่นญี่ปุ่น อาร์ตทอย POP MART, Labubu, Space Molly, กล่องสุ่ม และฟิกเกอร์สะสมสำหรับแฟนคอลเลกชันในไทย",
  },
  {
    question: "สินค้ามีทั้งของใหม่และมือสองไหม?",
    answer: "ร้านมีทั้งสินค้าใหม่และสินค้าคัดสภาพตามรายการสินค้าแต่ละชิ้น ลูกค้าควรอ่านรายละเอียด รูปภาพ และเงื่อนไขก่อนสั่งซื้อ",
  },
  {
    question: "จัดส่งสินค้าไปต่างจังหวัดได้ไหม?",
    answer: "ร้านรองรับการจัดส่งทั่วประเทศไทย โดยค่าจัดส่งและโปรโมชันจะคำนวณตามเงื่อนไขที่ร้านเปิดใช้งานในขั้นตอน checkout",
  },
  {
    question: "ค้นหาสินค้า POP MART หรือ Labubu ได้จากที่ไหน?",
    answer: "ลูกค้าสามารถกดดูสินค้าทั้งหมดหรือเลือกหมวดหมู่ เช่น POP MART, Japanese Toys, Collectibles และค้นหาชื่อรุ่นที่ต้องการในหน้า shop",
  },
];

export default async function Home() {
  const [products, categories, settings, session, publicDiscountCodes] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, recommendedPosition: { not: null } },
      take: 8,
      orderBy: { recommendedPosition: "asc" },
      include: { category: true, media: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        subCategories: {
          where: { active: true },
          orderBy: { name: "asc" },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true } },
      },
    }),
    prisma.siteSettings.findFirst(),
    getSession(),
    prisma.discountCode.findMany({
      where: {
        active: true,
        isPublic: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  const hero = {
    eyebrow: settings?.heroEyebrow || defaultHero.eyebrow,
    title: settings?.heroTitle || defaultHero.title,
    subtitle: settings?.heroSubtitle || defaultHero.subtitle,
  };
  const features = [
    { ...defaultFeatures[0], title: settings?.featureOneTitle || defaultFeatures[0].title, body: settings?.featureOneBody || defaultFeatures[0].body },
    { ...defaultFeatures[1], title: settings?.featureTwoTitle || defaultFeatures[1].title, body: settings?.featureTwoBody || defaultFeatures[1].body },
    { ...defaultFeatures[2], title: settings?.featureThreeTitle || defaultFeatures[2].title, body: settings?.featureThreeBody || defaultFeatures[2].body },
  ];
  const shopDescriptionFaqs = settings?.shopDescriptionFaqs
    ? parseShopDescriptionFaqs(settings.shopDescriptionFaqs)
    : seoFaqs;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `สินค้าแนะนำจาก ${seoBrandName}`,
            itemListElement: products.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: product.name,
              url: absoluteUrl(`/products/${product.slug}`),
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: shopDescriptionFaqs.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          },
        ]}
      />
      <SiteHeader />
      <main>
        <section className="overflow-hidden border-b border-[var(--border)] bg-[var(--page)]">
          <div className="container-shell grid gap-10 py-10 lg:grid-cols-[410px_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-14 xl:gap-16">
            <div className="p-0">
              <div className="relative mx-auto aspect-square w-full max-w-[330px] overflow-hidden bg-transparent">
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
                <div className="grid gap-2">
                  {categories.map((category) => (
                    <div key={category.id} className="grid gap-1.5">
                      <Link
                        href={category.slug ? `/categories/${category.slug}` : "/shop"}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
                      >
                        <span>{category.name}</span>
                        <span className="text-xs font-normal text-[var(--muted)]">{category._count.products}</span>
                      </Link>
                      {category.subCategories.length ? (
                        <div className="ml-4 grid gap-1.5 border-l border-[var(--border)] pl-3">
                          {category.subCategories.map((subCategory) => (
                            <Link
                              key={subCategory.id}
                              href={`/categories/${category.slug}?sub=${encodeURIComponent(subCategory.slug)}`}
                              className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <CornerDownRight aria-hidden="true" size={14} className="shrink-0" />
                                <span className="truncate">{subCategory.name}</span>
                              </span>
                              <span className="shrink-0 font-normal opacity-70">{subCategory._count.products}</span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col py-2 lg:py-10">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
                {hero.eyebrow}
              </p>
              <h1 className="mt-7 max-w-[590px] text-5xl font-semibold leading-[1.04] text-[var(--text)] md:text-7xl">
                {hero.title}
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[var(--muted)]">
                {hero.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--text)] px-5 font-semibold text-[var(--surface)]">
                  Browse products <ArrowRight size={17} />
                </Link>
                {session?.role === "ADMIN" ? (
                  <Link href="/admin" className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold text-[var(--text)]">
                    Admin dashboard
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
        <section className="container-shell grid gap-4 py-10 md:grid-cols-3">
          {features.map((item) => {
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
        {publicDiscountCodes.length ? (
          <section className="container-shell pb-12">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Promotion</p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Discount codes</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {publicDiscountCodes.map((discount) => {
                const minimum = discount.minimumSubtotal ? Number(discount.minimumSubtotal) : null;
                const maximum = discount.maximumDiscount ? Number(discount.maximumDiscount) : null;
                return (
                  <article key={discount.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Public code</p>
                        <h3 className="mt-1 text-2xl font-semibold text-[var(--text)]">{discount.code}</h3>
                      </div>
                      <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-sm font-semibold text-[var(--text)]">
                        {discount.type === "PERCENT" ? `${Number(discount.value)}% OFF` : `${money(discount.value)} OFF`}
                      </span>
                    </div>
                    {discount.description ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{discount.description}</p> : null}
                    <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                      {minimum ? <p>Minimum purchase {money(minimum)}</p> : null}
                      {maximum ? <p>Maximum discount {money(maximum)}</p> : null}
                      {discount.expiresAt ? <p>Valid until {discount.expiresAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}</p> : null}
                    </div>
                    <div className="mt-4"><CopyDiscountCodeButton code={discount.code} /></div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
        <section className="container-shell space-y-6 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Featured</p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Recommend Products</h2>
            </div>
            <Link href="/shop" className="hidden text-sm font-semibold text-[var(--accent)] md:block">View all</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {products.length === 0 ? (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
              ยังไม่มีสินค้าแนะนำ
            </p>
          ) : null}
        </section>
        <section className="border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="container-shell grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                {settings?.shopDescriptionEyebrow || "Japan Toy Shop"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">
                {settings?.shopDescriptionTitle || "ร้านของเล่นญี่ปุ่น POP MART และอาร์ตทอยสำหรับนักสะสมในไทย"}
              </h2>
              <p className="mt-4 leading-7 text-[var(--muted)]">
                {settings?.shopDescriptionBody || "เลือกซื้อของเล่นญี่ปุ่น ฟิกเกอร์สะสม กล่องสุ่ม POP MART, Labubu, The Monsters และ Space Molly จากรายการสินค้าที่คัดมาให้ดูง่าย พร้อมรายละเอียด รูปภาพ และราคาชัดเจน เหมาะทั้งสำหรับสะสมเองและเลือกเป็นของขวัญ"}
              </p>
            </div>
            <div className="grid gap-3">
              {shopDescriptionFaqs.map((item) => (
                <details key={item.question} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                  <summary className="cursor-pointer font-semibold text-[var(--text)]">{item.question}</summary>
                  <p className="mt-3 leading-7 text-[var(--muted)]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
