"use server";

import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { addCartItem, clearCart, getCart, updateCartItem } from "@/lib/cart";
import { createSession, destroySession, findUserByEmail, findUserByIdentifier, getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { sanitizeProductHtml } from "@/lib/html";
import { buildPayPalCredentials, buildStripeCredentials, createPayPalOrder, createStripeCheckoutSession, readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import {
  aiSchema,
  changePasswordSchema,
  categorySchema,
  checkoutSchema,
  loginSchema,
  paymentSchema,
  productSchema,
  registerSchema,
  shippingSchema,
  siteSettingsSchema,
  smtpSchema,
} from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) || "");
}

const savedShippingCookie = "myshop_shipping_address";

type CheckoutAddressInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingSubdistrict: string;
  shippingDistrict: string;
  shippingProvince: string;
  shippingPostalCode: string;
  saveShippingAddress: boolean;
};

async function rememberShippingAddress(input: CheckoutAddressInput, userId?: string) {
  const store = await cookies();
  if (!input.saveShippingAddress) {
    store.delete(savedShippingCookie);
    return;
  }

  const savedAddress = {
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    shippingAddress: input.shippingAddress,
    shippingSubdistrict: input.shippingSubdistrict,
    shippingDistrict: input.shippingDistrict,
    shippingProvince: input.shippingProvince,
    shippingPostalCode: input.shippingPostalCode,
  };

  store.set(savedShippingCookie, JSON.stringify(savedAddress), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        shippingName: input.customerName,
        phone: input.customerPhone,
        address: input.shippingAddress,
        subdistrict: input.shippingSubdistrict,
        district: input.shippingDistrict,
        province: input.shippingProvince,
        postalCode: input.shippingPostalCode,
        city: input.shippingProvince,
        country: "Thailand",
      },
    });
  }
}

function uploadedImageUrls(input: { imageUrl?: string; imageUrls?: string }) {
  const urls = new Set<string>();
  try {
    const parsed = JSON.parse(input.imageUrls || "[]") as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string" && (item.startsWith("/uploads/") || item.startsWith("http://") || item.startsWith("https://"))) {
          urls.add(item);
        }
      }
    }
  } catch {
    // Fall back to the single-image field below.
  }

  if (input.imageUrl) urls.add(input.imageUrl);
  return [...urls].slice(0, 12);
}

async function requestOrigin() {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function addToCartAction(formData: FormData) {
  await addCartItem(formValue(formData, "productId"), Number(formData.get("quantity") || 1));
  revalidatePath("/cart");
}

export async function updateCartAction(formData: FormData) {
  await updateCartItem(formValue(formData, "productId"), Number(formData.get("quantity") || 0));
  revalidatePath("/cart");
}

export async function registerAction(formData: FormData) {
  const input = registerSchema.parse(Object.fromEntries(formData));
  const username = input.username ? input.username.toLowerCase() : null;
  const existing = await findUserByEmail(input.email);
  if (existing) redirect("/login?message=account-exists");
  if (username) {
    const usernameTaken = await prisma.user.findUnique({ where: { username } });
    if (usernameTaken) redirect("/register?message=username-taken");
  }
  const user = await prisma.user.create({
    data: {
      name: input.name,
      username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });
  await createSession({ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role });
  redirect("/account");
}

export async function loginAction(formData: FormData) {
  const input = loginSchema.parse(Object.fromEntries(formData));
  if (!checkRateLimit(`login:${input.identifier.toLowerCase()}`)) redirect("/login?message=rate-limited");
  const user = await findUserByIdentifier(input.identifier);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    redirect("/login?message=invalid");
  }
  await createSession({ id: user.id, name: user.name, username: user.username, email: user.email, role: user.role });
  redirect(user.role === "ADMIN" ? "/admin" : "/account");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const input = changePasswordSchema.parse(Object.fromEntries(formData));
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    redirect("/account?message=password-invalid");
  }

  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
  redirect("/account?message=password-changed");
}

