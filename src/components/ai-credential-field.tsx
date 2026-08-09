"use client";

import { useRef, useState } from "react";
import { FileKey2, Upload } from "lucide-react";

export function AiCredentialField({ configured, provider }: { configured: boolean; provider: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const isGemini = provider === "GEMINI";

  async function readServiceAccountFile(file: File) {
    setError("");
    setFileName("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { type?: string; client_email?: string; private_key?: string; project_id?: string };
      if (parsed.type !== "service_account" || !parsed.client_email || !parsed.private_key || !parsed.project_id) {
        setError("This JSON file does not look like a Google service account key.");
        return;
      }
      setValue(JSON.stringify(parsed));
      setFileName(file.name);
    } catch {
      setError("Could not read the JSON key file.");
    }
  }

  return (
    <div className="grid gap-2">
      {isGemini ? (
        <>
          <input type="hidden" name="apiKey" value={value} />
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-black/10 bg-slate-50 p-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readServiceAccountFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0"
            >
              <Upload size={16} />
              Upload Gemini JSON key
            </button>
            {fileName ? (
              <span className="inline-flex items-center gap-2 text-xs text-emerald-700">
                <FileKey2 size={15} />
                {fileName}
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                {configured ? "Leave empty to keep the current Gemini credential." : "Upload a Google service account JSON file."}
              </span>
            )}
          </div>
        </>
      ) : (
        <input
          name="apiKey"
          type="password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setFileName("");
            setError("");
          }}
          placeholder={configured ? "API key (leave blank to keep current key)" : "API key"}
          required={!configured}
          className="h-10 rounded-md border border-black/10 px-3"
        />
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
