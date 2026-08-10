import { changePasswordAction, logoutAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AccountPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await requireUser();
  const params = await searchParams;
  const message = {
    "password-changed": "Password changed successfully.",
    "password-invalid": "Current password is incorrect.",
  }[params.message || ""];
  const isError = params.message === "password-invalid";
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
            <p className="mt-1 text-slate-600">
              {session.username ? `@${session.username} - ` : ""}{session.email}
            </p>
          </div>
          <form action={logoutAction}><button className="h-10 rounded-md border border-black/10 bg-white px-4">Log out</button></form>
        </div>
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
          <h2 className="text-xl font-semibold">Order history</h2>
          {message ? (
            <p className={`rounded-md p-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {message}
            </p>
          ) : null}
          {orders.map((order) => {
            const destination = [order.shippingProvince || order.shippingCity, order.shippingPostalCode].filter(Boolean).join(" ");
            return (
              <article key={order.id} className="rounded-lg border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-slate-500">{order.createdAt.toLocaleDateString()} - {order.status}</p>
                  </div>
                  <strong>{money(order.total)}</strong>
                </div>
                <p className="mt-3 text-sm text-slate-600">{order.items.length} items shipped to {destination || order.shippingCountry}</p>
              </article>
            );
          })}
          {orders.length === 0 ? <p className="rounded-lg border border-black/10 bg-white p-6 text-slate-600">No orders yet.</p> : null}
          </div>
          <form action={changePasswordAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
            <div>
              <h2 className="text-xl font-semibold">Change password</h2>
              <p className="mt-1 text-sm text-slate-600">Update your account password securely.</p>
            </div>
            <input name="currentPassword" type="password" placeholder="Current password" required className="h-11 rounded-md border border-black/10 px-3" />
            <input name="newPassword" type="password" placeholder="New password" required className="h-11 rounded-md border border-black/10 px-3" />
            <input name="confirmPassword" type="password" placeholder="Confirm new password" required className="h-11 rounded-md border border-black/10 px-3" />
            <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white">Save password</button>
          </form>
        </section>
      </main>
    </>
  );
}
