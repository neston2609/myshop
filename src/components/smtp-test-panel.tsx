"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

type SmtpTestPanelProps = {
  defaultEmail?: string | null;
  configured: boolean;
};

export function SmtpTestPanel({ defaultEmail, configured }: SmtpTestPanelProps) {
  const [to, setTo] = useState(defaultEmail || "");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function testSmtp() {
    setMessage("");
    setIsError(false);
    startTransition(async () => {
      const response = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setIsError(true);
        setMessage(payload.error || "SMTP test failed.");
        return;
      }
      setMessage(`Test email sent to ${to || defaultEmail}.`);
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-black/10 bg-white p-5">
      <div>
        <h2 className="font-semibold">Test SMTP</h2>
        <p className="mt-1 text-sm text-slate-600">Send a test email using the saved SMTP settings.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={to}
          onChange={(event) => setTo(event.target.value)}
          type="email"
          placeholder="Test recipient email"
          className="h-10 flex-1 rounded-md border border-black/10 px-3"
        />
        <button
          type="button"
          onClick={testSmtp}
          disabled={!configured || isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Send size={16} />
          {isPending ? "Testing..." : "Test"}
        </button>
      </div>
      {!configured ? <p className="text-sm text-amber-700">Save SMTP settings before testing.</p> : null}
      {message ? (
        <p className={`rounded-md p-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
