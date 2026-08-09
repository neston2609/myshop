import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateAiText } from "@/lib/ai";
import { sanitizeProductHtml } from "@/lib/html";

function publicImageUrl(request: NextRequest, imageUrl?: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (!imageUrl.startsWith("/")) return "";

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? `${proto}://${host}${imageUrl}` : "";
}

export async function POST(request: NextRequest) {
  await requireAdmin();

  const body = await request.json().catch(() => null) as { name?: string; imageUrl?: string } | null;
  const name = body?.name?.trim() || "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Product name is required before generating a description." }, { status: 400 });
  }

  const imageUrl = publicImageUrl(request, body?.imageUrl?.trim());
  const prompt = [
    "Create an ecommerce product description in Thai as clean HTML only.",
    `Product name: ${name}`,
    imageUrl ? `Product image URL: ${imageUrl}` : "No product image is available.",
    "Use concise, useful product detail. If exact facts are uncertain, avoid unsupported claims.",
    "Return only valid HTML using h3, p, ul, li, strong, and br tags. Do not include markdown fences.",
  ].join("\n");

  try {
    const description = await generateAiText({ prompt, imageUrl, maxTokens: 900 });
    return NextResponse.json({ description: sanitizeProductHtml(description) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate product description.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
