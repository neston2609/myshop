import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateAiText, type AiInputImage } from "@/lib/ai";
import { sanitizeProductHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";

function publicImageUrl(request: NextRequest, imageUrl?: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (!imageUrl.startsWith("/")) return "";

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${proto}://${host}${imageUrl}` : "";
}

function parseImageUrls(request: NextRequest, value?: string[] | string) {
  const raw = Array.isArray(value) ? value : [value || ""];
  return raw
    .flatMap((item) => {
      if (!item) return [];
      try {
        const parsed = JSON.parse(item) as unknown;
        if (Array.isArray(parsed)) return parsed.filter((url): url is string => typeof url === "string");
      } catch {
        // Single URL input.
      }
      return [item];
    })
    .map((url) => publicImageUrl(request, url.trim()))
    .filter(Boolean)
    .filter((url, index, array) => array.indexOf(url) === index)
    .slice(0, 3);
}

async function fetchAiImage(url: string): Promise<AiInputImage | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!mimeType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 6 * 1024 * 1024) return null;
    return { url, mimeType, base64: buffer.toString("base64") };
  } catch {
    return null;
  }
}

function extractJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error("AI did not return structured product data.");
  }
}

function cleanSku(value: unknown, fallbackName: string) {
  const base = String(value || fallbackName || "PRODUCT")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `PRODUCT-${Date.now().toString(36).toUpperCase()}`;
}

async function uniqueSku(candidate: string) {
  const base = candidate.slice(0, 54);
  let next = base;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { sku: next }, select: { id: true } })) {
    next = `${base}-${suffix}`.slice(0, 64);
    suffix++;
  }

  return next;
}

function cleanPrice(value: unknown) {
  const raw = typeof value === "number" ? value : Number(String(value || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return "";
  return raw.toFixed(2);
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const body = await request.json().catch(() => null) as { name?: string; imageUrl?: string; imageUrls?: string[] | string } | null;
  const name = body?.name?.trim() || "";
  const imageUrls = parseImageUrls(request, body?.imageUrls || body?.imageUrl);
  if (name.length < 2 && imageUrls.length === 0) {
    return NextResponse.json({ error: "Add a product name or upload at least one product image first." }, { status: 400 });
  }

  const fetchedImages = await Promise.all(imageUrls.map(fetchAiImage));
  const images = imageUrls.map((url, index) => fetchedImages[index] || { url, mimeType: "image/jpeg" });
  const prompt = [
    "You are helping an admin create an ecommerce product listing for a Thai shopping website.",
    name ? `Known product name: ${name}` : "No product name was provided. Identify the likely product name from the uploaded image(s).",
    imageUrls.length ? `Product image URL(s): ${imageUrls.join(", ")}` : "No product image is available.",
    "Return one JSON object only, with no markdown fences and no commentary.",
    "JSON keys: name, sku, marketPriceThb, descriptionHtml.",
    "name: the best product name. If uncertain, use a cautious descriptive name.",
    "sku: a short uppercase SKU, 2-5 letters plus model/short code when possible, max 48 chars.",
    "marketPriceThb: realistic market price estimate in Thai Baht as a number without comma. If uncertain, estimate conservatively from similar products.",
    "descriptionHtml: Thai clean HTML using h3, p, ul, li, strong, and br only. Include all useful details you can infer: product overview, key features, specifications, included items, condition/notes, and buyer guidance. Avoid unsupported exact claims. Do not truncate the HTML.",
  ].join("\n");

  try {
    const generated = await generateAiText({ prompt, imageUrl: imageUrls[0], images, maxTokens: 2600 });
    const parsed = extractJsonObject(generated);
    const generatedName = String(parsed.name || name || "").trim();
    const description = sanitizeProductHtml(String(parsed.descriptionHtml || generated || ""));
    const sku = await uniqueSku(cleanSku(parsed.sku, generatedName || name));

    return NextResponse.json({
      name: generatedName,
      sku,
      price: cleanPrice(parsed.marketPriceThb),
      description,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate product description.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
