import { checkoutAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { getCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, shippingMethods, paymentMethods] = await Promise.all([
    getCart(),
    prisma.shippingMethod.findMany({ where: { enabled: true } }),
    prisma.paymentMethod.findMany({ where: { enabled: true } }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="container-shell grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <form action={checkoutAction} className="rounded-lg border border-black/10 bg-white p-6">
          <h1 className="text-3xl font-semibold">Checkout</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <input name="customerName" placeholder="Full name" required className="h-11 rounded-md border border-black/10 px-3" />
            <input name="customerEmail" type="email" placeholder="Email" required className="h-11 rounded-md border border-black/10 px-3" />
            <input name="customerPhone" placeholder="Phone" className="h-11 rounded-md border border-black/10 px-3" />
            <input name="shippingCity" placeholder="City" required className="h-11 rounded-md border border-black/10 px-3" />
            <input name="shippingCountry" placeholder="Country" required className="h-11 rounded-md border border-black/10 px-3" />
            <textarea name="shippingAddress" placeholder="Shipping address" required className="min-h-28 rounded-md border border-black/10 px-3 py-3 sm:col-span-2" />
            <select name="shippingMethodId" required className="h-11 rounded-md border border-black/10 px-3">
              {shippingMethods.map((method) => <option key={method.id} value={method.id}>{method.name} - {money(method.cost)}</option>)}
            </select>
            <select name="paymentMethodId" required className="h-11 rounded-md border border-black/10 px-3">
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
            </select>
          </div>
          <button disabled={cart.items.length === 0} className="mt-6 h-12 w-full rounded-md bg-[#17201c] font-semibold text-white disabled:opacity-40">
            Place order
          </button>
        </form>
        <aside className="h-fit rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <div key={item.product.id} className="flex justify-between gap-4 text-sm">
                <span>{item.quantity} x {item.product.name}</span>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-black/10 pt-4">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
          </div>
        </aside>
      </main>
    </>
  );
}
