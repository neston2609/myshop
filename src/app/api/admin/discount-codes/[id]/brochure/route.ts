import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value: Date | null) {
  if (!value) return "ไม่มีวันหมดอายุ";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function wrapText(value: string, maxLength: number, maxLines = 4) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.includes(" ") ? normalized.split(" ") : normalized.match(new RegExp(`.{1,${maxLength}}`, "g")) || [];
  const lines: string[] = [];
  let consumed = 0;

  for (const word of words) {
    if (!lines.length) {
      lines.push(word);
      consumed += 1;
      if (lines.length === maxLines) break;
      continue;
    }

    const current = lines[lines.length - 1] || "";
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      lines[lines.length - 1] = candidate;
    } else {
      lines.push(word);
    }
    consumed += 1;
    if (lines.length === maxLines) break;
  }

  if (consumed < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\.+$/, "")}...`;
  }

  return lines;
}

function tspans(lines: string[], x: number, y: number, lineHeight: number) {
  return lines
    .map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
}

function filenamePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "discount";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await context.params;
  const [discount, settings] = await Promise.all([
    prisma.discountCode.findUnique({ where: { id } }),
    prisma.siteSettings.findFirst({
      select: {
        shopName: true,
        logoUrl: true,
        supportEmail: true,
        orderNotificationEmail: true,
        lineOaId: true,
      },
    }),
  ]);

  if (!discount) {
    return new Response("Discount code not found", { status: 404 });
  }

  const shopName = settings?.shopName?.trim() || "Japan Toy Shop";
  const contactEmail = settings?.orderNotificationEmail || settings?.supportEmail || "admin@japantoyshop.com";
  const lineOaId = settings?.lineOaId || "@retroconsole1981";
  const shopLink = siteUrl;
  const qrDataUrl = await QRCode.toDataURL(shopLink, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 620,
    color: {
      dark: "#15211b",
      light: "#ffffff",
    },
  });

  const valueText = discount.type === "PERCENT"
    ? `รับส่วนลด ${Number(discount.value).toLocaleString("th-TH")}%`
    : `รับส่วนลด ${money(discount.value)}`;
  const minimumText = discount.minimumSubtotal ? `เมื่อซื้อครบ ${money(discount.minimumSubtotal)}` : "ไม่มีขั้นต่ำการสั่งซื้อ";
  const maximumText = discount.maximumDiscount ? `ส่วนลดสูงสุด ${money(discount.maximumDiscount)}` : "ไม่จำกัดส่วนลดสูงสุด";
  const expiryText = `ใช้ได้ถึง ${formatDate(discount.expiresAt)}`;
  const descriptionLines = wrapText(discount.description || "สแกน QR เพื่อเลือกซื้อสินค้า แล้วใช้โค้ดส่วนลดนี้ตอนชำระเงิน", 44, 4);
  const logoUrl = settings?.logoUrl ? absoluteUrl(settings.logoUrl) : "";
  const issuedAt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" }).format(new Date());

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="210mm" viewBox="0 0 1748 2480" role="img" aria-label="${escapeXml(shopName)} discount brochure">
  <defs>
    <linearGradient id="ink" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#111f19"/>
      <stop offset="100%" stop-color="#253d32"/>
    </linearGradient>
    <style>
      .font { font-family: "TH Sarabun PSK", "Prompt", "Century Gothic", Arial, sans-serif; }
      .small-caps { letter-spacing: 9px; font-weight: 700; }
    </style>
  </defs>
  <rect width="1748" height="2480" fill="#f5f7f3"/>
  <rect x="74" y="74" width="1600" height="2332" rx="44" fill="#ffffff" stroke="#d7ddd4" stroke-width="4"/>
  <rect x="118" y="118" width="1512" height="2244" rx="36" fill="#f8faf6"/>
  <rect x="118" y="118" width="1512" height="720" rx="36" fill="url(#ink)"/>
  <circle cx="1442" cy="248" r="168" fill="#fff4aa" opacity="0.95"/>
  <circle cx="238" cy="710" r="210" fill="#e8f5ee" opacity="0.2"/>
  <text x="874" y="214" text-anchor="middle" class="font small-caps" font-size="42" fill="#fff4aa">${escapeXml(shopName)}</text>
  <text x="874" y="368" text-anchor="middle" class="font" font-size="128" font-weight="800" fill="#ffffff">SPECIAL OFFER</text>
  <text x="874" y="476" text-anchor="middle" class="font" font-size="76" font-weight="700" fill="#fff4aa">${escapeXml(valueText)}</text>
  <text x="874" y="574" text-anchor="middle" class="font" font-size="54" fill="#e4eee8">${escapeXml(minimumText)}</text>
  <text x="874" y="656" text-anchor="middle" class="font" font-size="46" fill="#e4eee8">${escapeXml(maximumText)}</text>

  ${logoUrl ? `<image href="${escapeXml(logoUrl)}" x="138" y="862" width="610" height="610" preserveAspectRatio="xMidYMid meet"/>` : `<rect x="166" y="890" width="554" height="554" rx="34" fill="#17201c"/><text x="443" y="1190" text-anchor="middle" class="font" font-size="72" font-weight="800" fill="#fff4aa">${escapeXml(shopName)}</text>`}

  <rect x="822" y="884" width="742" height="374" rx="34" fill="#ffffff" stroke="#d7ddd4" stroke-width="4"/>
  <text x="874" y="978" class="font" font-size="42" font-weight="700" fill="#526158">Discount code</text>
  <text x="1194" y="1112" text-anchor="middle" class="font" font-size="100" font-weight="900" fill="#15211b">${escapeXml(discount.code)}</text>
  <text x="1194" y="1198" text-anchor="middle" class="font" font-size="40" fill="#69776e">${escapeXml(expiryText)}</text>

  <rect x="822" y="1300" width="742" height="264" rx="34" fill="#fff8c9" stroke="#e8d76e" stroke-width="4"/>
  <text x="874" y="1388" class="font" font-size="46" font-weight="800" fill="#15211b">รายละเอียดโปรโมชัน</text>
  <text x="874" y="1462" class="font" font-size="38" fill="#253d32">${tspans(descriptionLines, 874, 1462, 48)}</text>

  <rect x="236" y="1554" width="520" height="520" rx="34" fill="#ffffff" stroke="#d7ddd4" stroke-width="4"/>
  <image href="${escapeXml(qrDataUrl)}" x="278" y="1596" width="436" height="436"/>
  <text x="496" y="2144" text-anchor="middle" class="font" font-size="42" font-weight="700" fill="#15211b">Scan to shop</text>
  <text x="496" y="2202" text-anchor="middle" class="font" font-size="34" fill="#69776e">${escapeXml(shopLink.replace(/^https?:\/\//, ""))}</text>

  <rect x="822" y="1622" width="742" height="346" rx="34" fill="#ffffff" stroke="#d7ddd4" stroke-width="4"/>
  <text x="874" y="1712" class="font" font-size="44" font-weight="800" fill="#15211b">วิธีใช้งาน</text>
  <text x="874" y="1794" class="font" font-size="38" fill="#253d32">
    <tspan x="874" y="1794">1. สแกน QR เพื่อเข้าร้านค้า</tspan>
    <tspan x="874" y="1850">2. เลือกสินค้าที่ต้องการ</tspan>
    <tspan x="874" y="1906">3. ใส่โค้ด ${escapeXml(discount.code)} ตอนชำระเงิน</tspan>
  </text>

  <line x1="236" y1="2266" x2="1512" y2="2266" stroke="#d7ddd4" stroke-width="4"/>
  <text x="236" y="2332" class="font" font-size="34" fill="#69776e">ติดต่อร้าน: ${escapeXml(contactEmail)} | LINE OA: ${escapeXml(lineOaId)}</text>
  <text x="1512" y="2332" text-anchor="end" class="font" font-size="30" fill="#9aa59f">Generated ${escapeXml(issuedAt)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${filenamePart(discount.code)}-brochure-a5.svg"`,
    },
  });
}
