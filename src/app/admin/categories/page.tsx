import Image from "next/image";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions";
import { ImageUploadField } from "@/components/image-upload-field";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Categories</h2>
        <div className="mt-4 divide-y divide-black/10">
          {categories.map((category) => (
            <details key={category.id} className="group py-3 text-sm">
              <summary className="grid cursor-pointer list-none items-center gap-3 rounded-md p-2 hover:bg-slate-50 sm:grid-cols-[56px_1fr_110px]">
                <div className="relative h-12 w-12 overflow-hidden rounded-md border border-black/10 bg-slate-100">
                  {category.imageUrl ? <Image src={category.imageUrl} alt={category.name} fill className="object-cover" sizes="48px" /> : null}
                </div>
                <span className="font-medium">
                  {category.name}
                  {!category.active ? <span className="ml-2 text-xs text-red-600">Inactive</span> : null}
                </span>
                <span>{category._count.products} products</span>
              </summary>
              <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4">
                <form action={saveCategoryAction} className="grid gap-3">
                  <input type="hidden" name="id" value={category.id} />
                  <input name="name" defaultValue={category.name} placeholder="Name" required className="h-10 rounded-md border border-black/10 bg-white px-3" />
                  <textarea name="description" defaultValue={category.description || ""} placeholder="Description" className="min-h-20 rounded-md border border-black/10 bg-white px-3 py-2" />
                  <ImageUploadField name="imageUrl" label="Category image" defaultValue={category.imageUrl} />
                  <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={category.active} /> Active</label>
                  <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save changes</button>
                </form>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <button className="h-10 rounded-md border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700">Delete category</button>
                </form>
              </div>
            </details>
          ))}
        </div>
      </div>
      <form action={saveCategoryAction} className="grid h-fit gap-3 rounded-lg border border-black/10 bg-white p-5">
        <h2 className="font-semibold">Add category</h2>
        <input name="name" placeholder="Name" required className="h-10 rounded-md border border-black/10 px-3" />
        <textarea name="description" placeholder="Description" className="min-h-20 rounded-md border border-black/10 px-3 py-2" />
        <ImageUploadField name="imageUrl" label="Category image" />
        <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked /> Active</label>
        <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save category</button>
      </form>
    </div>
  );
}
