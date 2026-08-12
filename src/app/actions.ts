"use server";

import type { Prisma } from "@prisma/client";
import { mkdir, writeFile } from "fs/promises";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import path from "path";
import { addCartItem, clearCart, getCart, updateCartItem } from "@/lib/cart";
import { createSession, destroySession, findUserByEmail, findUserByIdentifier, getSession, hashPassword, requireAdmin, requireUser, verifyPassword } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { sanitizeProductHtml } from "@/lib/html";
import { calculateCheckoutTotal, normalizePostalCodes } from "@/lib/checkout-pricing";
import { sendOrderEmail } from "@/lib/order-email";
import { buildPayPalCredentials, buildStripeCredentials, createPayPalOrder, createStripeCheckoutSession, readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { findShippingCarrier } from "@/lib/shipping-carriers";
import {
  aiSchema,
  changePasswordSchema,
  categorySchema,
  checkoutSchema,
  downloadCategorySchema,
  downloadHideRuleSchema,
  downloadSourceSchema,
  forgotPasswordSchema,
  loginSchema,
  orderTrackingSchema,
  paymentProofSchema,
  paymentSchema,
  productSchema,
  registerSchema,
  resetPasswordSchema,
  shippingSchema,
  siteSettingsSchema,
  smtpSchema,
} from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken, hashPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) || "");
}

async function uniqueProductSlug(name: string, sku: string, productId?: string) {
  const baseSlug = slugify(name) || slugify(sku) || `product-${nanoid(8)}`;
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === productId) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }
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

function orderIsPaid(status: string) {
  return ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(status);
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
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/register?message=invalid");
  const input = parsed.data;
  const username = input.username ? input.username.toLowerCase() : null;
  const existing = await findUserByEmail(input.email);
  if (existing) redirect("/register?message=email-taken");
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
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/login?message=invalid");
  const input = parsed.data;
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
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/account?message=password-invalid");
  const input = parsed.data;
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

export async function forgotPasswordAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/forgot-password?message=sent");

  const identifier = parsed.data.identifier.toLowerCase();
  if (!checkRateLimit(`forgot-password:${identifier}`)) redirect("/forgot-password?message=rate-limited");

  const user = await findUserByIdentifier(identifier);
  if (user) {
    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const now = new Date();

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        },
      }),
    ]);

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
      origin: await requestOrigin(),
    });
  }

  redirect("/forgot-password?message=sent");
}

export async function resetPasswordAction(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  const token = formValue(formData, "token");
  if (!parsed.success) redirect(token ? `/reset-password?token=${encodeURIComponent(token)}&message=invalid` : "/reset-password?message=invalid");

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    redirect("/reset-password?message=expired");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });
  });

  redirect("/login?message=password-reset");
}

export async function checkoutAction(formData: FormData) {
  const input = checkoutSchema.parse({ ...Object.fromEntries(formData), saveShippingAddress: formData.has("saveShippingAddress") });
  const cart = await getCart();
  if (cart.items.length === 0) redirect("/cart");

  const session = await getSession();
  const methodAccess = session?.role === "ADMIN" ? {} : { isTest: false };
  const [shippingMethod, paymentMethod, siteSettings] = await Promise.all([
    prisma.shippingMethod.findFirst({ where: { id: input.shippingMethodId, enabled: true, ...methodAccess } }),
    prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, enabled: true, ...methodAccess } }),
    prisma.siteSettings.findFirst({ select: { remoteAreaFee: true, remotePostalCodes: true } }),
  ]);

  if (!shippingMethod || !paymentMethod) redirect("/checkout?message=configuration");

  const pricing = calculateCheckoutTotal({
    subtotal: cart.subtotal,
    shippingMethod: {
      cost: Number(shippingMethod.cost),
      freeShippingThreshold: shippingMethod.freeShippingThreshold ? Number(shippingMethod.freeShippingThreshold) : null,
    },
    paymentMethod: { additionFeePercent: Number(paymentMethod.additionFeePercent) },
    postalCode: input.shippingPostalCode,
    settings: {
      remoteAreaFee: siteSettings ? Number(siteSettings.remoteAreaFee) : 50,
      remotePostalCodes: siteSettings?.remotePostalCodes || [],
    },
  });
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
        shippingCost: pricing.shippingCost,
        remoteAreaFee: pricing.remoteAreaFee,
        paymentFee: pricing.paymentFee,
        total: pricing.total,
        paymentStatus: paymentMethod.provider === "STRIPE" || paymentMethod.provider === "PAYPAL" ? "pending" : paymentMethod.provider === "BANK_TRANSFER" ? "awaiting_transfer" : "manual",
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
  const origin = await requestOrigin();
  await sendOrderEmail("order_created", order.id, { origin });

  if (paymentMethod.provider === "STRIPE") {
    const paymentUrl = await createStripeCheckoutSession({
      method: paymentMethod,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        total: pricing.total,
        shippingCost: pricing.shippingCost,
        paymentFee: pricing.paymentFee,
        items: cart.items.map((item) => ({
          name: item.product.name,
          price: Number(item.product.price),
          quantity: item.quantity,
          total: item.lineTotal,
        })),
      },
      origin,
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
        total: pricing.total,
        shippingCost: pricing.shippingCost,
        paymentFee: pricing.paymentFee,
        items: cart.items.map((item) => ({
          name: item.product.name,
          price: Number(item.product.price),
          quantity: item.quantity,
          total: item.lineTotal,
        })),
      },
      origin,
    });
    await clearCart();
    redirect(paymentUrl);
  }

  await clearCart();
  redirect(`/checkout/success?order=${order.orderNumber}${paymentMethod.provider === "BANK_TRANSFER" ? "&payment=bank-transfer" : ""}`);
}

