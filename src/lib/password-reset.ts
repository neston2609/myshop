import { createHash, randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const fallbackSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.japantoyshop.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  token: string;
  origin?: string;
}) {
  try {
    const [smtp, site] = await Promise.all([
      prisma.smtpSettings.findFirst(),
      prisma.siteSettings.findFirst(),
    ]);

    if (!smtp?.enabled) return false;

    const shopName = site?.shopName || smtp.senderName || "MyShop";
    const origin = params.origin || fallbackSiteUrl;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(params.token)}`;
    const safeName = escapeHtml(params.name);
    const safeShopName = escapeHtml(shopName);
    const safeResetUrl = escapeHtml(resetUrl);
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: decryptSecret(smtp.passwordCiphertext),
      },
    });

    await transporter.sendMail({
      from: `"${smtp.senderName}" <${smtp.senderEmail}>`,
      to: params.to,
      subject: `Reset your ${shopName} password`,
      text: [
        `Hi ${params.name},`,
        "",
        `We received a request to reset your ${shopName} password.`,
        "Open this link within 1 hour to set a new password:",
        resetUrl,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#17201c">
          <h2 style="margin:0 0 12px">Reset your ${safeShopName} password</h2>
          <p>Hi ${safeName},</p>
          <p>We received a request to reset your password. This link will expire in 1 hour.</p>
          <p><a href="${safeResetUrl}" style="display:inline-block;background:#17201c;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Reset password</a></p>
          <p style="font-size:13px;color:#64748b">If the button does not work, open this link:<br>${safeResetUrl}</p>
          <p style="font-size:13px;color:#64748b">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.warn("Password reset email failed", error);
    return false;
  }
}
