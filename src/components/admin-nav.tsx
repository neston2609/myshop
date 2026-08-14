import Link from "next/link";
import { BookOpenText, Boxes, CreditCard, Download, LayoutDashboard, Mail, MessageCircle, PackagePlus, ReceiptText, Settings, Sparkles, TicketPercent, Truck, Users } from "lucide-react";

const items = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: PackagePlus },
  { href: "/admin/recommend-products", label: "Recommend Products", icon: Sparkles },
  { href: "/admin/categories", label: "Categories", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/shipping", label: "Shipping", icon: Truck },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/discount-codes", label: "Discount Codes", icon: TicketPercent },
  { href: "/admin/downloads", label: "Downloads", icon: Download },
  { href: "/admin/live-chat", label: "Live Chat", icon: MessageCircle },
  { href: "/admin/shop-description", label: "Shop Description", icon: BookOpenText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/settings/smtp", label: "SMTP", icon: Mail },
  { href: "/admin/settings/ai", label: "AI", icon: Settings },
];

export function AdminNav() {
  return (
    <aside className="rounded-lg border border-black/10 bg-white p-3">
      <nav className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
