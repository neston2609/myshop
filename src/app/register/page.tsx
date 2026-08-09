import Link from "next/link";
import { registerAction } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-shell py-14">
        <form action={registerAction} className="mx-auto grid max-w-md gap-4 rounded-lg border border-black/10 bg-white p-6">
          <div>
            <h1 className="text-3xl font-semibold">Create account</h1>
            <p className="mt-2 text-sm text-slate-600">Save details and view your order history.</p>
          </div>
          <input name="name" placeholder="Name" required className="h-11 rounded-md border border-black/10 px-3" />
          <input name="email" type="email" placeholder="Email" required className="h-11 rounded-md border border-black/10 px-3" />
          <input name="password" type="password" placeholder="Password" required className="h-11 rounded-md border border-black/10 px-3" />
          <button className="h-11 rounded-md bg-[#17201c] font-semibold text-white">Create account</button>
          <Link href="/login" className="text-center text-sm text-[#0f766e]">Already have an account?</Link>
        </form>
      </main>
    </>
  );
}
