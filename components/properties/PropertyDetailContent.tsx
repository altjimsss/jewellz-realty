"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PropertyCard } from "@/components/properties/PropertyCard";
import { PropertyChatAssistant } from "@/components/properties/PropertyChatAssistant";
import { PropertyGallery } from "@/components/properties/PropertyGallery";
import { PropertyLocationMap } from "@/components/properties/PropertyLocationMap";
import { PropertyAnalyticsTracker } from "@/components/properties/PropertyAnalyticsTracker";
import { InquireCard } from "@/components/properties/InquireCard";
import { ParamIcon } from "@/components/properties/ParamIcon";
import { formatPHPWhole } from "@/lib/currency";
import { getPropertyPlaceholderImage } from "@/lib/property-placeholder-image";
import { useAnalytics } from "@/hooks/useAnalytics";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";
import type { Property } from "@/types/property";

type PropertyDetailContentProps = {
	property: Property;
	galleryImages: string[];
	nearbyGroups: NearbyPlaceGroup[];
	relatedProperties: Property[];
	backHref?: string;
	developerName?: string;
	previewMode?: boolean;
};

function getComputedDescription(property: Property) {
	if (property.description) return property.description;
	if (property.type === "Farm") return "Contact Jewellz Realty for verified information about this farm property, including land details, access, and availability.";

	if (property.type === "Lot") {
		return "A spacious lot in a prime location, ideal for residential or investment use. Flexible for custom builds with good access to roads, utilities, and nearby community essentials.";
	}

	if (property.type === "House") {
		return "Charleston Place by APEC Homes provides affordable, quality housing for Filipino families. Located near essential services, schools, and transport hubs — perfect for first-time homeowners.";
	}

	if (property.type === "Condo") {
		return "A modern condo with a clean, functional layout and convenient access to nearby amenities. Designed for urban living — ideal for young professionals and small families seeking comfort.";
	}

	return "A well-presented property suited for buyers looking for value, space, and a great location. Offers a balance of comfort and practicality for everyday family living.";
}

function getParameterItems(property: Property) {
	if (property.type === "Farm") {
		const farmArea = property.lotAreaSqm ?? property.areaSqm;
		const farmSpecs = property.specs ?? [];
		return [
			{ label: "Lot Area", value: farmArea ? `${farmArea.toLocaleString()} sqm` : farmSpecs.find((spec) => /lot area|area|sqm/i.test(spec.label))?.value ?? "Ask for details", icon: "grid" },
			...[
				{ label: "Road Access", pattern: /road access/i },
				{ label: "Water Source", pattern: /water source/i },
				{ label: "Terrain", pattern: /terrain/i },
				{ label: "Current Use", pattern: /current use/i },
			].map(({ label, pattern }) => ({
				label,
				value: farmSpecs.find((spec) => pattern.test(spec.label))?.value ?? "Ask for details",
				icon: "area",
			})),
		];
	}
	const floorArea = property.specs?.find((spec) => /floor area/i.test(spec.label))?.value
		?? (property.type !== "Lot" && property.areaSqm ? `+/- ${property.areaSqm} sqm` : "N/A");
	const lotArea = property.lotAreaSqm != null
		? `${property.lotAreaSqm} sqm`
		: property.specs?.find((spec) => /lot area/i.test(spec.label))?.value
		?? (property.type === "Lot" && property.areaSqm ? `${property.areaSqm} sqm` : "N/A");

	return [
		{ label: "Floor Area", value: floorArea, icon: "area" },
		{ label: "Lot Area", value: lotArea, icon: "grid" },
		{ label: "Levels", value: property.specs?.find((spec) => /level/i.test(spec.label))?.value ?? "2", icon: "levels" },
		{ label: "Bedroom", value: String(property.beds ?? 0), icon: "bed" },
		{ label: "Bathroom", value: String(property.baths ?? 0), icon: "bath" },
		{ label: "Garage", value: property.specs?.find((spec) => /garage/i.test(spec.label))?.value ?? "0", icon: "garage" },
	];
}

function getYouTubeEmbedUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname.includes("youtu.be")) {
			const id = parsed.pathname.slice(1);
			return `https://www.youtube.com/embed/${id}`;
		}
		const v = parsed.searchParams.get("v");
		if (v) return `https://www.youtube.com/embed/${v}`;
		if (parsed.pathname.includes("/embed/")) return url;
	} catch {
		// return url
	}
	return url;
}

function getVimeoEmbedUrl(url: string): string {
	try {
		const match = url.match(/vimeo\.com\/(\d+)/);
		if (match?.[1]) {
			return `https://player.vimeo.com/video/${match[1]}`;
		}
	} catch {
		// return url
	}
	return url;
}

/** Phone-only: circular chat launcher pinned to the bottom-right, like typical site chat widgets. */
function PhonePropertyChat({ property, previewMode }: { property: Property; previewMode: boolean }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="lg:hidden">
			{open ? (
				<div className="fixed inset-x-4 bottom-24 z-[5600] sm:left-auto sm:right-5 sm:w-[380px]">
					<div className="overflow-hidden rounded-2xl shadow-2xl">
						<PropertyChatAssistant property={property} previewMode={previewMode} />
					</div>
				</div>
			) : null}

			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				aria-label={open ? "Close chat" : "Chat with Jewel, our AI guide"}
				className="fixed bottom-5 right-5 z-[5600] grid h-14 w-14 place-items-center rounded-full bg-[#DE141C] text-white shadow-[0_12px_30px_rgba(222,20,28,0.4)] transition-transform active:scale-95"
			>
				{open ? (
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
						<path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
					</svg>
				) : (
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
						<path d="M21 11.5a8.4 8.4 0 01-8.5 8.4c-1.16 0-2.27-.23-3.29-.66L4 21l1.77-4.26A8.3 8.3 0 013 11.5 8.4 8.4 0 0111.5 3 8.4 8.4 0 0121 11.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M8.5 10.5h7M8.5 13.5H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
					</svg>
				)}
			</button>
		</div>
	);
}

