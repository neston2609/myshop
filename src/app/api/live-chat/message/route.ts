import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

type LiveChatMessageBody = {
  name?: string;
  contact?: string;
  message?: string;
  path?: string;
  pageTitle?: string;
  pageUrl?: string;
  chatRef?: string;
};

function originFromRequest(request: NextRequest) {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

function productSlugFromPath(path?: string) {
  if (!path) return "";
  const pathname = path.split("?")[0] || "";
  const match = pathname.match(/^\/products\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function cleanText(value?: string, maxLength = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeLineText(value: string, maxLength = 4800) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function validLineRecipientId(value?: string | null) {
  return Boolean(value && /^[UCR][a-zA-Z0-9_-]{8,}$/.test(value));
}

async function pushLineText(token: string, to: string, text: string) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text: safeLineText(text) }],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `LINE rejected message (${response.status}).`);
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
  if (!checkRateLimit(`live-chat-message:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: "ส่งข้อความถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as LiveChatMessageBody;
  const message = cleanText(body.message, 1600);
  if (message.length < 2) {
    return NextResponse.json({ error: "กรุณาพิมพ์ข้อความก่อนส่ง" }, { status: 400 });
  }

  const settings = await prisma.siteSettings.findFirst({
    select: {
      lineChannelTokenCiphertext: true,
      lineAdminRecipientId: true,
      shopName: true,
    },
  });
  const token = decryptSecret(settings?.lineChannelTokenCiphertext);
  if (!token || !settings?.lineAdminRecipientId) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า LINE Messaging API หรือ Admin recipient ในระบบ" }, { status: 400 });
  }
  if (!validLineRecipientId(settings.lineAdminRecipientId)) {
    return NextResponse.json({
      error: "LINE Admin recipient ID ไม่ถูกต้อง ต้องขึ้นต้นด้วย U, C หรือ R กรุณาพิมพ์ REGISTER_ADMIN ไปหา LINE OA เพื่อลงทะเบียนใหม่",
    }, { status: 400 });
  }

  const slug = productSlugFromPath(body.path);
  const product = slug
    ? await prisma.product.findUnique({
        where: { slug },
        select: {
          name: true,
          sku: true,
          price: true,
          stock: true,
          category: { select: { name: true } },
        },
      })
    : null;

  const productUrl = slug ? `${originFromRequest(request)}/products/${encodeURIComponent(slug)}` : "";
  const lines = [
    `ข้อความ Live Chat จากเว็บ ${settings.shopName || "ร้านค้า"}`,
    body.chatRef ? `Chat ref: ${cleanText(body.chatRef, 80)}` : "",
    "",
    `ข้อความ: ${message}`,
    cleanText(body.name, 120) ? `ชื่อ: ${cleanText(body.name, 120)}` : "",
    cleanText(body.contact, 160) ? `ติดต่อกลับ: ${cleanText(body.contact, 160)}` : "",
    "",
    product ? `สินค้า: ${product.name}` : "",
    product ? `SKU: ${product.sku}` : "",
    product ? `หมวดหมู่: ${product.category.name}` : "",
    product ? `ราคา: ${money(product.price)}` : "",
    product ? `สต็อก: ${product.stock}` : "",
    `หน้าเว็บ: ${body.pageUrl?.startsWith("http") ? body.pageUrl : productUrl || originFromRequest(request)}`,
    cleanText(body.pageTitle, 240) ? `Page title: ${cleanText(body.pageTitle, 240)}` : "",
  ].filter(Boolean);

  try {
    await pushLineText(token, settings.lineAdminRecipientId, lines.join("\n"));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "ส่งข้อความเข้า LINE ไม่สำเร็จ กรุณาตรวจสอบ Channel access token และ Admin recipient" }, { status: 502 });
  }
}
