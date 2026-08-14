import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const discountCodeCookie = "myshop_discount_code";

export function normalizeDiscountCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function calculateDiscount(input: {
  type: string;
  value: number;
  maximumDiscount?: number | null;
  subtotal: number;
}) {
  const raw = input.type === "PERCENT"
    ? input.subtotal * Math.min(100, Math.max(0, input.value)) / 100
    : Math.max(0, input.value);
  const capped = input.maximumDiscount != null ? Math.min(raw, input.maximumDiscount) : raw;
  return Math.min(input.subtotal, Math.round(capped * 100) / 100);
}

export async function evaluateDiscountCode(rawCode: string, subtotal: number) {
  const code = normalizeDiscountCode(rawCode);
  if (!code) return { valid: false as const, reason: "missing" as const };

  const discountCode = await prisma.discountCode.findUnique({ where: { code } });
  if (!discountCode || !discountCode.active) return { valid: false as const, reason: "invalid" as const };
  if (discountCode.expiresAt && discountCode.expiresAt <= new Date()) {
    return { valid: false as const, reason: "expired" as const };
  }

  const minimumSubtotal = discountCode.minimumSubtotal ? Number(discountCode.minimumSubtotal) : 0;
  if (subtotal < minimumSubtotal) {
    return { valid: false as const, reason: "minimum" as const, minimumSubtotal };
  }

  const amount = calculateDiscount({
    type: discountCode.type,
    value: Number(discountCode.value),
    maximumDiscount: discountCode.maximumDiscount ? Number(discountCode.maximumDiscount) : null,
    subtotal,
  });
  if (amount <= 0) return { valid: false as const, reason: "invalid" as const };

  return {
    valid: true as const,
    code: discountCode.code,
    amount,
    discountCode,
  };
}

export async function getAppliedDiscount(subtotal: number) {
  const store = await cookies();
  const code = store.get(discountCodeCookie)?.value || "";
  return evaluateDiscountCode(code, subtotal);
}

