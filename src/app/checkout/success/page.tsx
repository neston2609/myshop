import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { confirmStripeCheckout, capturePayPalOrder } from "@/lib/payments";
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
  if (order.status === "PAID") return { status: "paid", message: "Payment confirmed." };
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
          <Link href="/account" className="mt-6 inline-flex h-11 items-center rounded-md bg-[#17201c] px-5 font-semibold text-white">View account</Link>
        </div>
      </main>
    </>
  );
}
