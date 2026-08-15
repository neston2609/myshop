"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Crop, GripVertical, ImageIcon, Star, Trash2, Upload, X } from "lucide-react";

type MultiImageUploadFieldProps = {
  name: string;
  label: string;
  defaultValues?: string[];
  helpText?: string;
};

type CropSource = {
  url: string;
  fileName: string;
  replaceIndex?: number;
};

const maxImages = 12;
const cropDisplaySize = 320;
const cropOutputSize = 1200;

function moveItem(list: string[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

function revokeObjectUrl(url: string) {
  if (url.startsWith("blob:")) URL.revokeObjectURL(url);
}

export function MultiImageUploadField({
  name,
  label,
  defaultValues = [],
  helpText = "Upload multiple PNG, JPG, or WebP images. Crop images, reorder them, and choose which image is the product cover.",
}: MultiImageUploadFieldProps) {
  const [imageUrls, setImageUrls] = useState(defaultValues.filter(Boolean));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openNextCrop(files: File[]) {
    const [nextFile, ...remaining] = files;
    setCropQueue(remaining);
    if (!nextFile) return;
    setCropSource({
      url: URL.createObjectURL(nextFile),
      fileName: nextFile.name.replace(/\.[^.]+$/, "") || "product-image",
    });
  }

  function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).slice(0, Math.max(0, maxImages - imageUrls.length));
    if (!selected.length) return;
    setError("");
    openNextCrop(selected);
    if (inputRef.current) inputRef.current.value = "";
  }

  function closeCrop() {
    if (cropSource) revokeObjectUrl(cropSource.url);
    for (const file of cropQueue) revokeObjectUrl(URL.createObjectURL(file));
    setCropSource(null);
    setCropQueue([]);
  }

  function continueQueue() {
    if (cropSource) revokeObjectUrl(cropSource.url);
    if (cropQueue.length) openNextCrop(cropQueue);
    else setCropSource(null);
  }

  async function uploadBlob(blob: Blob, fileName: string) {
    const formData = new FormData();
    formData.append("file", new File([blob], `${fileName}.webp`, { type: "image/webp" }));
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Upload failed");
    return String(payload.url);
  }

  function handleCrop(blob: Blob) {
    if (!cropSource) return;
    const source = cropSource;
    setError("");
    startTransition(async () => {
      try {
        const uploadedUrl = await uploadBlob(blob, source.fileName);
        setImageUrls((current) => {
          if (typeof source.replaceIndex === "number") {
            return current.map((url, index) => (index === source.replaceIndex ? uploadedUrl : url));
          }
          return [...current, uploadedUrl].slice(0, maxImages);
        });
        continueQueue();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      }
    });
  }

  async function cropExistingImage(url: string, index: number) {
    setError("");
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load image for cropping.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setCropSource({ url: objectUrl, fileName: `product-image-${index + 1}`, replaceIndex: index });
    } catch {
      setError("This image cannot be cropped from the browser. Upload the image again to crop it.");
    }
  }

  function setCover(index: number) {
    if (index === 0) return;
    setImageUrls((current) => moveItem(current, index, 0));
  }

  function shiftImage(index: number, step: number) {
    const target = index + step;
    if (target < 0 || target >= imageUrls.length) return;
    setImageUrls((current) => moveItem(current, index, target));
  }

  function onDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    if (dragIndex == null || dragIndex === targetIndex) return;
    setImageUrls((current) => moveItem(current, dragIndex, targetIndex));
    setDragIndex(null);
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
          onChange={handleFilesChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending || imageUrls.length >= maxImages}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0 disabled:opacity-50"
        >
          <Upload size={16} />
          {isPending ? "Uploading..." : "Upload images"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {imageUrls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={() => setDragIndex(null)}
            className={`group overflow-hidden rounded-md border bg-white shadow-sm transition ${dragIndex === index ? "border-[#0f766e] opacity-60" : "border-black/10"}`}
          >
            <div className="relative aspect-square overflow-hidden bg-slate-100">
              <Image src={url} alt={`${label} ${index + 1}`} fill className="object-cover" sizes="160px" />
              <span className="absolute left-1 top-1 inline-flex h-7 min-w-7 items-center justify-center rounded bg-black/70 px-2 text-xs font-semibold text-white">
                {index + 1}
              </span>
              {index === 0 ? (
                <span className="absolute bottom-1 left-1 rounded bg-[#0f766e] px-2 py-0.5 text-xs font-semibold text-white">Cover</span>
              ) : null}
              <span className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded bg-white/90 text-slate-600 shadow-sm">
                <GripVertical size={15} />
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 p-2">
              <button
                type="button"
                onClick={() => shiftImage(index, -1)}
                disabled={index === 0}
                className="inline-flex h-8 items-center justify-center rounded-md border border-black/10 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-35"
                aria-label={`Move image ${index + 1} up`}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => shiftImage(index, 1)}
                disabled={index === imageUrls.length - 1}
                className="inline-flex h-8 items-center justify-center rounded-md border border-black/10 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-35"
                aria-label={`Move image ${index + 1} down`}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCover(index)}
                disabled={index === 0}
                className="inline-flex h-8 items-center justify-center rounded-md border border-black/10 bg-white text-amber-600 transition hover:bg-amber-50 active:scale-95 disabled:opacity-35"
                aria-label={`Set image ${index + 1} as cover`}
              >
                <Star size={14} />
              </button>
              <button
                type="button"
                onClick={() => cropExistingImage(url, index)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-black/10 bg-white text-slate-700 transition hover:bg-slate-50 active:scale-95"
                aria-label={`Crop image ${index + 1}`}
              >
                <Crop size={14} />
              </button>
              <button
                type="button"
                onClick={() => setImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 active:scale-95"
                aria-label={`Remove image ${index + 1}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {imageUrls.length < maxImages ? (
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
      {cropSource ? (
        <ImageCropDialog
          key={cropSource.url}
          source={cropSource}
          busy={isPending}
          onCancel={closeCrop}
          onSkip={continueQueue}
          onCrop={handleCrop}
        />
      ) : null}
    </div>
  );
}

function ImageCropDialog({
  source,
  busy,
  onCancel,
  onSkip,
  onCrop,
}: {
  source: CropSource;
  busy: boolean;
  onCancel: () => void;
  onSkip: () => void;
  onCrop: (blob: Blob) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState("");

  function createCrop() {
    const image = imageRef.current;
    if (!image || !isLoaded) return;
    const canvas = document.createElement("canvas");
    canvas.width = cropOutputSize;
    canvas.height = cropOutputSize;
    const context = canvas.getContext("2d");
    if (!context) return;

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    const baseScale = Math.max(cropDisplaySize / naturalWidth, cropDisplaySize / naturalHeight);
    const displayedWidth = naturalWidth * baseScale * zoom;
    const displayedHeight = naturalHeight * baseScale * zoom;
    const scale = cropOutputSize / cropDisplaySize;
    const drawX = ((cropDisplaySize - displayedWidth) / 2 + offsetX) * scale;
    const drawY = ((cropDisplaySize - displayedHeight) / 2 + offsetY) * scale;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, cropOutputSize, cropOutputSize);
    context.imageSmoothingQuality = "high";
    context.drawImage(image, drawX, drawY, displayedWidth * scale, displayedHeight * scale);
    canvas.toBlob((blob) => {
      if (blob) onCrop(blob);
      else setError("Could not create cropped image.");
    }, "image/webp", 0.92);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-950">Crop product image</h3>
            <p className="text-sm text-slate-500">Adjust the square crop before saving the image.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-slate-700 transition hover:bg-slate-50 active:scale-95"
            aria-label="Close crop dialog"
          >
            <X size={17} />
          </button>
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-[340px_1fr]">
          <div className="flex justify-center">
            <div className="relative h-80 w-80 overflow-hidden rounded-md bg-slate-100 ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={source.url}
                alt=""
                className="absolute left-1/2 top-1/2 max-w-none select-none"
                style={{
                  transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${zoom})`,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                draggable={false}
                onLoad={() => setIsLoaded(true)}
                onError={() => setError("Could not load image.")}
              />
              <div className="pointer-events-none absolute inset-0 ring-4 ring-white/70" />
            </div>
          </div>
          <div className="grid content-start gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Move left / right
              <input
                type="range"
                min="-160"
                max="160"
                step="1"
                value={offsetX}
                onChange={(event) => setOffsetX(Number(event.target.value))}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Move up / down
              <input
                type="range"
                min="-160"
                max="160"
                step="1"
                value={offsetY}
                onChange={(event) => setOffsetY(Number(event.target.value))}
              />
            </label>
            {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={createCrop}
                disabled={busy || !isLoaded}
                className="h-10 rounded-md bg-[#17201c] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#223329] active:translate-y-0 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save crop"}
              </button>
              <button
                type="button"
                onClick={onSkip}
                disabled={busy}
                className="h-10 rounded-md border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                Skip image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
