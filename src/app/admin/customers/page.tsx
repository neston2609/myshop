import { prisma } from "@/lib/prisma";

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">Customers</h2>
      <div className="mt-4 divide-y divide-black/10">
        {customers.map((customer) => (
          <div key={customer.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_1fr_100px]">
            <span className="font-medium">{customer.name}</span>
            <span>{customer.email}</span>
            <span>{customer._count.orders} orders</span>
          </div>
        ))}
      </div>
    </div>
  );
}
