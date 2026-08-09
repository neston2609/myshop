import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export async function POST() {
  await requireAdmin();
  const settings = await prisma.aiSettings.findFirst();
  if (!settings) return NextResponse.json({ error: "AI settings not configured" }, { status: 400 });

  const apiKey = decryptSecret(settings.apiKeyCiphertext);
  const endpoints: Record<string, string> = {
    OPENAI: "https://api.openai.com/v1/models",
    ANTHROPIC: "https://api.anthropic.com/v1/models",
    GEMINI: "https://generativelanguage.googleapis.com/v1beta/models",
    OPENROUTER: "https://openrouter.ai/api/v1/models",
    CUSTOM: settings.customEndpoint || "",
  };
  const endpoint = endpoints[settings.provider];
  if (!endpoint) return NextResponse.json({ error: "Missing custom endpoint" }, { status: 400 });

  const headers: HeadersInit = settings.provider === "GEMINI"
    ? { "x-goog-api-key": apiKey }
    : { Authorization: `Bearer ${apiKey}` };
  if (settings.provider === "ANTHROPIC") headers["anthropic-version"] = "2023-06-01";

  const response = await fetch(endpoint, { headers, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Provider rejected the request" }, { status: response.status });
  const data = await response.json();
  const models = ((data.data || data.models || []) as Array<{ id?: string; name?: string }>)
    .map((model) => model.id || model.name)
    .filter(Boolean) as string[];

  await prisma.aiSettings.update({ where: { id: settings.id }, data: { models } });
  return NextResponse.json({ models });
}
