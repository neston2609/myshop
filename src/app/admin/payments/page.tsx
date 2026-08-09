import Image from "next/image";
import { PaymentMethodForm } from "@/components/payment-method-form";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type BankTransferCredentials = {
  bankName?: string;
  accountName?: string;
  qrCodeUrl?: string;
};

function bankTransferCredentials(credentials?: string | null): BankTransferCredentials | null {
  if (!credentials) return null;
  try {
    return JSON.parse(decryptSecret(credentials)) as BankTransferCredentials;
  } catch {
    return null;
  }
}

export default async function AdminPaymentsPage() {
  const methods = await prisma.paymentMethod.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Payment methods</h2>
        <div className="mt-4 divide-y divide-black/10">
          {methods.map((method) => (
            <div key={method.id} className="grid gap-3 py-3 text-sm md:grid-cols-[1fr_150px_90px]">
              <div>
                <span className="font-medium">{method.name}</span>
                {method.provider === "BANK_TRANSFER" ? (
                  <BankTransferSummary credentials={bankTransferCredentials(method.credentialsCiphertext)} />
                ) : null}
              </div>
              <span>{method.provider}</span>
              <span>{method.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          ))}
        </div>
      </div>
      <PaymentMethodForm />
    </div>
  );
}

function BankTransferSummary({ credentials }: { credentials: BankTransferCredentials | null }) {
  if (!credentials) return null;
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
      {credentials.qrCodeUrl ? (
        <Image src={credentials.qrCodeUrl} alt="Bank transfer QR" width={44} height={44} className="rounded-md border border-black/10 object-contain" />
      ) : null}
      <span>{credentials.bankName} - {credentials.accountName}</span>
    </div>
  );
}
