import Link from "next/link";
import Image from "next/image";
import { Package, Search, ShoppingBag, UserRound } from "lucide-react";
import { getCart } from "@/lib/cart";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function SiteHeader() {
  const [cart, session, settings] = await Promise.all([
    getCart(),
    getSession(),
    prisma.siteSettings.findFirst(),
  ]);

  return (
    <header className="border-b border-black/10 bg-white/90 backdrop-blur">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          {settings?.logoUrl ? (
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-black/10 bg-white">
              <Image src={settings.logoUrl} alt={`${settings.shopName} logo`} width={40} height={40} className="h-full w-full object-contain" />
            </span>
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#17201c] text-white">
              <Package size={19} />
            </span>
          )}
          <span>{settings?.shopName || "MyShop"}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <Link href="/shop">Shop</Link>
          <Link href="/shop?sort=new">New arrivals</Link>
          <Link href="/shop?stock=in">In stock</Link>
          {session?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/shop"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white"
            aria-label="Search products"
          >
            <Search size={18} />
          </Link>
          <Link
            href={session ? "/account" : "/login"}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-black/10 bg-white"
            aria-label="Account"
          >
            <UserRound size={18} />
          </Link>
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-md bg-[#0f766e] text-white"
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
