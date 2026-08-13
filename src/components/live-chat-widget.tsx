"use client";

import type { FormEvent } from "react";
import { ExternalLink, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

type LiveChatWidgetProps = {
  enabled: boolean;
  lineOaId: string;
  prompt: string;
};

function buildLineChatUrl(lineOaId: string, message: string) {
  const normalizedId = lineOaId.trim().startsWith("@") ? lineOaId.trim() : `@${lineOaId.trim()}`;
  return `https://line.me/R/oaMessage/${encodeURIComponent(normalizedId)}/?${encodeURIComponent(message)}`;
}

function buildLineProfileUrl(lineOaId: string) {
  const normalizedId = lineOaId.trim().startsWith("@") ? lineOaId.trim() : `@${lineOaId.trim()}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(normalizedId)}`;
}

function isProductPath(pathname: string) {
  return /^\/products\/[^/]+/.test(pathname);
}

type ChatMessage = {
  id?: string;
  role: "customer" | "admin" | "system";
  text: string;
};

type ApiChatMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

function mapApiMessage(item: ApiChatMessage): ChatMessage {
  return {
    id: item.id,
    role: item.sender === "ADMIN" ? "admin" : "customer",
    text: item.body,
  };
}

export function LiveChatWidget({ enabled, lineOaId, prompt }: LiveChatWidgetProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "system", text: "สวัสดีครับ พิมพ์คำถามไว้ที่นี่ ระบบจะส่งเข้า LINE ของร้านทันที" },
  ]);
  const [isPending, startTransition] = useTransition();
  const chatRef = useMemo(() => `LC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, []);

  useEffect(() => {
    if (!panelOpen) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/live-chat/message?chatRef=${encodeURIComponent(chatRef)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { messages?: ApiChatMessage[] };
        if (cancelled || !data.messages?.length) return;
        const apiMessages = data.messages.map(mapApiMessage);
        setMessages((current) => {
          const systemMessages = current.filter((item) => item.role === "system");
          return [...systemMessages, ...apiMessages];
        });
      } catch {
        // Polling is best-effort; sending still works without it.
      }
    };

    void poll();
    const timer = window.setInterval(poll, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [chatRef, panelOpen]);

  if (!enabled || !lineOaId.trim()) return null;

  function buildMessage() {
    if (typeof window === "undefined") return prompt.trim() || "สวัสดีครับ สนใจสอบถามสินค้า";

    const pathname = window.location.pathname;
    const productContext = isProductPath(pathname)
      ? `\n\nสินค้าที่กำลังดู:\n${document.title}\n${window.location.href}`
      : "";
    return `${prompt.trim() || "สวัสดีครับ สนใจสอบถามสินค้า"}${productContext}`;
  }

  function notifyAdmin() {
    void fetch("/api/live-chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: `${window.location.pathname}${window.location.search}`,
        pageTitle: document.title,
        pageUrl: window.location.href,
      }),
    }).catch(() => undefined);
  }

  function openPanel() {
    setPanelOpen(true);
    notifyAdmin();
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isPending) return;

    setMessages((current) => [...current, { role: "customer", text: trimmed }]);
    setMessage("");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/live-chat/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              contact,
              message: trimmed,
              chatRef,
              path: `${window.location.pathname}${window.location.search}`,
              pageTitle: document.title,
              pageUrl: window.location.href,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "ส่งข้อความไม่สำเร็จ");
          if (Array.isArray(data.messages)) {
            const apiMessages = (data.messages as ApiChatMessage[]).map(mapApiMessage);
            setMessages((current) => {
              const systemMessages = current.filter((item) => item.role === "system");
              return [...systemMessages, ...apiMessages, { role: "system", text: "ส่งข้อความเข้า LINE ร้านแล้วครับ รอคำตอบในกล่องนี้ได้เลย" }];
            });
          } else {
            setMessages((current) => [...current, { role: "system", text: "ส่งข้อความเข้า LINE ร้านแล้วครับ รอคำตอบในกล่องนี้ได้เลย" }]);
          }
        } catch (error) {
          setMessages((current) => [
            ...current,
            { role: "system", text: error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
          ]);
        }
      })();
    });
  }

  const lineChatUrl = buildLineChatUrl(lineOaId, buildMessage());
  const lineProfileUrl = buildLineProfileUrl(lineOaId);

  return (
    <>
      {panelOpen ? (
        <div className="fixed bottom-24 right-5 z-50 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_24px_60px_rgba(15,23,42,0.22)] md:bottom-28 md:right-7">
          <div className="flex items-start justify-between gap-3 bg-[#06c755] px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="font-semibold">LINE Live Chat</p>
              <p className="mt-0.5 text-sm text-white/85">ข้อความจะถูกส่งเข้า LINE ของร้าน</p>
              <p className="mt-1 text-xs text-white/75">Chat ref: {chatRef}</p>
            </div>
            <button type="button" onClick={() => setPanelOpen(false)} className="rounded-md p-1 text-white/90 hover:bg-white/15">
              <X size={18} />
              <span className="sr-only">Close LINE chat panel</span>
            </button>
          </div>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto p-4">
            <div className="grid gap-2">
              {messages.map((item, index) => (
                <div
                  key={item.id || `${item.role}-${index}`}
                  className={item.role === "customer"
                    ? "live-chat-bubble-customer ml-8 rounded-lg px-3 py-2 text-sm"
                    : item.role === "admin"
                      ? "live-chat-bubble-admin mr-8 rounded-lg px-3 py-2 text-sm"
                      : "mr-8 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text)]"}
                >
                  {item.role === "admin" ? <span className="live-chat-bubble-label mb-1 block text-xs font-semibold">ร้านค้า</span> : null}
                  {item.text}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="grid gap-2 border-t border-[var(--border)] pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="ชื่อ"
                  className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                  maxLength={120}
                />
                <input
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="เบอร์โทร / LINE / Email"
                  className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
                  maxLength={160}
                />
              </div>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="พิมพ์ข้อความถึงร้าน"
                rows={3}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                maxLength={1600}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <a href={lineChatUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#06a84a]">
                    เปิดใน LINE <ExternalLink size={12} />
                  </a>
                  <a href={lineProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--muted)]">
                    LINE OA
                  </a>
                </div>
                <button
                  type="submit"
                  disabled={isPending || !message.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#06c755] px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Send size={15} />
                  {isPending ? "กำลังส่ง..." : "ส่งข้อความ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={openPanel}
        aria-label="Chat with us on LINE"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#06c755] text-white shadow-[0_16px_36px_rgba(6,199,85,0.36)] hover:bg-[#05b84e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#06c755] md:bottom-7 md:right-7"
      >
        <MessageCircle size={26} strokeWidth={2.4} />
        <span className="sr-only">Chat with us on LINE</span>
      </button>
    </>
  );
}
