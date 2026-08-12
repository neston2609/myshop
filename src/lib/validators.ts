import { z } from "zod";

export const emailSchema = z.string().email().toLowerCase();
const uploadedImageSchema = z
  .string()
  .refine((value) => value === "" || value.startsWith("/uploads/") || z.url().safeParse(value).success, {
    message: "Use an uploaded image or a valid URL",
  });

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional()
    .or(z.literal("")),
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(128),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((input) => input.newPassword === input.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3).max(120),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(200),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((input) => input.newPassword === input.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerEmail: emailSchema,
  customerPhone: z.string().min(6).max(40),
  shippingAddress: z.string().min(6).max(240),
  shippingSubdistrict: z.string().min(2).max(80),
  shippingDistrict: z.string().min(2).max(80),
  shippingProvince: z.string().min(2).max(80),
  shippingPostalCode: z.string().min(4).max(12),
  shippingMethodId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  saveShippingAddress: z.coerce.boolean().default(true),
});

export const productSchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  sku: z.string().min(2).max(64),
  stock: z.coerce.number().int().min(0),
  categoryId: z.string().min(1),
  active: z.coerce.boolean().default(true),
  imageUrl: uploadedImageSchema.optional(),
  imageUrls: z.string().optional(),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(240).optional(),
  imageUrl: uploadedImageSchema.optional(),
  active: z.coerce.boolean().default(true),
});

export const shippingSchema = z.object({
  name: z.string().min(2).max(100),
  regions: z.string().min(2),
  cost: z.coerce.number().min(0),
  freeShippingThreshold: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(0).optional()),
  enabled: z.coerce.boolean().default(true),
  isTest: z.coerce.boolean().default(false),
});

export const orderTrackingSchema = z.object({
  orderId: z.string().min(1),
  trackingCarrierCode: z.string().min(1).max(80),
  trackingNumber: z.string().trim().min(3).max(100),
});

export const paymentProofSchema = z.object({
  orderId: z.string().min(1),
  payerName: z.string().trim().min(2).max(120),
  transferBank: z.string().trim().min(2).max(100),
  transferAmount: z.coerce.number().positive(),
  paidAt: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
});

export const paymentSchema = z.object({
  name: z.string().min(2).max(100),
  provider: z.enum(["CASH_ON_DELIVERY", "BANK_TRANSFER", "STRIPE", "PAYPAL", "CUSTOM"]),
  enabled: z.coerce.boolean().default(true),
  isTest: z.coerce.boolean().default(false),
  additionFeePercent: z.coerce.number().min(0).max(100).default(0),
  credentials: z.string().optional(),
  bankCode: z.string().max(40).optional(),
  bankName: z.string().max(100).optional(),
  accountName: z.string().max(140).optional(),
  accountNumber: z.string().max(80).optional(),
  bankLogoUrl: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  paypalEnvironment: z.enum(["sandbox", "live"]).default("sandbox"),
}).superRefine((input, context) => {
  if (input.provider === "BANK_TRANSFER" && !input.bankName?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Bank name is required",
      path: ["bankName"],
    });
  }
  if (input.provider === "BANK_TRANSFER" && !input.accountName?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Account name is required",
      path: ["accountName"],
    });
  }
  if (input.provider === "BANK_TRANSFER" && !input.accountNumber?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Account number is required",
      path: ["accountNumber"],
    });
  }
});

export const smtpSchema = z.object({
  host: z.string().min(2),
  port: z.coerce.number().int().positive(),
  username: z.string().min(1),
  password: z.string().min(1),
  secure: z.coerce.boolean().default(true),
  senderEmail: emailSchema,
  senderName: z.string().min(2),
  enabled: z.coerce.boolean().default(true),
});

export const aiSchema = z.object({
  provider: z.enum(["OPENAI", "ANTHROPIC", "GEMINI", "OPENROUTER", "CUSTOM"]),
  customEndpoint: z.string().url().optional().or(z.literal("")),
  apiKey: z.union([z.string().trim().min(6).max(20000), z.literal("")]).optional(),
  activeModel: z.string().optional(),
  enabled: z.coerce.boolean().default(true),
});

export const siteSettingsSchema = z.object({
  shopName: z.string().min(2).max(80),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  brandColor: z.string().min(4).max(20),
  themeMode: z.enum(["WHITE", "BLACK"]).default("WHITE"),
  fontFamily: z.enum(["CENTURY_GOTHIC", "TH_SARABUN_PSK", "PROMPT", "IMPACT"]).default("TH_SARABUN_PSK"),
  headerLinks: z.string().max(2000).optional(),
  heroEyebrow: z.string().min(2).max(80),
  heroTitle: z.string().min(2).max(120),
  heroSubtitle: z.string().min(2).max(260),
  featureOneTitle: z.string().min(2).max(80),
  featureOneBody: z.string().min(2).max(180),
  featureTwoTitle: z.string().min(2).max(80),
  featureTwoBody: z.string().min(2).max(180),
  featureThreeTitle: z.string().min(2).max(80),
  featureThreeBody: z.string().min(2).max(180),
  footerText: z.string().max(500).optional(),
  supportEmail: z.string().email().optional().or(z.literal("")),
  orderNotificationEmail: z.string().email().optional().or(z.literal("")),
  remoteAreaFee: z.coerce.number().min(0).max(100000).default(50),
  remotePostalCodes: z.string().max(20000).optional(),
  liveChatEnabled: z.coerce.boolean().default(false),
  lineOaId: z.string().trim().min(2).max(80).default("@retroconsole1981"),
  lineChatPrompt: z.string().trim().min(1).max(500).default("สวัสดีครับ สนใจสอบถามสินค้า"),
  lineChannelAccessToken: z.string().trim().max(2000).optional(),
  lineChannelSecret: z.string().trim().max(200).optional(),
  lineAdminRecipientId: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || /^[UCR][a-zA-Z0-9_-]{8,}$/.test(value), {
      message: "LINE recipient ID must start with U, C, or R. Send REGISTER_ADMIN to the LINE OA to register it automatically.",
    })
    .optional(),
  lineNotifyProductContext: z.coerce.boolean().default(false),
});

export const downloadSourceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  protocol: z.enum(["sftp", "ftp", "ftps"]).default("sftp"),
  enabled: z.coerce.boolean().default(true),
  host: z.string().trim().min(1).max(200),
  port: z.coerce.number().int().positive().max(65535).optional(),
  username: z.string().trim().min(1).max(200),
  password: z.string().max(2000).optional(),
  basePath: z.string().trim().min(1).max(500).default("/"),
});

export const downloadCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140).optional(),
  description: z.string().trim().max(500).optional(),
  imageUrl: uploadedImageSchema.optional(),
  sourceId: z.string().min(1),
  remotePath: z.string().trim().min(1).max(800),
  position: z.coerce.number().int().default(0),
  enabled: z.coerce.boolean().default(true),
});

export const downloadHideRuleSchema = z.object({
  pattern: z.string().trim().min(1).max(160),
  enabled: z.coerce.boolean().default(true),
  position: z.coerce.number().int().default(0),
});
