import { deleteShippingAction, saveShippingAction, toggleShippingAction } from "@/app/actions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminShippingPage() {
  const shippingMethods = await prisma.shippingMethod.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Shipping methods</h2>
        <div className="mt-4 divide-y divide-black/10">
          {shippingMethods.map((method) => (
            <details key={method.id} className="group py-3 text-sm">
              <summary className="grid cursor-pointer list-none items-center gap-3 rounded-md p-2 hover:bg-slate-50 md:grid-cols-[1fr_120px_90px_140px]">
                <span className="font-medium">
                  {method.name}
                  <span className="ml-2 text-slate-400">{method.regions.join(", ")}</span>
                </span>
                <span>{money(method.cost)}</span>
                <span>{method.enabled ? "Enabled" : "Disabled"}</span>
                <span className="text-xs text-slate-500">Click to edit</span>
              </summary>
              <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4">
                <ShippingForm
                  id={method.id}
                  name={method.name}
                  regions={method.regions.join(", ")}
                  cost={method.cost.toString()}
                  enabled={method.enabled}
                  submitLabel="Save changes"
                />
                <div className="flex flex-wrap gap-2">
                  <form action={toggleShippingAction}>
                    <input type="hidden" name="id" value={method.id} />
                    <input type="hidden" name="enabled" value={method.enabled ? "false" : "true"} />
                    <button className="h-10 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0">
                      {method.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                  <form action={deleteShippingAction}>
                    <input type="hidden" name="id" value={method.id} />
                    <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:translate-y-0">
                      Delete shipping
                    </button>
                  </form>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
      <ShippingForm submitLabel="Save shipping" />
    </div>
  );
}

function ShippingForm({
  id,
  name = "",
  regions = "",
  cost = "",
  enabled = true,
  submitLabel,
}: {
  id?: string;
  name?: string;
  regions?: string;
  cost?: string;
  enabled?: boolean;
  submitLabel: string;
}) {
  return (
    <form action={saveShippingAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
      <h2 className="font-semibold">{id ? "Edit shipping method" : "Add shipping method"}</h2>
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <input name="name" defaultValue={name} placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
      <input name="regions" defaultValue={regions} placeholder="US, TH, EU" required className="h-10 rounded-md border border-black/10 px-3" />
      <input name="cost" defaultValue={cost} type="number" step="0.01" placeholder="Cost" required className="h-10 rounded-md border border-black/10 px-3" />
      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={enabled} /> Enabled</label>
      <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0">
        {submitLabel}
      </button>
    </form>
  );
}
