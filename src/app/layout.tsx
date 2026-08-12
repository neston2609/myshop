import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { JsonLd } from "@/components/json-ld";
import { LiveChatWidget } from "@/components/live-chat-widget";
import { absoluteUrl, defaultSeoDescription, defaultSeoTitle, seoBrandName, seoKeywords, siteUrl } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const defaultAppearance = {
  shopName: seoBrandName,
  logoUrl: "",
  faviconUrl: "",
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
        logoUrl: true,
        faviconUrl: true,
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
      logoUrl: settings?.logoUrl || defaultAppearance.logoUrl,
      faviconUrl: settings?.faviconUrl || defaultAppearance.faviconUrl,
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

export async function generateMetadata(): Promise<Metadata> {
  const appearance = await getSiteAppearance();
  const previewImage = appearance.logoUrl ? absoluteUrl(appearance.logoUrl) : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultSeoTitle,
      template: `%s | ${seoBrandName}`,
    },
    description: defaultSeoDescription,
    applicationName: seoBrandName,
    keywords: seoKeywords,
    creator: seoBrandName,
    publisher: seoBrandName,
    alternates: {
      canonical: "/",
    },
    icons: appearance.faviconUrl ? { icon: absoluteUrl(appearance.faviconUrl) } : undefined,
    openGraph: {
      title: defaultSeoTitle,
      description: defaultSeoDescription,
      url: "/",
      siteName: seoBrandName,
      locale: "th_TH",
      type: "website",
      images: previewImage ? [{ url: previewImage, alt: `${appearance.shopName} logo` }] : undefined,
    },
    twitter: {
      card: previewImage ? "summary_large_image" : "summary",
      title: defaultSeoTitle,
      description: defaultSeoDescription,
      images: previewImage ? [previewImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const appearance = await getSiteAppearance();
  const footerText = appearance.footerText.trim() || `© ${new Date().getFullYear()} ${appearance.shopName}. All rights reserved.`;
  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || "0.0.0+dev";
  const sourceLastUpdated = formatBuildDate(process.env.NEXT_PUBLIC_SOURCE_LAST_UPDATED);

  return (
    <html lang="th" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        data-theme={appearance.themeMode}
        data-font={appearance.fontFamily}
        style={{ "--brand": appearance.brandColor } as CSSProperties}
      >
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: seoBrandName,
              alternateName: appearance.shopName,
              url: siteUrl,
              inLanguage: "th-TH",
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/shop?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "Store",
              name: seoBrandName,
              url: siteUrl,
              logo: appearance.logoUrl ? absoluteUrl(appearance.logoUrl) : undefined,
              image: appearance.logoUrl ? absoluteUrl(appearance.logoUrl) : undefined,
              description: defaultSeoDescription,
              priceRange: "THB",
              areaServed: "TH",
            },
          ]}
        />
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
