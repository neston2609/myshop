"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";

type LogoUploadFieldProps = {
  defaultValue?: string | null;
};

export function LogoUploadField({ defaultValue }: LogoUploadFieldProps) {
  const [logoUrl, setLogoUrl] = useState(defaultValue || "");
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
      setLogoUrl(payload.url);
    });
  }

  return (
    <div className="grid gap-3 md:col-span-2">
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <div className="flex flex-col gap-3 rounded-md border border-black/10 bg-slate-50 p-3 sm:flex-row sm:items-center">
        <div className="flex h-16 w-32 items-center justify-center rounded-md border border-black/10 bg-white">
          {logoUrl ? (
            <Image src={logoUrl} alt="Shop logo preview" width={112} height={48} className="max-h-12 w-auto object-contain" />
          ) : (
            <span className="text-sm text-slate-500">No logo</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Shop logo</p>
          <p className="text-xs leading-5 text-slate-500">PNG, JPG, or WebP. The saved logo appears in the storefront header.</p>
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
