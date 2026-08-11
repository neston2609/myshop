import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const message = {
    sent: "If that account exists, a reset link has been sent to the registered email.",
    "rate-limited": "Too many reset requests. Please try again shortly.",
  }[params.message || ""];
  const isError = params.message === "rate-limited";

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-14">
        <form action={forgotPasswordAction} className="mx-auto grid max-w-md gap-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-3xl font-semibold">Forgot password</h1>
            <p className="mt-2 text-sm text-slate-600">Enter your username or email and we will send a reset link.</p>
          </div>
          {message ? (
            <p className={`rounded-md p-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {message}
            </p>
          ) : null}
          <input name="identifier" type="text" placeholder="Username or email" required className="h-11 rounded-md border border-black/10 px-3" />
          <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white transition hover:bg-[#0f766e] active:translate-y-px">
            Send reset link
          </button>
          <Link href="/login" className="text-center text-sm text-[#0f766e]">Back to login</Link>
        </form>
      </main>
    </>
  );
}
