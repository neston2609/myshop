"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { QrCode, Upload } from "lucide-react";
import { savePaymentAction } from "@/app/actions";
import type { PaymentCredentials } from "@/lib/payments";

type PaymentMethodFormProps = {
  method?: {
    id: string;
    name: string;
    provider: string;
    enabled: boolean;
    credentials: PaymentCredentials;
  };
};

const providers = [
  { value: "CASH_ON_DELIVERY", label: "Cash on Delivery" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "STRIPE", label: "Stripe" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "CUSTOM", label: "Custom" },
];

export function PaymentMethodForm({ method }: PaymentMethodFormProps) {
  const [provider, setProvider] = useState(method?.provider || "CASH_ON_DELIVERY");
  const [qrCodeUrl, setQrCodeUrl] = useState(method?.credentials.qrCodeUrl || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const isBankTransfer = provider === "BANK_TRANSFER";
  const isStripe = provider === "STRIPE";
  const isPayPal = provider === "PAYPAL";
  const isCustom = provider === "CUSTOM";

  function upload(file: File) {
    setError("");
    startTransition(() => {
      void (async () => {
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
      })();
    });
  }

  return (
    <form action={savePaymentAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">{method ? "Edit payment method" : "Add payment method"}</h2>
      {method ? <input type="hidden" name="id" value={method.id} /> : null}
      <input name="name" defaultValue={method?.name || ""} placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
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
          <input name="bankName" defaultValue={method?.credentials.bankName || ""} placeholder="Bank name" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input name="accountName" defaultValue={method?.credentials.accountName || ""} placeholder="Account name" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0 disabled:opacity-50"
            >
              <Upload size={16} />
              {isPending ? "Uploading..." : "Upload QR"}
            </button>
          </div>
        </div>
      ) : null}

      {isStripe ? (
        <div className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3">
          <input
            name="stripeSecretKey"
            type="password"
            placeholder={method ? "Stripe secret key (leave blank to keep current)" : "Stripe secret key"}
            required={!method}
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          />
          <input
            name="stripePublishableKey"
            defaultValue={method?.credentials.publishableKey || ""}
            placeholder="Stripe publishable key"
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          />
          <input
            name="stripeWebhookSecret"
            type="password"
            placeholder="Webhook secret (optional, leave blank to keep current)"
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          />
        </div>
      ) : null}

      {isPayPal ? (
        <div className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3">
          <input
            name="paypalClientId"
            defaultValue={method?.credentials.clientId || ""}
            placeholder="PayPal client ID"
            required
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          />
          <input
            name="paypalClientSecret"
            type="password"
            placeholder={method ? "PayPal client secret (leave blank to keep current)" : "PayPal client secret"}
            required={!method}
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          />
          <select
            name="paypalEnvironment"
            defaultValue={method?.credentials.environment || "sandbox"}
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          >
            <option value="sandbox">Sandbox</option>
            <option value="live">Live</option>
          </select>
        </div>
      ) : null}

      {isCustom ? (
        <textarea name="credentials" placeholder="Custom credentials JSON or note" className="min-h-24 rounded-md border border-black/10 px-3 py-2" />
      ) : null}

      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={method?.enabled ?? true} /> Enabled</label>
      <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0">
        {method ? "Save changes" : "Save method"}
      </button>
    </form>
  );
}
