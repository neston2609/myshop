"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { QrCode, Upload } from "lucide-react";
import { savePaymentAction } from "@/app/actions";

const providers = [
  { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "STRIPE", label: "Stripe" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "CUSTOM", label: "Custom" },
];

export function PaymentMethodForm() {
  const [provider, setProvider] = useState("CASH_ON_DELIVERY");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const isBankTransfer = provider === "BANK_TRANSFER";

  function upload(file: File) {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "QR code upload failed");
        return;
      }
      setQrCodeUrl(payload.url);
    });
  }

  return (
    <form action={savePaymentAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">Add payment method</h2>
      <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
      <select
        name="provider"
        value={provider}
        onChange={(event) => setProvider(event.target.value)}
        className="h-10 rounded-md border border-black/10 px-3"
      >
        {providers.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>

      {isBankTransfer ? (
        <div className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3">
          <input name="bankName" placeholder="Bank name" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input name="accountName" placeholder="Account name" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input type="hidden" name="qrCodeUrl" value={qrCodeUrl} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-md border border-black/10 bg-white">
              {qrCodeUrl ? (
                <Image src={qrCodeUrl} alt="Bank transfer QR preview" width={112} height={112} className="h-full w-full object-contain" />
              ) : (
                <QrCode className="text-slate-400" size={36} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">QR Code</p>
              <p className="text-xs leading-5 text-slate-500">Upload a PNG, JPG, or WebP QR payment image.</p>
              {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload(file);
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Upload size={16} />
              {isPending ? "Uploading..." : "Upload QR"}
            </button>
          </div>
        </div>
      ) : (
        <textarea name="credentials" placeholder="API credentials JSON" className="min-h-24 rounded-md border border-black/10 px-3 py-2" />
      )}

      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> Enabled</label>
      <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save method</button>
    </form>
  );
}
