import Image from "next/image";
import Link from "next/link";
import { deleteOrderAction, markOrderPaidAction, updateOrderTrackingAction } from "@/app/actions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { findShippingCarrier, shippingCarriers, trackingHref } from "@/lib/shipping-carriers";

type AdminOrdersPageProps = {
  searchParams: Promise<{ editTracking?: string; message?: string; page?: string }>;
};

const ordersPerPage = 6;

function pageLink(page: number, message?: string) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (message) params.set("message", message);
  return `/admin/orders?${params.toString()}`;
}

function trackingEditLink(page: number, orderId: string) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("editTracking", orderId);
  return `/admin/orders?${params.toString()}`;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const requestedPage = Number(params.page || "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const message = {
    "tracking-saved": "Tracking updated.",
    "tracking-not-allowed": "Tracking can be added only after payment is successful.",
    "carrier-invalid": "Selected carrier is invalid.",
    "paid-marked": "Order marked as paid.",
    "order-deleted": "Order deleted.",
    "order-not-found": "Order was not found.",
    "admin-password-invalid": "Admin password is incorrect.",
  }[params.message || ""];
  const isError = params.message === "tracking-not-allowed" || params.message === "carrier-invalid" || params.message === "order-not-found" || params.message === "admin-password-invalid";
  const orderCount = await prisma.order.count();
  const totalPages = Math.max(1, Math.ceil(orderCount / ordersPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const orders = await prisma.order.findMany({
    include: { items: true, shippingMethod: true, paymentMethod: true },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * ordersPerPage,
    take: ordersPerPage,
  });

  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">Orders</h2>
      {message ? (
        <p className={`mt-3 rounded-md p-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
      <div className="mt-4">
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
          const canUpdateTracking = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.status);
          const isEditingTracking = params.editTracking === order.id;
          const carrier = findShippingCarrier(order.trackingCarrierCode);
          const trackingUrl = trackingHref(order.trackingCarrierCode, order.trackingNumber);
          return (
            <article key={order.id} className="admin-order-card py-4">
              <div className="grid gap-2 text-sm md:grid-cols-[1fr_150px_120px_100px]">
                <span className="font-medium">{order.orderNumber}<span className="ml-2 text-slate-400">{order.customerEmail}</span></span>
                <span>{order.status}</span>
                <span>{order.paymentMethod?.name}</span>
                <strong>{money(order.total)}</strong>
              </div>
              <p className="mt-2 text-sm text-slate-500">{order.items.length} items to {shippingLine}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span>สินค้า {money(order.subtotal)}</span>
                <span>ค่าส่ง {money(order.shippingCost)}</span>
                {Number(order.remoteAreaFee) > 0 ? <span>พื้นที่พิเศษ {money(order.remoteAreaFee)}</span> : null}
                {Number(order.paymentFee) > 0 ? <span>ค่าธรรมเนียม {money(order.paymentFee)}</span> : null}
              </div>
              {order.paymentSlipUrl ? (
                <div className="mt-4 grid gap-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm md:grid-cols-[180px_1fr_auto] md:items-start">
                  <a href={order.paymentSlipUrl} target="_blank" rel="noreferrer" className="block">
                    <Image src={order.paymentSlipUrl} alt={`Payment slip ${order.orderNumber}`} width={180} height={180} className="max-h-44 w-full rounded-md border border-black/10 bg-white object-contain" />
                  </a>
                  <div className="grid gap-1 text-amber-950">
                    <p className="font-semibold">แจ้งชำระเงินแล้ว</p>
                    <p>ชื่อผู้โอน: {order.paymentSlipName || "-"}</p>
                    <p>ธนาคารที่โอนจาก: {order.paymentSlipBank || "-"}</p>
                    <p>ยอดที่แจ้ง: {order.paymentSlipAmount ? money(order.paymentSlipAmount) : "-"}</p>
                    <p>เวลาโอน: {order.paymentSlipPaidAt ? order.paymentSlipPaidAt.toLocaleString() : "-"}</p>
                    {order.paymentSlipNote ? <p>หมายเหตุ: {order.paymentSlipNote}</p> : null}
                  </div>
                  {!["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.status) ? (
                    <form action={markOrderPaidAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <button className="h-10 rounded-md bg-[#0f766e] px-4 font-semibold text-white transition hover:bg-[#115e59] active:translate-y-px">
                        Mark PAID
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
              {order.trackingNumber && !isEditingTracking ? (
                <div className="admin-order-tracking mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md p-3 text-sm">
                  <div className="grid gap-1">
                    <p className="font-semibold">Tracking saved</p>
                    <p>ขนส่ง: {order.trackingCarrierName || carrier?.name || order.trackingCarrierCode || "-"}</p>
                    {trackingUrl ? (
                      <a href={trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0f766e] underline-offset-4 hover:underline">
                        Tracking: {order.trackingNumber}
                      </a>
                    ) : (
                      <p>Tracking: {order.trackingNumber}</p>
                    )}
                  </div>
                  <Link href={trackingEditLink(safePage, order.id)} className="inline-flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 font-semibold text-[var(--text)] transition hover:bg-[var(--surface-soft)] active:translate-y-px">
                    Edit
                  </Link>
                </div>
              ) : canUpdateTracking ? (
                <form action={updateOrderTrackingAction} className="mt-4 grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                  <input type="hidden" name="orderId" value={order.id} />
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
                    <span>บริษัทขนส่ง</span>
                    <select name="trackingCarrierCode" defaultValue={order.trackingCarrierCode || ""} required className="h-11 rounded-md border border-black/10 bg-white px-3">
                      <option value="" disabled>เลือกบริษัทขนส่ง</option>
                      {shippingCarriers.map((carrier) => (
                        <option key={carrier.code} value={carrier.code}>{carrier.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-slate-800">
                    <span>Tracking Number</span>
                    <input name="trackingNumber" defaultValue={order.trackingNumber || ""} required className="h-11 rounded-md border border-black/10 bg-white px-3" />
                  </label>
                  <button className="h-11 rounded-md bg-[#17201c] px-4 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                    Save tracking
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  ใส่ Tracking ได้หลังลูกค้าชำระเงินสำเร็จแล้ว
                </p>
              )}
              <details className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-red-800">Delete order</summary>
                <form action={deleteOrderAction} className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="page" value={safePage} />
                  <label className="grid gap-1.5 font-semibold text-red-950">
                    <span>ใส่รหัสผ่าน Admin เพื่อยืนยันการลบ Order {order.orderNumber}</span>
                    <input
                      name="adminPassword"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Admin password"
                      className="h-11 rounded-md border border-red-200 bg-white px-3 text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    />
                  </label>
                  <button className="h-11 rounded-md bg-red-700 px-4 font-semibold text-white transition hover:bg-red-800 active:translate-y-px">
                    Delete order
                  </button>
                </form>
              </details>
            </article>
          );
        })}
      </div>
      {orderCount > ordersPerPage ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-slate-50 p-3 text-sm">
          <span className="text-slate-500">Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <Link href={pageLink(safePage - 1, params.message)} className="inline-flex h-10 items-center rounded-md border border-black/10 bg-white px-4 font-semibold transition hover:bg-slate-100 active:translate-y-px">
                Previous
              </Link>
            ) : null}
            {safePage < totalPages ? (
              <Link href={pageLink(safePage + 1, params.message)} className="inline-flex h-10 items-center rounded-md bg-[#17201c] px-4 font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
