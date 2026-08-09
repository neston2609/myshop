export function money(value: number | { toString(): string }) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function youtubeEmbed(url?: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}
