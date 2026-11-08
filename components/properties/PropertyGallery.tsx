"use client";

import { useEffect, useState } from "react";
import { SafeImage } from "@/components/ui/SafeImage";

type PropertyGalleryProps = {
  images: string[];
  title: string;
  fallbackImage?: string;
  videoUrl?: string;
  onInteraction?: (event: string, metadata?: Record<string, unknown>) => void;
};

const DEFAULT_FALLBACK_IMAGE = "/assets/housebanner1.webp";

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}?autoplay=1&mute=1&playsinline=1&controls=1`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v") ?? parsed.pathname.split("/embed/")[1]?.split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&controls=1`;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.match(/\d+/)?.[0];
      if (id) return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&playsinline=1`;
    }
  } catch {
    // Invalid or relative URLs are rendered as a native video source below.
  }
  return null;
}

function WalkthroughVideo({ src, title, contain = false }: { src: string; title: string; contain?: boolean }) {
  const embedUrl = getVideoEmbedUrl(src);
  if (embedUrl) {
    return <iframe src={embedUrl} title={`${title} walkthrough video`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full border-0" />;
  }
  return <video src={src} title={`${title} walkthrough video`} autoPlay muted loop playsInline controls className={`absolute inset-0 h-full w-full bg-black ${contain ? "object-contain" : "object-cover"}`} />;
}

export function PropertyGallery({ images, title, fallbackImage = DEFAULT_FALLBACK_IMAGE, videoUrl, onInteraction }: PropertyGalleryProps) {
  const availableImages = images.filter(Boolean);
  const galleryImages = availableImages.length > 0 ? availableImages : [fallbackImage];
  const hasVideo = Boolean(videoUrl?.trim());
  const mediaCount = galleryImages.length + (hasVideo ? 1 : 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const currentIndex = mediaCount > 1 ? activeIndex % mediaCount : 0;
  const isVideoActive = hasVideo && currentIndex === 0;
  const imageIndex = hasVideo ? Math.max(0, currentIndex - 1) : currentIndex;
  const previewIndices = galleryImages.length > 1
    ? [imageIndex % galleryImages.length, (imageIndex + 1) % galleryImages.length]
    : [0, 0];

  const changeImage = (direction: number) => {
    if (mediaCount <= 1) return;
    setActiveIndex((current) => (current + direction + mediaCount) % mediaCount);
    onInteraction?.(direction > 0 ? "property_gallery_next" : "property_gallery_previous", { imageCount: mediaCount });
  };

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLightboxOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLightboxOpen]);

  const renderActiveMedia = (lightbox = false) => isVideoActive && videoUrl ? (
    <WalkthroughVideo src={videoUrl} title={title} contain={lightbox} />
  ) : (
    <SafeImage src={galleryImages[imageIndex]} fallbackSrc={fallbackImage} alt={title} fill sizes={lightbox ? "100vw" : "(min-width: 1024px) 740px, 100vw"} className={lightbox ? "object-contain" : "object-cover"} priority />
  );

  return (
    <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)]">
      <div className="order-2 hidden h-28 grid-cols-2 gap-3 md:order-none md:grid md:h-80 md:grid-cols-1 md:grid-rows-2 lg:h-96">
        {previewIndices.map((previewIndex, idx) => {
          const isShowAllTile = idx === 1;
          return (
            <button
              key={`${galleryImages[previewIndex]}-${idx}`}
              type="button"
              onClick={isShowAllTile ? () => {
                setIsLightboxOpen(true);
                onInteraction?.("property_gallery_open", { imageCount: mediaCount });
              } : () => {
                setActiveIndex(previewIndex + (hasVideo ? 1 : 0));
                onInteraction?.("property_gallery_interaction", { previewIndex, imageCount: mediaCount });
              }}
              className="relative min-h-0 overflow-hidden bg-black/5 text-left shadow-sm"
              aria-label={isShowAllTile ? "Show all photos and videos" : `Show preview image ${idx + 1}`}
            >
              <SafeImage src={galleryImages[previewIndex]} fallbackSrc={fallbackImage} alt={`${title} preview ${idx + 1}`} fill sizes="(min-width: 1024px) 200px, 140px" className="object-cover" />
              {isShowAllTile ? <div className="absolute inset-0 bg-black/55" /> : null}
              {isShowAllTile ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M4 7h4l2-2h4l2 2h4v11H4V7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.6" /></svg>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Show all</span>
                  <span className="text-[11px] text-white/85">{galleryImages.length} photos{hasVideo ? " + video" : ""}</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="order-1 relative aspect-[4/3] overflow-hidden bg-black/5 shadow-sm md:aspect-auto md:h-80 lg:h-96">
        {renderActiveMedia()}
        <button type="button" onClick={() => {
          setIsLightboxOpen(true);
          onInteraction?.("property_gallery_open", { imageCount: mediaCount });
        }} className="absolute inset-0 z-[1] cursor-pointer md:hidden" aria-label="Show all photos and videos" />
        {mediaCount > 1 ? <span className="pointer-events-none absolute bottom-3 right-3 z-10 text-[10px] font-semibold tabular-nums text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">{currentIndex + 1}/{mediaCount}</span> : null}
        <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-3"><button type="button" aria-label="Previous photo or video" onClick={() => changeImage(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M14.5 6.5L9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
        <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-3"><button type="button" aria-label="Next photo or video" onClick={() => changeImage(1)} className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M9.5 6.5L15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
      </div>

      {isLightboxOpen ? (
        <div className="fixed inset-0 z-[6000] bg-black/80 p-4 backdrop-blur-sm" role="dialog" tabIndex={-1} aria-modal="true" aria-label={`${title} photo and video gallery`} onClick={() => setIsLightboxOpen(false)} onKeyDown={(event) => { if (event.key === "Escape") setIsLightboxOpen(false); }}>
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3 pt-12 sm:pt-16 lg:pt-20" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between text-white"><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-white/70">{currentIndex + 1} of {mediaCount}</p></div><button type="button" aria-label="Close gallery" onClick={() => { setIsLightboxOpen(false); onInteraction?.("property_gallery_close", { imageCount: mediaCount }); }} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button></div>
            <div className="relative mx-auto flex h-[56vh] w-full max-w-5xl overflow-hidden rounded-[18px] bg-black">{renderActiveMedia(true)}
              <div className="absolute inset-y-0 left-0 z-10 flex items-center pl-3"><button type="button" aria-label="Previous photo or video" onClick={() => changeImage(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M14.5 6.5L9 12l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
              <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-3"><button type="button" aria-label="Next photo or video" onClick={() => changeImage(1)} className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M9.5 6.5L15 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
