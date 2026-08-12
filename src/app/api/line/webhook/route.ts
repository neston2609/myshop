import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type LineWebhookEvent = {
  type?: string;
  replyToken?: string;
  source?: {
    type?: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
};

type LineWebhookBody = {
  events?: LineWebhookEvent[];
};

function verifyLineSignature(body: string, signature: string | null, channelSecret: string) {
  if (!channelSecret) return true;
  if (!signature) return false;

  const digest = createHmac("sha256", channelSecret).update(body).digest("base64");
  const signatureBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);
  if (signatureBuffer.length !== digestBuffer.length) return false;
  return timingSafeEqual(signatureBuffer, digestBuffer);
}

function sourceRecipientId(event: LineWebhookEvent) {
  return event.source?.groupId || event.source?.roomId || event.source?.userId || "";
}

function isRegisterAdminMessage(event: LineWebhookEvent) {
  const text = event.message?.type === "text" ? event.message.text?.trim().toUpperCase() : "";
  return text === "REGISTER_ADMIN" || text === "ADMIN" || text === "ตั้งค่าแอดมิน";
}

async function replyLineMessage(token: string, replyToken: string, text: string) {
  if (!token || !replyToken) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
    cache: "no-store",
  }).catch(() => undefined);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const settings = await prisma.siteSettings.findFirst({
    select: {
      id: true,
      lineChannelSecretCiphertext: true,
      lineChannelTokenCiphertext: true,
    },
  });

  const channelSecret = decryptSecret(settings?.lineChannelSecretCiphertext);
  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"), channelSecret)) {
    return NextResponse.json({ error: "Invalid LINE signature." }, { status: 401 });
  }

  const body = JSON.parse(rawBody || "{}") as LineWebhookBody;
  const events = body.events || [];
  const token = decryptSecret(settings?.lineChannelTokenCiphertext);

  for (const event of events) {
    if (!settings?.id || !isRegisterAdminMessage(event)) continue;

    const recipientId = sourceRecipientId(event);
    if (!recipientId) continue;

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        lineAdminRecipientId: recipientId,
        lineNotifyProductContext: true,
      },
    });

    await replyLineMessage(
      token,
      event.replyToken || "",
      `ตั้งค่า Admin recipient สำเร็จแล้ว\nRecipient ID: ${recipientId}`,
    );
  }

  return NextResponse.json({ ok: true });
}
