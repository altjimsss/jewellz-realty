"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function useHeroCarousel({
  heroCount,
  durationMs,
  tickMs = 50,
}: {
  heroCount: number;
  durationMs: number;
  /** kept for backwards compatibility; new impl uses rAF */
  tickMs?: number;
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroElapsed, setHeroElapsed] = useState(0);
  const lastEmittedElapsedRef = useRef(0);

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    if (!heroCount || heroCount <= 0) return;

    let raf = 0;
    let start = performance.now();
    let lastElapsed = 0;

    lastEmittedElapsedRef.current = 0;

    const step = (now: number) => {
      // Pause when tab hidden.
      if (document.visibilityState !== "visible") {
        start = now - lastElapsed;
        raf = requestAnimationFrame(step);
        return;
      }

      const elapsed = now - start;
      lastElapsed = elapsed;
      if (elapsed >= durationMs) {
        setHeroIndex((i) => (i + 1) % heroCount);
        start = now;
        lastElapsed = 0;
        lastEmittedElapsedRef.current = 0;
        setHeroElapsed(0);
      } else {
        // Avoid updating state too frequently: only update when elapsed changes by >= tickMs.
        // Still driven by rAF, but throttled to keep re-renders reasonable.
        const nextElapsed = elapsed;
        if (Math.abs(nextElapsed - lastEmittedElapsedRef.current) >= tickMs) {
          lastEmittedElapsedRef.current = nextElapsed;
          setHeroElapsed(nextElapsed);
        }
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, heroCount, reducedMotion, tickMs]);

  const heroProgress = useMemo(() => {
    if (!durationMs) return 0;
    return (heroElapsed / durationMs) * 100;
  }, [heroElapsed, durationMs]);

  const onPrevHero = () => {
    setHeroIndex((i) => (i - 1 + heroCount) % heroCount);
    setHeroElapsed(0);
  };

  const onNextHero = () => {
    setHeroIndex((i) => (i + 1) % heroCount);
    setHeroElapsed(0);
  };

  return {
    heroIndex,
    heroElapsed,
    heroProgress,
    onPrevHero,
    onNextHero,
    setHeroIndex,
    setHeroElapsed,
  };
}

