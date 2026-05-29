"use client";

import { useEffect, useState } from "react";
import { SparkleSvg } from "@/components/ui/SparkleSvg";

const BANNER_DURATION_MS = 5500;
const BANNER_TICK_MS = 50;

type BannerSlide = {
  key: string;
  Svg: () => JSX.Element;
};

function BannerSvgOne() {
  return (
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-transparent">
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        <span className="w-[3px] bg-[#DE141C]" style={{ animation: "banner-fade-in 0.4s ease-out both" }} />

        <div className="relative">
          <div className="overflow-hidden">
            <p
              className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]"
              style={{ animation: "banner-slide-right 0.45s ease-out both", animationDelay: "0.35s" }}
            >
              DISCOVER YOUR
            </p>
          </div>

          <div className="overflow-hidden">
            <h2
              className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]"
              style={{ animation: "banner-slide-right 0.5s ease-out both", animationDelay: "0.45s" }}
            >
              DREAM
              <br />
              PROPERTY
            </h2>
          </div>

          <div
            className="pointer-events-none absolute z-0 -right-[145px] top-1 w-[132px] md:-right-[165px] md:w-[150px]"
            style={{ animation: "banner-fade-in 0.5s ease-out both", animationDelay: "0.6s" }}
          >
            <SparkleSvg showExtra className="h-auto w-full" />
          </div>
        </div>
      </div>

      <img
        src="/assets/housebanner1.png"
        alt="House banner"
        className="absolute right-[-30px] top-[46%] z-20 h-[260px] max-w-none -translate-y-1/2 object-contain md:h-[360px]"
        style={{ animation: "banner-fade-in 0.6s ease-out both", animationDelay: "0.5s" }}
      />
    </div>
  );
}

function BannerSvgTwo() {
  return (
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-transparent">
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        <span className="w-[3px] bg-[#DE141C]" style={{ animation: "banner-fade-in 0.4s ease-out both" }} />
        <div className="relative">
          <div className="overflow-hidden">
            <p
              className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]"
              style={{ animation: "banner-slide-right 0.45s ease-out both", animationDelay: "0.35s" }}
            >
              LISTINGS &amp; SELLING
            </p>
          </div>
          <div className="overflow-hidden">
            <h2
              className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]"
              style={{ animation: "banner-slide-right 0.5s ease-out both", animationDelay: "0.45s" }}
            >
              EXPERT BROKER
              <br />
              ASSISTANCE
            </h2>
          </div>
          <div
            className="pointer-events-none absolute z-0 -right-[145px] top-1 w-[132px] md:-right-[165px] md:w-[150px]"
            style={{ animation: "banner-fade-in 0.5s ease-out both", animationDelay: "0.6s" }}
          >
            <SparkleSvg showExtra className="h-auto w-full" />
          </div>
        </div>
      </div>

      <img
        src="/assets/bannerprofessional.png"
        alt="Listings and selling banner"
        className="absolute right-[-40px] top-[40%] z-20 h-[220px] max-w-none -translate-y-1/2 object-contain md:h-[300px]"
        style={{ animation: "banner-fade-in 0.6s ease-out both", animationDelay: "0.5s" }}
      />
    </div>
  );
}

function BannerSvgThree() {
  return (
    <div className="relative flex h-full w-full items-center rounded-[18px] bg-transparent">
      <div className="relative z-20 flex items-stretch gap-3 pl-4 md:pl-8">
        <span className="w-[3px] bg-[#DE141C]" style={{ animation: "banner-fade-in 0.4s ease-out both" }} />
        <div className="relative">
          <div className="overflow-hidden">
            <p
              className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]"
              style={{ animation: "banner-slide-right 0.45s ease-out both", animationDelay: "0.35s" }}
            >
              INVEST &amp; GROW
            </p>
          </div>
          <div className="overflow-hidden">
            <h2
              className="mt-1 text-[40px] font-bold leading-[0.95] text-white md:text-[54px]"
              style={{ animation: "banner-slide-right 0.5s ease-out both", animationDelay: "0.45s" }}
            >
              CONSULTATION
              <br />
              &amp; GROWTH
            </h2>
          </div>
          <div
            className="pointer-events-none absolute z-0 -right-[145px] top-1 w-[132px] md:-right-[165px] md:w-[150px]"
            style={{ animation: "banner-fade-in 0.5s ease-out both", animationDelay: "0.6s" }}
          >
            <SparkleSvg showExtra className="h-auto w-full" />
          </div>
        </div>
      </div>

      <img
        src="/assets/bannerconsult.png"
        alt="Investment consultation banner"
        className="absolute right-[-40px] top-[40%] z-20 h-[220px] max-w-none -translate-y-1/2 object-contain md:h-[300px]"
        style={{ animation: "banner-fade-in 0.6s ease-out both", animationDelay: "0.5s" }}
      />
    </div>
  );
}

const BANNER_SLIDES: BannerSlide[] = [
  { key: "discover", Svg: BannerSvgOne },
  { key: "invest", Svg: BannerSvgTwo },
  { key: "featured", Svg: BannerSvgThree },
];

export function PropertyBanner() {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerElapsed, setBannerElapsed] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerElapsed((prev) => {
        const next = prev + BANNER_TICK_MS;
        if (next >= BANNER_DURATION_MS) {
          setBannerIndex((idx) => (idx + 1) % BANNER_SLIDES.length);
          return 0;
        }
        return next;
      });
    }, BANNER_TICK_MS);

    return () => window.clearInterval(id);
  }, []);

  const bannerProgress = Math.min(100, (bannerElapsed / BANNER_DURATION_MS) * 100);
  void bannerProgress;

  return (
    <section className="relative isolate overflow-hidden bg-black">
      <img
        src="/assets/Gradient V25.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 top-1/2 z-0 h-80 w-80 -translate-y-1/2 md:h-[34rem] md:w-[34rem]"
      />

      <div className="relative mx-auto max-w-[1200px] px-4 py-6 md:py-8">
        <div className="relative h-[150px] md:h-[190px]">
          {BANNER_SLIDES.map((slide, idx) => {
            const Svg = slide.Svg;
            const isActive = idx === bannerIndex;

            return (
              <div
                key={`${slide.key}-${isActive ? "active" : "inactive"}`}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  isActive ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="relative mx-auto h-full w-full max-w-[860px] overflow-visible">
                  <Svg />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
