import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

type SuccessPageProps = {
  searchParams: Promise<{ order?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="container-shell py-16">
        <div className="mx-auto max-w-xl rounded-lg border border-black/10 bg-white p-8 text-center">
          <h1 className="text-3xl font-semibold">Order received</h1>
          <p className="mt-3 text-slate-600">Thanks for your order. Reference: <strong>{params.order}</strong></p>
          <Link href="/account" className="mt-6 inline-flex h-11 items-center rounded-md bg-[#17201c] px-5 font-semibold text-white">View account</Link>
        </div>
      </main>
    </>
  );
}
