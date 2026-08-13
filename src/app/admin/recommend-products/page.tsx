import { saveRecommendedProductsAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

type AdminRecommendProductsPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AdminRecommendProductsPage({ searchParams }: AdminRecommendProductsPageProps) {
  const params = await searchParams;
  const [products, recommendedProducts] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, sku: true, recommendedPosition: true },
    }),
    prisma.product.findMany({
      where: { recommendedPosition: { not: null } },
      orderBy: { recommendedPosition: "asc" },
      select: { id: true, recommendedPosition: true },
      take: 8,
    }),
  ]);
  const selectedByPosition = new Map(recommendedProducts.map((product) => [product.recommendedPosition || 0, product.id]));

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-black/10 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="font-semibold">Recommend Products</h2>
            <p className="mt-1 text-sm text-slate-500">เลือกสินค้าได้สูงสุด 8 รายการเพื่อแสดงที่หน้าแรก โดยลำดับที่เลือกจะเป็นลำดับการแสดงผล</p>
          </div>
        </div>
        {params.message === "saved" ? (
          <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Recommend products saved.</p>
        ) : null}
        <form action={saveRecommendedProductsAction} className="mt-5 grid gap-4">
          {Array.from({ length: 8 }, (_, index) => {
            const position = index + 1;
            return (
              <label key={position} className="grid gap-1 text-sm font-medium text-slate-700">
                Product {position}
                <select
                  name={`productId${position}`}
                  defaultValue={selectedByPosition.get(position) || ""}
                  className="h-11 rounded-md border border-black/10 bg-white px-3 font-normal text-slate-900"
                >
                  <option value="">Not selected</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <button className="h-11 w-fit rounded-md bg-[#17201c] px-5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0">
            Save recommend products
          </button>
        </form>
      </section>
    </div>
  );
}
