import { saveShippingAction, saveSiteSettingsAction } from "@/app/actions";
import { LogoUploadField } from "@/components/logo-upload-field";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  const [shippingMethods, site] = await Promise.all([
    prisma.shippingMethod.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.siteSettings.findFirst(),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6 rounded-lg border border-black/10 bg-white p-5">
        <form action={saveSiteSettingsAction} className="grid gap-3">
          <h2 className="font-semibold">Website branding</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="shopName" defaultValue={site?.shopName || "MyShop"} placeholder="Shop name" required className="h-10 rounded-md border border-black/10 px-3" />
            <input name="supportEmail" defaultValue={site?.supportEmail || ""} placeholder="Support email" className="h-10 rounded-md border border-black/10 px-3" />
            <LogoUploadField defaultValue={site?.logoUrl} />
            <input name="faviconUrl" defaultValue={site?.faviconUrl || ""} placeholder="Favicon URL or uploaded path" className="h-10 rounded-md border border-black/10 px-3" />
            <input name="brandColor" defaultValue={site?.brandColor || "#111827"} placeholder="#111827" className="h-10 rounded-md border border-black/10 px-3" />
          </div>
          <button className="h-10 w-fit rounded-md bg-[#17201c] px-4 font-semibold text-white">Save branding</button>
        </form>
        <h2 className="mt-8 font-semibold">Shipping methods</h2>
        <div className="mt-4 divide-y divide-black/10">
          {shippingMethods.map((method) => (
            <div key={method.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_120px_90px]">
              <span className="font-medium">{method.name}<span className="ml-2 text-slate-400">{method.regions.join(", ")}</span></span>
              <span>{money(method.cost)}</span>
              <span>{method.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          ))}
        </div>
      </div>
      <form action={saveShippingAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Add shipping method</h2>
        <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
        <input name="regions" placeholder="US, TH, EU" required className="h-10 rounded-md border border-black/10 px-3" />
        <input name="cost" type="number" step="0.01" placeholder="Cost" required className="h-10 rounded-md border border-black/10 px-3" />
        <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked /> Enabled</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save shipping</button>
      </form>
    </div>
  );
}
