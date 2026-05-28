"use client";

import React from "react";
import Image from "next/image";
import { formatPHPWhole } from "@/lib/currency";

export type HeroProperty = {
	image: string;
	title: string;
	price: string;
	status: string;
	location: string;
	area: string;
	bedroom: number;
	bathroom: number;
	garage: number;
};

export type ServiceVisual = {
	title: string;
	subtitle: string;
	image: string;
};

export type HeroBannerProps = {
	heroProperties: HeroProperty[];
	serviceVisuals: ServiceVisual[];

	heroIndex: number;
	heroElapsed: number;
	heroProgress: number;
	serviceVisualIndex: number;

	priceMax: number;
	areaMax: number;

	onPrevHero: () => void;
	onNextHero: () => void;
	setPriceMax: (v: number) => void;
	setAreaMax: (v: number) => void;
};

function SparkleSvg({ className = "", showExtra = false }: { className?: string; showExtra?: boolean }) {
	return (
		<svg
			width="254"
			height="192"
			viewBox="0 0 254 192"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<path
				d="M97.9733 50.1845C99.6027 50.278 100.836 51.6383 100.953 53.6089C100.942 54.4804 100.817 55.4226 100.529 56.229C98.472 62.0578 96.4146 67.8872 94.1735 73.6725C93.2888 76.1836 92.1502 78.5378 91.125 80.8213C89.8804 80.3331 89.8211 79.3476 89.8327 78.4761C89.9646 76.2727 90.005 74.0472 90.5049 71.9309C91.3042 68.1365 92.3091 64.2937 93.2221 60.4291C93.7873 58.0367 94.3742 55.5518 94.8473 53.1377C95.3256 51.1137 96.3441 50.0911 97.9733 50.1845ZM111.858 47.3445C120.664 49.1336 129.428 51.1064 137.995 53.9076C138.179 53.9512 138.342 54.087 138.504 54.2225L138.373 54.7747C136.63 54.7514 134.751 54.8904 133.073 54.5912C126.02 53.605 119.059 52.64 112.049 51.4698C110.923 51.3009 109.699 50.7201 108.796 50.0209C107.547 49.1428 107.986 47.6931 109.426 47.3532C110.249 47.159 111.121 47.1706 111.858 47.3445ZM73.3313 29.8874C74.4138 30.2403 75.4749 30.686 76.5573 31.0388C82.9164 33.3183 89.1836 35.5755 95.5427 37.855C96.2571 38.1209 96.8578 38.4578 97.5722 38.7237C97.4152 38.9777 97.3714 39.1615 97.328 39.3454C94.064 38.7686 90.7345 38.4679 87.5357 37.6151C83.0271 36.5499 78.4913 35.187 74.0261 33.9379C73.2903 33.764 72.5978 33.4063 71.9974 33.0703C71.1425 32.5769 70.7639 31.7101 71.1869 30.7415C71.5882 29.8649 72.4113 29.6702 73.3313 29.8874ZM118.382 9.44259C118.75 9.52982 119.085 10.5801 119.047 11.1539C118.97 12.3015 118.687 13.4978 118.474 14.8077C117.877 16.5125 117.28 18.2178 116.775 19.9443C115.7 23.6732 114.739 27.3319 113.663 31.0608C113.245 32.4192 112.736 33.7563 111.971 34.9358C111.185 36.2072 110.004 37.0938 108.348 36.7028C106.692 36.3115 106.124 35.0117 105.898 33.501C105.565 30.7993 106.265 28.2443 107.426 25.7983C109.39 21.599 111.424 17.5133 113.641 13.4713C114.336 12.1781 115.398 10.9717 116.416 9.94945C116.801 9.55459 117.83 9.31216 118.382 9.44259Z"
				fill="white"
			>
				<animate attributeName="opacity" values="0.45;1;0.45" dur="2.2s" begin="0s" repeatCount="indefinite" />
			</path>
			<path
				d="M203.973 151.185C205.603 151.278 206.836 152.638 206.953 154.609C206.942 155.48 206.817 156.423 206.529 157.229C204.472 163.058 202.415 168.887 200.173 174.673C199.289 177.184 198.15 179.538 197.125 181.821C195.88 181.333 195.821 180.348 195.833 179.476C195.965 177.273 196.005 175.047 196.505 172.931C197.304 169.137 198.309 165.294 199.222 161.429C199.787 159.037 200.374 156.552 200.847 154.138C201.326 152.114 202.344 151.091 203.973 151.185ZM217.858 148.345C226.664 150.134 235.428 152.106 243.995 154.908C244.179 154.951 244.342 155.087 244.504 155.222L244.373 155.775C242.63 155.751 240.751 155.89 239.073 155.591C232.02 154.605 225.059 153.64 218.049 152.47C216.923 152.301 215.699 151.72 214.796 151.021C213.547 150.143 213.986 148.693 215.426 148.353C216.249 148.159 217.121 148.171 217.858 148.345ZM179.331 130.887C180.414 131.24 181.475 131.686 182.557 132.039C188.916 134.318 195.184 136.576 201.543 138.855C202.257 139.121 202.858 139.458 203.572 139.724C203.415 139.978 203.371 140.162 203.328 140.345C200.064 139.769 196.734 139.468 193.536 138.615C189.027 137.55 184.491 136.187 180.026 134.938C179.29 134.764 178.598 134.406 177.997 134.07C177.143 133.577 176.764 132.71 177.187 131.741C177.588 130.865 178.411 130.67 179.331 130.887ZM224.382 110.443C224.75 110.53 225.085 111.58 225.047 112.154C224.97 113.302 224.687 114.498 224.474 115.808C223.877 117.513 223.28 119.218 222.775 120.944C221.7 124.673 220.739 128.332 219.663 132.061C219.245 133.419 218.736 134.756 217.971 135.936C217.185 137.207 216.004 138.094 214.348 137.703C212.692 137.311 212.124 136.012 211.898 134.501C211.565 131.799 212.265 129.244 213.426 126.798C215.39 122.599 217.424 118.513 219.641 114.471C220.336 113.178 221.398 111.972 222.416 110.949C222.801 110.555 223.83 110.312 224.382 110.443Z"
				fill="white"
			>
				<animate attributeName="opacity" values="0.45;1;0.45" dur="2.2s" begin="0.35s" repeatCount="indefinite" />
			</path>
			<path
				d="M28.3828 77.2634C29.3661 76.7583 30.5459 77.0758 31.2804 78.105C31.5682 78.582 31.8139 79.1359 31.9183 79.6716C32.6866 83.5362 33.4549 87.4013 34.1009 91.3051C34.4327 92.9694 34.5626 94.6354 34.7355 96.2243C33.8437 96.3839 33.4764 95.8692 33.1887 95.3924C32.5212 94.1518 31.7926 92.9301 31.3695 91.6111C30.5542 89.2798 29.8427 86.8519 29.07 84.4436C28.5917 82.9527 28.0946 81.4043 27.5552 79.9329C27.1505 78.6714 27.3998 77.7687 28.3828 77.2634ZM35.5324 70.9853C41.2805 68.9515 47.0657 67.0326 53.0162 65.6296C53.1383 65.5905 53.2788 65.6083 53.4193 65.6264L53.5296 65.9705C52.5037 66.5526 51.4536 67.2696 50.3725 67.6797C45.9198 69.5509 41.5273 71.4021 37.0378 73.1587C36.3233 73.451 35.4133 73.5539 34.6496 73.4828C33.6229 73.4327 33.3894 72.495 34.1159 71.8192C34.5309 71.4332 35.0438 71.1421 35.5324 70.9853ZM7.13229 74.6568C7.88373 74.479 8.65371 74.3588 9.40514 74.181C13.8895 73.2483 18.3128 72.3352 22.7971 71.4025C23.3042 71.3031 23.7688 71.2808 24.2758 71.1814C24.27 71.373 24.3066 71.4882 24.3434 71.6028C22.2424 72.4033 20.1965 73.3758 18.0403 74.0044C15.0471 74.9647 11.937 75.772 8.90693 76.6176C8.4183 76.7744 7.89284 76.8171 7.42849 76.8396C6.7625 76.8636 6.24847 76.5221 6.16818 75.8523C6.10638 75.2396 6.52144 74.8528 7.13229 74.6568ZM26.5352 48.1931C26.7795 48.1147 27.3305 48.5708 27.5019 48.8952C27.8448 49.5441 28.084 50.2897 28.4026 51.0728C28.63 52.2015 28.8577 53.3301 29.1462 54.4392C29.7783 56.8296 30.4527 59.1434 31.0848 61.5338C31.2997 62.4135 31.4529 63.3127 31.4051 64.2135C31.3756 65.1715 30.986 66.0553 29.8867 66.4082C28.7871 66.7609 28.0165 66.2493 27.374 65.5067C26.2665 64.1544 25.8126 62.5295 25.664 60.8063C25.3918 57.8577 25.1983 54.9463 25.1278 51.9963C25.0962 51.0579 25.3093 50.0412 25.5588 49.1392C25.65 48.7937 26.1687 48.3108 26.5352 48.1931Z"
				fill="white"
			>
				<animate attributeName="opacity" values="0.45;1;0.45" dur="2.2s" begin="0.7s" repeatCount="indefinite" />
			</path>
			{showExtra && (
				<path
					d="M97.9733 50.1845C99.6027 50.278 100.836 51.6383 100.953 53.6089C100.942 54.4804 100.817 55.4226 100.529 56.229C98.472 62.0578 96.4146 67.8872 94.1735 73.6725C93.2888 76.1836 92.1502 78.5378 91.125 80.8213C89.8804 80.3331 89.8211 79.3476 89.8327 78.4761C89.9646 76.2727 90.005 74.0472 90.5049 71.9309C91.3042 68.1365 92.3091 64.2937 93.2221 60.4291C93.7873 58.0367 94.3742 55.5518 94.8473 53.1377C95.3256 51.1137 96.3441 50.0911 97.9733 50.1845ZM111.858 47.3445C120.664 49.1336 129.428 51.1064 137.995 53.9076C138.179 53.9512 138.342 54.087 138.504 54.2225L138.373 54.7747C136.63 54.7514 134.751 54.8904 133.073 54.5912C126.02 53.605 119.059 52.64 112.049 51.4698C110.923 51.3009 109.699 50.7201 108.796 50.0209C107.547 49.1428 107.986 47.6931 109.426 47.3532C110.249 47.159 111.121 47.1706 111.858 47.3445ZM73.3313 29.8874C74.4138 30.2403 75.4749 30.686 76.5573 31.0388C82.9164 33.3183 89.1836 35.5755 95.5427 37.855C96.2571 38.1209 96.8578 38.4578 97.5722 38.7237C97.4152 38.9777 97.3714 39.1615 97.328 39.3454C94.064 38.7686 90.7345 38.4679 87.5357 37.6151C83.0271 36.5499 78.4913 35.187 74.0261 33.9379C73.2903 33.764 72.5978 33.4063 71.9974 33.0703C71.1425 32.5769 70.7639 31.7101 71.1869 30.7415C71.5882 29.8649 72.4113 29.6702 73.3313 29.8874ZM118.382 9.44259C118.75 9.52982 119.085 10.5801 119.047 11.1539C118.97 12.3015 118.687 13.4978 118.474 14.8077C117.877 16.5125 117.28 18.2178 116.775 19.9443C115.7 23.6732 114.739 27.3319 113.663 31.0608C113.245 32.4192 112.736 33.7563 111.971 34.9358C111.185 36.2072 110.004 37.0938 108.348 36.7028C106.692 36.3115 106.124 35.0117 105.898 33.501C105.565 30.7993 106.265 28.2443 107.426 25.7983C109.39 21.599 111.424 17.5133 113.641 13.4713C114.336 12.1781 115.398 10.9717 116.416 9.94945C116.801 9.55459 117.83 9.31216 118.382 9.44259Z"
					fill="white"
					transform="translate(136 2) scale(0.72) rotate(16 110 50)"
				>
					<animate attributeName="opacity" values="0.35;1;0.35" dur="2.2s" begin="1.05s" repeatCount="indefinite" />
				</path>
			)}
		</svg>
	);
}

