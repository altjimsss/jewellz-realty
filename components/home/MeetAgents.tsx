"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

export type Agent = {
	name: string;
	top: boolean;
};

type MeetAgentsProps = {
	agents?: Agent[];
	autoSlideMs?: number;
};

const DEFAULT_AGENTS: Agent[] = [
	{ name: "CINDY HERMOSO", top: true },
	{ name: "JOHN A. SMITH", top: false },
	{ name: "LINDA WALKER", top: false },
	{ name: "EVAN YU", top: false },
];

export function MeetAgents({ agents = DEFAULT_AGENTS, autoSlideMs = 2600 }: MeetAgentsProps) {
	const [autoPaused, setAutoPaused] = useState(false);
	const railRef = useRef<HTMLDivElement | null>(null);

	const scrollAgents = useCallback((direction: "prev" | "next") => {
		const rail = railRef.current;
		if (!rail) return;

		const step = 280 + 24; // card width + gap-6
		const maxLeft = rail.scrollWidth - rail.clientWidth;

		if (maxLeft <= 0) return;

		const isAtStart = rail.scrollLeft <= 4;
		const isAtEnd = rail.scrollLeft >= maxLeft - 4;

		if (direction === "prev" && isAtStart) {
			rail.scrollTo({ left: maxLeft, behavior: "smooth" });
			return;
		}

		if (direction === "next" && isAtEnd) {
			rail.scrollTo({ left: 0, behavior: "smooth" });
			return;
		}

		const nextLeft =
			direction === "next"
				? Math.min(rail.scrollLeft + step, maxLeft)
				: Math.max(rail.scrollLeft - step, 0);

		rail.scrollTo({ left: nextLeft, behavior: "smooth" });
	}, []);

	useEffect(() => {
		if (autoPaused) return;
		if (typeof window === "undefined") return;
		if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

		const t = window.setInterval(() => {
			if (document.visibilityState !== "visible") return;
			scrollAgents("next");
		}, autoSlideMs);

		return () => window.clearInterval(t);
	}, [autoPaused, autoSlideMs, scrollAgents]);

	return (
		<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-24">
			<p className="text-center text-sm font-bold text-gray-500">WE HAVE PROFESSIONAL AGENTS</p>
			<h2 className="text-center text-3xl font-bold sm:text-4xl">MEET OUR AGENTS</h2>
			<div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
			<div className="relative mt-10">
				<button
					type="button"
					aria-label="Previous agents"
					onClick={() => scrollAgents("prev")}
					className="absolute left-0 top-1/2 z-20 grid h-10 w-9 -translate-y-1/2 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white"
				>
					&lsaquo;
				</button>
				<button
					type="button"
					aria-label="Next agents"
					onClick={() => scrollAgents("next")}
					className="absolute right-0 top-1/2 z-20 grid h-10 w-9 -translate-y-1/2 place-items-center bg-[#DE141C] text-lg leading-none text-white"
				>
					&rsaquo;
				</button>
				<div
					ref={railRef}
					className="mx-12 overflow-x-auto scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					onMouseEnter={() => setAutoPaused(true)}
					onMouseLeave={() => setAutoPaused(false)}
					onTouchStart={() => setAutoPaused(true)}
					onTouchEnd={() => setAutoPaused(false)}
					onFocusCapture={() => setAutoPaused(true)}
					onBlurCapture={() => setAutoPaused(false)}
				>
					<div className="flex w-max gap-6">
						{agents.map((agent, idx) => (
							<article
								key={agent.name}
								className="w-[280px] shrink-0 snap-start overflow-hidden rounded-sm border border-black/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
							>
								<div className={`relative h-60 ${idx % 2 === 0 ? "bg-[#DE141C]" : "bg-white"}`}>
									{agent.top && (
										<span className="absolute right-3 top-3 z-10 rounded-md bg-black px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white">TOP AGENT</span>
									)}
									<Image
										src="/assets/broker.png"
										alt={agent.name}
										fill
										sizes="280px"
										className="object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.02]"
									/>
								</div>
								<div className="bg-[#2A2A2A] px-3 py-3 text-center text-white">
									<p className="truncate whitespace-nowrap text-[28px] font-bold uppercase leading-none tracking-[0.02em]">{agent.name}</p>
									<p className="mt-1 text-[15px] font-medium text-gray-200">Real Estate Broker</p>
									<div className="mx-auto mt-2 h-px w-20 bg-white/20" />
									<p className="mt-2 text-[11px] font-medium text-gray-300">PRC No. 24444</p>
									<p className="text-[11px] font-medium text-gray-300">DHSUD No. 6186</p>
								</div>
								<div className={`px-3 py-2.5 ${idx % 2 === 0 ? "bg-[#DE141C]" : "bg-white"}`}>
									<div className={`flex items-center justify-center gap-3 ${idx % 2 === 0 ? "text-white" : "text-[#DE141C]"}`}>
										<button type="button" className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Facebook"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M13 10h3V7h-3V5c0-.8.2-1.1 1-1.1H16V1h-3c-2.5 0-4 1.5-4 4.2V7H7v3h2v9h4v-9z" /></svg></button>
										<button type="button" className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Instagram"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0122 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8A5.8 5.8 0 012 16.2V7.8A5.8 5.8 0 017.8 2zm0 2A3.8 3.8 0 004 7.8v8.4A3.8 3.8 0 007.8 20h8.4a3.8 3.8 0 003.8-3.8V7.8A3.8 3.8 0 0016.2 4H7.8zm9.6 1.3a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" /></svg></button>
										<button type="button" className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Email"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm16.6 2H4.4L12 12.2 19.6 7zM4 17h16V8.1l-7.4 5.1a1 1 0 01-1.2 0L4 8.1V17z" /></svg></button>
										<button type="button" className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${idx % 2 === 0 ? "bg-white/10 hover:bg-white/20" : "bg-[#DE141C]/10 hover:bg-[#DE141C]/20"}`} aria-label="Phone"><svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M6.6 10.8a15.6 15.6 0 006.6 6.6l2.2-2.2a1 1 0 011-.24c1.1.36 2.2.54 3.4.54a1 1 0 011 1V20a1 1 0 01-1 1C10.3 21 3 13.7 3 4.5a1 1 0 011-1h3.5a1 1 0 011 1c0 1.15.18 2.29.54 3.4a1 1 0 01-.25 1l-2.24 1.9z" /></svg></button>
									</div>
								</div>
							</article>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}