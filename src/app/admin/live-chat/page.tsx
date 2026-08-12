import { AdminLiveChatPanel } from "@/components/admin-live-chat-panel";
import { prisma } from "@/lib/prisma";

export default async function AdminLiveChatPage() {
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

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold">Live Chat</h2>
        <p className="mt-1 text-sm text-slate-500">Reply to website visitors directly from the admin dashboard.</p>
      </div>
      <AdminLiveChatPanel
        initialConversations={conversations.map((conversation) => ({
          ...conversation,
          createdAt: conversation.createdAt.toISOString(),
          updatedAt: conversation.updatedAt.toISOString(),
          messages: conversation.messages.map((message) => ({
            ...message,
            createdAt: message.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
