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

export const checkoutSchema = z.object({
  customerName: z.string().min(2).max(120),
  customerEmail: emailSchema,
  customerPhone: z.string().max(40).optional(),
  shippingAddress: z.string().min(6).max(240),
  shippingCity: z.string().min(2).max(80),
  shippingCountry: z.string().min(2).max(80),
  shippingMethodId: z.string().min(1),
  paymentMethodId: z.string().min(1),
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
  enabled: z.coerce.boolean().default(true),
});

export const paymentSchema = z.object({
  name: z.string().min(2).max(100),
  provider: z.enum(["CASH_ON_DELIVERY", "BANK_TRANSFER", "STRIPE", "PAYPAL", "CUSTOM"]),
  enabled: z.coerce.boolean().default(true),
  credentials: z.string().optional(),
  bankName: z.string().max(100).optional(),
  accountName: z.string().max(140).optional(),
  qrCodeUrl: z.string().optional(),
}).superRefine((input, context) => {
  if (input.provider !== "BANK_TRANSFER") return;
  if (!input.bankName?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Bank name is required",
      path: ["bankName"],
    });
  }
  if (!input.accountName?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Account name is required",
      path: ["accountName"],
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
  apiKey: z.string().min(6),
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
  supportEmail: z.string().email().optional().or(z.literal("")),
});
