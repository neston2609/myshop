import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCartAction } from "@/app/actions";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { SiteHeader } from "@/components/site-header";
import { money, youtubeEmbed } from "@/lib/format";
import { sanitizeProductHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
      reviews: { where: { approved: true }, include: { user: true }, take: 6 },
    },
  });

  if (!product || !product.active) notFound();
  const images = product.media.filter((item) => item.type === "IMAGE");
  const video = product.media.find((item) => item.type === "YOUTUBE" || item.type === "VIDEO");
  const embed = video?.type === "YOUTUBE" ? youtubeEmbed(video.url) : null;
  const descriptionHtml = sanitizeProductHtml(product.description);

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
          <section className="grid gap-4">
            <ProductImageGallery
              images={images.map((image) => ({
                id: image.id,
                url: image.url,
                alt: image.alt || product.name,
              }))}
              fallbackAlt={product.name}
            />
            {embed ? (
              <iframe
                src={embed}
                className="aspect-video w-full rounded-lg"
                title={`${product.name} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : video?.url ? (
              <video src={video.url} controls className="aspect-video w-full rounded-lg bg-black" />
            ) : null}
          </section>
          <section className="rounded-lg border border-black/10 bg-white p-6">
            <Link href={`/shop?category=${product.category.slug}`} className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0f766e]">
              {product.category.name}
            </Link>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">{product.name}</h1>
            <p className="mt-4 text-2xl font-semibold">{money(product.price)}</p>
            <div className="product-html mt-5" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-100 p-3"><dt className="text-slate-500">SKU</dt><dd className="font-semibold">{product.sku}</dd></div>
              <div className="rounded-md bg-slate-100 p-3"><dt className="text-slate-500">Stock</dt><dd className="font-semibold">{product.stock}</dd></div>
            </dl>
            <form action={addToCartAction} className="mt-6 flex gap-3">
              <input type="hidden" name="productId" value={product.id} />
              <input name="quantity" type="number" min="1" max={product.stock} defaultValue="1" className="h-12 w-24 rounded-md border border-black/10 px-3" />
              <button disabled={product.stock < 1} className="h-12 flex-1 rounded-md bg-[#17201c] font-semibold text-white disabled:opacity-40">
                Add to cart
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
