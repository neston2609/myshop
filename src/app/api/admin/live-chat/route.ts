import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanText(value?: string | null, maxLength = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function mapConversation(conversation: {
  id: string;
  chatRef: string;
  customerName: string | null;
  customerContact: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  productName: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{ id: string; sender: string; body: string; source: string; createdAt: Date }>;
}) {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  await requireAdmin();

  const conversations = await prisma.liveChatConversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      chatRef: true,
      customerName: true,
      customerContact: true,
      pageUrl: true,
      pageTitle: true,
      productName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          sender: true,
          body: true,
          source: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ conversations: conversations.map(mapConversation) });
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const body = await request.json().catch(() => ({})) as { chatRef?: string; message?: string; status?: string };
  const chatRef = cleanText(body.chatRef, 80).toUpperCase();
  const message = cleanText(body.message, 1600);
  if (!chatRef) return NextResponse.json({ error: "Missing chat reference." }, { status: 400 });

  const conversation = await prisma.liveChatConversation.findUnique({
    where: { chatRef },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  if (message) {
    await prisma.liveChatMessage.create({
      data: {
        conversationId: conversation.id,
        sender: "ADMIN",
        body: message,
        source: "ADMIN",
      },
    });
  }

  const nextStatus = body.status === "CLOSED" ? "CLOSED" : "OPEN";
  const updated = await prisma.liveChatConversation.update({
    where: { id: conversation.id },
    data: { status: nextStatus },
    select: {
      id: true,
      chatRef: true,
      customerName: true,
      customerContact: true,
      pageUrl: true,
      pageTitle: true,
      productName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          sender: true,
          body: true,
          source: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ conversation: mapConversation(updated) });
}
