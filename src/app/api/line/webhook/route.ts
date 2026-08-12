import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/crypto";
import { cleanupExpiredLiveChatConversations } from "@/lib/live-chat-cleanup";
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

function parseAdminReply(event: LineWebhookEvent) {
  const text = event.message?.type === "text" ? event.message.text?.trim() || "" : "";
  const match = text.match(/^(?:REPLY|ตอบ)\s+(LC-[A-Z0-9-]+)\s+([\s\S]+)/i);
  if (!match?.[1] || !match[2]?.trim()) return null;
  return {
    chatRef: match[1].toUpperCase(),
    body: match[2].trim().slice(0, 1600),
  };
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
  await cleanupExpiredLiveChatConversations();

  const settings = await prisma.siteSettings.findFirst({
    select: {
      id: true,
      lineChannelSecretCiphertext: true,
      lineChannelTokenCiphertext: true,
      lineAdminRecipientId: true,
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
    if (!settings?.id) continue;

    const recipientId = sourceRecipientId(event);
    if (!recipientId) continue;

    if (isRegisterAdminMessage(event)) {
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
      continue;
    }

    const adminReply = parseAdminReply(event);
    if (!adminReply || recipientId !== settings.lineAdminRecipientId) continue;

    const conversation = await prisma.liveChatConversation.findUnique({
      where: { chatRef: adminReply.chatRef },
      select: { id: true, chatRef: true },
    });

    if (!conversation) {
      await replyLineMessage(token, event.replyToken || "", `ไม่พบ Live Chat ref: ${adminReply.chatRef}`);
      continue;
    }

    await prisma.liveChatMessage.create({
      data: {
        conversationId: conversation.id,
        sender: "ADMIN",
        body: adminReply.body,
        source: "LINE",
      },
    });
    await prisma.liveChatConversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN" },
    });
    await replyLineMessage(token, event.replyToken || "", `ส่งคำตอบกลับเว็บแล้ว (${conversation.chatRef})`);
  }

  return NextResponse.json({ ok: true });
}
