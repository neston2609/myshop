"use client";

import { useState } from "react";
import type { AiProvider } from "@prisma/client";
import { saveAiAction } from "@/app/actions";
import { AiCredentialField } from "@/components/ai-credential-field";

type AiSettingsFormProps = {
  settings?: {
    provider: AiProvider;
    customEndpoint: string | null;
    activeModel: string | null;
    models: string[];
    enabled: boolean;
  } | null;
};

export function AiSettingsForm({ settings }: AiSettingsFormProps) {
  const [provider, setProvider] = useState(settings?.provider || "OPENAI");
  const configured = Boolean(settings);
  const showEndpoint = provider === "CUSTOM";

  return (
    <form action={saveAiAction} className="grid max-w-2xl gap-4 rounded-lg border border-black/10 bg-white p-5">
      <div>
        <h2 className="font-semibold">AI configuration</h2>
        <p className="mt-1 text-sm text-slate-600">Provider keys are encrypted before storage. Save first, then fetch models or test the connection.</p>
      </div>
      <select
        name="provider"
        value={provider}
        onChange={(event) => setProvider(event.target.value as AiProvider)}
        className="h-10 rounded-md border border-black/10 px-3"
      >
        <option value="OPENAI">OpenAI</option>
        <option value="ANTHROPIC">Anthropic</option>
        <option value="GEMINI">Google Gemini</option>
        <option value="OPENROUTER">OpenRouter</option>
        <option value="CUSTOM">Custom</option>
      </select>
      {showEndpoint ? (
        <input
          name="customEndpoint"
          defaultValue={settings?.customEndpoint || ""}
          placeholder="Custom chat endpoint"
          required
          className="h-10 rounded-md border border-black/10 px-3"
        />
      ) : null}
      <AiCredentialField configured={configured} provider={provider} />
      <select name="activeModel" defaultValue={settings?.activeModel || ""} className="h-10 rounded-md border border-black/10 px-3">
        <option value="">Use default or select after fetching models</option>
        {settings?.models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? true} /> Enabled</label>
      <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0">Save AI settings</button>
    </form>
  );
}