export function HeroBanner({
	heroProperties,
	serviceVisuals,
	heroIndex,
	heroElapsed: _heroElapsed,
	heroProgress,
	serviceVisualIndex,
	priceMax,
	areaMax,
	onPrevHero,
	onNextHero,
	setPriceMax,
	setAreaMax,
}: HeroBannerProps) {
	const currentHero = heroProperties[heroIndex % heroProperties.length];
	const safeServiceVisualIndex = serviceVisualIndex % serviceVisuals.length;
	const heroProgressPct = Number.isFinite(heroProgress) ? heroProgress : 0;
	const safePriceMax = Math.min(Math.max(priceMax ?? 0, 0), 850000);
	const priceRangeLabel = `Price (${formatPHPWhole(0)}-${formatPHPWhole(safePriceMax)})`;

	return (
		<>
			<section className="relative overflow-hidden bg-black md:h-[520px]">
				<div
					className="absolute right-0 top-0 hidden h-full w-[70%] z-0 bg-cover bg-center transition-all duration-700 md:block"
					style={{ backgroundImage: `url('${currentHero.image}')` }}
				/>
				<div className="absolute inset-y-0 left-0 hidden w-[34%] bg-gradient-to-r from-black/85 via-black/45 to-transparent md:block" />
				<div className="absolute bottom-0 right-0 hidden h-[5px] w-[70%] overflow-hidden rounded bg-white/25 md:block">
					<div className="h-full bg-[#DE141C] transition-[width] duration-75 ease-linear" style={{ width: `${heroProgressPct}%` }} />
				</div>
				<div className="absolute bottom-8 left-[35%] z-20 hidden w-[36%] md:block">
					<div className="mb-0 relative inline-flex overflow-hidden">
						<button onClick={onPrevHero} className="grid h-9 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white">
							&lsaquo;
						</button>
								<button onClick={onNextHero} className="grid h-9 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C]">
									&rsaquo;
								</button>
					</div>
					<div className="bg-black/70 px-3.5 py-2.5 text-white">
						<h3 className="text-[28px] leading-tight font-bold">{currentHero.title}</h3>
						<div className="mt-1.5 flex items-center gap-3 text-[12px]">
							<p className="font-semibold">{currentHero.price}</p>
							<span className="rounded bg-[#DE141C] px-2 py-0.5 text-[10px] font-bold">{currentHero.status}</span>
							<p className="flex items-center gap-1 text-[11px] text-white/85">
								<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#DE141C]" fill="none" aria-hidden="true">
									<path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
									<circle cx="12" cy="10" r="2.2" fill="currentColor" />
								</svg>
								{currentHero.location}
							</p>
						</div>
						<div className="grid grid-cols-4 bg-white px-3 py-2 text-[#1F2328]">
							<div className="flex items-center gap-2 border-r border-black/10 pr-2">
								<svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
									<rect x="3" y="3" width="7" height="7" fill="currentColor" />
									<rect x="14" y="3" width="7" height="7" fill="currentColor" />
									<rect x="3" y="14" width="7" height="7" fill="currentColor" />
									<rect x="14" y="14" width="7" height="7" fill="currentColor" />
								</svg>
								<div>
									<p className="text-[11px] font-bold">{currentHero.area}</p>
									<p className="text-[10px] text-black/60">Area</p>
								</div>
							</div>
							<div className="flex items-center gap-2 border-r border-black/10 px-2">
								<svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
									<path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<div>
									<p className="text-[11px] font-bold">{currentHero.bedroom}</p>
									<p className="text-[10px] text-black/60">Bedroom</p>
								</div>
							</div>
							<div className="flex items-center gap-2 border-r border-black/10 px-2">
								<svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
									<path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<div>
									<p className="text-[11px] font-bold">{currentHero.bathroom}</p>
									<p className="text-[10px] text-black/60">Bathroom</p>
								</div>
							</div>
							<div className="flex items-center gap-2 pl-2">
								<svg viewBox="0 0 24 24" className="h-5 w-5 text-[#DE141C]" fill="none" aria-hidden="true">
									<path d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								<div>
									<p className="text-[11px] font-bold">{currentHero.garage}</p>
									<p className="text-[10px] text-black/60">Garage</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="absolute left-10 top-12 hidden h-28 w-[3px] bg-[#DE141C] md:block" />
				<div className="absolute left-14 top-11 hidden items-start gap-4 md:flex">
					<div>
						<p className="font-bold text-[#7F7F7F]">DISCOVER YOUR</p>
						<h1 className="text-5xl font-bold leading-[0.92] text-white">
							DREAM<br />PROPERTY
						</h1>
					</div>
					<SparkleSvg className="mt-1 h-auto w-[120px] shrink-0" />
				</div>

				<div className="absolute left-0 right-0 top-52 hidden md:block">
					<div className="mx-auto w-full max-w-[1020px] rounded-[24px] border border-black/5 bg-white/95 p-3.5 shadow-[0_-14px_28px_rgba(0,0,0,0.08),0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm">
						<div className="grid grid-cols-12 items-center gap-0">
							{/* Search keywords */}
							<div className="col-span-3 px-4 py-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Search</p>
								<input placeholder="Enter Keywords" className="mt-1 h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-black placeholder:text-black/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]" type="search" />
							</div>
							<div className="col-span-2 border-l border-black/10 px-4 py-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Looking For</p>
								<div className="relative mt-1">
									<select defaultValue="" className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-7 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
										<option value="">Type</option>
										<option value="House">House</option>
										<option value="Apartment">Apartment</option>
										<option value="Condo">Condo</option>
										<option value="Townhouse">Townhouse</option>
										<option value="Lot">Lot</option>
										<option value="Commercial">Commercial</option>
									</select>
									<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
										<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							</div>

							{/* Location */}
							<div className="col-span-2 border-l border-black/10 px-4 py-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Location</p>
								<div className="relative mt-1">
									<select defaultValue="" className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-7 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
										<option value="">Location</option>
										<option value="Batangas">Batangas</option>
										<option value="Cavite">Cavite</option>
										<option value="Laguna">Laguna</option>
										<option value="Metro Manila">Metro Manila</option>
										<option value="Tagaytay">Tagaytay</option>
										<option value="Nuvali">Nuvali</option>
									</select>
									<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
										<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							</div>

							{/* Sub-Location */}
							<div className="col-span-1 border-l border-black/10 px-4 py-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Sub-Location</p>
								<div className="relative mt-1">
									<select defaultValue="" className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-7 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
										<option value="">Sub-Location</option>
										<option value="Lipa">Lipa</option>
										<option value="Nuvali">Nuvali</option>
										<option value="Tagaytay">Tagaytay</option>
										<option value="Alabang">Alabang</option>
									</select>
									<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
										<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							</div>

							{/* Price */}
							<div className="col-span-2 border-l border-black/10 px-4 py-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Price</p>
								<div className="mt-1 grid grid-cols-2 gap-2">
									<input placeholder="Min" inputMode="numeric" className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-black placeholder:text-black/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]" />
									<input placeholder="Max" inputMode="numeric" className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-xs text-black placeholder:text-black/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]" />
								</div>
							</div>

							{/* Status */}
							<div className="col-span-1 border-l border-black/10 px-4 py-2.5">
								<p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Status</p>
								<div className="relative mt-1">
									<select defaultValue="" className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-7 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
										<option value="">Status</option>
										<option value="for-sale">For Sale</option>
										<option value="pre-selling">Pre-Selling</option>
										<option value="ready">Ready for Occupancy</option>
									</select>
									<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
										<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							</div>

							{/* Search button */}
							<div className="col-span-1 flex items-center justify-center px-3 py-2.5">
								<button type="submit" className="search-btn inline-flex h-9 w-full items-center justify-center gap-2 rounded-[16px] bg-[#DE141C] text-xs font-semibold text-white shadow-[0_10px_22px_rgba(222,20,28,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(222,20,28,0.34)]">
									<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
										<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8"></circle>
										<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"></path>
									</svg>
									Search
								</button>
							</div>
						</div>
					</div>
				</div>

				<div className="md:hidden">
					<div className="px-4 pb-6 pt-8">
						<div className="flex items-stretch gap-2">
							<span className="w-[3px] bg-[#DE141C]" />
							<div className="relative">
								<div>
									<p className="text-[10px] font-bold leading-none tracking-[0.08em] text-[#5F5F63]">DISCOVER YOUR</p>
									<h1 className="mt-1 text-[40px] font-bold leading-[0.95] text-white">
										DREAM
										<br />PROPERTY
									</h1>
								</div>
								<SparkleSvg showExtra className="pointer-events-none absolute -right-[145px] top-1 h-auto w-[132px]" />
							</div>
						</div>
					</div>

					<div className="relative h-[300px] w-full overflow-hidden">
						{heroProperties.map((hero, idx) => (
							<div
								key={`mobile-hero-${hero.title}`}
								className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out ${
									idx === heroIndex ? "scale-100 opacity-100" : "scale-105 opacity-0"
								}`}
								style={{ backgroundImage: `url('${hero.image}')` }}
							/>
						))}
						<div className="absolute bottom-4 left-4 right-4 z-20">
							<div className="relative inline-flex overflow-hidden">
								<button onClick={onPrevHero} className="grid h-10 w-10 place-items-center bg-[#DE141C] text-2xl leading-none text-white">
									&lsaquo;
								</button>
								<button onClick={onNextHero} className="grid h-10 w-10 place-items-center bg-white text-2xl leading-none text-[#DE141C]">
									&rsaquo;
								</button>
							</div>
							<div className="bg-black/75 px-3 py-2 text-white">
								<h3 className="text-[24px] font-bold leading-[0.95]">{currentHero.title}</h3>
								<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
									<p className="font-semibold">{currentHero.price}</p>
									<span className="rounded bg-[#DE141C] px-2 py-0.5 text-[10px] font-bold">{currentHero.status}</span>
									<p className="flex items-center gap-1 text-white/85">
										<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#DE141C]" fill="none" aria-hidden="true">
											<path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
											<circle cx="12" cy="10" r="2.2" fill="currentColor" />
										</svg>
										{currentHero.location}
									</p>
								</div>
							</div>
							<div className="grid grid-cols-4 bg-white px-2 py-2 text-[#1F2328]">
								<div className="flex items-center gap-1 border-r border-black/10 pr-2">
									<svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
										<rect x="3" y="3" width="7" height="7" fill="currentColor" />
										<rect x="14" y="3" width="7" height="7" fill="currentColor" />
										<rect x="3" y="14" width="7" height="7" fill="currentColor" />
										<rect x="14" y="14" width="7" height="7" fill="currentColor" />
									</svg>
									<div>
										<p className="text-[9px] font-bold">{currentHero.area}</p>
										<p className="text-[9px] text-black/60">Area</p>
									</div>
								</div>
								<div className="flex items-center gap-1 border-r border-black/10 px-2">
									<svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
										<path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									<div>
										<p className="text-[9px] font-bold">{currentHero.bedroom}</p>
										<p className="text-[9px] text-black/60">Bedroom</p>
									</div>
								</div>
								<div className="flex items-center gap-1 border-r border-black/10 px-2">
									<svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
										<path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									<div>
										<p className="text-[9px] font-bold">{currentHero.bathroom}</p>
										<p className="text-[9px] text-black/60">Bathroom</p>
									</div>
								</div>
								<div className="flex items-center gap-1 pl-2">
									<svg viewBox="0 0 24 24" className="h-4 w-4 text-[#DE141C]" fill="none" aria-hidden="true">
										<path d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
									<div>
										<p className="text-[9px] font-bold">{currentHero.garage}</p>
										<p className="text-[9px] text-black/60">Garage</p>
									</div>
								</div>
							</div>
						</div>
						<div className="absolute bottom-0 left-0 right-0 h-[5px] overflow-hidden rounded bg-white/25">
							<div className="h-full bg-[#DE141C] transition-[width] duration-75 ease-linear" style={{ width: `${heroProgressPct}%` }} />
						</div>
					</div>

					<div className="overflow-hidden rounded-[28px] border border-black/5 bg-white/95 px-3.5 py-3 shadow-[0_-14px_28px_rgba(0,0,0,0.08),0_18px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm">
						<div className="grid grid-cols-2 gap-2">
							<div className="relative">
								<select className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-6 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
									<option value="">Location</option>
									<option value="batangas">Batangas</option>
									<option value="cavite">Cavite</option>
									<option value="laguna">Laguna</option>
								</select>
								<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
							<div className="relative">
								<select className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-6 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
									<option value="">Sub-Location</option>
									<option value="lipa">Lipa</option>
									<option value="nuvali">Nuvali</option>
									<option value="tagaytay">Tagaytay</option>
								</select>
								<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>

							<div className="relative">
								<select className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-6 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
									<option value="">No. of Bathrooms</option>
									<option value="1">1</option>
									<option value="2">2</option>
									<option value="3">3</option>
									<option value="4">4+</option>
								</select>
								<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>

							<div className="relative">
								<select className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-6 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
									<option value="">Status</option>
									<option value="for-sale">For Sale</option>
									<option value="pre-selling">Pre-Selling</option>
									<option value="ready">Ready for Occupancy</option>
								</select>
								<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>

							<div className="relative">
								<select className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-6 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
									<option value="">No. of Guest</option>
									<option value="1-2">1-2</option>
									<option value="3-4">3-4</option>
									<option value="5-6">5-6</option>
									<option value="7+">7+</option>
								</select>
								<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>

							<div className="relative">
								<select className="h-9 w-full appearance-none rounded-xl border border-black/10 bg-white px-3 pr-6 text-xs text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[#DE141C] focus:shadow-[0_0_0_3px_rgba(222,20,28,0.12)]">
									<option value="">No. of Bedrooms</option>
									<option value="1">1</option>
									<option value="2">2</option>
									<option value="3">3</option>
									<option value="4">4+</option>
								</select>
								<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2 pt-2">
							<div>
								<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">{priceRangeLabel}</p>
								<input className="h-1.5 w-full accent-[#DE141C]" type="range" min="0" max="850000" step="10000" value={safePriceMax} onChange={(e) => setPriceMax(Math.min(Number(e.target.value) || 0, 850000))} />
							</div>
							<div>
								<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55">Area (120-{areaMax})</p>
								<input className="h-1.5 w-full accent-[#DE141C]" type="range" min="120" max="500" step="1" value={areaMax ?? 120} onChange={(e) => setAreaMax(Number(e.target.value) || 120)} />
							</div>
						</div>
						<button className="mt-2 h-9 w-full rounded-[16px] bg-[#DE141C] text-xs font-semibold text-white shadow-[0_10px_22px_rgba(222,20,28,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(222,20,28,0.34)]">Search Property</button>
					</div>
				</div>
			</section>

			<section className="grid gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-28">
				<div className="md:hidden">
					<h2 className="mb-2 text-2xl font-semibold">
						Welcome to <span className="text-[#DE141C]">Jewellz Realty</span>
					</h2>
					<p className="text-sm leading-7">
						We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
					</p>
				</div>
				<div className="relative">
					<div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
						{serviceVisuals.map((visual, idx) => (
							<div
								key={visual.title}
								className={`absolute inset-0 transition-opacity duration-700 ${idx === safeServiceVisualIndex ? "opacity-100" : "opacity-0"}`}
							>
								<Image
									src={visual.image}
									alt={visual.title}
									fill
									sizes="(min-width: 1024px) 50vw, 100vw"
									priority={idx === safeServiceVisualIndex}
									className={`object-cover transition-transform duration-[1400ms] ${idx === safeServiceVisualIndex ? "scale-100" : "scale-105"}`}
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
							</div>
						))}
					</div>
					<div className="pointer-events-none absolute bottom-4 left-4 right-24 text-white">
						<p className="text-lg font-semibold">{serviceVisuals[safeServiceVisualIndex].title}</p>
						<p className="mt-1 text-sm text-white/85">{serviceVisuals[safeServiceVisualIndex].subtitle}</p>
					</div>
				</div>
				<div>
					<h2 className="mb-3 hidden text-3xl font-semibold md:block">
						Welcome to <span className="text-[#DE141C]">Jewellz Realty</span>
					</h2>
					<p className="mb-6 hidden text-sm leading-7 md:block">
						We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
					</p>

					<div className="mb-5 flex items-start gap-4">
						<div
							className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
								safeServiceVisualIndex === 0
									? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
									: "border-black bg-black"
							}`}
						>
							<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
								<path d="M4 7.5h16M4 12h10M4 16.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
								<path d="M16.5 14.5l1.4 1.4 2.6-2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</div>
						<div>
							<h3 className="font-semibold">Property Listings &amp; Selling Assistance</h3>
							<p className="text-sm leading-6">Browse houses, lots, condos, and farmland properties while getting guided support from licensed brokers throughout the buying or selling process.</p>
						</div>
					</div>

					<div className="mb-5 flex items-start gap-4">
						<div
							className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
								safeServiceVisualIndex === 1
									? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
									: "border-black bg-black"
							}`}
						>
							<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
								<path d="M4 12a8 8 0 1114.2 5l1.8 3-3.6-.7A8 8 0 014 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								<path d="M8.5 12h7M8.5 9.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
							</svg>
						</div>
						<div>
							<p className="text-[11px] font-bold leading-none tracking-[0.18em] text-[#7F7F7F] md:text-[13px]">INVEST &amp; GROW</p>
							<h3 className="font-semibold">CONSULTATION<br />&amp; GROWTH</h3>
							<p className="text-sm leading-6">Provides personalized property recommendations, market guidance, and investment assistance tailored to each client&apos;s needs and budget.</p>
						</div>
					</div>

					<div className="mb-5 flex items-start gap-4">
						<div
							className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
								safeServiceVisualIndex === 2
									? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
									: "border-black bg-black"
							}`}
						>
							<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
								<path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
								<circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
							</svg>
						</div>
						<div>
							<h3 className="font-semibold">Property Viewing &amp; Tripping Services</h3>
							<p className="text-sm leading-6">Jewellz Realty assists clients with scheduled site visits and property tours to help buyers explore different project locations before making a decision.</p>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}

