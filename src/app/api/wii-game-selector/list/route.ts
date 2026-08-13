import { listWiiGameSelectorEntries } from "@/lib/download-sources";
import { getWiiSelectorCategory } from "@/lib/wii-game-selector";

export const dynamic = "force-dynamic";

export async function GET() {
  const category = await getWiiSelectorCategory();
  if (!category) return new Response("ไม่พบ Download Category สำหรับ Nintendo Wii", { status: 404 });

  try {
    const entries = await listWiiGameSelectorEntries(category);
    return Response.json({
      categorySlug: category.slug,
      entries,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "ไม่สามารถโหลดรายชื่อเกมได้", { status: 500 });
  }
}
