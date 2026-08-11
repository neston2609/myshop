"use client";

import Image from "next/image";
import { useState } from "react";
import { QrCode, Upload } from "lucide-react";
import { submitPaymentProofAction } from "@/app/actions";
import { BankLogo } from "@/components/bank-logo";
import { money } from "@/lib/format";
import type { BankTransferCredentials } from "@/lib/payments";

export function BankTransferOrderActions({
  orderId,
  orderNumber,
  total,
  credentials,
  proofSubmitted,
}: {
  orderId: string;
  orderNumber: string;
  total: number;
  credentials: BankTransferCredentials;
  proofSubmitted: boolean;
}) {
  const [showProof, setShowProof] = useState(false);
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {!proofSubmitted ? (
        <button
          type="button"
          onClick={() => setShowProof((value) => !value)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#115e59] active:translate-y-px"
        >
          <Upload size={16} />
          แจ้งชำระเงิน
        </button>
      ) : (
        <span className="inline-flex h-10 items-center rounded-md bg-amber-50 px-4 text-sm font-semibold text-amber-800">
          รอตรวจสอบสลิป
        </span>
      )}
      <button
        type="button"
        onClick={() => setShowQr(true)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold transition hover:bg-slate-50"
      >
        <QrCode size={16} />
        ดู QR
      </button>

      {showProof && !proofSubmitted ? (
        <form action={submitPaymentProofAction} className="grid w-full gap-3 rounded-md border border-black/10 bg-slate-50 p-3 md:grid-cols-2">
          <input type="hidden" name="orderId" value={orderId} />
          <input name="payerName" placeholder="ชื่อผู้โอน" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input name="transferBank" placeholder="ธนาคารที่โอนจาก" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input name="transferAmount" type="number" step="0.01" min="0" defaultValue={total.toFixed(2)} required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input name="paidAt" type="datetime-local" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
          <input name="slip" type="file" accept="image/png,image/jpeg,image/webp" required className="rounded-md border border-black/10 bg-white px-3 py-2 md:col-span-2" />
          <textarea name="note" placeholder="หมายเหตุ" rows={3} className="rounded-md border border-black/10 bg-white px-3 py-2 md:col-span-2" />
          <button className="h-10 rounded-md bg-[#17201c] px-4 font-semibold text-white md:col-span-2">
            ส่งสลิป
          </button>
        </form>
      ) : null}

      {showQr ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              <BankLogo code={credentials.bankCode} name={credentials.bankName} />
              <div>
                <p className="font-semibold">{orderNumber}</p>
                <p className="text-sm text-slate-600">{credentials.bankName}</p>
              </div>
            </div>
            {credentials.qrCodeUrl ? (
              <Image src={credentials.qrCodeUrl} alt="Bank transfer QR" width={260} height={260} className="mx-auto mt-4 rounded-md border border-black/10 object-contain" />
            ) : null}
            <div className="mt-4 grid gap-1 text-sm text-slate-700">
              <p>ชื่อบัญชี: <strong>{credentials.accountName}</strong></p>
              <p>เลขบัญชี: <strong>{credentials.accountNumber}</strong></p>
              <p>ยอดชำระ: <strong>{money(total)}</strong></p>
            </div>
            <button
              type="button"
              onClick={() => setShowQr(false)}
              className="mt-5 h-10 w-full rounded-md bg-[#17201c] font-semibold text-white"
            >
              ปิด
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
