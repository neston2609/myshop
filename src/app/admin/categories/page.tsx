import { saveCategoryAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Categories</h2>
        <div className="mt-4 divide-y divide-black/10">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between py-3 text-sm">
              <span className="font-medium">{category.name}</span>
              <span>{category._count.products} products</span>
            </div>
          ))}
        </div>
      </div>
      <form action={saveCategoryAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Add category</h2>
        <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
        <textarea name="description" placeholder="Description" className="min-h-20 rounded-md border border-black/10 px-3 py-2" />
        <input name="imageUrl" placeholder="Image URL or uploaded path" className="h-10 rounded-md border border-black/10 px-3" />
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save category</button>
      </form>
    </div>
  );
}
