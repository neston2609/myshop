import Link from "next/link";
import { WiiGameSelector } from "@/components/wii-game-selector";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { getWiiSelectorCategory, selectorAdminEmail, WII_SELECTOR_LINE_OA, wiiSelectorSizeLimits } from "@/lib/wii-game-selector";

export const dynamic = "force-dynamic";

export default async function WiiGameSelectorPage() {
  const [settings, category] = await Promise.all([
    prisma.siteSettings.findFirst(),
    getWiiSelectorCategory(),
  ]);
  const limits = wiiSelectorSizeLimits(settings);
  const adminEmail = selectorAdminEmail(settings);

  return (
    <>
      <SiteHeader />
      <main className="container-shell py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link href="/downloads" className="text-sm font-semibold text-[var(--accent)]">Downloads</Link>
            <h1 className="mt-1 text-3xl font-semibold">Nintendo Wii Game Selector</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">
              เลือกเกม Wii ที่ต้องการแล้วระบบจะสร้างไฟล์ .sel ให้ดาวน์โหลดอัตโนมัติ เพื่อนำไปส่งให้ร้านพร้อมรหัสคำสั่งซื้อ
            </p>
          </div>
        </div>

        {!category ? (
          <p className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
            ไม่พบ Download Category สำหรับ Nintendo Wii กรุณาตรวจสอบ category ที่มีคำว่า Wii หรือ slug wii-roms
          </p>
        ) : null}

        {category ? (
          <div className="mt-6">
            <WiiGameSelector
              entries={[]}
              categorySlug={category.slug}
              loadUrl="/api/wii-game-selector/list"
              sizeLoadUrl="/api/wii-game-selector/sizes"
              minSizeBytes={limits.minBytes}
              maxSizeBytes={limits.maxBytes}
              minSizeGb={limits.minGb}
              maxSizeGb={limits.maxGb}
              adminEmail={adminEmail}
              lineOaId={settings?.lineOaId || WII_SELECTOR_LINE_OA}
            />
          </div>
        ) : null}
      </main>
    </>
  );
}
