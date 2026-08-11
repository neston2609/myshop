import { changePasswordAction, logoutAction, payOrderAction } from "@/app/actions";
import { BankTransferOrderActions } from "@/components/bank-transfer-order-actions";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { findShippingCarrier, trackingHref } from "@/lib/shipping-carriers";

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
    "payment-cancelled": "Payment was cancelled. You can try again from the order below.",
    "payment-unavailable": "This order cannot be paid online right now.",
    "manual-payment": "This order uses a manual payment method. Please follow the store payment instructions.",
    "already-paid": "This order is already paid.",
    "order-not-found": "Order not found.",
    "proof-submitted": "Payment slip submitted. The store will verify it shortly.",
    "slip-required": "Please upload a payment slip.",
    "slip-type": "Slip must be PNG, JPG, or WebP.",
    "slip-too-large": "Slip file is too large.",
  }[params.message || ""];
  const isError = params.message === "password-invalid" || params.message === "payment-unavailable" || params.message === "order-not-found" || params.message?.startsWith("slip-");
  const orders = await prisma.order.findMany({
    where: { OR: [{ userId: session.id }, { customerEmail: session.email }] },
    include: { items: true, paymentMethod: true },
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
            const isPaid = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.status);
            const canPayNow = !isPaid && (order.paymentMethod?.provider === "STRIPE" || order.paymentMethod?.provider === "PAYPAL");
            const canShowBankTransfer = !isPaid && order.paymentMethod?.provider === "BANK_TRANSFER";
            const bankCredentials = canShowBankTransfer ? readPaymentCredentials(order.paymentMethod?.credentialsCiphertext) : null;
            const carrier = findShippingCarrier(order.trackingCarrierCode);
            const trackingUrl = trackingHref(order.trackingCarrierCode, order.trackingNumber);
            return (
              <article key={order.id} className="rounded-lg border border-black/10 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-slate-500">
                      {order.createdAt.toLocaleDateString()} - {order.status}
                      {order.paymentStatus ? ` - payment: ${order.paymentStatus}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <strong>{money(order.total)}</strong>
                    {canPayNow ? (
                      <form action={payOrderAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <button className="h-10 rounded-md bg-[#0f766e] px-4 font-semibold text-white transition hover:bg-[#115e59] active:translate-y-px">
                          ชำระเงิน
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{order.items.length} items shipped to {destination || order.shippingCountry}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>สินค้า {money(order.subtotal)}</span>
                  <span>ค่าส่ง {money(order.shippingCost)}</span>
                  {Number(order.paymentFee) > 0 ? <span>ค่าธรรมเนียม {money(order.paymentFee)}</span> : null}
                </div>
                {canShowBankTransfer && bankCredentials ? (
                  <BankTransferOrderActions
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    total={Number(order.total)}
                    credentials={bankCredentials}
                    proofSubmitted={Boolean(order.paymentSlipUrl)}
                  />
                ) : null}
                {order.trackingNumber ? (
                  <div className="mt-3 rounded-md border border-black/10 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-800">ข้อมูลจัดส่ง</p>
                    <p className="mt-1 text-slate-600">ขนส่ง: {order.trackingCarrierName || carrier?.name || order.trackingCarrierCode}</p>
                    {trackingUrl ? (
                      <a href={trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold text-[#0f766e] underline-offset-4 hover:underline">
                        Tracking: {order.trackingNumber}
                      </a>
                    ) : (
                      <p className="mt-1 text-slate-600">Tracking: {order.trackingNumber}</p>
                    )}
                  </div>
                ) : null}
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
