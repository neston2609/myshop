import { saveProductAction } from "@/app/actions";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Products</h2>
        <div className="mt-4 divide-y divide-black/10">
          {products.map((product) => (
            <div key={product.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_110px_80px_80px]">
              <span className="font-medium">{product.name}<span className="ml-2 text-slate-400">{product.category.name}</span></span>
              <span>{product.sku}</span>
              <span>{product.stock}</span>
              <strong>{money(product.price)}</strong>
            </div>
          ))}
        </div>
      </div>
      <form action={saveProductAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Add product</h2>
        <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
        <textarea name="description" placeholder="Description" required className="min-h-24 rounded-md border border-black/10 px-3 py-2" />
        <input name="sku" placeholder="SKU" required className="h-10 rounded-md border border-black/10 px-3" />
        <input name="price" type="number" step="0.01" placeholder="Price" required className="h-10 rounded-md border border-black/10 px-3" />
        <input name="stock" type="number" placeholder="Stock" required className="h-10 rounded-md border border-black/10 px-3" />
        <select name="categoryId" required className="h-10 rounded-md border border-black/10 px-3">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input name="imageUrl" placeholder="Image URL or uploaded path" className="h-10 rounded-md border border-black/10 px-3" />
        <input name="youtubeUrl" placeholder="YouTube URL" className="h-10 rounded-md border border-black/10 px-3" />
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save product</button>
      </form>
    </div>
  );
}
