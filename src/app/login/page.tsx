import Link from "next/link";
import { loginAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-shell py-14">
        <form action={loginAction} className="mx-auto grid max-w-md gap-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-3xl font-semibold">Log in</h1>
            <p className="mt-2 text-sm text-slate-600">Access your orders or the admin dashboard.</p>
          </div>
          <input name="email" type="email" placeholder="Email" required className="h-11 rounded-md border border-black/10 px-3" />
          <input name="password" type="password" placeholder="Password" required className="h-11 rounded-md border border-black/10 px-3" />
          <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white">Log in</button>
          <Link href="/register" className="text-center text-sm text-[#0f766e]">Create an account</Link>
        </form>
      </main>
    </>
  );
}
