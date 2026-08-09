"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bot, RefreshCw, TestTube2 } from "lucide-react";

type ToolState = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function AiSettingsTools({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ToolState>({ kind: "idle", message: "" });

  async function callApi(endpoint: string) {
    setState({ kind: "idle", message: "" });
    const response = await fetch(endpoint, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  function fetchModels() {
    startTransition(() => {
      void (async () => {
        try {
          const data = await callApi("/api/admin/ai/models");
          setState({ kind: "success", message: `Fetched ${data.models?.length || 0} models.` });
          router.refresh();
        } catch (error) {
          setState({ kind: "error", message: error instanceof Error ? error.message : "Could not fetch models." });
        }
      })();
    });
  }

  function testAi() {
    startTransition(() => {
      void (async () => {
        try {
          const data = await callApi("/api/admin/ai/test");
          setState({ kind: "success", message: data.message || "AI test succeeded." });
        } catch (error) {
          setState({ kind: "error", message: error instanceof Error ? error.message : "AI test failed." });
        }
      })();
    });
  }

  return (
    <div className="grid max-w-2xl gap-3 rounded-lg border border-black/10 bg-white p-5">
      <div className="flex items-center gap-2 font-semibold">
        <Bot size={18} />
        AI tools
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={fetchModels}
          disabled={!configured || isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Fetch models
        </button>
        <button
          type="button"
          onClick={testAi}
          disabled={!configured || isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TestTube2 size={16} />
          Test AI
        </button>
      </div>
      {state.message ? (
        <p className={state.kind === "error" ? "text-sm text-red-600" : "text-sm text-emerald-700"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
