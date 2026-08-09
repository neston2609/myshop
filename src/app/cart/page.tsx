import Image from "next/image";
import Link from "next/link";
import { updateCartAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { getCart } from "@/lib/cart";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCart();

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <h1 className="text-3xl font-semibold">Cart</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-3">
            {cart.items.length === 0 ? (
              <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
                <p className="text-slate-600">Your cart is empty.</p>
                <Link href="/shop" className="mt-4 inline-flex h-11 items-center rounded-md bg-[#17201c] px-5 font-semibold text-white">Start shopping</Link>
              </div>
            ) : cart.items.map((item) => {
              const image = item.product.media.find((media) => media.type === "IMAGE")?.url || "/window.svg";
              return (
                <article key={item.product.id} className="flex gap-4 rounded-lg border border-black/10 bg-white p-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-md bg-slate-100">
                    <Image src={image} alt={item.product.name} fill className="object-cover" sizes="96px" />
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.product.slug}`} className="font-semibold">{item.product.name}</Link>
                    <p className="text-sm text-slate-500">{money(item.product.price)}</p>
                    <form action={updateCartAction} className="mt-3 flex items-center gap-2">
                      <input type="hidden" name="productId" value={item.product.id} />
                      <input name="quantity" type="number" min="0" max="99" defaultValue={item.quantity} className="h-10 w-20 rounded-md border border-black/10 px-3" />
                      <button className="h-10 rounded-md border border-black/10 px-3 text-sm">Update</button>
                    </form>
                  </div>
                  <strong>{money(item.lineTotal)}</strong>
                </article>
              );
            })}
          </section>
          <aside className="h-fit rounded-lg border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <strong className="text-base text-slate-950">{money(cart.subtotal)}</strong>
            </div>
            <p className="mt-3 text-sm text-slate-500">Shipping and payment are selected during checkout.</p>
            <Link href="/checkout" className="mt-5 flex h-12 items-center justify-center rounded-md bg-[#0f766e] font-semibold text-white">Checkout</Link>
          </aside>
        </div>
      </main>
    </>
  );
}
