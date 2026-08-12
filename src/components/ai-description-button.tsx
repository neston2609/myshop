"use client";

import type { MouseEvent } from "react";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

type GenerateState = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function AiDescriptionButton() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<GenerateState>({ kind: "idle", message: "" });

  function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement | null, value?: string) {
    if (!field || !value) return;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function generateDescription(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest("form");
    if (!form) return;

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const imageUrl = String(formData.get("imageUrl") || "").trim();
    const imageUrls = String(formData.get("imageUrls") || "").trim();
    const nameField = form.querySelector<HTMLInputElement>('input[name="name"]');
    const skuField = form.querySelector<HTMLInputElement>('input[name="sku"]');
    const priceField = form.querySelector<HTMLInputElement>('input[name="price"]');
    const descriptionField = form.querySelector<HTMLTextAreaElement>('textarea[name="description"]');

    if (!descriptionField) return;
    if (!name && !imageUrl && !imageUrls) {
      setState({ kind: "error", message: "Add a product name or upload a product image first." });
      return;
    }

    startTransition(() => {
      void (async () => {
        setState({ kind: "idle", message: "" });
        try {
          const response = await fetch("/api/admin/ai/product-description", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, imageUrl, imageUrls }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Could not generate description.");

          setFieldValue(nameField, data.name);
          setFieldValue(skuField, data.sku);
          setFieldValue(priceField, data.price);
          setFieldValue(descriptionField, data.description || "");
          const visualEditor = form.querySelector<HTMLDivElement>("[data-rich-html-editor]");
          if (visualEditor) visualEditor.innerHTML = data.description || "";
          setState({ kind: "success", message: "AI filled product details. Review before saving." });
        } catch (error) {
          setState({ kind: "error", message: error instanceof Error ? error.message : "Could not generate description." });
        }
      })();
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={generateDescription}
        disabled={isPending}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#0f766e]/30 bg-[#ecfdf5] px-4 text-sm font-semibold text-[#0f766e] transition hover:-translate-y-0.5 hover:bg-[#d1fae5] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={16} />
        {isPending ? "Generating..." : "AI Gen Description"}
      </button>
      {state.message ? (
        <p className={state.kind === "error" ? "text-xs text-red-600" : "text-xs text-emerald-700"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
