import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const defaultAppearance = {
  shopName: "MyShop",
  brandColor: "#111827",
  themeMode: "WHITE",
  fontFamily: "TH_SARABUN_PSK",
  footerText: "",
  liveChatEnabled: true,
  lineOaId: "@retroconsole1981",
  lineChatPrompt: "สวัสดีครับ สนใจสอบถามสินค้า",
};

function formatBuildDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

async function getSiteAppearance() {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: {
        shopName: true,
        brandColor: true,
        themeMode: true,
        fontFamily: true,
        footerText: true,
        liveChatEnabled: true,
        lineOaId: true,
        lineChatPrompt: true,
      },
    });

    return {
      shopName: settings?.shopName?.trim() || defaultAppearance.shopName,
      brandColor: settings?.brandColor || defaultAppearance.brandColor,
      themeMode: settings?.themeMode || defaultAppearance.themeMode,
      fontFamily: settings?.fontFamily || defaultAppearance.fontFamily,
      footerText: settings?.footerText || defaultAppearance.footerText,
      liveChatEnabled: settings?.liveChatEnabled ?? defaultAppearance.liveChatEnabled,
      lineOaId: settings?.lineOaId || defaultAppearance.lineOaId,
      lineChatPrompt: settings?.lineChatPrompt || defaultAppearance.lineChatPrompt,
    };
  } catch {
    return defaultAppearance;
  }
}

async function getShopName() {
  return (await getSiteAppearance()).shopName;
}

export async function generateMetadata(): Promise<Metadata> {
  const shopName = await getShopName();

  return {
    title: {
      default: shopName,
      template: `%s | ${shopName}`,
    },
    description:
      "A clean, production-ready shopping website with customer checkout, admin tools, and PostgreSQL-backed commerce operations.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const appearance = await getSiteAppearance();
  const footerText = appearance.footerText.trim() || `© ${new Date().getFullYear()} ${appearance.shopName}. All rights reserved.`;
  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || "0.0.0+dev";
  const sourceLastUpdated = formatBuildDate(process.env.NEXT_PUBLIC_SOURCE_LAST_UPDATED);

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body
        className="min-h-full flex flex-col"
        data-theme={appearance.themeMode}
        data-font={appearance.fontFamily}
        style={{ "--brand": appearance.brandColor } as CSSProperties}
      >
        {children}
        <LiveChatWidget enabled={appearance.liveChatEnabled} lineOaId={appearance.lineOaId} prompt={appearance.lineChatPrompt} />
        <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]">
          <div className="container-shell flex flex-col gap-3 py-5 text-sm md:flex-row md:items-center md:justify-between">
            <p className="whitespace-pre-line">{footerText}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--subtle)]">
              <span>Build version: {buildVersion}</span>
              <span>Last source update: {sourceLastUpdated}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
