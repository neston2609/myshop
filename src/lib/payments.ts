import Stripe from "stripe";
import type { PaymentMethod } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export type BankTransferCredentials = {
  bankName?: string;
  accountName?: string;
  qrCodeUrl?: string;
};

export type StripeCredentials = {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
};

export type PayPalCredentials = {
  clientId?: string;
  clientSecret?: string;
  environment?: "sandbox" | "live";
};

export type CustomPaymentCredentials = {
  raw?: string;
};

export type PaymentCredentials = BankTransferCredentials & StripeCredentials & PayPalCredentials & CustomPaymentCredentials;

export type CheckoutOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  total: number;
  shippingCost: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    total: number;
  }>;
};

export function readPaymentCredentials(credentials?: string | null): PaymentCredentials {
  if (!credentials) return {};
  try {
    return JSON.parse(decryptSecret(credentials)) as PaymentCredentials;
  } catch {
    return {};
  }
}

function toMinorUnits(value: number) {
  return Math.round(value * 100);
}

export function buildStripeCredentials(input: {
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
}, existing: PaymentCredentials = {}): StripeCredentials {
  return {
    secretKey: input.stripeSecretKey?.trim() || existing.secretKey || "",
    publishableKey: input.stripePublishableKey?.trim() || existing.publishableKey || "",
    webhookSecret: input.stripeWebhookSecret?.trim() || existing.webhookSecret || "",
  };
}

export function buildPayPalCredentials(input: {
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalEnvironment?: "sandbox" | "live";
}, existing: PaymentCredentials = {}): PayPalCredentials {
  return {
    clientId: input.paypalClientId?.trim() || existing.clientId || "",
    clientSecret: input.paypalClientSecret?.trim() || existing.clientSecret || "",
    environment: input.paypalEnvironment || existing.environment || "sandbox",
  };
}

export async function createStripeCheckoutSession(params: {
  method: PaymentMethod;
  order: CheckoutOrder;
  origin: string;
}) {
  const credentials = readPaymentCredentials(params.method.credentialsCiphertext);
  if (!credentials.secretKey) throw new Error("Stripe secret key is missing.");

  const stripe = new Stripe(credentials.secretKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "thb",
    customer_email: params.order.customerEmail,
    success_url: `${params.origin}/checkout/success?order=${encodeURIComponent(params.order.orderNumber)}&stripe_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/checkout?message=payment-cancelled`,
    metadata: {
      orderId: params.order.id,
      orderNumber: params.order.orderNumber,
    },
    line_items: [
      ...params.order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "thb",
          unit_amount: toMinorUnits(item.price),
          product_data: {
            name: item.name.slice(0, 250),
          },
        },
      })),
      {
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: toMinorUnits(params.order.shippingCost),
          product_data: {
            name: "Shipping",
          },
        },
      },
    ],
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  await prisma.order.update({
    where: { id: params.order.id },
    data: { paymentReference: session.id, paymentStatus: session.payment_status || "unpaid" },
  });
  return session.url;
}

function paypalBaseUrl(environment?: "sandbox" | "live") {
  return environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(credentials: PayPalCredentials) {
  if (!credentials.clientId || !credentials.clientSecret) throw new Error("PayPal client ID or secret is missing.");
  const response = await fetch(`${paypalBaseUrl(credentials.environment)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`PayPal authentication failed (${response.status}).`);
  const data = await response.json();
  if (!data.access_token) throw new Error("PayPal did not return an access token.");
  return String(data.access_token);
}

export async function createPayPalOrder(params: {
  method: PaymentMethod;
  order: CheckoutOrder;
  origin: string;
}) {
  const credentials = readPaymentCredentials(params.method.credentialsCiphertext) as PayPalCredentials;
  const accessToken = await getPayPalAccessToken(credentials);
  const site = await prisma.siteSettings.findFirst({ select: { shopName: true } });
  const itemTotal = params.order.items.reduce((total, item) => total + item.price * item.quantity, 0);
  const amount = params.order.total.toFixed(2);

  const response = await fetch(`${paypalBaseUrl(credentials.environment)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.order.orderNumber,
          invoice_id: params.order.orderNumber,
          amount: {
            currency_code: "THB",
            value: amount,
            breakdown: {
              item_total: { currency_code: "THB", value: itemTotal.toFixed(2) },
              shipping: { currency_code: "THB", value: params.order.shippingCost.toFixed(2) },
            },
          },
          items: params.order.items.map((item) => ({
            name: item.name.slice(0, 127),
            quantity: String(item.quantity),
            unit_amount: { currency_code: "THB", value: item.price.toFixed(2) },
          })),
        },
      ],
      application_context: {
        brand_name: site?.shopName || "Japan Toy Shop",
        shipping_preference: "GET_FROM_FILE",
        user_action: "PAY_NOW",
        return_url: `${params.origin}/checkout/success?order=${encodeURIComponent(params.order.orderNumber)}`,
        cancel_url: `${params.origin}/checkout?message=payment-cancelled`,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`PayPal order creation failed (${response.status}).`);
  const data = await response.json();
  const approvalUrl = (data.links || []).find((link: { rel?: string; href?: string }) => link.rel === "approve")?.href;
  if (!data.id || !approvalUrl) throw new Error("PayPal did not return an approval URL.");

  await prisma.order.update({
    where: { id: params.order.id },
    data: { paymentReference: data.id, paymentStatus: data.status || "CREATED" },
  });
  return approvalUrl;
}

export async function confirmStripeCheckout(method: PaymentMethod, sessionId: string) {
  const credentials = readPaymentCredentials(method.credentialsCiphertext);
  if (!credentials.secretKey) throw new Error("Stripe secret key is missing.");

  const stripe = new Stripe(credentials.secretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    paid: session.payment_status === "paid",
    status: session.payment_status || session.status || "unknown",
    reference: session.id,
  };
}

export async function capturePayPalOrder(method: PaymentMethod, paypalOrderId: string) {
  const credentials = readPaymentCredentials(method.credentialsCiphertext) as PayPalCredentials;
  const accessToken = await getPayPalAccessToken(credentials);
  const response = await fetch(`${paypalBaseUrl(credentials.environment)}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`PayPal capture failed (${response.status}).`);
  const data = await response.json();
  return {
    paid: data.status === "COMPLETED",
    status: data.status || "unknown",
    reference: data.id || paypalOrderId,
  };
}