export async function checkoutAction(formData: FormData) {
  const input = checkoutSchema.parse({ ...Object.fromEntries(formData), saveShippingAddress: formData.has("saveShippingAddress") });
  const cart = await getCart();
  if (cart.items.length === 0) redirect("/cart");

  const [shippingMethod, paymentMethod, session] = await Promise.all([
    prisma.shippingMethod.findFirst({ where: { id: input.shippingMethodId, enabled: true } }),
    prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, enabled: true } }),
    getSession(),
  ]);

  if (!shippingMethod || !paymentMethod) redirect("/checkout?message=configuration");

  const baseShippingCost = Number(shippingMethod.cost);
  const freeShippingThreshold = shippingMethod.freeShippingThreshold ? Number(shippingMethod.freeShippingThreshold) : null;
  const shippingCost = freeShippingThreshold && cart.subtotal >= freeShippingThreshold ? 0 : baseShippingCost;
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: `MS-${nanoid(8).toUpperCase()}`,
        userId: session?.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress,
        shippingSubdistrict: input.shippingSubdistrict,
        shippingDistrict: input.shippingDistrict,
        shippingProvince: input.shippingProvince,
        shippingPostalCode: input.shippingPostalCode,
        shippingCity: input.shippingProvince,
        shippingCountry: "Thailand",
        subtotal: cart.subtotal,
        shippingCost,
        total: cart.subtotal + shippingCost,
        paymentStatus: paymentMethod.provider === "STRIPE" || paymentMethod.provider === "PAYPAL" ? "pending" : "manual",
        shippingMethodId: shippingMethod.id,
        paymentMethodId: paymentMethod.id,
        items: {
          create: cart.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            price: item.product.price,
            quantity: item.quantity,
            total: item.lineTotal,
          })),
        },
      },
    });

    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.product.id },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return created;
  });

  await rememberShippingAddress(input, session?.id);

  if (paymentMethod.provider === "STRIPE") {
    const paymentUrl = await createStripeCheckoutSession({
      method: paymentMethod,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        total: cart.subtotal + shippingCost,
        shippingCost,
        items: cart.items.map((item) => ({
          name: item.product.name,
          price: Number(item.product.price),
          quantity: item.quantity,
          total: item.lineTotal,
        })),
      },
      origin: await requestOrigin(),
    });
    await clearCart();
    redirect(paymentUrl);
  }

  if (paymentMethod.provider === "PAYPAL") {
    const paymentUrl = await createPayPalOrder({
      method: paymentMethod,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        total: cart.subtotal + shippingCost,
        shippingCost,
        items: cart.items.map((item) => ({
          name: item.product.name,
          price: Number(item.product.price),
          quantity: item.quantity,
          total: item.lineTotal,
        })),
      },
      origin: await requestOrigin(),
    });
    await clearCart();
    redirect(paymentUrl);
  }

  await clearCart();
  redirect(`/checkout/success?order=${order.orderNumber}`);
}

export async function saveProductAction(formData: FormData) {
  const input = productSchema.parse({ ...Object.fromEntries(formData), active: formData.has("active") });
  const id = formValue(formData, "id");
  const slug = slugify(input.name);
  const data = {
    name: input.name,
    slug,
    description: sanitizeProductHtml(input.description),
    price: input.price,
    sku: input.sku,
    stock: input.stock,
    categoryId: input.categoryId,
    active: input.active,
  };

  const product = id
    ? await prisma.product.update({ where: { id }, data })
    : await prisma.product.create({ data });

  await prisma.productMedia.deleteMany({ where: { productId: product.id } });
  const imageUrls = uploadedImageUrls(input);
  const media: Prisma.ProductMediaCreateManyInput[] = imageUrls.map((url, index) => ({ productId: product.id, type: "IMAGE", url, alt: input.name, sortOrder: index }));
  if (input.youtubeUrl) media.push({ productId: product.id, type: "YOUTUBE" as const, url: input.youtubeUrl, alt: input.name, sortOrder: imageUrls.length });
  if (media.length) await prisma.productMedia.createMany({ data: media });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/");
}

