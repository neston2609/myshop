"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { checkoutAction } from "@/app/actions";
import { BankLogo } from "@/components/bank-logo";
import { ThaiAddressFields } from "@/components/thai-address-fields";
import { calculateCheckoutTotal, type PricingSettings } from "@/lib/checkout-pricing";
import { money } from "@/lib/format";
import type { BankTransferCredentials } from "@/lib/payments";

type SavedAddress = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingSubdistrict: string;
  shippingDistrict: string;
  shippingProvince: string;
  shippingPostalCode: string;
};

type ShippingOption = {
  id: string;
  name: string;
  cost: number;
  freeShippingThreshold: number | null;
  isTest: boolean;
};

type PaymentOption = {
  id: string;
  name: string;
  provider: string;
  additionFeePercent: number;
  isTest: boolean;
  credentials: BankTransferCredentials | null;
};

type CartItem = {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
};

export function CheckoutForm({
  savedAddress,
  cartItems,
  subtotal,
  shippingMethods,
  paymentMethods,
  settings,
}: {
  savedAddress: SavedAddress;
  cartItems: CartItem[];
  subtotal: number;
  shippingMethods: ShippingOption[];
  paymentMethods: PaymentOption[];
  settings: PricingSettings;
}) {
  const [postalCode, setPostalCode] = useState(savedAddress.shippingPostalCode);
  const [shippingMethodId, setShippingMethodId] = useState(shippingMethods[0]?.id || "");
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id || "");
  const router = useRouter();

  const selectedShipping = shippingMethods.find((method) => method.id === shippingMethodId) || shippingMethods[0];
  const selectedPayment = paymentMethods.find((method) => method.id === paymentMethodId) || paymentMethods[0];
  const cartIsEmpty = cartItems.length === 0;
  const pricing = useMemo(() => {
    if (!selectedShipping) {
      return { baseShipping: 0, remoteAreaFee: 0, shippingCost: 0, isRemoteArea: false, paymentFee: 0, total: subtotal };
    }
    return calculateCheckoutTotal({
      subtotal,
      shippingMethod: selectedShipping,
      paymentMethod: selectedPayment,
      postalCode,
      settings,
    });
  }, [postalCode, selectedPayment, selectedShipping, settings, subtotal]);

  function handleEmptyCart() {
    window.alert("ไม่มีสินค้าในตะกร้า กรุณาเลือกสินค้าก่อนทำรายการ");
    router.push("/shop");
  }

  return (
    <main className="container-shell grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
      <form action={checkoutAction} className="rounded-lg border border-black/10 bg-white p-6">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <section className="mt-6">
          <h2 className="text-xl font-semibold">ข้อมูลจัดส่ง</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ThaiAddressFields savedAddress={savedAddress} onPostalCodeChange={setPostalCode} />
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-md border border-black/10 bg-slate-50 px-3 py-2 text-sm">
            <input name="saveShippingAddress" type="checkbox" defaultChecked />
            บันทึกที่อยู่นี้ไว้ใช้สำหรับการสั่งซื้อครั้งถัดไป
          </label>
        </section>

        <section className="mt-8 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold">วิธีจัดส่ง</h2>
          <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-800">
            <span>เลือกวิธีจัดส่ง</span>
            <select
              name="shippingMethodId"
              value={shippingMethodId}
              onChange={(event) => setShippingMethodId(event.target.value)}
              required
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-base outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15"
            >
              {shippingMethods.map((method) => {
                const threshold = method.freeShippingThreshold;
                const qualifies = threshold !== null && subtotal >= threshold;
                const label = threshold
                  ? `${method.isTest ? "[TEST] " : ""}${method.name} - ${qualifies ? "ส่งฟรี" : money(method.cost)} (ส่งฟรีเมื่อซื้อครบ ${money(threshold)})`
                  : `${method.isTest ? "[TEST] " : ""}${method.name} - ${money(method.cost)}`;
                return <option key={method.id} value={method.id}>{label}</option>;
              })}
            </select>
          </label>
          {pricing.isRemoteArea ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              รหัสไปรษณีย์นี้อยู่ในพื้นที่ห่างไกล/พิเศษ เพิ่ม {money(pricing.remoteAreaFee)}
            </p>
          ) : null}
        </section>

        <section className="mt-8 border-t border-black/10 pt-6">
          <h2 className="text-xl font-semibold">การชำระเงิน</h2>
          <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-800">
            <span>เลือกวิธีชำระเงิน</span>
            <select
              name="paymentMethodId"
              value={paymentMethodId}
              onChange={(event) => setPaymentMethodId(event.target.value)}
              required
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-base outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15"
            >
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.isTest ? "[TEST] " : ""}{method.name}{method.additionFeePercent > 0 ? ` (+${method.additionFeePercent}%)` : ""}
                </option>
              ))}
            </select>
          </label>
          {selectedPayment?.provider === "BANK_TRANSFER" && selectedPayment.credentials ? (
            <div className="mt-4 grid gap-3 rounded-md border border-black/10 bg-slate-50 p-4">
              <h3 className="font-semibold">รายละเอียดโอนเงินผ่านธนาคาร</h3>
              <div className="flex flex-col gap-3 rounded-md bg-white p-3 sm:flex-row sm:items-center">
                {selectedPayment.credentials.qrCodeUrl ? (
                  <Image src={selectedPayment.credentials.qrCodeUrl} alt={`${selectedPayment.name} QR Code`} width={112} height={112} className="rounded-md border border-black/10 object-contain" />
                ) : null}
                <BankLogo code={selectedPayment.credentials.bankCode} name={selectedPayment.credentials.bankName} />
                <div className="text-sm">
                  <p className="font-semibold">{selectedPayment.credentials.bankName || selectedPayment.name}</p>
                  <p className="text-slate-600">ชื่อบัญชี: {selectedPayment.credentials.accountName}</p>
                  <p className="text-slate-600">เลขบัญชี: {selectedPayment.credentials.accountNumber}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
        <button
          type={cartIsEmpty ? "button" : "submit"}
          onClick={cartIsEmpty ? handleEmptyCart : undefined}
          className="mt-6 h-12 w-full rounded-md bg-[#17201c] font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px"
        >
          Place order
        </button>
      </form>

      <aside className="h-fit rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Order summary</h2>
        <div className="mt-4 space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <span>{item.quantity} x {item.name}</span>
              <strong>{money(item.lineTotal)}</strong>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm">
          <div className="flex justify-between"><span>ราคาสินค้า</span><strong>{money(subtotal)}</strong></div>
          <div className="flex justify-between"><span>ค่าส่ง</span><strong>{money(pricing.baseShipping)}</strong></div>
          {pricing.remoteAreaFee > 0 ? <div className="flex justify-between text-amber-700"><span>พื้นที่ห่างไกล/พิเศษ</span><strong>{money(pricing.remoteAreaFee)}</strong></div> : null}
          {pricing.paymentFee > 0 ? <div className="flex justify-between"><span>ค่าธรรมเนียมจ่ายเงิน</span><strong>{money(pricing.paymentFee)}</strong></div> : null}
          <div className="flex justify-between border-t border-black/10 pt-3 text-base"><span>รวมทั้งสิ้น</span><strong>{money(pricing.total)}</strong></div>
        </div>
      </aside>
    </main>
  );
}
