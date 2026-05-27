"use client";

import React from "react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import type { Property } from "@/types/property";

type HotPick = {
	title: string;
	location: string;
	beds: number;
	baths: number;
	area: number;
	price: string;
	imageId: string;
};

type HotPicksProps = {
	hotPicks: HotPick[];
	hotPicksPage: number;
	hotPicksLoading: boolean;
	d: string;
	h: string;
	m: string;
	s: string;
	changeHotPicksPage: (direction: "prev" | "next") => void;
	/** default: 6 */
	hotPicksPerPage?: number;
};

export function HotPicks({
	hotPicks,
	hotPicksPage,
	hotPicksLoading,
	d,
	h,
	m,
	s,
	changeHotPicksPage,
	hotPicksPerPage = 6,
}: HotPicksProps) {
	const hotPicksSkeletonCount = hotPicksPerPage;
	const visibleHotPicks = hotPicks.slice(
		hotPicksPage * hotPicksPerPage,
		hotPicksPage * hotPicksPerPage + hotPicksPerPage
	);

	return (
		<section className="px-6 py-14 lg:px-24">
			<div className="mb-8 flex flex-wrap items-center justify-between gap-6">
				<div className="flex flex-wrap items-center gap-3 sm:gap-10">
					<div>
						<p className="text-xs font-bold tracking-wide text-gray-500">TODAY&apos;S</p>
						<h2 className="text-3xl font-bold leading-none sm:text-4xl">HOT PICKS</h2>
						<div className="mt-2 h-[3px] w-16 bg-[#DE141C]" />
					</div>
					<div className="flex items-end gap-5">
						<div>
							<p className="text-[10px] font-semibold uppercase text-black/70">Days</p>
							<p className="text-3xl font-bold leading-none">{d}</p>
						</div>
						<span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
						<div>
							<p className="text-[10px] font-semibold uppercase text-black/70">Hours</p>
							<p className="text-3xl font-bold leading-none">{h}</p>
						</div>
						<span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
						<div>
							<p className="text-[10px] font-semibold uppercase text-black/70">Minutes</p>
							<p className="text-3xl font-bold leading-none">{m}</p>
						</div>
						<span className="pb-1 text-xl font-bold text-[#DE141C]">:</span>
						<div>
							<p className="text-[10px] font-semibold uppercase text-black/70">Seconds</p>
							<p className="text-3xl font-bold leading-none">{s}</p>
						</div>
					</div>
				</div>
				<div className="ml-auto flex items-center justify-end">
					<button
						onClick={() => changeHotPicksPage("prev")}
						disabled={hotPicksLoading}
						className="grid h-9 w-8 place-items-center border border-black/10 bg-white text-lg leading-none text-black transition-colors hover:bg-black hover:text-white"
					>
						‹
					</button>
					<button
						onClick={() => changeHotPicksPage("next")}
						disabled={hotPicksLoading}
						className="grid h-9 w-8 place-items-center bg-[#DE141C] text-lg leading-none text-white"
					>
						›
					</button>
					<button className="h-9 bg-black px-5 text-xs font-semibold text-white">
						View All
					</button>
				</div>
			</div>

			<div
				className={`grid grid-cols-2 gap-3 transition-opacity duration-300 sm:gap-5 md:grid-cols-3 ${
					hotPicksLoading ? "opacity-80" : "opacity-100"
				}`}
			>
				{hotPicksLoading
					? Array.from({ length: hotPicksSkeletonCount }).map((_, idx) => (
							<article
								key={`hotpick-skeleton-${idx}`}
								className="overflow-hidden bg-white shadow-sm"
							>
								<div className="h-32 animate-pulse bg-[#E7E7E7] sm:h-44" />
								<div className="flex h-[118px] flex-col bg-[#F4F4F4] p-2.5 sm:h-[158px] sm:p-3.5">
									<div className="h-4 w-[88%] animate-pulse rounded bg-[#DFDFDF] sm:h-5" />
									<div className="mt-1 h-4 w-[62%] animate-pulse rounded bg-[#E5E5E5]" />
									<div className="mt-auto flex items-end justify-between gap-2 pt-1.5 sm:gap-4 sm:pt-3">
										<div className="h-4 w-20 animate-pulse rounded bg-[#DCDCDC] sm:w-28" />
										<div className="h-6 w-12 animate-pulse rounded bg-[#CFCFCF] sm:h-9 sm:w-20" />
									</div>
								</div>
							</article>
						))
					: visibleHotPicks.map((pick) => {
							const priceNumber = Number(String(pick.price).replace(/[^0-9.]/g, "")) || 0;
							const property: Property = {
								id: pick.title,
								slug: pick.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
								title: pick.title,
								price: priceNumber,
								location: pick.location,
								beds: pick.beds,
								baths: pick.baths,
								areaSqm: pick.area,
								image: `https://images.unsplash.com/photo-${pick.imageId}?w=1200&q=80`,
							};

							return <PropertyCard key={pick.title} property={property} priceLabel={pick.price} />;
						})}
			</div>
		</section>
	);
}

