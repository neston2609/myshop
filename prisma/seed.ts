import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/myshop_db",
  }),
});

const images = {
  desk: "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80",
  lamp: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
  bag: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1200&q=80",
  bottle: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1200&q=80",
};

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin12345!";

  await prisma.siteSettings.upsert({
    where: { id: "site-settings" },
    update: {},
    create: {
      id: "site-settings",
      shopName: "MyShop",
      supportEmail: "support@example.com",
      brandColor: "#17201c",
    },
  });

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { role: "ADMIN" },
    create: {
      name: "Store Admin",
      email: adminEmail.toLowerCase(),
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "workspace" },
      update: {},
      create: { name: "Workspace", slug: "workspace", description: "Clean tools for focused work.", imageUrl: images.desk },
    }),
    prisma.category.upsert({
      where: { slug: "daily-carry" },
      update: {},
      create: { name: "Daily Carry", slug: "daily-carry", description: "Refined essentials for every day.", imageUrl: images.bag },
    }),
  ]);

  const products = [
    {
      name: "Ash Desk Organizer",
      slug: "ash-desk-organizer",
      description: "A compact wood organizer for pens, notes, cables, and the small objects that make a workspace feel intentional.",
      price: 48,
      sku: "MS-WK-001",
      stock: 28,
      categoryId: categories[0].id,
      image: images.desk,
      video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      name: "Dawn Reading Lamp",
      slug: "dawn-reading-lamp",
      description: "A warm dimmable lamp with a small footprint, stable base, and soft glare-free shade for late work or quiet reading.",
      price: 86,
      sku: "MS-WK-002",
      stock: 16,
      categoryId: categories[0].id,
      image: images.lamp,
    },
    {
      name: "Canvas Weekender Tote",
      slug: "canvas-weekender-tote",
      description: "Durable cotton canvas, structured handles, and a laptop-friendly interior for errands, travel, and studio days.",
      price: 72,
      sku: "MS-DC-001",
      stock: 33,
      categoryId: categories[1].id,
      image: images.bag,
    },
    {
      name: "Matte Steel Bottle",
      slug: "matte-steel-bottle",
      description: "A double-wall insulated bottle with a slim profile, powder-coated finish, and leak-resistant cap.",
      price: 34,
      sku: "MS-DC-002",
      stock: 44,
      categoryId: categories[1].id,
      image: images.bottle,
    },
  ];

  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        sku: product.sku,
        stock: product.stock,
        categoryId: product.categoryId,
        media: {
          create: [
            { type: "IMAGE", url: product.image, alt: product.name },
            ...(product.video ? [{ type: "YOUTUBE" as const, url: product.video, alt: `${product.name} video`, sortOrder: 1 }] : []),
          ],
        },
      },
    });

    await prisma.review.createMany({
      data: [
        { productId: saved.id, userId: (await prisma.user.findUniqueOrThrow({ where: { email: adminEmail.toLowerCase() } })).id, rating: 5, title: "Beautifully made", comment: "Sample approved review for storefront layout.", approved: true },
      ],
      skipDuplicates: true,
    });
  }

  await prisma.shippingMethod.upsert({
    where: { id: "standard-shipping" },
    update: {},
    create: { id: "standard-shipping", name: "Standard shipping", regions: ["US", "TH", "EU"], cost: 8, enabled: true },
  });

  await prisma.paymentMethod.upsert({
    where: { id: "cash-on-delivery" },
    update: {},
    create: { id: "cash-on-delivery", name: "Cash on Delivery", provider: "CASH_ON_DELIVERY", enabled: true },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
