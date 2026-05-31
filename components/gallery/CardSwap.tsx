"use client";

import React, { Children, cloneElement, forwardRef, isValidElement, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import gsap from "gsap";
import "./CardSwap.css";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  customClass?: string;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({ customClass, className, ...rest }, ref) => (
  <div ref={ref} {...rest} className={`card ${customClass ?? ""} ${className ?? ""}`.trim()} />
));
Card.displayName = "Card";

const makeSlot = (index: number, distX: number, distY: number, total: number) => ({
  x: index * distX,
  y: -index * distY,
  z: -index * distX * 1.5,
  zIndex: total - index,
});

const placeNow = (element: HTMLElement, slot: ReturnType<typeof makeSlot>, skew: number) =>
  gsap.set(element, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });

type CardSwapProps = {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  onFrontChange?: (index: number) => void;
  skewAmount?: number;
  easing?: "elastic" | "smooth";
  children: React.ReactNode;
};

export type CardSwapHandle = {
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
};

const CardSwap = forwardRef<CardSwapHandle, CardSwapProps>(({ 
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  onFrontChange,
  skewAmount = 6,
  easing = "elastic",
  children,
}: CardSwapProps, ref) => {
  const config =
    easing === "elastic"
      ? {
          ease: "elastic.out(0.6,0.9)",
          durDrop: 2,
          durMove: 2,
          durReturn: 2,
          promoteOverlap: 0.9,
          returnDelay: 0.05,
        }
      : {
          ease: "power1.inOut",
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2,
        };

  const childArray = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(() => childArray.map(() => React.createRef<HTMLDivElement>()), [childArray.length]);
  const order = useRef(Array.from({ length: childArray.length }, (_, index) => index));
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const runSwap = (direction: "next" | "prev") => {
    if (order.current.length < 2) return;

    order.current = order.current.filter((i) => i >= 0 && i < refs.length);

    const timeline = gsap.timeline();
    timelineRef.current = timeline;

    if (direction === "next") {
      const [front, ...rest] = order.current;
      const frontElement = refs[front].current;
      if (!frontElement) return;

      onFrontChange?.(front);

      timeline.to(frontElement, {
        y: "+=500",
        duration: config.durDrop,
        ease: config.ease,
      });

      timeline.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);

      rest.forEach((index, step) => {
        const element = refs[index].current;
        if (!element) return;

        const slot = makeSlot(step, cardDistance, verticalDistance, refs.length);
        timeline.set(element, { zIndex: slot.zIndex }, "promote");
        timeline.to(
          element,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.durMove,
            ease: config.ease,
          },
          `promote+=${step * 0.15}`
        );
      });

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      timeline.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
      timeline.call(() => {
        gsap.set(frontElement, { zIndex: backSlot.zIndex });
      }, undefined, "return");
      timeline.to(
        frontElement,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.durReturn,
          ease: config.ease,
        },
        "return"
      );

      timeline.call(() => {
        order.current = [...rest, front];
      });
      return;
    }

    const last = order.current[order.current.length - 1];
    const rest = order.current.slice(0, -1);
    const lastElement = refs[last].current;
    if (!lastElement) return;

    onFrontChange?.(last);

    timeline.to(lastElement, {
      y: "-=500",
      duration: config.durDrop,
      ease: config.ease,
    });

    timeline.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);

    rest.forEach((index, step) => {
      const element = refs[index].current;
      if (!element) return;

      const slot = makeSlot(step + 1, cardDistance, verticalDistance, refs.length);
      timeline.set(element, { zIndex: slot.zIndex }, "promote");
      timeline.to(
        element,
        {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          duration: config.durMove,
          ease: config.ease,
        },
        `promote+=${step * 0.15}`
      );
    });

    const frontSlot = makeSlot(0, cardDistance, verticalDistance, refs.length);
    timeline.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
    timeline.call(() => {
      gsap.set(lastElement, { zIndex: frontSlot.zIndex });
    }, undefined, "return");
    timeline.to(
      lastElement,
      {
        x: frontSlot.x,
        y: frontSlot.y,
        z: frontSlot.z,
        duration: config.durReturn,
        ease: config.ease,
      },
      "return"
    );

    timeline.call(() => {
      order.current = [last, ...rest];
    });
  };

  useImperativeHandle(ref, () => ({
    next: () => runSwap("next"),
    prev: () => runSwap("prev"),
    jumpTo: (index: number) => {
      const nextIndex = Math.max(0, Math.min(index, refs.length - 1));
      const currentFront = order.current[0] ?? 0;
      if (nextIndex === currentFront) return;

      order.current = Array.from({ length: refs.length }, (_, i) => i);
      while (order.current[0] !== nextIndex) {
        order.current = [...order.current.slice(1), order.current[0]];
      }
      onFrontChange?.(order.current[0] ?? 0);
    },
  }), [onFrontChange, refs.length]);

  useEffect(() => {
    const total = refs.length;
    // Ensure order indexes match the current refs length to avoid out-of-range refs
    if (order.current.length !== total) {
      order.current = Array.from({ length: total }, (_, index) => index);
    }
    refs.forEach((ref, index) => {
      if (ref.current) {
        placeNow(ref.current, makeSlot(index, cardDistance, verticalDistance, total), skewAmount);
      }
    });
    onFrontChange?.(order.current[0] ?? 0);

    return () => {
      timelineRef.current?.kill();
    };
  }, [cardDistance, verticalDistance, skewAmount, easing, refs, onFrontChange]);

  const renderedChildren = childArray.map((child, index) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: index,
          ref: refs[index],
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            child.props.onClick?.(event);
            onCardClick?.(index);
          },
        })
      : child
  );

  return (
    <div ref={containerRef} className="card-swap-container" style={{ width, height }}>
      {renderedChildren}
    </div>
  );
});

CardSwap.displayName = "CardSwap";

export default CardSwap;