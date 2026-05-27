"use client";

import { useEffect, useRef, useState } from "react";

function CountUpOnView({ end, duration = 2200 }: { end: number; duration?: number }) {
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

export function SiteStats() {
	return (
		<div className="grid grid-cols-3 border-y py-4 text-center">
			<div className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={500} /><span className="text-[#DE141C]">+</span></p><p className="text-[11px] sm:text-sm">Properties</p></div>
			<div className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={50} /><span className="text-[#DE141C]">+</span></p><p className="text-[11px] sm:text-sm">Agents</p></div>
			<div className="flex flex-col items-center justify-center"><p className="text-2xl font-semibold sm:text-4xl"><CountUpOnView end={10} /><span className="text-[#DE141C]">+</span></p><p className="text-[11px] sm:text-sm">Provinces</p></div>
		</div>
	);
}