import type { DownloadCategory, DownloadSource, SiteSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const WII_SELECTOR_DEFAULT_MIN_GB = 35;
export const WII_SELECTOR_DEFAULT_MAX_GB = 44.5;
export const WII_SELECTOR_LINE_OA = "@retroconsole1981";

export type WiiSelectorCategory = DownloadCategory & { source: DownloadSource | null };

export function gbToBytes(gb: number) {
  return Math.round(gb * 1024 * 1024 * 1024);
}

export function wiiSelectorSizeLimits(settings?: Pick<SiteSettings, "wiiSelectorMinSizeGb" | "wiiSelectorMaxSizeGb"> | null) {
  const minGb = Number(settings?.wiiSelectorMinSizeGb ?? WII_SELECTOR_DEFAULT_MIN_GB);
  const maxGb = Number(settings?.wiiSelectorMaxSizeGb ?? WII_SELECTOR_DEFAULT_MAX_GB);
  return {
    minGb,
    maxGb,
    minBytes: gbToBytes(minGb),
    maxBytes: gbToBytes(maxGb),
  };
}

export function selectorAdminEmail(settings?: Pick<SiteSettings, "orderNotificationEmail" | "supportEmail"> | null) {
  return settings?.orderNotificationEmail || settings?.supportEmail || "";
}

export function selectorFileDate(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}${parts.month}${parts.day}`;
}

export function sanitizeSelectorUser(value?: string | null) {
  const clean = String(value || "guest").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return clean || "guest";
}

export async function getWiiSelectorCategory(): Promise<WiiSelectorCategory | null> {
  const categories = await prisma.downloadCategory.findMany({
    where: { enabled: true, source: { enabled: true } },
    include: { source: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return (
    categories.find((category) => category.slug === "wii-roms") ||
    categories.find((category) => /ninten/i.test(category.name) && /wii/i.test(category.name)) ||
    categories.find((category) => /wii/i.test(category.name)) ||
    null
  );
}
