"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  parseShopDescriptionFaqs,
  serializeShopDescriptionFaqs,
  type ShopDescriptionFaq,
} from "@/lib/shop-description";

type FaqRow = ShopDescriptionFaq & { id: string };

function createRow(faq?: Partial<ShopDescriptionFaq>, index = 0): FaqRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    question: faq?.question || "",
    answer: faq?.answer || "",
  };
}

export function ShopDescriptionFaqsField({ defaultValue }: { defaultValue?: string | null }) {
  const initialRows = useMemo(
    () => parseShopDescriptionFaqs(defaultValue).map((faq, index) => createRow(faq, index)),
    [defaultValue],
  );
  const [rows, setRows] = useState<FaqRow[]>(initialRows);

  function updateRow(id: string, update: Partial<ShopDescriptionFaq>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...update } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="shopDescriptionFaqs" value={serializeShopDescriptionFaqs(rows)} />
      {rows.map((row, index) => (
        <div key={row.id} className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Question {index + 1}</p>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Remove question ${index + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <input
            value={row.question}
            onChange={(event) => updateRow(row.id, { question: event.target.value })}
            placeholder="Question"
            maxLength={160}
            required
            className="h-10 rounded-md border border-black/10 bg-white px-3"
          />
          <textarea
            value={row.answer}
            onChange={(event) => updateRow(row.id, { answer: event.target.value })}
            placeholder="Answer"
            maxLength={1000}
            rows={3}
            required
            className="rounded-md border border-black/10 bg-white px-3 py-2"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((current) => [...current, createRow({}, current.length)])}
        disabled={rows.length >= 12}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={16} />
        Add question
      </button>
    </div>
  );
}

