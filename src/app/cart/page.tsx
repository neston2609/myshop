import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { applyDiscountCodeAction, removeDiscountCodeAction, updateCartAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { getCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { getAppliedDiscount } from "@/lib/discount-codes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cart",
  robots: {
    index: false,
    follow: false,
  },
};

type CartPageProps = {
  searchParams: Promise<{ discount?: string; minimum?: string }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const cart = await getCart();
  const [params, appliedDiscount] = await Promise.all([searchParams, getAppliedDiscount(cart.subtotal)]);
  const discountMessage = {
    applied: "ใช้โค้ดส่วนลดเรียบร้อยแล้ว",
    removed: "นำโค้ดส่วนลดออกแล้ว",
    invalid: "ไม่พบโค้ดส่วนลดหรือโค้ดถูกปิดใช้งาน",
    expired: "โค้ดส่วนลดหมดอายุแล้ว",
    missing: "กรุณากรอกโค้ดส่วนลด",
  }[params.discount || ""];
  const minimumMessage = params.discount === "minimum" && params.minimum
    ? `ยอดสั่งซื้อขั้นต่ำสำหรับโค้ดนี้คือ ${money(Number(params.minimum))}`
    : null;

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
            <div className="mt-4 border-t border-black/10 pt-4">
              <p className="text-sm font-semibold text-slate-800">Discount code</p>
              {discountMessage || minimumMessage ? (
                <p className={`mt-2 rounded-md px-3 py-2 text-sm ${params.discount === "applied" || params.discount === "removed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                  {minimumMessage || discountMessage}
                </p>
              ) : null}
              {appliedDiscount.valid ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-emerald-800">{appliedDiscount.code}</span>
                    <strong className="text-emerald-700">-{money(appliedDiscount.amount)}</strong>
                  </div>
                  <form action={removeDiscountCodeAction} className="mt-2">
                    <button className="text-xs font-semibold text-red-600">Remove code</button>
                  </form>
                </div>
              ) : (
                <form action={applyDiscountCodeAction} className="mt-3 flex gap-2">
                  <input name="discountCode" placeholder="Enter code" autoCapitalize="characters" className="h-10 min-w-0 flex-1 rounded-md border border-black/10 px-3 uppercase" />
                  <button className="h-10 rounded-md border border-black/10 px-3 text-sm font-semibold">Apply</button>
                </form>
              )}
            </div>
            {appliedDiscount.valid ? (
              <div className="mt-3 flex items-center justify-between text-sm text-emerald-700">
                <span>Discount</span>
                <strong>-{money(appliedDiscount.amount)}</strong>
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
              <span className="font-semibold">Total before shipping</span>
              <strong>{money(cart.subtotal - (appliedDiscount.valid ? appliedDiscount.amount : 0))}</strong>
            </div>
            <p className="mt-3 text-sm text-slate-500">Shipping and payment are selected during checkout.</p>
            <Link href="/checkout" className="mt-5 flex h-12 items-center justify-center rounded-md bg-[#0f766e] font-semibold text-white">Checkout</Link>
          </aside>
        </div>
      </main>
    </>
  );
}
