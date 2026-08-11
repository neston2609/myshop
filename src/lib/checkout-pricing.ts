export type PricingShippingMethod = {
  cost: number;
  freeShippingThreshold?: number | null;
};

export type PricingPaymentMethod = {
  additionFeePercent?: number | null;
};

export type PricingSettings = {
  remoteAreaFee: number;
  remotePostalCodes: string[];
};

export function normalizePostalCodes(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.replace(/\D/g, "").trim())
        .filter(Boolean),
    ),
  );
}

export function isRemotePostalCode(postalCode: string, settings: PricingSettings) {
  const normalized = postalCode.replace(/\D/g, "");
  return normalized.length > 0 && settings.remotePostalCodes.includes(normalized);
}

export function calculateShippingCost(params: {
  subtotal: number;
  shippingMethod: PricingShippingMethod;
  postalCode: string;
  settings: PricingSettings;
}) {
  const threshold = params.shippingMethod.freeShippingThreshold ?? null;
  const baseShipping = threshold !== null && params.subtotal >= threshold ? 0 : params.shippingMethod.cost;
  const remoteAreaFee = isRemotePostalCode(params.postalCode, params.settings) ? params.settings.remoteAreaFee : 0;
  return {
    baseShipping,
    remoteAreaFee,
    shippingCost: baseShipping + remoteAreaFee,
    isRemoteArea: remoteAreaFee > 0,
  };
}

export function calculatePaymentFee(subtotal: number, paymentMethod?: PricingPaymentMethod | null) {
  const percent = Math.max(0, Number(paymentMethod?.additionFeePercent || 0));
  return Math.round(subtotal * percent) / 100;
}

export function calculateCheckoutTotal(params: {
  subtotal: number;
  shippingMethod: PricingShippingMethod;
  paymentMethod?: PricingPaymentMethod | null;
  postalCode: string;
  settings: PricingSettings;
}) {
  const shipping = calculateShippingCost(params);
  const paymentFee = calculatePaymentFee(params.subtotal, params.paymentMethod);
  return {
    ...shipping,
    paymentFee,
    total: params.subtotal + shipping.shippingCost + paymentFee,
  };
}
