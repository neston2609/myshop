import type { Metadata } from "next";
import Link from "next/link";
import { registerAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

type RegisterPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export const metadata: Metadata = {
  title: "Create account",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const message = {
    invalid: "Please check your details. Password must be at least 8 characters.",
    "email-taken": "That email is already registered.",
    "username-taken": "That username is already in use.",
  }[params.message || ""];

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-14">
        <form action={registerAction} className="mx-auto grid max-w-md gap-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-3xl font-semibold">Create account</h1>
            <p className="mt-2 text-sm text-slate-600">Save details and view your order history.</p>
          </div>
          {message ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
          <input name="name" placeholder="Name" required className="h-11 rounded-md border border-black/10 px-3" />
          <input name="username" placeholder="Username" className="h-11 rounded-md border border-black/10 px-3" />
          <input name="email" type="email" placeholder="Email" required className="h-11 rounded-md border border-black/10 px-3" />
          <input name="password" type="password" minLength={8} placeholder="Password" required className="h-11 rounded-md border border-black/10 px-3" />
          <p className="-mt-2 text-xs text-slate-500">Password must be at least 8 characters.</p>
          <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white">Create account</button>
          <Link href="/login" className="text-center text-sm text-[#0f766e]">Already have an account?</Link>
        </form>
      </main>
    </>
  );
}
