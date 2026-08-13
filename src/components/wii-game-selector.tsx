"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Download, Folder } from "lucide-react";
import type { WiiGameSelectorEntry } from "@/lib/download-sources";

type WiiGameSelectorProps = {
  entries: WiiGameSelectorEntry[];
  categorySlug: string;
  minSizeBytes: number;
  maxSizeBytes: number;
  minSizeGb: number;
  maxSizeGb: number;
  adminEmail: string;
  lineOaId: string;
};

function formatBytes(size: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(size || 0);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit >= 3 ? 2 : unit ? 1 : 0)} ${units[unit]}`;
}

function fileNameFromDisposition(value: string | null) {
  const match = value?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || "guest.sel";
}

export function WiiGameSelector({
  entries,
  categorySlug,
  minSizeBytes,
  maxSizeBytes,
  minSizeGb,
  maxSizeGb,
  adminEmail,
  lineOaId,
}: WiiGameSelectorProps) {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const entryMap = useMemo(() => new Map(entries.map((entry) => [entry.code, entry])), [entries]);
  const selectedEntries = selectedCodes.map((code) => entryMap.get(code)).filter(Boolean) as WiiGameSelectorEntry[];
  const selectedBytes = selectedEntries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  const remainingBytes = Math.max(0, maxSizeBytes - selectedBytes);
  const needBytes = Math.max(0, minSizeBytes - selectedBytes);
  const isValid = selectedCodes.length > 0 && selectedBytes >= minSizeBytes && selectedBytes <= maxSizeBytes;
  const isOver = selectedBytes > maxSizeBytes;

  function toggle(code: string, checked: boolean) {
    setMessage("");
    setSelectedCodes((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  async function downloadSelection() {
    setDownloading(true);
    setMessage("");
    try {
      const response = await fetch("/api/wii-game-selector/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: selectedCodes }),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const filename = fileNameFromDisposition(response.headers.get("Content-Disposition"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const emailText = adminEmail || "อีเมลร้านค้า";
      setMessage(`สร้างไฟล์ ${filename} แล้ว กรุณาส่งไฟล์นี้มาที่ ${emailText} พร้อมแนบรหัสคำสั่งซื้อ หรือแจ้งผ่าน Line OA ${lineOaId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถสร้างไฟล์ได้");
    } finally {
      setDownloading(false);
    }
  }

  function renderDownloadButton() {
    if (!isValid) return null;
    return (
      <button
        type="button"
        onClick={downloadSelection}
        disabled={downloading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download size={17} />
        {downloading ? "Preparing..." : "Download Game List"}
      </button>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-[var(--muted)]">เลือกได้ตั้งแต่ {minSizeGb} GB ถึง {maxSizeGb} GB</p>
            <h2 className="text-2xl font-semibold">เลือกแล้ว {formatBytes(selectedBytes)}</h2>
            <p className={`text-sm ${isOver ? "text-red-600" : "text-[var(--muted)]"}`}>
              {isOver ? `เกินกำหนด ${formatBytes(selectedBytes - maxSizeBytes)}` : needBytes > 0 ? `ต้องเลือกเพิ่มอย่างน้อย ${formatBytes(needBytes)}` : `เลือกเพิ่มได้อีก ${formatBytes(remainingBytes)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-semibold">
              {selectedCodes.length} games selected
            </span>
            {renderDownloadButton()}
          </div>
        </div>
        {message ? <p className="mt-4 rounded-md bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--text)]">{message}</p> : null}
      </section>

      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="hidden grid-cols-[86px_minmax(280px,1fr)_120px_140px] border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--muted)] md:grid">
          <span>Cover</span>
          <span>Folder</span>
          <span>Code</span>
          <span className="text-right">Size</span>
        </div>
        {entries.map((entry) => {
          const checked = selectedCodes.includes(entry.code);
          const disabled = !entry.code;
          const thumbParams = new URLSearchParams({ path: entry.coverFile || "", source: entry.coverSource || "cover" });
          return (
            <label
              key={entry.path}
              className={`grid cursor-pointer gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[86px_minmax(280px,1fr)_120px_140px] md:items-center ${checked ? "bg-[var(--accent-soft)]" : ""}`}
            >
              <span>
                {entry.coverFile ? (
                  <img
                    src={`/api/downloads/${categorySlug}/thumb?${thumbParams.toString()}`}
                    alt=""
                    width={64}
                    height={64}
                    className="aspect-square h-16 w-16 rounded-md border border-[var(--border)] object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)]">
                    <Folder size={32} className="text-[var(--muted)]" />
                  </span>
                )}
              </span>
              <span className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => toggle(entry.code, event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{entry.name}</span>
                  {disabled ? <span className="text-sm text-red-600">ไม่พบรหัสในชื่อ folder</span> : null}
                </span>
              </span>
              <span className="text-sm font-semibold text-[var(--muted)]">{entry.code || "-"}</span>
              <span className="text-sm font-semibold md:text-right">{formatBytes(entry.sizeBytes)}</span>
            </label>
          );
        })}
        {entries.length === 0 ? <p className="p-6 text-[var(--muted)]">ยังไม่มี folder ใน category นี้</p> : null}
      </div>

      <div className="flex justify-end">{renderDownloadButton()}</div>
    </div>
  );
}
