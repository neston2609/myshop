import Image from "next/image";
import Link from "next/link";
import { BankLogo } from "@/components/bank-logo";
import { SiteHeader } from "@/components/site-header";
import { money } from "@/lib/format";
import { confirmStripeCheckout, capturePayPalOrder } from "@/lib/payments";
import { readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

type SuccessPageProps = {
  searchParams: Promise<{ order?: string; stripe_session_id?: string; token?: string }>;
};

async function confirmPayment(params: { orderNumber?: string; stripeSessionId?: string; paypalToken?: string }) {
  if (!params.orderNumber) return { status: "missing", message: "Missing order reference." };

  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { paymentMethod: true },
  });
  if (!order) return { status: "missing", message: "Order not found." };
  if (["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(order.status)) return { status: "paid", message: "Payment confirmed." };
  if (!order.paymentMethod) return { status: "pending", message: "Order received." };

  try {
    if (order.paymentMethod.provider === "STRIPE" && params.stripeSessionId) {
      const result = await confirmStripeCheckout(order.paymentMethod, params.stripeSessionId);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: result.paid ? "PAID" : order.status,
          paymentReference: result.reference,
          paymentStatus: result.status,
        },
      });
      return result.paid
        ? { status: "paid", message: "Stripe payment confirmed." }
        : { status: "pending", message: `Stripe payment status: ${result.status}.` };
    }

    if (order.paymentMethod.provider === "PAYPAL" && params.paypalToken) {
      const result = await capturePayPalOrder(order.paymentMethod, params.paypalToken);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: result.paid ? "PAID" : order.status,
          paymentReference: result.reference,
          paymentStatus: result.status,
        },
      });
      return result.paid
        ? { status: "paid", message: "PayPal payment captured." }
        : { status: "pending", message: `PayPal payment status: ${result.status}.` };
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Payment confirmation failed.",
    };
  }

  return { status: "pending", message: "Order received. Payment is pending." };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const payment = await confirmPayment({
    orderNumber: params.order,
    stripeSessionId: params.stripe_session_id,
    paypalToken: params.token,
  });
  const order = params.order
    ? await prisma.order.findUnique({
        where: { orderNumber: params.order },
        include: { paymentMethod: true },
      })
    : null;
  const credentials = order?.paymentMethod?.provider === "BANK_TRANSFER"
    ? readPaymentCredentials(order.paymentMethod.credentialsCiphertext)
    : null;

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-16">
        <div className="mx-auto max-w-xl rounded-lg border border-black/10 bg-white p-8 text-center">
          <h1 className="text-3xl font-semibold">Order received</h1>
          <p className="mt-3 text-slate-600">Thanks for your order. Reference: <strong>{params.order}</strong></p>
          <p className={payment.status === "error" ? "mt-3 text-sm text-red-600" : "mt-3 text-sm text-slate-600"}>
            {payment.message}
          </p>
          {order?.paymentMethod?.provider === "BANK_TRANSFER" && credentials ? (
            <div className="mt-6 grid gap-4 rounded-md border border-black/10 bg-slate-50 p-4 text-left">
              <div className="flex items-center gap-3">
                <BankLogo code={credentials.bankCode} name={credentials.bankName} />
                <div>
                  <p className="font-semibold">โอนเงินผ่านธนาคาร</p>
                  <p className="text-sm text-slate-600">{credentials.bankName}</p>
                </div>
              </div>
              {credentials.qrCodeUrl ? (
                <Image src={credentials.qrCodeUrl} alt="Bank transfer QR code" width={220} height={220} className="mx-auto rounded-md border border-black/10 bg-white object-contain" />
              ) : null}
              <div className="grid gap-1 text-sm text-slate-700">
                <p>ชื่อบัญชี: <strong>{credentials.accountName}</strong></p>
                <p>เลขบัญชี: <strong>{credentials.accountNumber}</strong></p>
                <p>ยอดชำระ: <strong>{money(order.total)}</strong></p>
              </div>
              <Link href="/account" className="inline-flex h-10 items-center justify-center rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white">
                แจ้งชำระเงิน
              </Link>
            </div>
          ) : null}
          <Link href="/account" className="mt-6 inline-flex h-11 items-center rounded-md bg-[#17201c] px-5 font-semibold text-white">View account</Link>
        </div>
      </main>
    </>
  );
}
