"use client";

import Image from "next/image";
import type { Property } from "@/types/property";
import { formatPHPWhole } from "@/lib/currency";

type PropertyCardProps = {
	property: Property;
	priceLabel?: string;
};

export function PropertyCard({ property, priceLabel }: PropertyCardProps) {
	const beds = property.beds ?? 0;
	const baths = property.baths ?? 0;
	const area = property.areaSqm ?? 0;
	const displayPrice = priceLabel ?? formatPHPWhole(property.price);
	const imageSrc =
		property.image ??
		"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80";

	return (
		<article className="group overflow-hidden bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
			<div className="relative h-32 overflow-hidden bg-[#E7E7E7] sm:h-44">
				<Image
					src={imageSrc}
					alt={property.title}
					fill
					sizes="(min-width: 768px) 33vw, 50vw"
					loading="eager"
					className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
				/>
				{property.featured && (
					<span className="absolute left-3 top-3 inline-flex items-center rounded-sm bg-[#DE141C] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white">
						FEATURED
					</span>
				)}
			</div>

			<div className="flex h-[118px] flex-col bg-[#F4F4F4] p-2.5 sm:h-[158px] sm:p-3.5">
				<h3 className="line-clamp-2 min-h-[34px] text-[14px] font-semibold leading-tight text-[#181A20] transition-colors duration-300 group-hover:text-[#DE141C] sm:min-h-[44px] sm:text-[18px]">
					{property.title}
				</h3>
				<p className="mt-1 text-[11px] text-gray-500 sm:text-[13px]">{property.location ?? ""}</p>

				<div className="mt-auto flex items-end justify-between gap-2 pt-1.5 sm:gap-4 sm:pt-3">
					<div className="flex items-center gap-1.5 text-[11px] text-[#1F2328] sm:gap-3 sm:text-[13px]">
						<span className="flex items-center gap-1.5">
							<svg viewBox="0 0 24 24" className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" fill="none" aria-hidden="true">
								<path
									d="M3 18v-7h18v7M3 14h18M6 11V7h6v4"
									stroke="currentColor"
									strokeWidth="1.6"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							{beds}
						</span>
						<span className="flex items-center gap-1.5">
							<svg viewBox="0 0 24 24" className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" fill="none" aria-hidden="true">
								<path
									d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0"
									stroke="currentColor"
									strokeWidth="1.6"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							{baths}
						</span>
						<span className="flex items-center gap-1.5">
							<svg viewBox="0 0 24 24" className="h-3 w-3 text-black/75 sm:h-3.5 sm:w-3.5" fill="none" aria-hidden="true">
								<rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
								<rect x="13.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
								<rect x="3.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
								<rect x="13.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
							</svg>
							{area}
						</span>
					</div>
					<p className="ml-1 inline-flex h-6 shrink-0 items-center bg-[#11141C] px-2 text-[10px] font-semibold text-white sm:ml-3 sm:h-9 sm:px-4 sm:text-[15px]">
						{displayPrice}
					</p>
				</div>
			</div>
		</article>
	);
}