export function PropertyDetailContent({
	property,
	galleryImages,
	nearbyGroups,
	relatedProperties,
	backHref = "/project-list",
	developerName = "APECHOMES",
	previewMode = false,
}: PropertyDetailContentProps) {
	const recommendationsScrollRef = useRef<HTMLDivElement>(null);
	const [recommendationsScroll, setRecommendationsScroll] = useState({ thumb: 100, position: 0, overflow: false });
	const updateRecommendationsScroll = () => {
		const element = recommendationsScrollRef.current;
		if (!element) return;
		const maxScroll = element.scrollWidth - element.clientWidth;
		const thumb = maxScroll > 0 ? (element.clientWidth / element.scrollWidth) * 100 : 100;
		const position = maxScroll > 0 ? (element.scrollLeft / maxScroll) * (100 - thumb) : 0;
		setRecommendationsScroll({ thumb, position, overflow: maxScroll > 1 });
	};
	useEffect(() => {
		updateRecommendationsScroll();
		window.addEventListener("resize", updateRecommendationsScroll);
		return () => window.removeEventListener("resize", updateRecommendationsScroll);
	}, [relatedProperties.length]);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
		return () => window.cancelAnimationFrame(frame);
	}, [property.id]);

	const computedDescription = getComputedDescription(property);
	const propertyPlaceholderImage = getPropertyPlaceholderImage(property.type);
	const propertyGalleryImages = galleryImages.length ? galleryImages : [property.image || propertyPlaceholderImage];
	const parameterItems = getParameterItems(property);
	const { track } = useAnalytics();
	const trackPropertyInteraction = (event: string, metadata: Record<string, unknown> = {}) => {
		if (previewMode) return;
		track(event, { propertyId: property.id, ...metadata });
	};

	const videoSrc = property.videoUrl?.trim() ?? "";
	const isYouTube = videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be");
	const isVimeo = videoSrc.includes("vimeo.com");
	const [isVideoOpen, setIsVideoOpen] = useState(false);

	useEffect(() => {
		if (!isVideoOpen) return;
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsVideoOpen(false);
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isVideoOpen]);

	return (
		<section className="mx-auto max-w-[1200px] overflow-x-clip px-4 pb-24 pt-4 md:py-6">
			{previewMode ? null : <PropertyAnalyticsTracker propertyId={property.id} />}
			<div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
				<div className="contents lg:block">
				<div className="order-1 -mx-4 min-w-0 md:mx-0 lg:mb-6">
					<PropertyGallery images={propertyGalleryImages} title={property.title} fallbackImage={propertyPlaceholderImage} onInteraction={trackPropertyInteraction} />
				</div>

				<div className="order-3 min-w-0 space-y-6">
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex items-center gap-2 text-[#DE141C]">
							<svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" aria-hidden="true">
								<path d="M12 21s6-4.7 6-10a6 6 0 10-12 0c0 5.3 6 10 6 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								<circle cx="12" cy="11" r="2.3" stroke="currentColor" strokeWidth="1.8" />
							</svg>
							<h2 className="text-xl font-semibold text-black">Location</h2>
						</div>
						<span className="text-black/30" aria-hidden="true">•</span>
						<span className="text-sm text-black/70">{property.location ?? "Location not specified"}</span>
						<span className="text-black/30" aria-hidden="true">•</span>
						<PropertyLocationMap property={property} nearbyGroups={nearbyGroups} onInteraction={trackPropertyInteraction} />
					</div>

					<div className="mt-6">
						<div className="mb-4 flex items-center gap-2 text-[#DE141C]">
							<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
								<path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
								<path d="M12 7v10M8 9l4-2 4 2M8 15l4 2 4-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							<h2 className="text-xl font-semibold text-black">Recommendations</h2>
						</div>
						<div
							ref={recommendationsScrollRef}
							onScroll={updateRecommendationsScroll}
							className="recommendation-scrollbar -mx-1 overflow-x-auto py-2"
						>
							<div className="flex gap-3 px-1">
								{relatedProperties.map((relatedProperty) => (
									<div key={relatedProperty.id} className="w-[300px] shrink-0">
										<PropertyCard property={relatedProperty} href={previewMode ? undefined : `/project-list/${relatedProperty.slug}`} />
									</div>
								))}
							</div>
						</div>
						{recommendationsScroll.overflow ? (
							<div className="mx-0.5 mt-1 h-1.5 overflow-hidden rounded-full bg-[#F4DADB]" aria-hidden="true">
								<div
									className="h-full rounded-full bg-[#DE141C] transition-[left] duration-100"
									style={{ width: `${recommendationsScroll.thumb}%`, marginLeft: `${recommendationsScroll.position}%` }}
								/>
							</div>
						) : null}
					</div>
				</div>
				</div>

				<div className="contents lg:block">
				<aside className="order-2 min-w-0">
					<div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_8px_28px_-24px_rgba(0,0,0,0.28)] lg:rounded-md lg:border-0 lg:shadow-none">
						<div className="flex items-center justify-between gap-3">
							<span className="inline-flex items-center rounded-full border border-[#DE141C]/15 bg-[#DE141C]/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#B8101A]">
								{property.category ?? property.type ?? "Listing"}
							</span>
							{property.subtype ? <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-700">{property.subtype}</span> : null}
							{previewMode ? (
								<button type="button" disabled className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/40">
									Back
								</button>
							) : (
								<Link href={backHref} className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold text-black/60 transition-colors hover:bg-black/5">
									Back
								</Link>
							)}
						</div>
						<h1 className="mt-2 text-[21px] font-semibold leading-tight text-black sm:text-2xl">{property.title}</h1>

						<p className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-black/45">{property.type === "Farm" ? "Listed price" : "Start at"}</p>
						<p className="mt-1 text-[28px] font-semibold leading-none tracking-[-0.03em] text-black sm:text-[32px]">{formatPHPWhole(property.price)}</p>
						<div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-black/50 sm:text-sm">
							{property.type !== "Farm" ? <><span>{property.monthlyAmortization ? `PHP ${Math.round(property.monthlyAmortization).toLocaleString()} / month` : `PHP ${Math.round(property.price / 12).toLocaleString()} / month`}</span><span aria-hidden="true">|</span></> : null}
							<span>{property.type ?? "Property"}</span>
							{property.pricePerSqm ? <><span aria-hidden="true">|</span><span>PHP {Math.round(property.pricePerSqm).toLocaleString()} / sqm</span></> : null}
							{property.isPriceNegotiable ? <><span aria-hidden="true">|</span><span className="font-medium text-[#DE141C]">Negotiable</span></> : null}
							<span aria-hidden="true">|</span>
							<span className="font-medium text-[#DE141C]">Available</span>
							{videoSrc ? (
								<button
									type="button"
									onClick={() => {
										setIsVideoOpen(true);
										trackPropertyInteraction("video_walkthrough_open");
										}}
									className="inline-flex h-6 items-center gap-1 rounded-full border border-[#DE141C]/25 bg-white px-2 text-[10px] font-semibold leading-none text-[#DE141C] transition hover:bg-[#DE141C] hover:text-white lg:hidden"
								>
									<svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
										<polygon points="5 3 19 12 5 21 5 3" />
									</svg>
									Video Walkthrough
								</button>
							) : null}
						</div>

						<details className="group mt-3 border-t border-black/10 py-3 lg:hidden">
							<summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-black marker:hidden">
								<span>About this property</span>
								<svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-180" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</summary>
							<p className="mt-2 text-[13px] leading-5 text-black/65 sm:text-sm sm:leading-6">{computedDescription}</p>
						</details>
						<p className="mt-4 hidden text-sm leading-6 text-black/70 lg:block">{computedDescription}</p>

						{property.keyFeatures?.length || property.amenities?.length ? (
							<>
							<details className="group border-t border-black/10 py-3 lg:hidden">
								<summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-black marker:hidden">
									<span>Features &amp; amenities</span>
									<svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-180" fill="none" aria-hidden="true">
										<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</summary>
								<div className="mt-3 grid gap-3">
									{property.keyFeatures?.length ? (
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/45">Key Features</p>
											<div className="mt-2 flex flex-wrap gap-1.5">
												{property.keyFeatures.map((item) => <span key={item} className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-[#DE141C]">{item}</span>)}
											</div>
										</div>
									) : null}
									{property.amenities?.length ? (
										<div>
											<p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/45">Amenities</p>
											<div className="mt-2 flex flex-wrap gap-1.5">
												{property.amenities.map((item) => <span key={item} className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-black/60">{item}</span>)}
											</div>
										</div>
									) : null}
								</div>
							</details>
							<div className="mt-4 hidden gap-3 lg:grid">
								{property.keyFeatures?.length ? (
									<div>
									<p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-black/45">Key Features</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{property.keyFeatures.map((item) => <span key={item} className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[#DE141C]">{item}</span>)}
									</div>
								</div>
								) : null}
								{property.amenities?.length ? (
									<div>
									<p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-black/45">Amenities</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{property.amenities.map((item) => <span key={item} className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/60">{item}</span>)}
									</div>
								</div>
								) : null}
							</div>
							</>
						) : null}

						{videoSrc ? (
							<button
								type="button"
								onClick={() => {
									setIsVideoOpen(true);
									trackPropertyInteraction("video_walkthrough_open");
								}}
								className="mt-4 hidden items-center gap-2 rounded-full border border-[#DE141C]/30 bg-red-50/70 px-3.5 py-1.5 text-xs font-semibold text-[#DE141C] transition hover:bg-[#DE141C] hover:text-white lg:inline-flex"
							>
								<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
									<polygon points="5 3 19 12 5 21 5 3" />
								</svg>
								Video Walkthrough
							</button>
						) : null}

						<details className="group border-t border-black/10 py-3 lg:hidden">
							<summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-black marker:hidden">
								<span>Property details</span>
								<svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-180" fill="none" aria-hidden="true">
									<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</summary>
							<div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
								{parameterItems.map(({ label, value, icon }) => (
									<div key={label} className="flex items-center gap-2 py-1">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#DE141C]/10">
											<ParamIcon type={icon} />
										</span>
										<div className="min-w-0">
											<p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-black/45">{label}</p>
											<p className="truncate text-xs font-semibold text-black">{value}</p>
										</div>
									</div>
								))}
							</div>
						</details>
						<div className="mt-4 hidden lg:block">
							<hr className="mb-4 border-black/10" />
							<div className="grid grid-cols-2 gap-x-3 gap-y-2">
								{parameterItems.map(({ label, value, icon }) => (
									<div key={label} className="flex items-center gap-2 py-1">
										<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#DE141C]/10">
											<ParamIcon type={icon} />
										</span>
										<div className="min-w-0">
											<p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">{label}</p>
											<p className="truncate text-xs font-semibold text-black">{value}</p>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="mt-5 border-t border-black/10 pt-4">
							{previewMode ? (
								<button
									type="button"
									disabled
									className="flex w-full items-center justify-center gap-2 rounded-xl bg-black/10 py-3 text-sm font-semibold text-black/40 cursor-not-allowed"
								>
									<svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M8 2v4" />
										<path d="M16 2v4" />
										<rect width="18" height="18" x="3" y="4" rx="2" />
										<path d="M3 10h18" />
									</svg>
									Book an Appointment
								</button>
							) : (
								<Link
									href={`/appointment?from=${encodeURIComponent("/project-list/" + property.slug)}&property=${encodeURIComponent(property.title)}`}
									className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#DE141C] py-3 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition duration-150 hover:bg-[#b80f16] active:scale-[0.99]"
								>
									<svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
										<path d="M8 2v4" />
										<path d="M16 2v4" />
										<rect width="18" height="18" x="3" y="4" rx="2" />
										<path d="M3 10h18" />
									</svg>
									Book an Appointment
								</Link>
							)}
						</div>
					</div>
				</aside>

				<div className="order-4 min-w-0 space-y-4 lg:mt-4">
					<div className="hidden lg:block">
						<PropertyChatAssistant property={property} previewMode={previewMode} />
					</div>
					<InquireCard previewMode={previewMode} property={property} />
					{property.type === "Farm" ? <p className="text-right text-sm text-black/45">Contact Jewellz Realty for farm listing details.</p> : <p className="text-right text-sm text-black/45">This property is brought to you by: {property.developerName ?? developerName}</p>}
				</div>
				</div>
			</div>

			<PhonePropertyChat property={property} previewMode={previewMode} />

			{videoSrc && isVideoOpen ? (
				<div
					className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
					role="dialog"
					aria-modal="true"
					aria-label={`${property.title} walkthrough video`}
					onClick={() => setIsVideoOpen(false)}
				>
					<div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
						<div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
							<button
								type="button"
								onClick={() => setIsVideoOpen(false)}
								aria-label="Close video"
								className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur transition hover:bg-black/95"
							>
								<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
									<path d="M18 6 6 18M6 6l12 12" />
								</svg>
								Close
							</button>
							{isYouTube ? (
								<div className="aspect-video w-full">
									<iframe
										src={getYouTubeEmbedUrl(videoSrc)}
										title={`${property.title} Video Tour`}
										className="h-full w-full"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowFullScreen
									/>
								</div>
							) : isVimeo ? (
								<div className="aspect-video w-full">
									<iframe
										src={getVimeoEmbedUrl(videoSrc)}
										title={`${property.title} Video Tour`}
										className="h-full w-full"
										allowFullScreen
									/>
								</div>
							) : (
								<video
									src={videoSrc}
									controls
									autoPlay
									playsInline
									preload="metadata"
									className="max-h-[80vh] w-full object-contain"
								>
									Your browser does not support the video tag.
								</video>
							)}
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
