import { saveShopDescriptionAction } from "@/app/actions";
import { ShopDescriptionFaqsField } from "@/components/shop-description-faqs-field";
import { prisma } from "@/lib/prisma";
import { defaultShopDescription } from "@/lib/shop-description";

export default async function AdminShopDescriptionPage() {
  const site = await prisma.siteSettings.findFirst({
    select: {
      shopDescriptionEyebrow: true,
      shopDescriptionTitle: true,
      shopDescriptionBody: true,
      shopDescriptionFaqs: true,
    },
  });

  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <form action={saveShopDescriptionAction} className="grid gap-5">
        <div>
          <h2 className="text-lg font-semibold">Shop Description</h2>
          <p className="mt-1 text-sm text-slate-500">Manage the description and FAQ section displayed near the bottom of the homepage.</p>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Small heading
          <input
            name="shopDescriptionEyebrow"
            defaultValue={site?.shopDescriptionEyebrow || defaultShopDescription.eyebrow}
            maxLength={80}
            required
            className="h-10 rounded-md border border-black/10 px-3 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Main heading
          <textarea
            name="shopDescriptionTitle"
            defaultValue={site?.shopDescriptionTitle || defaultShopDescription.title}
            maxLength={180}
            rows={2}
            required
            className="rounded-md border border-black/10 px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Description
          <textarea
            name="shopDescriptionBody"
            defaultValue={site?.shopDescriptionBody || defaultShopDescription.body}
            maxLength={1200}
            rows={5}
            required
            className="rounded-md border border-black/10 px-3 py-2 font-normal"
          />
        </label>
        <div className="grid gap-2 border-t border-black/10 pt-5">
          <div>
            <h3 className="font-semibold">Questions and answers</h3>
            <p className="mt-1 text-xs text-slate-500">Add up to 12 FAQ items. These are also used in homepage search-engine structured data.</p>
          </div>
          <ShopDescriptionFaqsField defaultValue={site?.shopDescriptionFaqs} />
        </div>
        <button className="h-10 w-fit rounded-md bg-[#17201c] px-5 font-semibold text-white">Save Shop Description</button>
      </form>
    </div>
  );
}

