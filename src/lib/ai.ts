import type { AiProvider } from "@prisma/client";
import { SignJWT, importPKCS8 } from "jose";
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

type GoogleServiceAccount = {
  type?: string;
  project_id?: string;
  private_key?: string;
  client_email?: string;
  token_uri?: string;
};

const defaultModels: Record<AiProvider, string> = {
  OPENAI: "gpt-4o-mini",
  ANTHROPIC: "claude-3-5-haiku-latest",
  GEMINI: "gemini-2.5-flash",
  OPENROUTER: "openai/gpt-4o-mini",
  CUSTOM: "gpt-4o-mini",
};

const geminiVertexLocations = ["global", "us-central1"];
const geminiVertexApiVersions = ["v1", "v1beta1"];
const defaultVertexGeminiModels = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function getModel(settings: AiSettingsForGeneration) {
  return settings.activeModel || settings.models[0] || defaultModels[settings.provider];
}

export function parseGoogleServiceAccount(value: string): GoogleServiceAccount | null {
  try {
    const parsed = JSON.parse(value) as GoogleServiceAccount;
    if (parsed.type !== "service_account" || !parsed.project_id || !parsed.private_key || !parsed.client_email) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key || !serviceAccount.project_id) {
    throw new Error("Invalid Google service account credential.");
  }

  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(serviceAccount.private_key, "RS256");
  const assertion = await new SignJWT({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(key);

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Google OAuth token request failed (${response.status}).`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Google OAuth did not return an access token.");
  return String(data.access_token);
}

function vertexModelName(model: string) {
  return model.replace(/^models\//, "").replace(/^publishers\/google\/models\//, "");
}

function vertexBaseUrl(location: string) {
  return location === "global" ? "https://aiplatform.googleapis.com" : `https://${location}-aiplatform.googleapis.com`;
}

function vertexGenerateEndpoint(projectId: string, location: string, apiVersion: string, model: string) {
  return `${vertexBaseUrl(location)}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

function vertexModelsEndpoint(projectId: string, location: string, apiVersion: string) {
  return `${vertexBaseUrl(location)}/${apiVersion}/projects/${projectId}/locations/${location}/publishers/google/models`;
}

async function googleErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return `${response.status}`;

  try {
    const data = JSON.parse(text) as { error?: { message?: string; status?: string } };
    const status = data.error?.status ? `${data.error.status}: ` : "";
    return `${response.status} ${status}${data.error?.message || text}`.trim();
  } catch {
    return `${response.status} ${text}`.trim();
  }
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
  const serviceAccount = parseGoogleServiceAccount(apiKey);
  if (serviceAccount) {
    const projectId = serviceAccount.project_id;
    if (!projectId) throw new Error("Google service account project_id is missing.");
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const model = vertexModelName(getModel(settings));
    const errors: string[] = [];

    for (const location of geminiVertexLocations) {
      for (const apiVersion of geminiVertexApiVersions) {
        const response = await fetch(vertexGenerateEndpoint(projectId, location, apiVersion, model), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: input.prompt }] }],
            generationConfig: {
              maxOutputTokens: input.maxTokens || 700,
            },
          }),
          cache: "no-store",
        });

        if (!response.ok) {
          errors.push(`${location}/${apiVersion}: ${await googleErrorMessage(response)}`);
          continue;
        }

        const data = await response.json();
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((part: { text?: string }) => part.text || "")
          .join("")
          .trim();
        if (!text) throw new Error("Google Vertex AI returned an empty response.");
        return text;
      }
    }

    throw new Error(`Google Vertex AI rejected the request (${errors.join(", ")}).`);
  }

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

export async function fetchGeminiModels(rawCredential: string) {
  const serviceAccount = parseGoogleServiceAccount(rawCredential);
  if (!serviceAccount) return null;
  const projectId = serviceAccount.project_id;
  if (!projectId) throw new Error("Google service account project_id is missing.");

  const accessToken = await getGoogleAccessToken(serviceAccount);
  const errors: string[] = [];

  for (const location of geminiVertexLocations) {
    for (const apiVersion of geminiVertexApiVersions) {
      const response = await fetch(
        vertexModelsEndpoint(projectId, location, apiVersion),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        errors.push(`${location}/${apiVersion}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const models = ((data.publisherModels || data.models || []) as Array<{ name?: string; displayName?: string }>)
        .map((model) => model.name?.split("/").pop() || model.displayName)
        .filter(Boolean) as string[];
      return models.length > 0 ? models : defaultVertexGeminiModels;
    }
  }

  if (errors.every((error) => error.endsWith(": 403") || error.endsWith(": 404"))) return defaultVertexGeminiModels;
  throw new Error(`Google Vertex AI model fetch failed (${errors.join(", ")}).`);
}

export async function generateAiText(input: AiGenerateInput) {
  const settings = await getSettings();
  const apiKey = decryptSecret(settings.apiKeyCiphertext);

  if (settings.provider === "ANTHROPIC") return generateAnthropicText(settings, input, apiKey);
  if (settings.provider === "GEMINI") return generateGeminiText(settings, input, apiKey);
  return generateOpenAiCompatibleText(settings, input, apiKey);
}
