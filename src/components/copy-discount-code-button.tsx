"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyDiscountCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--text)] px-4 text-sm font-semibold text-[var(--surface)]"
      aria-label={`Copy discount code ${code}`}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : "Copy code"}
    </button>
  );
}

