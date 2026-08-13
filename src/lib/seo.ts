export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.japantoyshop.com").replace(/\/+$/, "");

export const seoBrandName = "Japan Toy Shop";

export const defaultSeoTitle = "Japan Toy Shop | ของเล่นญี่ปุ่น POP MART Art Toy ของแท้";

export const defaultSeoDescription =
  "Japan Toy Shop ร้านของเล่นญี่ปุ่น POP MART และ Art Toy ของแท้ในไทย มี Labubu, Space Molly, ฟิกเกอร์สะสม และสินค้าคัดสภาพ พร้อมจัดส่งทั่วประเทศ";

export const seoKeywords = [
  "ของเล่นญี่ปุ่น",
  "ร้านของเล่นญี่ปุ่น",
  "Japan Toy Shop",
  "POP MART",
  "Popmart",
  "Labubu",
  "The Monsters",
  "Space Molly",
  "Art Toy",
  "อาร์ตทอย",
  "ฟิกเกอร์สะสม",
  "กล่องสุ่ม",
];

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

export function truncateSeoText(value: string, maxLength = 155) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function shopTitle(title: string) {
  return title.includes(seoBrandName) ? title : `${title} | ${seoBrandName}`;
}
