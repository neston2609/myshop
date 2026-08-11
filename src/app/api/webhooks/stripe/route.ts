import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendOrderEmail } from "@/lib/order-email";
import { readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  const body = await request.text();
  const methods = await prisma.paymentMethod.findMany({
    where: { provider: "STRIPE", enabled: true },
  });

  for (const method of methods) {
    const credentials = readPaymentCredentials(method.credentialsCiphertext);
    if (!credentials.secretKey || !credentials.webhookSecret) continue;

    const stripe = new Stripe(credentials.secretKey);
    try {
      const event = stripe.webhooks.constructEvent(body, signature, credentials.webhookSecret);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (orderId) {
          const current = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: session.payment_status === "paid" ? "PAID" : "PENDING",
              paymentReference: session.id,
              paymentStatus: session.payment_status || session.status || "completed",
            },
          });
          if (session.payment_status === "paid" && current && !["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(current.status)) {
            await sendOrderEmail("payment_paid", orderId);
          }
        }
      }
      return NextResponse.json({ received: true });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "No matching Stripe webhook configuration" }, { status: 400 });
}
