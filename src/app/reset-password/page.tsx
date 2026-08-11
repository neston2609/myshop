import Link from "next/link";
import { resetPasswordAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string; message?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const hasToken = Boolean(params.token);
  const message = {
    invalid: "Please enter a matching password with at least 8 characters.",
    expired: "This reset link is invalid or has expired. Please request a new one.",
  }[params.message || ""];

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-14">
        <form action={resetPasswordAction} className="mx-auto grid max-w-md gap-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-3xl font-semibold">Reset password</h1>
            <p className="mt-2 text-sm text-slate-600">Choose a new password for your account.</p>
          </div>
          {message ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
          {!hasToken ? (
            <div className="grid gap-3">
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Reset token is missing.</p>
              <Link href="/forgot-password" className="text-center text-sm font-semibold text-[#0f766e]">Request a new reset link</Link>
            </div>
          ) : (
            <>
              <input type="hidden" name="token" value={params.token} />
              <input name="newPassword" type="password" minLength={8} placeholder="New password" required className="h-11 rounded-md border border-black/10 px-3" />
              <input name="confirmPassword" type="password" minLength={8} placeholder="Confirm new password" required className="h-11 rounded-md border border-black/10 px-3" />
              <p className="-mt-2 text-xs text-slate-500">Password must be at least 8 characters.</p>
              <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
                Save new password
              </button>
              <Link href="/login" className="text-center text-sm text-[#0f766e]">Back to login</Link>
            </>
          )}
        </form>
      </main>
    </>
  );
}
