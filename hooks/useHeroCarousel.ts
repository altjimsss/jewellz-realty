"use client";

import { useEffect, useMemo, useState } from "react";

export function useHeroCarousel({
  heroCount,
  durationMs,
}: {
  heroCount: number;
  durationMs: number;
}) {
  const [heroIndex, setHeroIndex] = useState(0);

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (!heroCount || heroCount <= 0) return;

    let raf = 0;
    let start = performance.now();
    let elapsedBeforePause = 0;
    let lastFrame = start;

    const step = (now: number) => {
      // Pause when tab hidden.
      if (document.visibilityState !== "visible") {
        elapsedBeforePause += now - lastFrame;
        lastFrame = now;
        raf = requestAnimationFrame(step);
        return;
      }

      const elapsed = now - start - elapsedBeforePause;
      if (elapsed >= durationMs) {
        setHeroIndex((i) => (i + 1) % heroCount);
        return;
      }

      lastFrame = now;
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, heroCount, reducedMotion]);

  const onPrevHero = () => {
    setHeroIndex((i) => (i - 1 + heroCount) % heroCount);
  };

  const onNextHero = () => {
    setHeroIndex((i) => (i + 1) % heroCount);
  };

  return {
    heroIndex,
    onPrevHero,
    onNextHero,
    setHeroIndex,
  };
}

