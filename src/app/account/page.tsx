import { logoutAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireUser();
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: session.id }, { customerEmail: session.email }] },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-semibold">Hi, {session.name}</h1>
            <p className="mt-1 text-slate-600">{session.email}</p>
          </div>
          <form action={logoutAction}><button className="h-10 rounded-md border border-black/10 bg-white px-4">Log out</button></form>
        </div>
        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">Order history</h2>
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-black/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-slate-500">{order.createdAt.toLocaleDateString()} - {order.status}</p>
                </div>
                <strong>{money(order.total)}</strong>
              </div>
              <p className="mt-3 text-sm text-slate-600">{order.items.length} items shipped to {order.shippingCity}, {order.shippingCountry}</p>
            </article>
          ))}
          {orders.length === 0 ? <p className="rounded-lg border border-black/10 bg-white p-6 text-slate-600">No orders yet.</p> : null}
        </section>
      </main>
    </>
  );
}
