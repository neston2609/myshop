import { OrderStatus } from "@prisma/client";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const paidRevenueStatuses = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.COMPLETED];
  const [orders, revenueTotal, products, customers] = await Promise.all([
    prisma.order.findMany({ take: 8, orderBy: { createdAt: "desc" } }),
    prisma.order.aggregate({
      where: { status: { in: paidRevenueStatuses } },
      _sum: { total: true },
    }),
    prisma.product.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
  ]);
  const revenue = revenueTotal._sum?.total || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Orders", orders.length],
          ["Revenue", money(revenue)],
          ["Products", products],
          ["Customers", customers],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-black/10 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Recent orders</h2>
        <div className="mt-4 divide-y divide-black/10">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between py-3 text-sm">
              <span>{order.orderNumber}</span>
              <span>{order.status}</span>
              <strong>{money(order.total)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
