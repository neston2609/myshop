import { findDownloadFolderCover, listDownloadEntries } from "@/lib/download-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const currentPath = (url.searchParams.get("path") || "").replace(/^\/+|\/+$/g, "");
  const category = await prisma.downloadCategory.findUnique({
    where: { slug },
    include: { source: true },
  });

  if (!category || !category.enabled) return new Response("Download category not found.", { status: 404 });

  try {
    const [entries, folderCover] = await Promise.all([
      listDownloadEntries(category, currentPath),
      findDownloadFolderCover(category, currentPath).catch(() => null),
    ]);
    return Response.json({
      entries: entries.map((entry) => ({
        name: entry.name,
        path: entry.path,
        size: entry.size,
        thumb: entry.thumb,
        thumbSource: entry.thumbSource,
        type: entry.type,
      })),
      folderCover,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Could not load downloads.", { status: 500 });
  }
}
