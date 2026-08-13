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
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)]">
        <h2 className="font-semibold">Payment methods</h2>
        <div className="mt-4 grid gap-3">
          {methods.map((method) => {
            const credentials = readPaymentCredentials(method.credentialsCiphertext);
            return (
              <details key={method.id} className="group rounded-md border border-[var(--border)] bg-[var(--surface-raised)] text-sm">
                <summary className="grid cursor-pointer list-none gap-4 p-4 transition hover:bg-[var(--surface-soft)] md:grid-cols-[minmax(0,1fr)_220px_110px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-semibold text-[var(--text)]">
                      {method.name}
                    </span>
                      {method.isTest ? <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">TEST</span> : null}
                    </div>
                    <ProviderSummary provider={method.provider} credentials={credentials} />
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                      {providerLabel(method.provider)}
                    </span>
                    {Number(method.additionFeePercent) > 0 ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        Fee +{Number(method.additionFeePercent)}%
                      </span>
                    ) : null}
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${method.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                      {method.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent)] md:text-right">Click to edit</span>
                </summary>
                <div className="grid gap-3 border-t border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <PaymentMethodForm
                    method={{
                      id: method.id,
                      name: method.name,
                      provider: method.provider,
                      enabled: method.enabled,
                      isTest: method.isTest,
                      additionFeePercent: Number(method.additionFeePercent),
                      credentials,
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <form action={togglePaymentAction}>
                      <input type="hidden" name="id" value={method.id} />
                      <input type="hidden" name="enabled" value={method.enabled ? "false" : "true"} />
                      <button className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-raised)] active:translate-y-0">
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

function providerLabel(provider: string) {
  if (provider === "BANK_TRANSFER") return "Bank transfer";
  if (provider === "CASH_ON_DELIVERY") return "Cash on delivery";
  if (provider === "STRIPE") return "Stripe";
  if (provider === "PAYPAL") return "PayPal";
  return "Custom";
}

function ProviderSummary({ provider, credentials }: { provider: string; credentials: PaymentCredentials }) {
  if (provider === "BANK_TRANSFER") return <BankTransferSummary credentials={credentials} />;
  if (provider === "STRIPE") {
    return (
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
        {credentials.secretKey ? "Secret key configured" : "Missing secret key"}
        {credentials.publishableKey ? " - publishable key set" : ""}
      </p>
    );
  }
  if (provider === "PAYPAL") {
    return (
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
        {credentials.clientId && credentials.clientSecret ? "Credentials configured" : "Missing credentials"} - {credentials.environment || "sandbox"}
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{provider === "CASH_ON_DELIVERY" ? "Manual payment" : "Custom credentials"}</p>
  );
}

function BankTransferSummary({ credentials }: { credentials: PaymentCredentials }) {
  return (
    <div className="mt-3 grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
          <BankLogo code={credentials.bankCode} name={credentials.bankName} />
        </div>
        {credentials.qrCodeUrl ? (
          <Image src={credentials.qrCodeUrl} alt="Bank transfer QR" width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-md border border-[var(--border)] bg-white object-contain" />
        ) : (
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[10px] font-semibold text-[var(--muted)]">
            No QR
          </div>
        )}
      </div>
      <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
        <p className="font-semibold text-[var(--text)]">{credentials.bankName || "Bank not set"}</p>
        <p className="mt-0.5 break-words">{credentials.accountName || "Account not set"}</p>
        {credentials.accountNumber ? <p className="mt-0.5 break-words">Account: {credentials.accountNumber}</p> : null}
      </div>
    </div>
  );
}
