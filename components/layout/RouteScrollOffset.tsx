"use client";

import { useEffect } from "react";

type RouteScrollOffsetProps = {
  offset?: number;
};

export function RouteScrollOffset({ offset = 88 }: RouteScrollOffsetProps) {
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.scrollBy({ top: offset, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(id);
  }, [offset]);

  return null;
}
