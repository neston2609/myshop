import { saveShippingAction, saveSiteSettingsAction } from "@/app/actions";
import { LogoUploadField } from "@/components/logo-upload-field";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  const [shippingMethods, site] = await Promise.all([
    prisma.shippingMethod.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.siteSettings.findFirst(),
  ]);
  const defaultHeroEyebrow = "Minimal commerce, ready to grow";
  const defaultHeroTitle = "Shop essentials with a calmer checkout.";
  const defaultHeroSubtitle = "A modern storefront with guest checkout, customer accounts, secure admin controls, uploads, SMTP, payments, and AI configuration.";

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
            <label className="grid gap-1 text-sm font-medium">
              Theme
              <select name="themeMode" defaultValue={site?.themeMode || "WHITE"} className="h-10 rounded-md border border-black/10 px-3 font-normal">
                <option value="WHITE">White theme</option>
                <option value="BLACK">Black theme</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Website font
              <select name="fontFamily" defaultValue={site?.fontFamily || "TH_SARABUN_PSK"} className="h-10 rounded-md border border-black/10 px-3 font-normal">
                <option value="CENTURY_GOTHIC">Century Gothic</option>
                <option value="TH_SARABUN_PSK">TH Sarabun PSK</option>
                <option value="PROMPT">Prompt</option>
                <option value="IMPACT">Impact</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 border-t border-black/10 pt-4">
            <h3 className="text-sm font-semibold">Homepage hero text</h3>
            <input name="heroEyebrow" defaultValue={site?.heroEyebrow || defaultHeroEyebrow} placeholder="Small title above hero" required className="h-10 rounded-md border border-black/10 px-3" />
            <input name="heroTitle" defaultValue={site?.heroTitle || defaultHeroTitle} placeholder="Main title" required className="h-10 rounded-md border border-black/10 px-3" />
            <textarea name="heroSubtitle" defaultValue={site?.heroSubtitle || defaultHeroSubtitle} placeholder="Subtitle" required rows={3} className="rounded-md border border-black/10 px-3 py-2" />
          </div>
          <div className="grid gap-3 border-t border-black/10 pt-4">
            <h3 className="text-sm font-semibold">Footer</h3>
            <textarea name="footerText" defaultValue={site?.footerText || ""} placeholder="Footer text" rows={3} className="rounded-md border border-black/10 px-3 py-2" />
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
