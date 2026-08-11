import Image from "next/image";
import { markOrderPaidAction, updateOrderTrackingAction } from "@/app/actions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { shippingCarriers } from "@/lib/shipping-carriers";

type AdminOrdersPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = await searchParams;
  const message = {
    "tracking-saved": "Tracking updated.",
    "tracking-not-allowed": "Tracking can be added only after payment is successful.",
    "carrier-invalid": "Selected carrier is invalid.",
    "paid-marked": "Order marked as paid.",
  }[params.message || ""];
  const isError = params.message === "tracking-not-allowed" || params.message === "carrier-invalid";
  const orders = await prisma.order.findMany({
    include: { items: true, shippingMethod: true, paymentMethod: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">Orders</h2>
      {message ? (
        <p className={`mt-3 rounded-md p-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
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
          const canUpdateTracking = ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.status);
          return (
            <article key={order.id} className="py-4">
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
              {canUpdateTracking ? (
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
            </article>
          );
        })}
      </div>
    </div>
  );
}
