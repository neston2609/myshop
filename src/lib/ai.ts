import type { AiProvider } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type AiGenerateInput = {
  prompt: string;
  imageUrl?: string;
  maxTokens?: number;
};

type AiSettingsForGeneration = {
  provider: AiProvider;
  customEndpoint: string | null;
  apiKeyCiphertext: string;
  models: string[];
  activeModel: string | null;
  enabled: boolean;
};

const defaultModels: Record<AiProvider, string> = {
  OPENAI: "gpt-4o-mini",
  ANTHROPIC: "claude-3-5-haiku-latest",
  GEMINI: "gemini-1.5-flash",
  OPENROUTER: "openai/gpt-4o-mini",
  CUSTOM: "gpt-4o-mini",
};

function getModel(settings: AiSettingsForGeneration) {
  return settings.activeModel || settings.models[0] || defaultModels[settings.provider];
}

function getOpenAiCompatibleEndpoint(settings: AiSettingsForGeneration) {
  if (settings.provider === "OPENROUTER") return "https://openrouter.ai/api/v1/chat/completions";
  if (settings.provider === "CUSTOM") return settings.customEndpoint || "";
  return "https://api.openai.com/v1/chat/completions";
}

async function getSettings() {
  const settings = await prisma.aiSettings.findFirst();
  if (!settings || !settings.enabled) throw new Error("AI settings are not enabled.");
  return settings;
}

async function generateOpenAiCompatibleText(settings: AiSettingsForGeneration, input: AiGenerateInput, apiKey: string) {
  const endpoint = getOpenAiCompatibleEndpoint(settings);
  if (!endpoint) throw new Error("Missing AI endpoint.");

  const content = input.imageUrl
    ? [
        { type: "text", text: input.prompt },
        { type: "image_url", image_url: { url: input.imageUrl } },
      ]
    : input.prompt;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(settings),
      messages: [
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.4,
      max_tokens: input.maxTokens || 700,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`AI provider rejected the request (${response.status}).`);
  const data = await response.json();
  const message = data?.choices?.[0]?.message?.content;
  if (typeof message !== "string" || !message.trim()) throw new Error("AI provider returned an empty response.");
  return message.trim();
}

async function generateAnthropicText(settings: AiSettingsForGeneration, input: AiGenerateInput, apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(settings),
      max_tokens: input.maxTokens || 700,
      temperature: 0.4,
      messages: [{ role: "user", content: input.prompt }],
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`AI provider rejected the request (${response.status}).`);
  const data = await response.json();
  const text = (data?.content || [])
    .map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

async function generateGeminiText(settings: AiSettingsForGeneration, input: AiGenerateInput, apiKey: string) {
  const model = getModel(settings).replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: input.maxTokens || 700,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`AI provider rejected the request (${response.status}).`);
  const data = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("AI provider returned an empty response.");
  return text;
}

export async function generateAiText(input: AiGenerateInput) {
  const settings = await getSettings();
  const apiKey = decryptSecret(settings.apiKeyCiphertext);

  if (settings.provider === "ANTHROPIC") return generateAnthropicText(settings, input, apiKey);
  if (settings.provider === "GEMINI") return generateGeminiText(settings, input, apiKey);
  return generateOpenAiCompatibleText(settings, input, apiKey);
}
