import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export const metadata: Metadata = {
  title: "Log in",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = {
    invalid: "Username/email or password is incorrect.",
    "rate-limited": "Too many login attempts. Please try again shortly.",
    "account-exists": "An account already exists. Please log in.",
    "password-reset": "Password reset successfully. Please log in with your new password.",
  }[params.message || ""];
  const isSuccess = params.message === "password-reset";

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-14">
        <form action={loginAction} className="mx-auto grid max-w-md gap-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-3xl font-semibold">Log in</h1>
            <p className="mt-2 text-sm text-slate-600">Access your orders or the admin dashboard.</p>
          </div>
          {message ? <p className={`rounded-md p-3 text-sm ${isSuccess ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p> : null}
          <input name="identifier" type="text" placeholder="Username or email" required className="h-11 rounded-md border border-black/10 px-3" />
          <input name="password" type="password" placeholder="Password" required className="h-11 rounded-md border border-black/10 px-3" />
          <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white">Log in</button>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link href="/forgot-password" className="text-[#0f766e]">Forgot password?</Link>
            <Link href="/register" className="text-[#0f766e]">Create an account</Link>
          </div>
        </form>
      </main>
    </>
  );
}
