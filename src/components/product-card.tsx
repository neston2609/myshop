import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { addToCartAction } from "@/app/actions";
import { money } from "@/lib/format";
import { plainTextFromHtml } from "@/lib/html";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: { toString(): string };
    stock: number;
    category: { name: string };
    media: { url: string; alt: string | null; type: string }[];
  };
};

export function ProductCard({ product }: ProductCardProps) {
  const image = product.media.find((item) => item.type === "IMAGE")?.url || "/window.svg";
  const description = plainTextFromHtml(product.description);

  return (
    <article className="group overflow-hidden rounded-lg border border-black/10 bg-white">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-slate-100">
          <Image
            src={image}
            alt={product.media[0]?.alt || product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      <div className="space-y-4 p-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-[#0f766e]">{product.category.name}</p>
          <Link href={`/products/${product.slug}`} className="block font-semibold text-slate-950">
            {product.name}
          </Link>
          <p className="line-clamp-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{money(product.price)}</span>
          <form action={addToCartAction}>
            <input type="hidden" name="productId" value={product.id} />
            <button
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[#17201c] text-white disabled:opacity-40"
              aria-label={`Add ${product.name} to cart`}
              disabled={product.stock < 1}
            >
              <ShoppingBag size={17} />
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
