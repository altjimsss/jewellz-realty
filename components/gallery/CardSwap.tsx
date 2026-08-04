"use client";

import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
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

const CardSwap = forwardRef<CardSwapHandle, CardSwapProps>(
  ({
    width = 500,
    height = 400,
    cardDistance = 60,
    verticalDistance = 70,
    onCardClick,
    onFrontChange,
    skewAmount = 6,
    easing = "elastic",
    children,
  }: CardSwapProps,
  ref) => {
    const config = useMemo(
      () =>
        easing === "elastic"
          ? {
              ease: "elastic.out(0.7,0.8)",
              durDrop: 1.2,
              durMove: 1.2,
              durReturn: 1.2,
              promoteOverlap: 0.85,
              returnDelay: 0.05,
            }
          : {
              ease: "power1.inOut",
              durDrop: 0.8,
              durMove: 0.8,
              durReturn: 0.8,
              promoteOverlap: 0.45,
              returnDelay: 0.2,
            },
      [easing]
    );

    const childArray = useMemo(() => Children.toArray(children), [children]);
    const childrenKey = childArray
      .map((child) => (isValidElement(child) ? String(child.key ?? "") : ""))
      .join("|");
    // Refs only need to be recreated when the child count changes; keeping them
    // stable across re-renders prevents the position effect from re-running and
    // killing an in-flight swap animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const refs = useMemo(() => childArray.map(() => React.createRef<HTMLDivElement>()), [childArray.length]);
    const order = useRef(Array.from({ length: childArray.length }, (_, index) => index));
    const timelineRef = useRef<gsap.core.Timeline | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const previousChildrenKey = useRef<string | null>(null);

    const runSwap = useCallback(
      (direction: "next" | "prev") => {
        const total = refs.length;
        if (total < 2) return;

        // Drop any stale indexes (e.g. after a children change) before swapping.
        order.current = order.current.filter((i) => i >= 0 && i < total);
        if (order.current.length < 2) return;

        // Interrupt any in-flight swap so a new click always starts fresh —
        // without this, rapid clicks stack competing timelines over the same
        // cards and the fan appears to ignore clicks.
        timelineRef.current?.kill();

        const timeline = gsap.timeline();
        timelineRef.current = timeline;

        if (direction === "next") {
          const [front, ...rest] = order.current;
          const frontElement = refs[front].current;
          if (!frontElement) return;

          // Advance the logical order *immediately* so a second click during
          // the animation targets the next card instead of re-triggering the
          // same swap. The original updated order only at the end of the
          // timeline, which is why Next sometimes needed two clicks.
          order.current = [...rest, front];
          onFrontChange?.(rest[0] ?? front);

          timeline.to(frontElement, {
            y: "+=500",
            duration: config.durDrop,
            ease: config.ease,
          });

          timeline.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);

          rest.forEach((index, step) => {
            const element = refs[index].current;
            if (!element) return;

            const slot = makeSlot(step, cardDistance, verticalDistance, total);
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

          const backSlot = makeSlot(total - 1, cardDistance, verticalDistance, total);
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
          return;
        }

        const last = order.current[order.current.length - 1];
        const rest = order.current.slice(0, -1);
        const lastElement = refs[last].current;
        if (!lastElement) return;

        order.current = [last, ...rest];
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

          const slot = makeSlot(step + 1, cardDistance, verticalDistance, total);
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

        const frontSlot = makeSlot(0, cardDistance, verticalDistance, total);
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
      },
      [cardDistance, config, onFrontChange, refs, verticalDistance]
    );

    useImperativeHandle(
      ref,
      () => ({
        next: () => runSwap("next"),
        prev: () => runSwap("prev"),
        jumpTo: (index: number) => {
          const total = refs.length;
          if (total === 0) return;
          const nextIndex = Math.max(0, Math.min(index, total - 1));
          const currentFront = order.current[0] ?? 0;
          if (nextIndex === currentFront) return;

          order.current = Array.from({ length: total }, (_, i) => i);
          while (order.current[0] !== nextIndex) {
            order.current = [...order.current.slice(1), order.current[0]];
          }
          onFrontChange?.(order.current[0] ?? 0);
        },
      }),
      [onFrontChange, refs.length, runSwap]
    );

    useEffect(() => {
      const total = refs.length;
      // Reset the rotation whenever the card set actually changes (different
      // keys or a different count) so the front card and caption stay in sync.
      if (order.current.length !== total || previousChildrenKey.current !== childrenKey) {
        order.current = Array.from({ length: total }, (_, index) => index);
        previousChildrenKey.current = childrenKey;
      }
      refs.forEach((refItem, index) => {
        if (refItem.current) {
          placeNow(refItem.current, makeSlot(index, cardDistance, verticalDistance, total), skewAmount);
        }
      });
      onFrontChange?.(order.current[0] ?? 0);

      const timeline = timelineRef.current;
      return () => {
        timeline?.kill();
      };
    }, [cardDistance, verticalDistance, skewAmount, easing, refs, onFrontChange, childrenKey]);

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
  }
);

CardSwap.displayName = "CardSwap";

export default CardSwap;
