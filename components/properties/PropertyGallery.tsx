"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type PropertyGalleryProps = {
  images: string[];
  title: string;
};

const FALLBACK_IMAGE = "/assets/housebanner1.png";

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const availableImages = images.filter(Boolean);
  const galleryImages = availableImages.length > 0 ? availableImages : [FALLBACK_IMAGE];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const imageCount = galleryImages.length;
  const currentIndex = imageCount > 1 ? activeIndex % imageCount : 0;
  const mainImage = galleryImages[currentIndex];
  const previewIndices =
    imageCount > 1
      ? [(currentIndex + 1) % imageCount, (currentIndex + 2) % imageCount]
      : [0, 0];

  const changeImage = (direction: number) => {
    if (imageCount <= 1) return;
    setActiveIndex((current) => (current + direction + imageCount) % imageCount);
  };

  useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen]);

  return (
    <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)]">
      <div className="grid h-80 grid-rows-2 gap-3 lg:h-96">
        {previewIndices.map((previewIndex, idx) => {
          const isShowAllTile = idx === 1;

          return (
            <button
              key={`${galleryImages[previewIndex]}-${idx}`}
              type="button"
              onClick={isShowAllTile ? () => setIsLightboxOpen(true) : () => setActiveIndex(previewIndex)}
              className="relative overflow-hidden bg-black/5 text-left shadow-sm min-h-0"
              aria-label={isShowAllTile ? "Show all images" : `Show preview image ${idx + 1}`}
            >
              <Image
                src={galleryImages[previewIndex] ?? FALLBACK_IMAGE}
                alt={`${title} preview ${idx + 1}`}
                fill
                sizes="(min-width: 1024px) 200px, 140px"
                className="object-cover"
              />

              {isShowAllTile ? (
                <div className="absolute inset-0 bg-black/55" />
              ) : null}

              {isShowAllTile ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                    <path d="M4 7h4l2-2h4l2 2h4v11H4V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Show all</span>
                  <span className="text-[11px] text-white/85">{imageCount} photos</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden bg-black/5 shadow-sm h-80 lg:h-96">
        <Image
          src={mainImage}
          alt={title}
          fill
          sizes="(min-width: 1024px) 740px, 100vw"
          className="object-cover"
          priority
        />

        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => changeImage(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M14.5 6.5L9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <button
            type="button"
            aria-label="Next image"
            onClick={() => changeImage(1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M9.5 6.5L15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-[6000] bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photo gallery`}
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 pt-12 sm:pt-16 lg:pt-20"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-white/70">
                  {currentIndex + 1} of {imageCount}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close gallery"
                onClick={() => setIsLightboxOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="relative mx-auto flex h-[56vh] w-full max-w-5xl overflow-hidden rounded-[18px]">
              <Image
                src={mainImage}
                alt={title}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />

              <div className="absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur-sm">
                <span className="text-[11px] font-semibold">
                  {currentIndex + 1}/{imageCount}
                </span>
              </div>

              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => changeImage(-1)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M14.5 6.5L9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => changeImage(1)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M9.5 6.5L15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            
          </div>
        </div>
      ) : null}
    </div>
  );
}