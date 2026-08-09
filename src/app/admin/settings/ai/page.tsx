import { saveAiAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export default async function AiSettingsPage() {
  const settings = await prisma.aiSettings.findFirst();
  return (
    <form action={saveAiAction} className="grid max-w-2xl gap-4 rounded-lg border border-black/10 bg-white p-5">
      <div>
        <h2 className="font-semibold">AI configuration</h2>
        <p className="mt-1 text-sm text-slate-600">Provider keys are encrypted before storage. Use the models API to refresh model choices after saving.</p>
      </div>
      <select name="provider" defaultValue={settings?.provider || "OPENAI"} className="h-10 rounded-md border border-black/10 px-3">
        <option value="OPENAI">OpenAI</option>
        <option value="ANTHROPIC">Anthropic</option>
        <option value="GEMINI">Google Gemini</option>
        <option value="OPENROUTER">OpenRouter</option>
        <option value="CUSTOM">Custom</option>
      </select>
      <input name="customEndpoint" defaultValue={settings?.customEndpoint || ""} placeholder="Custom endpoint for custom provider" className="h-10 rounded-md border border-black/10 px-3" />
      <input name="apiKey" type="password" placeholder="API key" required className="h-10 rounded-md border border-black/10 px-3" />
      <select name="activeModel" defaultValue={settings?.activeModel || ""} className="h-10 rounded-md border border-black/10 px-3">
        <option value="">Select after fetching models</option>
        {settings?.models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? true} /> Enabled</label>
      <button className="h-10 rounded-md bg-[#17201c] font-semibold text-white">Save AI settings</button>
    </form>
  );
}
