import { listWiiGameSelectorEntries, type WiiGameSelectorEntry } from "@/lib/download-sources";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWiiSelectorCategory, sanitizeSelectorUser, selectorFileDate, wiiSelectorSizeLimits } from "@/lib/wii-game-selector";

export const dynamic = "force-dynamic";

function selectedCodesFromBody(value: unknown) {
  if (!value || typeof value !== "object" || !("codes" in value)) return [];
  const codes = (value as { codes?: unknown }).codes;
  if (!Array.isArray(codes)) return [];
  return [...new Set(codes.map((code) => String(code).trim().toUpperCase()).filter(Boolean))];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const codes = selectedCodesFromBody(body);
  if (codes.length === 0) return new Response("กรุณาเลือกเกมอย่างน้อย 1 รายการ", { status: 400 });

  const [settings, category, session] = await Promise.all([
    prisma.siteSettings.findFirst(),
    getWiiSelectorCategory(),
    getSession(),
  ]);
  if (!category) return new Response("ไม่พบ Download Category สำหรับ Nintendo Wii", { status: 404 });

  const entries = await listWiiGameSelectorEntries(category);
  const entryMap = new Map(entries.map((entry) => [entry.code, entry]));
  const selected = codes
    .map((code) => entryMap.get(code))
    .filter((entry): entry is WiiGameSelectorEntry => Boolean(entry));
  if (selected.length !== codes.length) return new Response("มีรหัสเกมที่ไม่ถูกต้อง กรุณา refresh แล้วเลือกใหม่", { status: 400 });

  const limits = wiiSelectorSizeLimits(settings);
  const totalBytes = selected.reduce((sum, entry) => sum + Number(entry.sizeBytes || 0), 0);
  if (totalBytes < limits.minBytes || totalBytes > limits.maxBytes) {
    return new Response(`ขนาดรวมต้องอยู่ระหว่าง ${limits.minGb} GB ถึง ${limits.maxGb} GB`, { status: 400 });
  }

  const username = sanitizeSelectorUser(session?.username || session?.name);
  const filename = `${username}_${selectorFileDate()}.sel`;
  const content = `${selected.map((entry) => entry.code).join("\r\n")}\r\n`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
