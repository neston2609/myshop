"use client";

import { MessageCircle } from "lucide-react";

type LiveChatWidgetProps = {
  enabled: boolean;
  lineOaId: string;
  prompt: string;
};

function buildLineChatUrl(lineOaId: string, message: string) {
  const normalizedId = lineOaId.trim().startsWith("@") ? lineOaId.trim() : `@${lineOaId.trim()}`;
  return `https://line.me/R/oaMessage/${encodeURIComponent(normalizedId)}/?${encodeURIComponent(message)}`;
}

function isProductPath(pathname: string) {
  return /^\/products\/[^/]+/.test(pathname);
}

export function LiveChatWidget({ enabled, lineOaId, prompt }: LiveChatWidgetProps) {
  if (!enabled || !lineOaId.trim()) return null;

  function startChat() {
    const pathname = window.location.pathname;
    const productContext = isProductPath(pathname)
      ? `\n\nสินค้าที่กำลังดู:\n${document.title}\n${window.location.href}`
      : "";
    const message = `${prompt.trim() || "สวัสดีครับ สนใจสอบถามสินค้า"}${productContext}`;

    window.open(buildLineChatUrl(lineOaId, message), "_blank", "noopener,noreferrer");

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

  return (
    <button
      type="button"
      onClick={startChat}
      aria-label="Chat with us on LINE"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#06c755] text-white shadow-[0_16px_36px_rgba(6,199,85,0.36)] hover:bg-[#05b84e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#06c755] md:bottom-7 md:right-7"
    >
      <MessageCircle size={26} strokeWidth={2.4} />
      <span className="sr-only">Chat with us on LINE</span>
    </button>
  );
}
