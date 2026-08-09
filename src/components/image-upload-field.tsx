"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImageIcon, Upload } from "lucide-react";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  helpText?: string;
  defaultValue?: string | null;
  previewClassName?: string;
  imageClassName?: string;
};

export function ImageUploadField({
  name,
  label,
  helpText = "Upload PNG, JPG, or WebP.",
  defaultValue,
  previewClassName = "h-24 w-24",
  imageClassName = "object-cover",
}: ImageUploadFieldProps) {
  const [imageUrl, setImageUrl] = useState(defaultValue || "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Upload failed");
        return;
      }
      setImageUrl(payload.url);
    });
  }

  return (
    <div className="grid gap-3 rounded-md border border-black/10 bg-slate-50 p-3">
      <input type="hidden" name={name} value={imageUrl} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className={`flex items-center justify-center overflow-hidden rounded-md border border-black/10 bg-white ${previewClassName}`}>
          {imageUrl ? (
            <Image src={imageUrl} alt={`${label} preview`} width={160} height={160} className={`h-full w-full ${imageClassName}`} />
          ) : (
            <ImageIcon className="text-slate-400" size={32} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs leading-5 text-slate-500">{helpText}</p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Upload size={16} />
          {isPending ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}
