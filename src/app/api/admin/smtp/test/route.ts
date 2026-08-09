import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  await requireAdmin();
  const { to } = await request.json().catch(() => ({ to: "" }));
  const settings = await prisma.smtpSettings.findFirst();
  if (!settings) return NextResponse.json({ error: "SMTP is not configured" }, { status: 400 });

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.username,
      pass: decryptSecret(settings.passwordCiphertext),
    },
  });

  await transporter.sendMail({
    from: `"${settings.senderName}" <${settings.senderEmail}>`,
    to: to || settings.senderEmail,
    subject: "MyShop SMTP test",
    text: "Your SMTP settings are working.",
  });

  return NextResponse.json({ ok: true });
}
