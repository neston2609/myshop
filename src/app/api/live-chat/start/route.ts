import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

type LiveChatBody = {
  path?: string;
  pageTitle?: string;
  pageUrl?: string;
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

function safeText(value: string, maxLength = 4800) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
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
      messages: [{ type: "text", text: safeText(text) }],
    }),
    cache: "no-store",
  });

  return response.ok;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
  if (!checkRateLimit(`live-chat:${ip}`, 20, 60_000)) {
    return NextResponse.json({ ok: true, notified: false });
  }

  const body = await request.json().catch(() => ({})) as LiveChatBody;
  const settings = await prisma.siteSettings.findFirst({
    select: {
      lineNotifyProductContext: true,
      lineChannelTokenCiphertext: true,
      lineAdminRecipientId: true,
      shopName: true,
    },
  });

  if (!settings?.lineNotifyProductContext || !settings.lineAdminRecipientId || !settings.lineChannelTokenCiphertext) {
    return NextResponse.json({ ok: true, notified: false });
  }

  const slug = productSlugFromPath(body.path);
  if (!slug) return NextResponse.json({ ok: true, notified: false });

  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      sku: true,
      price: true,
      stock: true,
      category: { select: { name: true } },
    },
  });
  if (!product) return NextResponse.json({ ok: true, notified: false });

  const productUrl = `${originFromRequest(request)}/products/${encodeURIComponent(slug)}`;
  const text = [
    `มีลูกค้ากดเริ่ม Live Chat จากหน้า ${settings.shopName || "ร้านค้า"}`,
    "",
    `สินค้า: ${product.name}`,
    `SKU: ${product.sku}`,
    `หมวดหมู่: ${product.category.name}`,
    `ราคา: ${money(product.price)}`,
    `สต็อก: ${product.stock}`,
    `URL: ${body.pageUrl?.startsWith("http") ? body.pageUrl : productUrl}`,
    body.pageTitle ? `Page title: ${body.pageTitle}` : "",
  ].filter(Boolean).join("\n");

  const token = decryptSecret(settings.lineChannelTokenCiphertext);
  if (!token) return NextResponse.json({ ok: true, notified: false });

  const notified = await pushLineText(token, settings.lineAdminRecipientId, text).catch(() => false);
  return NextResponse.json({ ok: true, notified });
}