export async function payOrderAction(formData: FormData) {
  const session = await requireUser();
  const orderId = formValue(formData, "orderId");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: session.id,
    },
    include: { items: true, paymentMethod: true },
  });

  if (!order) redirect("/account?message=order-not-found");
  if (order.status === "CANCELLED") redirect("/account?message=order-cancelled");
  if (orderIsPaid(order.status)) redirect("/account?message=already-paid");
  if (!order.paymentMethod) redirect("/account?message=payment-unavailable");

  const paymentOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    total: Number(order.total),
    shippingCost: Number(order.shippingCost),
    paymentFee: Number(order.paymentFee),
    items: order.items.map((item) => ({
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity,
      total: Number(item.total),
    })),
  };

  if (order.paymentMethod.provider === "STRIPE") {
    redirect(await createStripeCheckoutSession({ method: order.paymentMethod, order: paymentOrder, origin: await requestOrigin() }));
  }

  if (order.paymentMethod.provider === "PAYPAL") {
    redirect(await createPayPalOrder({ method: order.paymentMethod, order: paymentOrder, origin: await requestOrigin() }));
  }

  if (order.paymentMethod.provider === "BANK_TRANSFER") {
    redirect(`/checkout/success?order=${order.orderNumber}&payment=bank-transfer`);
  }

  redirect("/account?message=manual-payment");
}

export async function cancelOrderAction(formData: FormData) {
  const session = await requireUser();
  const orderId = formValue(formData, "orderId");
  if (!orderId) redirect("/account?message=order-not-found");
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: session.id,
    },
    include: { items: true },
  });

  if (!order) redirect("/account?message=order-not-found");
  if (order.status === "CANCELLED") redirect("/account?message=order-cancelled");
  if (orderIsPaid(order.status)) redirect("/account?message=cancel-not-allowed");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", paymentStatus: "cancelled" },
    });

    for (const item of order.items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  });

  await sendOrderEmail("order_cancelled", order.id, { origin: await requestOrigin() });
  revalidatePath("/account");
  revalidatePath("/admin/orders");
  revalidatePath("/shop");
  redirect("/account?message=order-cancelled");
}

export async function updateOrderTrackingAction(formData: FormData) {
  await requireAdmin();
  const input = orderTrackingSchema.parse(Object.fromEntries(formData));
  const carrier = findShippingCarrier(input.trackingCarrierCode);
  if (!carrier) redirect("/admin/orders?message=carrier-invalid");

  const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { status: true } });
  if (!order || !orderIsPaid(order.status)) redirect("/admin/orders?message=tracking-not-allowed");

  await prisma.order.update({
    where: { id: input.orderId },
    data: {
      trackingCarrierCode: carrier.code,
      trackingCarrierName: carrier.name,
      trackingNumber: input.trackingNumber,
      status: "SHIPPED",
    },
  });
  await sendOrderEmail("order_shipped", input.orderId, { origin: await requestOrigin() });
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  redirect("/admin/orders?message=tracking-saved");
}

