import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MyShop - Modern commerce platform",
    template: "%s | MyShop",
  },
  description:
    "A clean, production-ready shopping website with customer checkout, admin tools, and PostgreSQL-backed commerce operations.",
};

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
