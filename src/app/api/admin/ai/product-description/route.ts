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

function normalizeAiJsonText(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function findBalancedJsonObject(text: string) {
  const start = text.indexOf("{");
  if (start < 0) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index++) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return "";
}

function parseJsonCandidate(text: string) {
  const withoutTrailingCommas = text.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(withoutTrailingCommas) as Record<string, unknown>;
}

function extractJsonObject(text: string) {
  const cleaned = normalizeAiJsonText(text);
  try {
    return parseJsonCandidate(cleaned);
  } catch {
    const objectText = findBalancedJsonObject(cleaned);
    if (objectText) {
      return parseJsonCandidate(objectText);
    }
    return null;
  }
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function textToDescriptionHtml(text: string) {
  const cleaned = normalizeAiJsonText(text);
  if (/<(h2|h3|h4|p|ul|ol|li|table|strong|b|br)\b/i.test(cleaned)) return cleaned;

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(name|product name|ชื่อสินค้า|sku|price|ราคา|market price)\s*[:：-]/i.test(line));

  const listItems = lines
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => `<li>${line.replace(/^[-*•]\s+/, "")}</li>`);
  const paragraphs = lines
    .filter((line) => !/^[-*•]\s+/.test(line))
    .map((line) => `<p>${line}</p>`);

  return [
    "<h3>รายละเอียดสินค้า</h3>",
    ...paragraphs,
    listItems.length ? `<ul>${listItems.join("")}</ul>` : "",
  ].join("");
}

function parsedOrFallbackProduct(generated: string, fallbackName: string) {
  const parsed = extractJsonObject(generated);
  if (parsed) return parsed;

  const name = firstMatch(generated, [
    /(?:product\s*name|name|ชื่อสินค้า)\s*[:：-]\s*(.+)/i,
    /^#{1,4}\s*(.+)$/m,
  ]);
  const sku = firstMatch(generated, [
    /(?:sku|รหัสสินค้า)\s*[:：-]\s*([A-Z0-9][A-Z0-9\-_ ]{1,64})/i,
  ]);
  const price = firstMatch(generated, [
    /(?:market\s*price|price|ราคา(?:ตลาด)?)\s*[:：-]\s*(?:THB|฿)?\s*([\d,]+(?:\.\d+)?)/i,
    /(?:THB|฿)\s*([\d,]+(?:\.\d+)?)/i,
  ]);

  return {
    name: name || fallbackName,
    sku,
    marketPriceThb: price,
    descriptionHtml: textToDescriptionHtml(generated),
  };
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
    const parsed = parsedOrFallbackProduct(generated, name);
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
