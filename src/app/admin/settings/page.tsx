import { saveSiteSettingsAction } from "@/app/actions";
import { LogoUploadField } from "@/components/logo-upload-field";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  const site = await prisma.siteSettings.findFirst();
  const defaultHeroEyebrow = "Minimal commerce, ready to grow";
  const defaultHeroTitle = "Shop essentials with a calmer checkout.";
  const defaultHeroSubtitle = "A modern storefront with guest checkout, customer accounts, secure admin controls, uploads, SMTP, payments, and AI configuration.";
  const defaultFeatures = [
    {
      titleName: "featureOneTitle",
      bodyName: "featureOneBody",
      title: site?.featureOneTitle || "Configurable shipping",
      body: site?.featureOneBody || "Enable regions, delivery fees, and checkout options from admin.",
    },
    {
      titleName: "featureTwoTitle",
      bodyName: "featureTwoBody",
      title: site?.featureTwoTitle || "Secure by default",
      body: site?.featureTwoBody || "Hashed passwords, signed sessions, validation, and encrypted secrets.",
    },
    {
      titleName: "featureThreeTitle",
      bodyName: "featureThreeBody",
      title: site?.featureThreeTitle || "AI-ready operations",
      body: site?.featureThreeBody || "Choose providers and models for descriptions, SEO text, and assistant features.",
    },
  ];

  return (
    <div className="grid gap-6">
      <div className="space-y-6 rounded-lg border border-black/10 bg-white p-5">
        <form action={saveSiteSettingsAction} className="grid gap-3">
          <h2 className="font-semibold">Website branding</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="shopName" defaultValue={site?.shopName || "MyShop"} placeholder="Shop name" required className="h-10 rounded-md border border-black/10 px-3" />
            <input name="supportEmail" defaultValue={site?.supportEmail || ""} placeholder="Support email" className="h-10 rounded-md border border-black/10 px-3" />
            <input name="orderNotificationEmail" defaultValue={site?.orderNotificationEmail || ""} type="email" placeholder="Order/status notification email" className="h-10 rounded-md border border-black/10 px-3" />
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
            <h3 className="text-sm font-semibold">Shipping remote area</h3>
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <input
                name="remoteAreaFee"
                defaultValue={site?.remoteAreaFee?.toString() || "50"}
                type="number"
                step="0.01"
                min="0"
                placeholder="Remote area fee"
                className="h-10 rounded-md border border-black/10 px-3"
              />
              <textarea
                name="remotePostalCodes"
                defaultValue={(site?.remotePostalCodes || []).join("\n")}
                placeholder={"58130\n84280\ncomma, space, or newline separated"}
                rows={4}
                className="rounded-md border border-black/10 px-3 py-2"
              />
            </div>
          </div>
          <div className="grid gap-3 border-t border-black/10 pt-4">
            <div>
              <h3 className="text-sm font-semibold">Header navigation</h3>
              <p className="mt-1 text-xs text-slate-500">Add one link per line, using: Label | URL</p>
            </div>
            <textarea
              name="headerLinks"
              defaultValue={site?.headerLinks || ""}
              placeholder={"About | /about\nContact | /contact\nFacebook | https://facebook.com/yourshop"}
              rows={4}
              className="rounded-md border border-black/10 px-3 py-2"
            />
          </div>
          <div className="grid gap-3 border-t border-black/10 pt-4">
            <h3 className="text-sm font-semibold">Homepage hero text</h3>
            <input name="heroEyebrow" defaultValue={site?.heroEyebrow || defaultHeroEyebrow} placeholder="Small title above hero" required className="h-10 rounded-md border border-black/10 px-3" />
            <input name="heroTitle" defaultValue={site?.heroTitle || defaultHeroTitle} placeholder="Main title" required className="h-10 rounded-md border border-black/10 px-3" />
            <textarea name="heroSubtitle" defaultValue={site?.heroSubtitle || defaultHeroSubtitle} placeholder="Subtitle" required rows={3} className="rounded-md border border-black/10 px-3 py-2" />
          </div>
          <div className="grid gap-3 border-t border-black/10 pt-4">
            <h3 className="text-sm font-semibold">Homepage feature cards</h3>
            <div className="grid gap-4 lg:grid-cols-3">
              {defaultFeatures.map((feature, index) => (
                <div key={feature.titleName} className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Card {index + 1}</p>
                  <input name={feature.titleName} defaultValue={feature.title} placeholder="Title" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
                  <textarea name={feature.bodyName} defaultValue={feature.body} placeholder="Text" required rows={4} className="rounded-md border border-black/10 bg-white px-3 py-2" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-t border-black/10 pt-4">
            <h3 className="text-sm font-semibold">Footer</h3>
            <textarea name="footerText" defaultValue={site?.footerText || ""} placeholder="Footer text" rows={3} className="rounded-md border border-black/10 px-3 py-2" />
          </div>
          <button className="h-10 w-fit rounded-md bg-[#17201c] px-4 font-semibold text-white">Save branding</button>
        </form>
      </div>
    </div>
  );
}
