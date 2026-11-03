"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";
import { formatDistance } from "@/lib/nearby-places";
import type { Property } from "@/types/property";

const PropertyMapPreview = dynamic(
	() => import("@/components/properties/PropertyMapPreview").then((mod) => mod.PropertyMapPreview),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-[400px] w-full items-center justify-center bg-stone-100 text-sm text-stone-500">
				Loading map…
			</div>
		),
	},
);

type NearbyTabDef = {
	label: string;
	icon: React.ReactNode;
};

const nearbyCategoryTabs: NearbyTabDef[] = [
	{
		label: "Education",
		icon: (
			<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
				<path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M2 8v6M22 8v6M6 10.5v5a6 6 0 0012 0v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
	{
		label: "Health",
		icon: (
			<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
				<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
				<path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
			</svg>
		),
	},
	{
		label: "Food",
		icon: (
			<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
				<path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M6 2v6M10 2v6M14 2v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
			</svg>
		),
	},
	{
		label: "Culture",
		icon: (
			<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
				<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M16 10v11M12 10v11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
];

function nearbyDotColor(category?: string): string {
	if (category === "Education") return "#2563EB";
	if (category === "Health") return "#16A34A";
	if (category === "Food") return "#F97316";
	return "#7C3AED";
}

type PropertyLocationMapProps = {
	property: Property;
	nearbyGroups: NearbyPlaceGroup[];
	onInteraction?: (event: string, metadata?: Record<string, unknown>) => void;
};

export function PropertyLocationMap({ property, nearbyGroups, onInteraction }: PropertyLocationMapProps) {
	const [isMapOpen, setIsMapOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [showAllPlaces, setShowAllPlaces] = useState(false);
	const [focusedNearbyPlace, setFocusedNearbyPlace] = useState<NearbyPlaceGroup["places"][number] | null>(null);

	// Live groups discovered from Stadia Places API (used when cache is empty)
	const hasCachedPlaces = nearbyGroups.some((g) => g.places.length > 0);
	const [liveGroups, setLiveGroups] = useState<NearbyPlaceGroup[] | null>(null);

	// Automatically load nearby places if not provided by server cache
	useEffect(() => {
		if (hasCachedPlaces || !property.coordinates) return;

		let active = true;
		const [lat, lng] = property.coordinates;
		fetch(
			`/api/nearby?propertyId=${encodeURIComponent(property.id)}&lat=${lat}&lng=${lng}&type=${encodeURIComponent(property.type ?? "")}`,
		)
			.then((res) => res.json())
			.then((data) => {
				if (active && Array.isArray(data.groups) && data.groups.some((g: NearbyPlaceGroup) => g.places.length > 0)) {
					setLiveGroups(data.groups);
				}
			})
			.catch(() => {});

		return () => {
			active = false;
		};
	}, [hasCachedPlaces, property.coordinates, property.id, property.type]);

	/** Called by PropertyMapPreview after its first idle queryRenderedFeatures run */
	const handleNearbyPlacesFound = useCallback(
		(groups: NearbyPlaceGroup[]) => {
			if (hasCachedPlaces) return; // cached data takes priority
			setLiveGroups(groups);

			// Fire-and-forget: save to Supabase so next page load is instant
			fetch("/api/nearby", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ propertyId: property.id, groups }),
			}).catch(() => {});
		},
		[hasCachedPlaces, property.id],
	);

	const groups = hasCachedPlaces ? nearbyGroups : (liveGroups ?? nearbyGroups);
	const active = nearbyCategoryTabs[activeTab];
	const activePlaces = groups.find((g) => g.category === active.label)?.places ?? [];
	const allNearbyPlaces = useMemo(() => groups.flatMap((g) => g.places), [groups]);

	const handleSelectNearbyPlace = useCallback((place: NearbyPlaceGroup["places"][number] | null) => {
		if (!place) {
			setFocusedNearbyPlace(null);
			return;
		}
		setFocusedNearbyPlace((current) => (current?.id === place.id ? null : place));
		const idx = nearbyCategoryTabs.findIndex((t) => t.label === place.category);
		if (idx !== -1) setActiveTab(idx);
	}, []);

	return (
		<>
			<div className="flex w-full justify-center lg:w-auto lg:justify-start">
			<button
				type="button"
				onClick={() => {
					setIsMapOpen((current) => {
						const nextOpen = !current;
						if (nextOpen) onInteraction?.("property_map_open");
						return nextOpen;
					});
				}}
				className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#DE141C]/25 bg-white px-3 text-[11px] font-semibold text-[#DE141C] transition-colors hover:bg-[#DE141C]/5"
				aria-expanded={isMapOpen}
				aria-controls="property-location-map"
			>
				<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
					<path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M9 4v13M15 7v13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
				</svg>
				{isMapOpen ? "Close map" : "Open map"}
			</button>
			</div>

			{isMapOpen && (
				<div id="property-location-map" className="mt-3 w-full overflow-hidden rounded-xl border border-black/10 shadow-sm">
					<PropertyMapPreview
						properties={[property]}
						nearbyPlaces={allNearbyPlaces}
						mapHeightClassName="h-[280px] sm:h-[360px] lg:h-[400px]"
						focusedNearbyPlace={focusedNearbyPlace}
						onSelectCategory={(category) => {
							if (category === "All") return;
							const idx = nearbyCategoryTabs.findIndex((t) => t.label === category);
							if (idx !== -1) setActiveTab(idx);
						}}
						onSelectNearbyPlace={handleSelectNearbyPlace}
						onNearbyPlacesFound={handleNearbyPlacesFound}
					/>
				</div>
			)}

			{/* What's Nearby */}
			<div className="mt-4 w-full border-t border-black/10 pt-4">
				<p className="mb-2.5 text-[13px] font-semibold text-black">
					What&apos;s nearby
				</p>

				{/* Category tabs */}
				<div className="-mx-4 flex snap-x snap-mandatory flex-nowrap gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
					{nearbyCategoryTabs.map((tab, index) => {
						const isActive = activeTab === index;
						return (
							<button
								key={tab.label}
								type="button"
								aria-label={tab.label}
								onClick={() => {
									setActiveTab(index);
									setShowAllPlaces(false);
								}}
								className={`inline-flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border text-xs font-semibold transition-colors ${
									isActive
										? "border-[#DE141C] bg-[#DE141C] px-3 text-white"
										: "w-9 justify-center border-black/15 bg-white px-0 text-black hover:border-black/30 sm:w-auto sm:justify-normal sm:px-3"
								}`}
							>
								{tab.icon}
								<span className={isActive ? "" : "hidden sm:inline"}>{tab.label}</span>
							</button>
						);
					})}
				</div>

				{/* Places list */}
				<div className="mt-3 grid grid-cols-2 gap-2">
					{activePlaces.length === 0 ? (
						<div className="col-span-2 rounded-xl border border-black/[0.08] bg-white px-3 py-3 text-xs leading-5 text-black/50">
							{isMapOpen
								? `Finding nearby ${active.label.toLowerCase()} places…`
								: `Open the map to view nearby ${active.label.toLowerCase()} places.`}
						</div>
					) : null}
					{(showAllPlaces ? activePlaces : activePlaces.slice(0, 4)).map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => {
								setFocusedNearbyPlace((current) => (current?.id === item.id ? null : item));
								setIsMapOpen(true);
								onInteraction?.("property_nearby_click", {
									category: active.label,
									placeName: item.name,
									distanceMeters: item.distanceMeters,
								});
							}}
							className={`flex min-h-[60px] w-full flex-col items-start justify-center gap-1 rounded-xl border px-3 py-2 text-left transition hover:border-[#DE141C]/30 hover:bg-red-50 ${
								focusedNearbyPlace?.id === item.id ? "border-[#DE141C]/30 bg-red-50" : "border-black/[0.08] bg-white"
							}`}
						>
							<span className="w-full truncate text-xs font-medium text-black/80">{item.name}</span>
							<div className="flex items-center gap-1.5">
								<span
									className="h-2 w-2 rounded-full"
									style={{ backgroundColor: nearbyDotColor(item.category ?? active.label) }}
									aria-hidden="true"
								/>
								<span className="shrink-0 text-[10px] font-medium text-black/50">
									{formatDistance(item.distanceMeters)}
								</span>
							</div>
						</button>
					))}

					{/* Show All dropdown toggle */}
					{activePlaces.length > 4 && (
						<button
							type="button"
							onClick={() => setShowAllPlaces((prev) => !prev)}
							className="col-span-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold text-[#DE141C] transition-colors hover:bg-[#DE141C]/5"
						>
							<span>{showAllPlaces ? "Show less" : `Show all ${activePlaces.length} places`}</span>
							<svg
								viewBox="0 0 24 24"
								className={`h-3.5 w-3.5 transition-transform duration-200 ${showAllPlaces ? "rotate-180" : ""}`}
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<polyline points="6 9 12 15 18 9" />
							</svg>
						</button>
					)}
				</div>
			</div>
		</>
	);
}
