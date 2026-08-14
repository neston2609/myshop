import { deleteDiscountCodeAction, saveDiscountCodeAction } from "@/app/actions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type AdminDiscountCodesPageProps = {
  searchParams: Promise<{ message?: string }>;
};

function thailandDateTimeInput(value?: Date | null) {
  if (!value) return "";
  return new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function DiscountFields({ code }: { code?: Awaited<ReturnType<typeof prisma.discountCode.findFirst>> }) {
  return (
    <>
      {code ? <input type="hidden" name="id" value={code.id} /> : null}
      <input name="code" defaultValue={code?.code || ""} placeholder="Code, e.g. WELCOME10" required className="h-10 rounded-md border border-black/10 bg-white px-3 uppercase" />
      <input name="description" defaultValue={code?.description || ""} placeholder="Promotion description" className="h-10 rounded-md border border-black/10 bg-white px-3" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Discount type
          <select name="type" defaultValue={code?.type || "PERCENT"} className="h-10 rounded-md border border-black/10 bg-white px-3 font-normal">
            <option value="PERCENT">Percent (%)</option>
            <option value="FIXED">Fixed amount (THB)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Discount value
          <input name="value" defaultValue={code?.value.toString() || ""} type="number" min="0.01" step="0.01" required className="h-10 rounded-md border border-black/10 bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Minimum purchase (optional)
          <input name="minimumSubtotal" defaultValue={code?.minimumSubtotal?.toString() || ""} type="number" min="0" step="0.01" className="h-10 rounded-md border border-black/10 bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Maximum discount (optional)
          <input name="maximumDiscount" defaultValue={code?.maximumDiscount?.toString() || ""} type="number" min="0.01" step="0.01" className="h-10 rounded-md border border-black/10 bg-white px-3 font-normal" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Expiration date/time (Thailand, optional)
        <input name="expiresAt" defaultValue={thailandDateTimeInput(code?.expiresAt)} type="datetime-local" className="h-10 rounded-md border border-black/10 bg-white px-3 font-normal" />
      </label>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input name="active" type="checkbox" defaultChecked={code?.active ?? true} /> Active</label>
        <label className="flex items-center gap-2"><input name="isPublic" type="checkbox" defaultChecked={code?.isPublic ?? false} /> Public — advertise on homepage</label>
      </div>
    </>
  );
}

export default async function AdminDiscountCodesPage({ searchParams }: AdminDiscountCodesPageProps) {
  const [codes, params] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    searchParams,
  ]);
  const message = params.message === "saved" ? "Discount code saved." : params.message === "deleted" ? "Discount code deleted." : params.message === "code-exists" ? "This code already exists." : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Discount Codes</h2>
        {message ? <p className={`mt-3 rounded-md p-3 text-sm ${params.message === "code-exists" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}
        <div className="mt-4 divide-y divide-black/10">
          {codes.map((code) => {
            const expired = Boolean(code.expiresAt && code.expiresAt <= new Date());
            return (
              <details key={code.id} className="py-3 text-sm">
                <summary className="grid cursor-pointer list-none gap-2 rounded-md p-2 hover:bg-slate-50 sm:grid-cols-[1fr_120px_150px]">
                  <span className="font-semibold">{code.code}{code.isPublic ? <span className="ml-2 text-xs text-[#0f766e]">Public</span> : null}</span>
                  <span>{code.type === "PERCENT" ? `${code.value}%` : money(code.value)}</span>
                  <span className={expired || !code.active ? "text-red-600" : "text-slate-500"}>{expired ? "Expired" : code.active ? "Active" : "Inactive"}</span>
                </summary>
                <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4">
                  <form action={saveDiscountCodeAction} className="grid gap-3">
                    <DiscountFields code={code} />
                    <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save changes</button>
                  </form>
                  <form action={deleteDiscountCodeAction}>
                    <input type="hidden" name="id" value={code.id} />
                    <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 font-semibold text-red-700">Delete code</button>
                  </form>
                </div>
              </details>
            );
          })}
          {!codes.length ? <p className="py-6 text-sm text-slate-500">No discount codes yet.</p> : null}
        </div>
      </section>
      <form action={saveDiscountCodeAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Create discount code</h2>
        <DiscountFields />
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Create code</button>
      </form>
    </div>
  );
}

