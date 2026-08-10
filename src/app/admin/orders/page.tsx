import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: true, shippingMethod: true, paymentMethod: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">Orders</h2>
      <div className="mt-4 divide-y divide-black/10">
        {orders.map((order) => {
          const shippingLine = [
            order.customerName,
            order.shippingAddress,
            order.shippingSubdistrict ? `ต.${order.shippingSubdistrict}` : null,
            order.shippingDistrict ? `อ.${order.shippingDistrict}` : null,
            order.shippingProvince || order.shippingCity,
            order.shippingPostalCode,
            order.customerPhone,
          ].filter(Boolean).join(" ");
          return (
            <article key={order.id} className="py-4">
              <div className="grid gap-2 text-sm md:grid-cols-[1fr_150px_120px_100px]">
                <span className="font-medium">{order.orderNumber}<span className="ml-2 text-slate-400">{order.customerEmail}</span></span>
                <span>{order.status}</span>
                <span>{order.paymentMethod?.name}</span>
                <strong>{money(order.total)}</strong>
              </div>
              <p className="mt-2 text-sm text-slate-500">{order.items.length} items to {shippingLine}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
