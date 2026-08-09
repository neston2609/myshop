import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || undefined;
  const category = searchParams.get("category") || undefined;
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      ...(category ? { category: { slug: category } } : {}),
    },
    include: { category: true, media: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}
