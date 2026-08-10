"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";

type MultiImageUploadFieldProps = {
  name: string;
  label: string;
  defaultValues?: string[];
  helpText?: string;
};

export function MultiImageUploadField({
  name,
  label,
  defaultValues = [],
  helpText = "Upload multiple PNG, JPG, or WebP images. The first image is used as the product cover.",
}: MultiImageUploadFieldProps) {
  const [imageUrls, setImageUrls] = useState(defaultValues.filter(Boolean));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function upload(files: FileList) {
    const selected = Array.from(files);
    if (!selected.length) return;
    setError("");
    startTransition(async () => {
      const uploaded: string[] = [];
      for (const file of selected) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
          setError(payload.error || "Upload failed");
          break;
        }
        uploaded.push(payload.url);
      }
      if (uploaded.length) {
        setImageUrls((current) => [...current, ...uploaded].slice(0, 12));
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3">
      <input type="hidden" name={name} value={JSON.stringify(imageUrls)} />
      <input type="hidden" name="imageUrl" value={imageUrls[0] || ""} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs leading-5 text-slate-500">{helpText}</p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            if (files) upload(files);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending || imageUrls.length >= 12}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0 disabled:opacity-50"
        >
          <Upload size={16} />
          {isPending ? "Uploading..." : "Upload images"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {imageUrls.map((url, index) => (
          <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-md border border-black/10 bg-white">
            <Image src={url} alt={`${label} ${index + 1}`} fill className="object-cover" sizes="120px" />
            <button
              type="button"
              onClick={() => setImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-red-600 shadow-sm transition hover:bg-red-50 active:scale-95"
              aria-label={`Remove image ${index + 1}`}
            >
              <Trash2 size={15} />
            </button>
            {index === 0 ? (
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">Cover</span>
            ) : null}
          </div>
        ))}
        {!imageUrls.length ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-md border border-dashed border-black/15 bg-white text-slate-400 transition hover:bg-slate-50 active:scale-95"
            aria-label={`Upload ${label}`}
          >
            <ImageIcon size={30} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
