import { AiSettingsForm } from "@/components/ai-settings-form";
import { AiSettingsTools } from "@/components/ai-settings-tools";
import { prisma } from "@/lib/prisma";

export default async function AiSettingsPage() {
  const settings = await prisma.aiSettings.findFirst();
  return (
    <div className="grid gap-4">
      <AiSettingsForm settings={settings} />
      <AiSettingsTools configured={Boolean(settings)} />
    </div>
  );
}