export async function deleteProductAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) return;

  const [orderItems, cartItems] = await Promise.all([
    prisma.orderItem.count({ where: { productId: id } }),
    prisma.cartItem.count({ where: { productId: id } }),
  ]);

  if (orderItems || cartItems) {
    await prisma.product.update({
      where: { id },
      data: { active: false },
    });
  } else {
    await prisma.product.delete({ where: { id } });
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function saveCategoryAction(formData: FormData) {
  const input = categorySchema.parse({ ...Object.fromEntries(formData), active: formData.has("active") });
  const id = formValue(formData, "id");
  const data = {
    name: input.name,
    slug: slugify(input.name),
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    active: input.active,
  };
  if (id) await prisma.category.update({ where: { id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function deleteCategoryAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) return;

  const products = await prisma.product.count({ where: { categoryId: id } });
  if (products) {
    await prisma.category.update({
      where: { id },
      data: { active: false },
    });
  } else {
    await prisma.category.delete({ where: { id } });
  }

  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  revalidatePath("/");
}

export async function saveShippingAction(formData: FormData) {
  const input = shippingSchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled") });
  const id = formValue(formData, "id");
  const data = {
    name: input.name,
    regions: input.regions.split(",").map((item) => item.trim()).filter(Boolean),
    cost: input.cost,
    freeShippingThreshold: input.freeShippingThreshold ?? null,
    enabled: input.enabled,
  };
  if (id) await prisma.shippingMethod.update({ where: { id }, data });
  else await prisma.shippingMethod.create({ data });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}

export async function toggleShippingAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.shippingMethod.update({
    where: { id },
    data: { enabled: formValue(formData, "enabled") === "true" },
  });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}

export async function deleteShippingAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.shippingMethod.delete({ where: { id } });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}

export async function savePaymentAction(formData: FormData) {
  const input = paymentSchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled") });
  const id = formValue(formData, "id");
  const current = id ? await prisma.paymentMethod.findUnique({ where: { id } }) : null;
  const existingCredentials = readPaymentCredentials(current?.credentialsCiphertext);
  let credentials: Record<string, string> | null = null;

  if (input.provider === "BANK_TRANSFER") {
    credentials = {
      bankName: input.bankName?.trim() || "",
      accountName: input.accountName?.trim() || "",
      qrCodeUrl: input.qrCodeUrl || existingCredentials.qrCodeUrl || "",
    };
  } else if (input.provider === "STRIPE") {
    credentials = buildStripeCredentials(input, existingCredentials);
    if (!credentials.secretKey) throw new Error("Stripe secret key is required.");
  } else if (input.provider === "PAYPAL") {
    credentials = buildPayPalCredentials(input, existingCredentials);
    if (!credentials.clientId || !credentials.clientSecret) throw new Error("PayPal client ID and secret are required.");
  } else if (input.provider === "CUSTOM") {
    credentials = { raw: input.credentials?.trim() || existingCredentials.raw || "" };
  }

  const data = {
    name: input.name,
    provider: input.provider,
    enabled: input.enabled,
    credentialsCiphertext: credentials ? encryptSecret(JSON.stringify(credentials)) : null,
  };

  if (current) await prisma.paymentMethod.update({ where: { id: current.id }, data });
  else await prisma.paymentMethod.create({ data });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}

export async function togglePaymentAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.paymentMethod.update({
    where: { id },
    data: { enabled: formValue(formData, "enabled") === "true" },
  });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}

export async function deletePaymentAction(formData: FormData) {
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.paymentMethod.delete({ where: { id } });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}

export async function saveSmtpAction(formData: FormData) {
  const input = smtpSchema.parse(Object.fromEntries(formData));
  await prisma.smtpSettings.deleteMany();
  await prisma.smtpSettings.create({
    data: {
      host: input.host,
      port: input.port,
      username: input.username,
      passwordCiphertext: encryptSecret(input.password),
      secure: input.secure,
      senderEmail: input.senderEmail,
      senderName: input.senderName,
      enabled: input.enabled,
    },
  });
  revalidatePath("/admin/settings/smtp");
}

export async function saveAiAction(formData: FormData) {
  const input = aiSchema.parse(Object.fromEntries(formData));
  const current = await prisma.aiSettings.findFirst();
  const apiKeyCiphertext = input.apiKey?.trim()
    ? encryptSecret(input.apiKey.trim())
    : current?.apiKeyCiphertext;

  if (!apiKeyCiphertext) throw new Error("API key is required before saving AI settings.");

  const data = {
    provider: input.provider,
    customEndpoint: input.customEndpoint || null,
    apiKeyCiphertext,
    activeModel: input.activeModel || null,
    enabled: input.enabled,
    models: current?.provider === input.provider ? current.models : [],
  };

  if (current) await prisma.aiSettings.update({ where: { id: current.id }, data });
  else await prisma.aiSettings.create({ data });
  revalidatePath("/admin/settings/ai");
}

export async function saveSiteSettingsAction(formData: FormData) {
  const input = siteSettingsSchema.parse(Object.fromEntries(formData));
  const current = await prisma.siteSettings.findFirst();
  const data = {
    shopName: input.shopName,
    logoUrl: input.logoUrl || null,
    faviconUrl: input.faviconUrl || null,
    brandColor: input.brandColor,
    themeMode: input.themeMode,
    fontFamily: input.fontFamily,
    headerLinks: input.headerLinks || "",
    heroEyebrow: input.heroEyebrow,
    heroTitle: input.heroTitle,
    heroSubtitle: input.heroSubtitle,
    featureOneTitle: input.featureOneTitle,
    featureOneBody: input.featureOneBody,
    featureTwoTitle: input.featureTwoTitle,
    featureTwoBody: input.featureTwoBody,
    featureThreeTitle: input.featureThreeTitle,
    featureThreeBody: input.featureThreeBody,
    footerText: input.footerText || "",
    supportEmail: input.supportEmail || null,
  };
  if (current) await prisma.siteSettings.update({ where: { id: current.id }, data });
  else await prisma.siteSettings.create({ data });
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/settings");
}
