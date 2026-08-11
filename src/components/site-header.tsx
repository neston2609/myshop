import Link from "next/link";
import Image from "next/image";
import { Package, Search, ShoppingBag, UserRound } from "lucide-react";
import { getCart } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseHeaderLinks(value?: string | null) {
  return (value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...hrefParts] = line.split("|");
      return { label: label.trim(), href: hrefParts.join("|").trim() };
    })
    .filter((link) => {
      if (!link.label || !link.href) return false;
      return link.href.startsWith("/") || link.href.startsWith("https://") || link.href.startsWith("http://");
    });
}

export async function SiteHeader() {
  const [cart, session, settings] = await Promise.all([
    getCart(),
    getSession(),
    prisma.siteSettings.findFirst(),
  ]);
  const customLinks = parseHeaderLinks(settings?.headerLinks);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 text-[var(--text)] backdrop-blur">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          {settings?.logoUrl ? (
            <span className="relative h-10 w-10 overflow-hidden">
              <Image src={settings.logoUrl} alt={`${settings.shopName} logo`} fill sizes="40px" className="object-contain" />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--text)] text-[var(--surface)]">
              <Package size={19} />
            </span>
          )}
          <span>{settings?.shopName || "MyShop"}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
          <Link href="/shop">Shop</Link>
          <Link href="/shop?sort=new">New arrivals</Link>
          <Link href="/shop?stock=in">In stock</Link>
          <Link href="/downloads">Downloads</Link>
          {customLinks.map((link) => (
            <Link key={`${link.label}-${link.href}`} href={link.href}>
              {link.label}
            </Link>
          ))}
          {session?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/shop"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)]"
            aria-label="Search products"
          >
            <Search size={18} />
          </Link>
          <Link
            href={session ? "/account" : "/login"}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)]"
            aria-label="Account"
          >
            <UserRound size={18} />
          </Link>
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)] text-white"
            aria-label="Shopping cart"
          >
            <ShoppingBag size={18} />
            {cart.count > 0 ? (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#f97316] px-1.5 text-[11px] font-bold text-white">
                {cart.count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
