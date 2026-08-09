import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const defaultAppearance = {
  shopName: "MyShop",
  brandColor: "#111827",
  themeMode: "WHITE",
  fontFamily: "TH_SARABUN_PSK",
};

async function getSiteAppearance() {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: { shopName: true, brandColor: true, themeMode: true, fontFamily: true },
    });

    return {
      shopName: settings?.shopName?.trim() || defaultAppearance.shopName,
      brandColor: settings?.brandColor || defaultAppearance.brandColor,
      themeMode: settings?.themeMode || defaultAppearance.themeMode,
      fontFamily: settings?.fontFamily || defaultAppearance.fontFamily,
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
      </body>
    </html>
  );
}
