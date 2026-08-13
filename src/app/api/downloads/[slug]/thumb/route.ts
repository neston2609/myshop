import { Readable } from "stream";
import { imageContentType, openInlineImageStream } from "@/lib/download-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const filePath = url.searchParams.get("path") || "";
  const source = url.searchParams.get("source") === "cover" ? "cover" : "folder";
  if (!filePath) return new Response("A thumbnail path is required.", { status: 400 });

  const category = await prisma.downloadCategory.findUnique({
    where: { slug },
    include: { source: true },
  });
  if (!category || !category.enabled) return new Response("Category not found.", { status: 404 });

  try {
    const { stream, started } = await openInlineImageStream(category, filePath, { source });
    started.catch(() => undefined);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": imageContentType(filePath),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Thumbnail failed.", { status: 500 });
  }
}
