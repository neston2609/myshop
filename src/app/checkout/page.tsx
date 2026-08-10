import Image from "next/image";
import { cookies } from "next/headers";
import { checkoutAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { ThaiAddressFields } from "@/components/thai-address-fields";
import { getSession } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type BankTransferCredentials = {
  bankName?: string;
  accountName?: string;
  qrCodeUrl?: string;
};

type SavedShippingAddress = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingSubdistrict?: string;
  shippingDistrict?: string;
  shippingProvince?: string;
  shippingPostalCode?: string;
};

function bankTransferCredentials(credentials?: string | null): BankTransferCredentials | null {
  const parsed = readPaymentCredentials(credentials);
  if (!parsed.bankName && !parsed.accountName && !parsed.qrCodeUrl) return null;
  return parsed;
}

function parseSavedShippingAddress(value?: string): SavedShippingAddress {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as SavedShippingAddress;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default async function CheckoutPage() {
  const [cart, shippingMethods, paymentMethods, session, cookieStore] = await Promise.all([
    getCart(),
    prisma.shippingMethod.findMany({ where: { enabled: true } }),
    prisma.paymentMethod.findMany({ where: { enabled: true } }),
    getSession(),
    cookies(),
  ]);
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.id },
        select: {
          name: true,
          email: true,
          phone: true,
          shippingName: true,
          address: true,
          subdistrict: true,
          district: true,
          province: true,
          postalCode: true,
        },
      })
    : null;
  const savedCookieAddress = parseSavedShippingAddress(cookieStore.get("myshop_shipping_address")?.value);
  const savedAddress = {
    customerName: user?.shippingName || user?.name || savedCookieAddress.customerName || "",
    customerEmail: user?.email || savedCookieAddress.customerEmail || "",
    customerPhone: user?.phone || savedCookieAddress.customerPhone || "",
    shippingAddress: user?.address || savedCookieAddress.shippingAddress || "",
    shippingSubdistrict: user?.subdistrict || savedCookieAddress.shippingSubdistrict || "",
    shippingDistrict: user?.district || savedCookieAddress.shippingDistrict || "",
    shippingProvince: user?.province || savedCookieAddress.shippingProvince || "",
    shippingPostalCode: user?.postalCode || savedCookieAddress.shippingPostalCode || "",
  };
  const bankTransferMethods = paymentMethods
    .filter((method) => method.provider === "BANK_TRANSFER")
    .map((method) => ({
      id: method.id,
      name: method.name,
      credentials: bankTransferCredentials(method.credentialsCiphertext),
    }))
    .filter((method) => method.credentials);

  return (
    <>
      <SiteHeader />
      <main className="container-shell grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <form action={checkoutAction} className="rounded-lg border border-black/10 bg-white p-6">
          <h1 className="text-3xl font-semibold">Checkout</h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ThaiAddressFields savedAddress={savedAddress} />
            <select name="shippingMethodId" required className="h-11 rounded-md border border-black/10 px-3">
              {shippingMethods.map((method) => {
                const threshold = method.freeShippingThreshold ? Number(method.freeShippingThreshold) : null;
                const qualifies = threshold !== null && cart.subtotal >= threshold;
                const label = threshold
                  ? `${method.name} - ${qualifies ? "ส่งฟรี" : money(method.cost)} (ส่งฟรีเมื่อซื้อครบ ${money(threshold)})`
                  : `${method.name} - ${money(method.cost)}`;
                return <option key={method.id} value={method.id}>{label}</option>;
              })}
            </select>
            <select name="paymentMethodId" required className="h-11 rounded-md border border-black/10 px-3">
              {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-md border border-black/10 bg-slate-50 px-3 py-2 text-sm sm:col-span-2">
              <input name="saveShippingAddress" type="checkbox" defaultChecked />
              บันทึกที่อยู่นี้ไว้ใช้สำหรับการสั่งซื้อครั้งถัดไป
            </label>
            {bankTransferMethods.length > 0 ? (
              <div className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-4 sm:col-span-2">
                <h2 className="font-semibold">Bank transfer details</h2>
                {bankTransferMethods.map((method) => (
                  <div key={method.id} className="flex flex-col gap-3 rounded-md bg-white p-3 sm:flex-row sm:items-center">
                    {method.credentials?.qrCodeUrl ? (
                      <Image src={method.credentials.qrCodeUrl} alt={`${method.name} QR Code`} width={96} height={96} className="rounded-md border border-black/10 object-contain" />
                    ) : null}
                    <div className="text-sm">
                      <p className="font-semibold">{method.name}</p>
                      <p className="text-slate-600">Bank: {method.credentials?.bankName}</p>
                      <p className="text-slate-600">Account: {method.credentials?.accountName}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
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