export async function submitPaymentProofAction(formData: FormData) {
  const session = await requireUser();
  const input = paymentProofSchema.parse(Object.fromEntries(formData));
  const file = formData.get("slip");
  if (!(file instanceof File) || file.size === 0) redirect("/account?message=slip-required");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) redirect("/account?message=slip-type");
  if (file.size > 10 * 1024 * 1024) redirect("/account?message=slip-too-large");

  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      userId: session.id,
    },
    include: { paymentMethod: true },
  });

  if (!order) redirect("/account?message=order-not-found");
  if (order.paymentMethod?.provider !== "BANK_TRANSFER") redirect("/account?message=payment-unavailable");
  if (orderIsPaid(order.status)) redirect("/account?message=already-paid");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `slip-${order.orderNumber}-${nanoid(10)}.${extension}`;
  const target = path.join(/* turbopackIgnore: true */ uploadDir, filename);
  await writeFile(target, Buffer.from(await file.arrayBuffer()));

  const paidAt = new Date(input.paidAt);
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentSlipUrl: `/uploads/${filename}`,
      paymentSlipName: input.payerName,
      paymentSlipBank: input.transferBank,
      paymentSlipAmount: input.transferAmount,
      paymentSlipPaidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
      paymentSlipNote: input.note || null,
      paymentNotifiedAt: new Date(),
      paymentStatus: "proof_submitted",
    },
  });
  await sendOrderEmail("payment_proof_submitted", order.id, { origin: await requestOrigin() });

  revalidatePath("/account");
  revalidatePath("/admin/orders");
  redirect("/account?message=proof-submitted");
}

export async function markOrderPaidAction(formData: FormData) {
  await requireAdmin();
  const orderId = formValue(formData, "orderId");
  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentStatus: "paid",
    },
  });
  await sendOrderEmail("payment_paid", orderId, { origin: await requestOrigin() });
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  redirect("/admin/orders?message=paid-marked");
}

export async function saveProductAction(formData: FormData) {
  await requireAdmin();
  const input = productSchema.parse({ ...Object.fromEntries(formData), active: formData.has("active") });
  const id = formValue(formData, "id");
  const existingProduct = id ? await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } }) : null;
  if (id && !existingProduct) redirect("/admin/products?message=product-not-found");
  const existingSku = await prisma.product.findUnique({ where: { sku: input.sku }, select: { id: true } });
  if (existingSku && existingSku.id !== id) redirect("/admin/products?message=sku-taken");
  const slug = await uniqueProductSlug(input.name, input.sku, id || undefined);
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
  if (existingProduct?.slug && existingProduct.slug !== product.slug) revalidatePath(`/products/${existingProduct.slug}`);
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/");
  redirect("/admin/products?message=product-saved");
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const id = formValue(formData, "id");
  if (!id) return;

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, slug: true } });
  if (!product) redirect("/admin/products?message=product-not-found");

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { productId: id } });
    await tx.wishlistItem.deleteMany({ where: { productId: id } });
    await tx.review.deleteMany({ where: { productId: id } });
    await tx.productMedia.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/");
  redirect("/admin/products?message=product-deleted");
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
  await requireAdmin();
  const input = shippingSchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled"), isTest: formData.has("isTest") });
  const id = formValue(formData, "id");
  const data = {
    name: input.name,
    regions: input.regions.split(",").map((item) => item.trim()).filter(Boolean),
    cost: input.cost,
    freeShippingThreshold: input.freeShippingThreshold ?? null,
    enabled: input.enabled,
    isTest: input.isTest,
  };
  if (id) await prisma.shippingMethod.update({ where: { id }, data });
  else await prisma.shippingMethod.create({ data });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}

export async function toggleShippingAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.shippingMethod.delete({ where: { id } });
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}

