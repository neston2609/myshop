import { cookies } from "next/headers";
import { CheckoutForm } from "@/components/checkout-form";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/auth";
import { getCart } from "@/lib/cart";
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
  const [cart, session, cookieStore] = await Promise.all([
    getCart(),
    getSession(),
    cookies(),
  ]);
  const methodAccess = session?.role === "ADMIN" ? {} : { isTest: false };
  const [shippingMethods, paymentMethods, siteSettings] = await Promise.all([
    prisma.shippingMethod.findMany({ where: { enabled: true, ...methodAccess }, orderBy: { createdAt: "asc" } }),
    prisma.paymentMethod.findMany({ where: { enabled: true, ...methodAccess }, orderBy: { createdAt: "asc" } }),
    prisma.siteSettings.findFirst({
      select: { remoteAreaFee: true, remotePostalCodes: true },
    }),
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

  return (
    <>
      <SiteHeader />
      <CheckoutForm
        savedAddress={savedAddress}
        cartItems={cart.items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        }))}
        subtotal={cart.subtotal}
        shippingMethods={shippingMethods.map((method) => ({
          id: method.id,
          name: method.name,
          cost: Number(method.cost),
          freeShippingThreshold: method.freeShippingThreshold ? Number(method.freeShippingThreshold) : null,
          isTest: method.isTest,
        }))}
        paymentMethods={paymentMethods.map((method) => ({
          id: method.id,
          name: method.name,
          provider: method.provider,
          additionFeePercent: Number(method.additionFeePercent),
          isTest: method.isTest,
          credentials: method.provider === "BANK_TRANSFER" ? bankTransferCredentials(method.credentialsCiphertext) : null,
        }))}
        settings={{
          remoteAreaFee: siteSettings ? Number(siteSettings.remoteAreaFee) : 50,
          remotePostalCodes: siteSettings?.remotePostalCodes || [],
        }}
      />
    </>
  );
}
