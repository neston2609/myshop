import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateAiText } from "@/lib/ai";

export async function POST() {
  await requireAdmin();

  try {
    const message = await generateAiText({
      prompt: "Reply in one short sentence: AI configuration test succeeded for the shop admin.",
      maxTokens: 80,
    });

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI test failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
