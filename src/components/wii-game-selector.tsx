"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Folder, RotateCcw, X } from "lucide-react";
import type { WiiGameSelectorEntry } from "@/lib/download-sources";

type WiiGameSelectorProps = {
  entries: WiiGameSelectorEntry[];
  categorySlug: string;
  loadUrl?: string;
  sizeLoadUrl?: string;
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
  loadUrl,
  sizeLoadUrl,
  minSizeBytes,
  maxSizeBytes,
  minSizeGb,
  maxSizeGb,
  adminEmail,
  lineOaId,
}: WiiGameSelectorProps) {
  const [gameEntries, setGameEntries] = useState(entries);
  const [loadingList, setLoadingList] = useState(Boolean(loadUrl && entries.length === 0));
  const [loadingSizes, setLoadingSizes] = useState(Boolean(loadUrl && entries.length === 0));
  const [loadError, setLoadError] = useState("");
  const [sizeError, setSizeError] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const entryMap = useMemo(() => new Map(gameEntries.map((entry) => [entry.code, entry])), [gameEntries]);
  const selectedEntries = selectedCodes.map((code) => entryMap.get(code)).filter(Boolean) as WiiGameSelectorEntry[];
  const selectedBytes = selectedEntries.reduce((sum, entry) => sum + Number(entry.sizeBytes || 0), 0);
  const selectedSizesReady = selectedEntries.every((entry) => entry.sizeBytes != null);
  const remainingBytes = Math.max(0, maxSizeBytes - selectedBytes);
  const needBytes = Math.max(0, minSizeBytes - selectedBytes);
  const isValid = selectedCodes.length > 0 && selectedSizesReady && selectedBytes >= minSizeBytes && selectedBytes <= maxSizeBytes;
  const isOver = selectedBytes > maxSizeBytes;

  useEffect(() => {
    if (!loadUrl || entries.length > 0) return;
    let cancelled = false;
    fetch(loadUrl, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ entries?: WiiGameSelectorEntry[]; categorySlug?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        const nextEntries = data.entries || [];
        setGameEntries(nextEntries);
        setLoadingSizes(nextEntries.length > 0);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "ไม่สามารถโหลดรายชื่อเกมได้");
        setLoadingSizes(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entries.length, loadUrl]);

  useEffect(() => {
    if (!sizeLoadUrl || loadingList || gameEntries.length === 0 || gameEntries.every((entry) => entry.sizeBytes != null)) return;
    let cancelled = false;
    fetch(sizeLoadUrl, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ sizes?: Array<{ code: string; sizeBytes: number }> }>;
      })
      .then((data) => {
        if (cancelled) return;
        const sizes = new Map((data.sizes || []).map((item) => [item.code, item.sizeBytes]));
        setGameEntries((current) => current.map((entry) => ({
          ...entry,
          sizeBytes: sizes.has(entry.code) ? sizes.get(entry.code) ?? null : entry.sizeBytes,
        })));
      })
      .catch((error) => {
        if (cancelled) return;
        setSizeError(error instanceof Error ? error.message : "ไม่สามารถโหลดขนาดเกมได้");
      })
      .finally(() => {
        if (!cancelled) setLoadingSizes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameEntries, loadingList, sizeLoadUrl]);

  function toggle(code: string, checked: boolean) {
    setMessage("");
    setSelectedCodes((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  function clearSelection() {
    setMessage("");
    setPreviewOpen(false);
    setSelectedCodes([]);
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

  function renderDownloadButton(alwaysVisible = false) {
    if (!alwaysVisible && !isValid) return null;
    return (
      <button
        type="button"
        onClick={downloadSelection}
        disabled={downloading || !isValid}
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
          isValid ? "border border-blue-600 bg-white text-blue-600 hover:bg-blue-50" : "bg-[var(--accent)] text-white"
        }`}
      >
        <Download size={17} />
        {downloading ? "Preparing..." : "Download Game List"}
      </button>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="sticky top-3 z-30 rounded-lg border border-[var(--border)] bg-[var(--surface)]/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">จำนวนไฟล์</p>
              <p className="text-xl font-semibold">{selectedCodes.length}</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">Min Size</p>
              <p className="text-xl font-semibold">{minSizeGb} GB</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">Max Size</p>
              <p className="text-xl font-semibold">{maxSizeGb} GB</p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">Current Size</p>
              <p className="text-xl font-semibold">{formatBytes(selectedBytes)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <p className={`text-sm ${isOver ? "text-red-600" : "text-[var(--muted)]"}`}>
              {!selectedSizesReady ? "กำลังโหลดขนาดไฟล์ที่เลือก..." : isOver ? `เกินกำหนด ${formatBytes(selectedBytes - maxSizeBytes)}` : needBytes > 0 ? `ต้องเลือกเพิ่มอย่างน้อย ${formatBytes(needBytes)}` : `เลือกเพิ่มได้อีก ${formatBytes(remainingBytes)}`}
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={selectedCodes.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Eye size={17} />
              Preview
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedCodes.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={17} />
              Clear
            </button>
            {renderDownloadButton(true)}
          </div>
        </div>
        {message ? <p className="mt-4 rounded-md bg-[var(--accent-soft)] p-3 text-sm font-semibold text-[var(--text)]">{message}</p> : null}
      </section>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <section className="grid max-h-[82vh] w-full max-w-2xl gap-4 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Selected Games</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selectedCodes.length} games / {formatBytes(selectedBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)]"
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[54vh] overflow-auto rounded-md border border-[var(--border)]">
              {selectedEntries.map((entry, index) => (
                <div key={entry.code} className="grid gap-2 border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[42px_1fr_110px] sm:items-center">
                  <span className="font-semibold text-[var(--muted)]">{index + 1}</span>
                  <span className="font-semibold">{entry.name}</span>
                  <span className="text-[var(--muted)] sm:text-right">{entry.code}</span>
                </div>
              ))}
              {selectedEntries.length === 0 ? <p className="p-4 text-[var(--muted)]">ยังไม่ได้เลือกเกม</p> : null}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {loadingList ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--muted)]">
          กำลังโหลดรายชื่อเกมและ cover จาก FTPS กรุณารอสักครู่...
        </div>
      ) : null}

      {!loadingList && loadingSizes ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--muted)]">
          รายชื่อเกมพร้อมแล้ว กำลังโหลดขนาดไฟล์เพิ่มเติม...
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {loadError}
        </div>
      ) : null}

      {sizeError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {sizeError}
        </div>
      ) : null}

      {!loadingList && !loadError ? (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="hidden grid-cols-[86px_minmax(280px,1fr)_120px_140px] border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--muted)] md:grid">
          <span>Cover</span>
          <span>Folder</span>
          <span>Code</span>
          <span className="text-right">Size</span>
        </div>
        {gameEntries.map((entry) => {
          const checked = selectedCodes.includes(entry.code);
          const disabled = !entry.code || entry.sizeBytes == null;
          const thumbParams = new URLSearchParams({ path: entry.coverFile || "", source: entry.coverSource || "cover" });
          return (
            <label
              key={entry.path}
              className={`grid cursor-pointer gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[86px_minmax(280px,1fr)_120px_140px] md:items-center ${checked ? "bg-[var(--accent-soft)]" : ""}`}
            >
              <span className="group relative inline-flex w-fit">
                {entry.coverFile ? (
                  <>
                    <img
                      src={`/api/downloads/${categorySlug}/thumb?${thumbParams.toString()}`}
                      alt=""
                      width={64}
                      height={64}
                      className="aspect-square h-16 w-16 rounded-md border border-[var(--border)] object-cover"
                    />
                    <span className="pointer-events-none fixed left-1/2 top-24 z-50 hidden -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl group-hover:block">
                      <img
                        src={`/api/downloads/${categorySlug}/thumb?${thumbParams.toString()}`}
                        alt=""
                        width={320}
                        height={320}
                        className="aspect-square h-80 w-80 rounded-md object-cover"
                      />
                    </span>
                  </>
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
                  {!entry.code ? <span className="text-sm text-red-600">ไม่พบรหัสในชื่อ folder</span> : null}
                  {entry.code && entry.sizeBytes == null ? <span className="text-sm text-[var(--muted)]">กำลังโหลดขนาดไฟล์...</span> : null}
                </span>
              </span>
              <span className="text-sm font-semibold text-[var(--muted)]">{entry.code || "-"}</span>
              <span className="text-sm font-semibold md:text-right">{entry.sizeBytes == null ? "Loading..." : formatBytes(entry.sizeBytes)}</span>
            </label>
          );
        })}
        {gameEntries.length === 0 ? <p className="p-6 text-[var(--muted)]">ยังไม่มี folder ใน category นี้</p> : null}
      </div>
      ) : null}

      <div className="flex justify-end">{renderDownloadButton()}</div>
    </div>
  );
}
