"use client";

import type { FormEvent } from "react";
import { ExternalLink, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type LiveChatMessage = {
  id: string;
  sender: string;
  body: string;
  source: string;
  createdAt: string;
};

type LiveChatConversation = {
  id: string;
  chatRef: string;
  customerName: string | null;
  customerContact: string | null;
  pageUrl: string | null;
  pageTitle: string | null;
  productName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: LiveChatMessage[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function latestMessage(conversation: LiveChatConversation) {
  return conversation.messages[conversation.messages.length - 1]?.body || "No messages yet";
}

export function AdminLiveChatPanel({ initialConversations }: { initialConversations: LiveChatConversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedRef, setSelectedRef] = useState(initialConversations[0]?.chatRef || "");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.chatRef === selectedRef) || conversations[0] || null,
    [conversations, selectedRef],
  );

  async function refresh() {
    const response = await fetch("/api/admin/live-chat", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json() as { conversations?: LiveChatConversation[] };
    setConversations(data.conversations || []);
    if (!selectedRef && data.conversations?.[0]) setSelectedRef(data.conversations[0].chatRef);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 3500);
    return () => window.clearInterval(timer);
  });

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !message.trim() || isPending) return;

    const body = message.trim();
    setMessage("");
    setNotice("");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/live-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatRef: selected.chatRef, message: body, status: selected.status }),
          });
          const data = await response.json().catch(() => ({})) as { conversation?: LiveChatConversation; error?: string };
          if (!response.ok || !data.conversation) throw new Error(data.error || "Could not send reply.");
          setConversations((current) => current.map((conversation) => conversation.chatRef === data.conversation?.chatRef ? data.conversation : conversation));
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not send reply.");
        }
      })();
    });
  }

  function setStatus(status: "OPEN" | "CLOSED") {
    if (!selected || isPending) return;

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/admin/live-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatRef: selected.chatRef, status }),
        });
        const data = await response.json().catch(() => ({})) as { conversation?: LiveChatConversation };
        if (data.conversation) setConversations((current) => current.map((conversation) => conversation.chatRef === data.conversation?.chatRef ? data.conversation : conversation));
      })();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-lg border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <div>
            <h2 className="font-semibold">Live Chat</h2>
            <p className="text-xs text-slate-500">{conversations.length} conversations</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="rounded-md border border-black/10 p-2 text-slate-600">
            <RefreshCw size={16} />
            <span className="sr-only">Refresh live chats</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No live chat conversations yet.</p>
          ) : conversations.map((conversation) => (
            <button
              key={conversation.chatRef}
              type="button"
              onClick={() => setSelectedRef(conversation.chatRef)}
              className={`grid w-full gap-1 border-b border-black/10 px-4 py-3 text-left transition hover:bg-slate-50 ${selected?.chatRef === conversation.chatRef ? "bg-slate-100" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{conversation.customerName || conversation.chatRef}</span>
                <span className={conversation.status === "CLOSED" ? "text-xs text-slate-400" : "text-xs font-semibold text-emerald-700"}>{conversation.status}</span>
              </div>
              <p className="truncate text-xs text-slate-500">{conversation.customerContact || conversation.productName || conversation.pageTitle || "Website visitor"}</p>
              <p className="line-clamp-2 text-xs text-slate-600">{latestMessage(conversation)}</p>
              <p className="text-[11px] text-slate-400">{formatTime(conversation.updatedAt)}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-black/10 bg-white">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3">
              <div>
                <h2 className="font-semibold">{selected.customerName || "Website visitor"}</h2>
                <p className="text-xs text-slate-500">Chat ref: {selected.chatRef}</p>
                {selected.customerContact ? <p className="text-xs text-slate-500">Contact: {selected.customerContact}</p> : null}
                {selected.productName ? <p className="text-xs text-slate-500">Product: {selected.productName}</p> : null}
                {selected.pageUrl ? (
                  <a href={selected.pageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#0f766e]">
                    Open customer page <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setStatus(selected.status === "CLOSED" ? "OPEN" : "CLOSED")}
                className="h-9 rounded-md border border-black/10 px-3 text-sm font-semibold text-slate-700"
              >
                {selected.status === "CLOSED" ? "Reopen" : "Close"}
              </button>
            </div>
            <div className="grid max-h-[58vh] gap-3 overflow-y-auto bg-slate-50 p-4">
              {selected.messages.map((item) => (
                <div key={item.id} className={item.sender === "ADMIN" ? "ml-auto max-w-[78%] rounded-lg bg-[#06c755] px-3 py-2 text-sm text-white" : "mr-auto max-w-[78%] rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-slate-800"}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] opacity-75">
                    <span>{item.sender === "ADMIN" ? "Admin" : "Customer"} via {item.source}</span>
                    <span>{formatTime(item.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{item.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={submitReply} className="grid gap-2 border-t border-black/10 p-4">
              {notice ? <p className="text-sm text-red-600">{notice}</p> : null}
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type a reply to show in the customer's web chat..."
                rows={3}
                className="rounded-md border border-black/10 px-3 py-2"
                maxLength={1600}
              />
              <div className="flex justify-end">
                <button type="submit" disabled={isPending || !message.trim()} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white disabled:opacity-60">
                  <Send size={15} />
                  {isPending ? "Sending..." : "Send reply"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="p-6 text-sm text-slate-500">Select a conversation to start replying.</p>
        )}
      </section>
    </div>
  );
}
