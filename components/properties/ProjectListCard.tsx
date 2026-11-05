"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/types/property";
import { SafeImage } from "@/components/ui/SafeImage";
import { formatPHPWhole } from "@/lib/currency";
import { PropertyDetailSkeleton } from "@/components/properties/PropertyDetailSkeleton";
import { getPropertyPlaceholderImage } from "@/lib/property-placeholder-image";

type ProjectListCardProps = {
	property: Property;
	priceLabel?: string;
	href?: string;
	aiReason?: string;
	aiConfidence?: number;
};

function getSpecs(property: Property) {
	const specs = property.specs?.length
		? property.specs
		: [
				{ label: "Beds", value: String(property.beds ?? "") },
				{ label: "Baths", value: String(property.baths ?? "") },
				{ label: "Area", value: property.areaSqm ? `${property.areaSqm} sqm` : "" },
			];

	return specs
		.filter((spec) => spec.value.trim() && !["0", "0 sqm"].includes(spec.value.trim().toLowerCase()))
		.slice(0, 3);
}

export function ProjectListCard({ property, priceLabel, href, aiReason, aiConfidence }: ProjectListCardProps) {
	const [showPendingDetail, setShowPendingDetail] = useState(false);
	const [shouldLoadImage, setShouldLoadImage] = useState(false);
	const imageContainerRef = useRef<HTMLDivElement>(null);
	const specs = getSpecs(property);

	useEffect(() => {
		if (shouldLoadImage) return;
		const container = imageContainerRef.current;
		if (!container) return;
		if (typeof window.IntersectionObserver !== "function") {
			const timer = window.setTimeout(() => setShouldLoadImage(true), 0);
			return () => window.clearTimeout(timer);
		}

		const observer = new IntersectionObserver(([entry]) => {
			if (!entry.isIntersecting) return;
			setShouldLoadImage(true);
			observer.disconnect();
		}, { rootMargin: "350px 0px" });
		observer.observe(container);
		return () => observer.disconnect();
	}, [shouldLoadImage]);

	const card = (
		<article className="group overflow-hidden bg-white transition-shadow duration-300 hover:shadow-[0_12px_32px_-20px_rgba(0,0,0,0.35)]">
			<div ref={imageContainerRef} className="relative aspect-[4/3] overflow-hidden bg-[#F2F0ED]">
				{shouldLoadImage ? (
					<SafeImage
						src={property.image?.trim() || getPropertyPlaceholderImage(property.type)}
						fallbackSrc={getPropertyPlaceholderImage(property.type)}
						alt={property.title}
						fill
						loading="eager"
						sizes="(min-width: 1280px) 370px, (min-width: 1024px) 30vw, (min-width: 640px) 44vw, 44vw"
						className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
					/>
				) : null}
				{property.featured || typeof aiConfidence === "number" ? (
					<div className="absolute left-3 top-3 flex gap-2">
						{property.featured ? <span className="bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#222]">Featured</span> : null}
						{typeof aiConfidence === "number" ? <span className="bg-white/95 px-2.5 py-1.5 text-[9px] font-semibold text-[#222]">{aiConfidence}% match</span> : null}
					</div>
				) : null}
			</div>

			<div className="border-b border-[#EAE7E3] px-1 pb-3 pt-3.5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h3 className="line-clamp-1 text-[14px] font-semibold leading-snug text-[#1C1B19] transition-colors group-hover:text-[#B8101A] sm:text-[16px]">{property.title}</h3>
						<p className="mt-1 truncate text-[11px] text-black/50">{[property.location, property.type].filter(Boolean).join(" · ")}</p>
					</div>
					<span className="shrink-0 pt-0.5 text-[12px] text-[#DE141C]" aria-hidden="true">↗</span>
				</div>

				{specs.length ? (
					<div className="mt-3 flex gap-3 text-[10px] text-black/55 sm:text-[11px]">
						{specs.map((spec) => <span key={`${spec.label}-${spec.value}`} className="whitespace-nowrap">{spec.value} <span className="text-black/35">{spec.label}</span></span>)}
					</div>
				) : null}

				<p className="mt-3 text-[16px] font-semibold tracking-[-0.03em] text-[#DE141C] sm:text-[18px]">{priceLabel ?? formatPHPWhole(property.price)}</p>
				{aiReason ? <p className="mt-2 line-clamp-1 text-[10px] text-black/45">{aiReason}</p> : null}
			</div>
		</article>
	);

	if (!href) return card;

	return (
		<Link
			href={href}
			className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DE141C]"
			onClick={(event) => {
				if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
				setShowPendingDetail(true);
			}}
		>
			{card}
			{showPendingDetail ? <div className="skeleton-delayed fixed inset-0 z-[9999] overflow-y-auto bg-white" aria-live="polite" aria-busy="true"><PropertyDetailSkeleton /></div> : null}
		</Link>
	);
}
