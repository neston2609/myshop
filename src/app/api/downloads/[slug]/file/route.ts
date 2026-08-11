import { Readable } from "stream";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { openDownloadStream } from "@/lib/download-sources";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const filePath = url.searchParams.get("path") || "";
  if (!filePath) return new Response("A file path is required.", { status: 400 });

  const category = await prisma.downloadCategory.findUnique({
    where: { slug },
    include: { source: true },
  });
  if (!category || !category.enabled) return new Response("Category not found.", { status: 404 });

  try {
    const { filename, stream, started } = await openDownloadStream(category, filePath);
    const session = await getSession();
    const requestHeaders = await headers();
    const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;

    started
      .then((info) => prisma.downloadLog.create({
        data: {
          userId: session?.id || null,
          path: `${category.slug}/${filePath}`,
          fileName: info.filename,
          sizeBytes: info.size == null ? null : Number(info.size),
          ip,
        },
      }))
      .catch(() => undefined);

    const safeName = filename.replace(/"/g, "");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Download failed.", { status: 500 });
  }
}
