"use client";

import Link from "next/link";
import Image from "next/image";
import type { Property } from "@/types/property";
import { formatPHPWhole } from "@/lib/currency";
import { PropertyDetailSkeleton } from "@/components/properties/PropertyDetailSkeleton";
import { useState } from "react";

type PropertyCardProps = {
	property: Property;
	priceLabel?: string;
	href?: string;
	aiReason?: string;
	aiConfidence?: number;
};

export function PropertyCard({ property, priceLabel, href, aiReason, aiConfidence }: PropertyCardProps) {
	const [showPendingDetail, setShowPendingDetail] = useState(false);
	const defaultSpecs = [
		{ label: "Beds", value: String(property.beds ?? 0) },
		{ label: "Baths", value: String(property.baths ?? 0) },
		{ label: "Area", value: `${property.areaSqm ?? 0} sqm` },
	];
	const specs = property.specs?.length ? property.specs.slice(0, 3) : defaultSpecs;
	const displayPrice = priceLabel ?? formatPHPWhole(property.price);
	const imageSrc =
		property.image?.trim() ||
		"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80";

	function renderSpecIcon(label: string) {
		const normalizedLabel = label.toLowerCase();

		if (normalizedLabel.includes("bed")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<path d="M3 18v-7h18v7M3 14h18M6 11V7h6v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		}

		if (normalizedLabel.includes("bath")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<path d="M4 13h16v1a5 5 0 01-5 5H9a5 5 0 01-5-5v-1zM7 13V8a2 2 0 114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		}

		if (normalizedLabel.includes("front") || normalizedLabel.includes("area") || normalizedLabel.includes("lot") || normalizedLabel.includes("land") || normalizedLabel.includes("size")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
					<path d="M8 8h8M8 12h5M8 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				</svg>
			);
		}

		if (normalizedLabel.includes("water")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<path d="M12 3s4 4.4 4 8.5A4 4 0 118 11.5C8 7.4 12 3 12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		}

		if (normalizedLabel.includes("crop") || normalizedLabel.includes("farm")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<path d="M12 20V9M12 9c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4zM12 9c0-2.2-1.8-4-4-4 0 2.2 1.8 4 4 4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		}

		if (normalizedLabel.includes("section")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<path d="M12 21s6-4.5 6-10a6 6 0 10-12 0c0 5.5 6 10 6 10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					<circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
				</svg>
			);
		}

		if (normalizedLabel.includes("avail")) {
			return (
				<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
					<path d="M5 12.5l4 4L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			);
		}

		return (
			<svg viewBox="0 0 24 24" className="h-4 w-4 text-black/75" fill="none" aria-hidden="true">
				<rect x="3.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
				<rect x="13.5" y="3.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
				<rect x="3.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
				<rect x="13.5" y="13.5" width="7" height="7" stroke="currentColor" strokeWidth="1.6" />
			</svg>
		);
	}

	const card = (
		<article className="group overflow-hidden bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
			<div className="relative h-44 overflow-hidden bg-[#E7E7E7]">
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
				{/* AI confidence badge */}
				{typeof aiConfidence === "number" && (
					<span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-sm bg-black/80 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
						<svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-[#DE141C]" fill="currentColor" aria-hidden="true">
							<polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5" />
						</svg>
						{aiConfidence}% match
					</span>
				)}
			</div>

			<div className="flex flex-col bg-[#F4F4F4] p-3.5">
				<h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-[#181A20] transition-colors duration-300 group-hover:text-[#DE141C]">
					{property.title}
				</h3>
				<p className="mt-1 text-[12px] text-gray-500">{property.location ?? ""}</p>

				<div className="mt-3 flex items-center justify-between gap-2 border-t border-black/8 pt-3">
					<div className="flex items-center gap-3">
						{specs.map((spec) => (
							<span
								key={`${spec.label}-${spec.value}`}
								className="inline-flex items-center gap-1 whitespace-nowrap"
								title={spec.label}
							>
								{renderSpecIcon(spec.label)}
								<span className="text-[11px] font-semibold text-[#1F2328]">{spec.value}</span>
							</span>
						))}
					</div>
					<p className="shrink-0 inline-flex h-8 items-center bg-[#11141C] px-3 text-[11px] font-semibold text-white">
						{displayPrice}
					</p>
				</div>

				{/* AI reason tag */}
				{aiReason && (
					<p className="mt-2.5 flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-[10px] leading-4 text-[#DE141C]">
						<svg viewBox="0 0 12 12" className="mt-px h-2.5 w-2.5 shrink-0" fill="currentColor" aria-hidden="true">
							<polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5" />
						</svg>
						<span className="font-medium">{aiReason}</span>
					</p>
				)}
			</div>
		</article>
	);

	if (href) {
		return (
			<Link
				href={href}
				className="block"
				onClick={(event) => {
					if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
						return;
					}

					setShowPendingDetail(true);
				}}
			>
				{card}
				{showPendingDetail ? (
					<div className="skeleton-delayed fixed inset-0 z-[9999] overflow-y-auto bg-white" aria-live="polite" aria-busy="true">
						<PropertyDetailSkeleton />
					</div>
				) : null}
			</Link>
		);
	}

	return card;
}
