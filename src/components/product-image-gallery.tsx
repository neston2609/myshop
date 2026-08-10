"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

export function ProductImageGallery({ images, fallbackAlt }: { images: GalleryImage[]; fallbackAlt: string }) {
  const galleryImages = images.length ? images : [{ id: "fallback", url: "/window.svg", alt: fallbackAlt }];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const activeImage = galleryImages[activeIndex] || galleryImages[0];

  const move = useCallback((step: number) => {
    setActiveIndex((current) => (current + step + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, move]);

  return (
    <section className="grid gap-4">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 transition hover:-translate-y-0.5 active:translate-y-0"
        aria-label="Open product image gallery"
      >
        <Image src={activeImage.url} alt={activeImage.alt} fill className="object-cover" sizes="(min-width: 1024px) 55vw, 100vw" priority />
      </button>
      {galleryImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-md border bg-slate-100 transition hover:-translate-y-0.5 active:translate-y-0 ${index === activeIndex ? "border-[#0f766e] ring-2 ring-[#0f766e]/20" : "border-black/10"}`}
              aria-label={`Show product image ${index + 1}`}
            >
              <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="120px" />
            </button>
          ))}
        </div>
      ) : null}
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 transition hover:scale-105 active:scale-95"
            aria-label="Close gallery"
          >
            <X size={22} />
          </button>
          {galleryImages.length > 1 ? (
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 transition hover:scale-105 active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft size={26} />
            </button>
          ) : null}
          <div className="relative h-[82vh] w-full max-w-6xl">
            <Image src={activeImage.url} alt={activeImage.alt} fill className="object-contain" sizes="100vw" />
          </div>
          {galleryImages.length > 1 ? (
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 transition hover:scale-105 active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight size={26} />
            </button>
          ) : null}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
            {activeIndex + 1} / {galleryImages.length}
          </div>
        </div>
      ) : null}
    </section>
  );
}
