import Image from "next/image";
import { deleteProductAction, saveProductAction } from "@/app/actions";
import { AiDescriptionButton } from "@/components/ai-description-button";
import { MultiImageUploadField } from "@/components/multi-image-upload-field";
import { RichHtmlEditor } from "@/components/rich-html-editor";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type AdminProductsPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = await searchParams;
  const message = {
    "product-deleted": "Product deleted.",
    "product-archived": "Product has order history, so it was archived instead.",
    "product-not-found": "Product was not found.",
  }[params.message || ""];
  const isError = params.message === "product-not-found";
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: true, media: { orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Products</h2>
        {message ? (
          <p className={`mt-3 rounded-md p-3 text-sm ${isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {message}
          </p>
        ) : null}
        <div className="mt-4 divide-y divide-black/10">
          {products.map((product) => {
            const imageUrls = product.media.filter((media) => media.type === "IMAGE").map((media) => media.url);
            const imageUrl = imageUrls[0] || "";
            const youtubeUrl = product.media.find((media) => media.type === "YOUTUBE")?.url || "";
            return (
              <details key={product.id} className="group py-3 text-sm">
                <summary className="grid cursor-pointer list-none items-center gap-3 rounded-md p-2 hover:bg-slate-50 md:grid-cols-[56px_1fr_110px_80px_80px]">
                  <div className="relative h-12 w-12 overflow-hidden rounded-md border border-black/10 bg-slate-100">
                    {imageUrl ? <Image src={imageUrl} alt={product.name} fill className="object-cover" sizes="48px" /> : null}
                  </div>
                  <span className="font-medium">
                    {product.name}
                    <span className="ml-2 text-slate-400">{product.category.name}</span>
                    {!product.active ? <span className="ml-2 text-xs text-red-600">Inactive</span> : null}
                  </span>
                  <span>{product.sku}</span>
                  <span>{product.stock}</span>
                  <strong>{money(product.price)}</strong>
                </summary>
                <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4">
                  <form action={saveProductAction} className="grid gap-3">
                    <input type="hidden" name="id" value={product.id} />
                    <input name="name" defaultValue={product.name} placeholder="Name" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
                    <RichHtmlEditor name="description" defaultValue={product.description} placeholder="Product details..." />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input name="sku" defaultValue={product.sku} placeholder="SKU" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
                      <input name="price" defaultValue={product.price.toString()} type="number" step="0.01" placeholder="Price" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
                      <input name="stock" defaultValue={product.stock} type="number" placeholder="Stock" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
                    </div>
                    <select name="categoryId" defaultValue={product.categoryId} required className="h-10 rounded-md border border-black/10 bg-white px-3">
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <MultiImageUploadField name="imageUrls" label="Product images" defaultValues={imageUrls} />
                    <AiDescriptionButton />
                    <input name="youtubeUrl" defaultValue={youtubeUrl} placeholder="YouTube URL" className="h-10 rounded-md border border-black/10 bg-white px-3" />
                    <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={product.active} /> Active</label>
                    <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0">Save changes</button>
                  </form>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:translate-y-0">Delete product</button>
                  </form>
                </div>
              </details>
            );
          })}
        </div>
      </div>
      <form action={saveProductAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Add product</h2>
        <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
        <RichHtmlEditor name="description" placeholder="Product details..." />
        <input name="sku" placeholder="SKU" required className="h-10 rounded-md border border-black/10 px-3" />
        <input name="price" type="number" step="0.01" placeholder="Price" required className="h-10 rounded-md border border-black/10 px-3" />
        <input name="stock" type="number" placeholder="Stock" required className="h-10 rounded-md border border-black/10 px-3" />
        <select name="categoryId" required className="h-10 rounded-md border border-black/10 px-3">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <MultiImageUploadField name="imageUrls" label="Product images" />
        <AiDescriptionButton />
        <input name="youtubeUrl" placeholder="YouTube URL" className="h-10 rounded-md border border-black/10 px-3" />
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0">Save product</button>
      </form>
    </div>
  );
}
