"use client";

import { ExternalLink, MessageCircle, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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

function qrCodeUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
}

function isProductPath(pathname: string) {
  return /^\/products\/[^/]+/.test(pathname);
}

function isMobileLineTarget() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function LiveChatWidget({ enabled, lineOaId, prompt }: LiveChatWidgetProps) {
  const [chatUrl, setChatUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [copied, setCopied] = useState(false);

  if (!enabled || !lineOaId.trim()) return null;

  function buildMessage() {
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

  function startChat() {
    const message = buildMessage();
    const nextChatUrl = buildLineChatUrl(lineOaId, message);

    notifyAdmin();
    setCopied(false);

    if (isMobileLineTarget()) {
      window.location.href = nextChatUrl;
      return;
    }

    setChatUrl(nextChatUrl);
    setProfileUrl(buildLineProfileUrl(lineOaId));
  }

  async function copyChatMessage() {
    await navigator.clipboard?.writeText(buildMessage()).catch(() => undefined);
    setCopied(true);
  }

  return (
    <>
      {chatUrl ? (
        <div className="fixed bottom-24 right-5 z-50 w-[min(340px,calc(100vw-32px))] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-[0_24px_60px_rgba(15,23,42,0.22)] md:bottom-28 md:right-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">LINE Live Chat</p>
              <p className="mt-1 text-sm text-[var(--muted)]">สแกน QR ด้วยมือถือ หรือเปิด LINE เพื่อคุยกับร้าน</p>
            </div>
            <button type="button" onClick={() => setChatUrl("")} className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-soft)]">
              <X size={18} />
              <span className="sr-only">Close LINE chat panel</span>
            </button>
          </div>
          <div className="mt-4 grid justify-items-center gap-3">
            <Image
              src={qrCodeUrl(chatUrl)}
              alt="LINE chat QR code"
              width={220}
              height={220}
              unoptimized
              className="rounded-md border border-[var(--border)] bg-white p-2"
            />
            <div className="grid w-full gap-2">
              <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#06c755] px-4 text-sm font-semibold text-white">
                เปิด LINE Chat <ExternalLink size={15} />
              </a>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text)]">
                เปิดหน้า LINE OA
              </a>
              <button type="button" onClick={copyChatMessage} className="h-10 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text)]">
                {copied ? "คัดลอกข้อความแล้ว" : "คัดลอกข้อความสอบถาม"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={startChat}
        aria-label="Chat with us on LINE"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-[#06c755] text-white shadow-[0_16px_36px_rgba(6,199,85,0.36)] hover:bg-[#05b84e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#06c755] md:bottom-7 md:right-7"
      >
        <MessageCircle size={26} strokeWidth={2.4} />
        <span className="sr-only">Chat with us on LINE</span>
      </button>
    </>
  );
}