export async function savePaymentAction(formData: FormData) {
  await requireAdmin();
  const input = paymentSchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled"), isTest: formData.has("isTest") });
  const id = formValue(formData, "id");
  const current = id ? await prisma.paymentMethod.findUnique({ where: { id } }) : null;
  const existingCredentials = readPaymentCredentials(current?.credentialsCiphertext);
  let credentials: Record<string, string> | null = null;

  if (input.provider === "BANK_TRANSFER") {
    credentials = {
      bankCode: input.bankCode?.trim() || "",
      bankName: input.bankName?.trim() || "",
      accountName: input.accountName?.trim() || "",
      accountNumber: input.accountNumber?.trim() || "",
      bankLogoUrl: input.bankLogoUrl || existingCredentials.bankLogoUrl || "",
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
    isTest: input.isTest,
    additionFeePercent: input.additionFeePercent,
    credentialsCiphertext: credentials ? encryptSecret(JSON.stringify(credentials)) : null,
  };

  if (current) await prisma.paymentMethod.update({ where: { id: current.id }, data });
  else await prisma.paymentMethod.create({ data });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}

export async function togglePaymentAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
    orderNotificationEmail: input.orderNotificationEmail || null,
    remoteAreaFee: input.remoteAreaFee,
    remotePostalCodes: normalizePostalCodes(input.remotePostalCodes || ""),
    liveChatEnabled: input.liveChatEnabled,
    liveChatRetentionDays: input.liveChatRetentionDays,
    lineOaId: input.lineOaId.startsWith("@") ? input.lineOaId : `@${input.lineOaId}`,
    lineChatPrompt: input.lineChatPrompt,
    lineChannelTokenCiphertext: input.lineChannelAccessToken?.trim()
      ? encryptSecret(input.lineChannelAccessToken.trim())
      : current?.lineChannelTokenCiphertext || null,
    lineChannelSecretCiphertext: input.lineChannelSecret?.trim()
      ? encryptSecret(input.lineChannelSecret.trim())
      : current?.lineChannelSecretCiphertext || null,
    lineAdminRecipientId: input.lineAdminRecipientId?.trim() || null,
    lineNotifyProductContext: input.lineNotifyProductContext,
  };
  if (current) await prisma.siteSettings.update({ where: { id: current.id }, data });
  else await prisma.siteSettings.create({ data });
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function saveDownloadSourceAction(formData: FormData) {
  await requireAdmin();
  const input = downloadSourceSchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled") });
  const id = formValue(formData, "id");
  const current = id ? await prisma.downloadSource.findUnique({ where: { id } }) : null;
  const data = {
    name: input.name,
    protocol: input.protocol,
    enabled: input.enabled,
    host: input.host,
    port: input.port || (input.protocol === "sftp" ? 22 : 21),
    username: input.username,
    basePath: input.basePath || "/",
    passwordCiphertext: input.password?.trim() ? encryptSecret(input.password.trim()) : current?.passwordCiphertext || null,
  };
  if (current) await prisma.downloadSource.update({ where: { id: current.id }, data });
  else await prisma.downloadSource.create({ data });
  revalidatePath("/admin/downloads");
  revalidatePath("/downloads");
}

export async function deleteDownloadSourceAction(formData: FormData) {
  await requireAdmin();
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.downloadSource.delete({ where: { id } });
  revalidatePath("/admin/downloads");
  revalidatePath("/downloads");
}

export async function saveDownloadCategoryAction(formData: FormData) {
  await requireAdmin();
  const input = downloadCategorySchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled") });
  const id = formValue(formData, "id");
  const fallbackSlug = `download-${nanoid(6).toLowerCase()}`;
  const data = {
    name: input.name,
    slug: slugify(input.slug || input.name) || fallbackSlug,
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    sourceId: input.sourceId,
    remotePath: input.remotePath,
    position: input.position,
    enabled: input.enabled,
  };
  if (id) await prisma.downloadCategory.update({ where: { id }, data });
  else await prisma.downloadCategory.create({ data });
  revalidatePath("/admin/downloads");
  revalidatePath("/downloads");
}

export async function deleteDownloadCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.downloadCategory.delete({ where: { id } });
  revalidatePath("/admin/downloads");
  revalidatePath("/downloads");
}

export async function saveDownloadHideRuleAction(formData: FormData) {
  await requireAdmin();
  const input = downloadHideRuleSchema.parse({ ...Object.fromEntries(formData), enabled: formData.has("enabled") });
  const id = formValue(formData, "id");
  const data = {
    pattern: input.pattern,
    enabled: input.enabled,
    position: input.position,
  };
  if (id) await prisma.downloadHideRule.update({ where: { id }, data });
  else await prisma.downloadHideRule.create({ data });
  revalidatePath("/admin/downloads");
  revalidatePath("/downloads");
}

export async function deleteDownloadHideRuleAction(formData: FormData) {
  await requireAdmin();
  const id = formValue(formData, "id");
  if (!id) return;
  await prisma.downloadHideRule.delete({ where: { id } });
  revalidatePath("/admin/downloads");
  revalidatePath("/downloads");
}
