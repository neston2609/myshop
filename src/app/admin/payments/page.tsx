import { savePaymentAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export default async function AdminPaymentsPage() {
  const methods = await prisma.paymentMethod.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Payment methods</h2>
        <div className="mt-4 divide-y divide-black/10">
          {methods.map((method) => (
            <div key={method.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_150px_90px]">
              <span className="font-medium">{method.name}</span>
              <span>{method.provider}</span>
              <span>{method.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          ))}
        </div>
      </div>
      <form action={savePaymentAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Add payment method</h2>
        <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
        <select name="provider" className="h-10 rounded-md border border-black/10 px-3">
          <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
          <option value="STRIPE">Stripe</option>
          <option value="PAYPAL">PayPal</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <textarea name="credentials" placeholder="API credentials JSON" className="min-h-24 rounded-md border border-black/10 px-3 py-2" />
        <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> Enabled</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save method</button>
      </form>
    </div>
  );
}
