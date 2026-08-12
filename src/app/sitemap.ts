import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: absoluteUrl("/"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: absoluteUrl("/shop"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        orderBy: { updatedAt: "desc" },
        select: {
          slug: true,
          updatedAt: true,
          media: {
            where: { type: "IMAGE" },
            orderBy: { sortOrder: "asc" },
            select: { url: true },
          },
        },
      }),
      prisma.category.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: absoluteUrl(`/categories/${category.slug}`),
        lastModified: category.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...products.map((product) => ({
        url: absoluteUrl(`/products/${product.slug}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: product.media.map((media) => absoluteUrl(media.url)),
      })),
    ];
  } catch (error) {
    console.warn("Could not load dynamic sitemap entries.", error);
    return staticRoutes;
  }
}
