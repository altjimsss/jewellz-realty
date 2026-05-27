"use client";

import { useEffect, useRef, useState } from "react";

export function CountUpOnView({
  end,
  duration = 2200,
}: {
  end: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setHasAnimated(true);

        const start = performance.now();
        const frame = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.round(progress * end));
          if (progress < 1) requestAnimationFrame(frame);
        };

        requestAnimationFrame(frame);
        observer.disconnect();
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [duration, end, hasAnimated]);

  return <span ref={ref}>{count}</span>;
}

