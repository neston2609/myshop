import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";

async function getShopName() {
  try {
    const settings = await prisma.siteSettings.findFirst({ select: { shopName: true } });
    return settings?.shopName?.trim() || "MyShop";
  } catch {
    return "MyShop";
  }
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#f8faf9] text-[#17201c]">
        {children}
      </body>
    </html>
  );
}
