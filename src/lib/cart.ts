import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const cartCookie = "myshop_cart";

export type CartLine = {
  productId: string;
  quantity: number;
};

async function readLines(): Promise<CartLine[]> {
  const store = await cookies();
  const raw = store.get(cartCookie)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartLine[];
    return parsed.filter((item) => item.productId && item.quantity > 0);
  } catch {
    return [];
  }
}

async function writeLines(lines: CartLine[]) {
  const store = await cookies();
  store.set(cartCookie, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function addCartItem(productId: string, quantity = 1) {
  const lines = await readLines();
  const existing = lines.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
  } else {
    lines.push({ productId, quantity: Math.max(1, Math.min(99, quantity)) });
  }
  await writeLines(lines);
}

export async function updateCartItem(productId: string, quantity: number) {
  const lines = await readLines();
  const next = lines
    .map((item) => (item.productId === productId ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  await writeLines(next);
}

export async function clearCart() {
  const store = await cookies();
  store.delete(cartCookie);
  store.delete("myshop_discount_code");
}

export async function getCart() {
  const lines = await readLines();
  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((item) => item.productId) }, active: true },
    include: { media: { orderBy: { sortOrder: "asc" } }, category: true },
  });

  const items = lines.flatMap((line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (!product) return [];
    const price = Number(product.price);
    return [{
      product,
      quantity: line.quantity,
      lineTotal: price * line.quantity,
    }];
  });

  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
  return { items, subtotal, count: items.reduce((total, item) => total + item.quantity, 0) };
}
