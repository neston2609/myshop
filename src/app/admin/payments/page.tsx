import Image from "next/image";
import { deletePaymentAction, togglePaymentAction } from "@/app/actions";
import { BankLogo } from "@/components/bank-logo";
import { PaymentMethodForm } from "@/components/payment-method-form";
import type { PaymentCredentials } from "@/lib/payments";
import { readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

export default async function AdminPaymentsPage() {
  const methods = await prisma.paymentMethod.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Payment methods</h2>
        <div className="mt-4 divide-y divide-black/10">
          {methods.map((method) => {
            const credentials = readPaymentCredentials(method.credentialsCiphertext);
            return (
              <details key={method.id} className="group py-3 text-sm">
                <summary className="grid cursor-pointer list-none items-center gap-3 rounded-md p-2 hover:bg-slate-50 md:grid-cols-[1fr_150px_90px_180px]">
                  <div>
                    <span className="font-medium">{method.name}</span>
                    <ProviderSummary provider={method.provider} credentials={credentials} />
                  </div>
                  <span>{method.provider}{Number(method.additionFeePercent) > 0 ? ` +${Number(method.additionFeePercent)}%` : ""}</span>
                  <span>{method.enabled ? "Enabled" : "Disabled"}</span>
                  <span className="text-xs text-slate-500">Click to edit</span>
                </summary>
                <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4">
                  <PaymentMethodForm
                    method={{
                      id: method.id,
                      name: method.name,
                      provider: method.provider,
                      enabled: method.enabled,
                      additionFeePercent: Number(method.additionFeePercent),
                      credentials,
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <form action={togglePaymentAction}>
                      <input type="hidden" name="id" value={method.id} />
                      <input type="hidden" name="enabled" value={method.enabled ? "false" : "true"} />
                      <button className="h-10 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0">
                        {method.enabled ? "Disable" : "Enable"}
                      </button>
                    </form>
                    <form action={deletePaymentAction}>
                      <input type="hidden" name="id" value={method.id} />
                      <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:translate-y-0">
                        Delete method
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
      <PaymentMethodForm />
    </div>
  );
}

function ProviderSummary({ provider, credentials }: { provider: string; credentials: PaymentCredentials }) {
  if (provider === "BANK_TRANSFER") return <BankTransferSummary credentials={credentials} />;
  if (provider === "STRIPE") {
    return (
      <p className="mt-1 text-xs text-slate-500">
        {credentials.secretKey ? "Secret key configured" : "Missing secret key"}
        {credentials.publishableKey ? " - publishable key set" : ""}
      </p>
    );
  }
  if (provider === "PAYPAL") {
    return (
      <p className="mt-1 text-xs text-slate-500">
        {credentials.clientId && credentials.clientSecret ? "Credentials configured" : "Missing credentials"} - {credentials.environment || "sandbox"}
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-slate-500">{provider === "CASH_ON_DELIVERY" ? "Manual payment" : "Custom credentials"}</p>
  );
}

function BankTransferSummary({ credentials }: { credentials: PaymentCredentials }) {
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
      <BankLogo code={credentials.bankCode} name={credentials.bankName} />
      {credentials.qrCodeUrl ? (
        <Image src={credentials.qrCodeUrl} alt="Bank transfer QR" width={44} height={44} className="rounded-md border border-black/10 object-contain" />
      ) : null}
      <span>{credentials.bankName || "Bank not set"} - {credentials.accountName || "Account not set"} {credentials.accountNumber ? `(${credentials.accountNumber})` : ""}</span>
    </div>
  );
}
