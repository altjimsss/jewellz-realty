"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { NearbyPlace } from "@/lib/nearby-places";
import { formatDistance } from "@/lib/nearby-places";
import type { Property } from "@/types/property";


const fallbackCenter: [number, number] = [13.7563, 121.0583];

type PropertyWithCoordinates = Property & {
	coordinates: [number, number];
};

function formatLocationLabel(location: string) {
	const value = location.trim();
	if (!value) return "Unknown area";

	return value.split(",")[0]?.trim() || value;
}

function normalizedPropertyType(property: Property) {
	return (property.type ?? property.category ?? "").toLowerCase();
}

function propertyIconColor() {
	return "#DE141C";
}

function propertyIconSvg(property: Property) {
	const type = normalizedPropertyType(property);

	if (type.includes("condo") || type.includes("apartment")) {
		return `<path d="M7 20V5h10v15M10 8h1M13 8h1M10 11h1M13 11h1M10 14h1M13 14h1M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
	}

	if (type.includes("house") || type.includes("townhouse")) {
		return `<path d="M4 11 12 5l8 6v9H5v-9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
	}

	if (type.includes("farm")) {
		return `<path d="M12 20V9M12 9c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4ZM12 9c0-2.2-1.8-4-4-4 0 2.2 1.8 4 4 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	}

	if (type.includes("memorial")) {
		return `<path d="M12 5a4 4 0 0 0-4 4v11h8V9a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 20h12M12 9v6M9.5 11.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	}

	if (type.includes("lot")) {
		return `<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h5M8 16h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	}

	return `<path d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="11" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
}

function createPinIcon(leaflet: typeof import("leaflet"), property: Property) {
	const color = propertyIconColor();
	return leaflet.divIcon({
		className: "",
		html: `
			<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:${color};color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.24);border:3px solid #fff;">
				<svg viewBox="0 0 24 24" style="width:19px;height:19px;display:block;" aria-hidden="true">
					${propertyIconSvg(property)}
				</svg>
			</div>
		`,
		iconSize: [36, 36],
		iconAnchor: [18, 36],
		popupAnchor: [0, -34],
	});
	}

function nearbyIconSvg(category: NearbyPlace["category"]) {
	if (category === "Education") {
		return `<path d="M12 5 4 9l8 4 8-4-8-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 11v3.2c0 1.8 2.7 3.3 6 3.3s6-1.5 6-3.3V11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	}

	if (category === "Health") {
		return `<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	}

	if (category === "Food") {
		return `<path d="M7 4v7M10 4v7M7 8h3M15 4v16M18 4v16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 20h13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	}

	return `<path d="M4 20h16M5 10h14M7 10v10M12 10v10M17 10v10M6 7l6-3 6 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function nearbyIconColor(category: NearbyPlace["category"]) {
	if (category === "Education") return "#2563EB";
	if (category === "Health") return "#16A34A";
	if (category === "Food") return "#F97316";
	return "#7C3AED";
}

function createNearbyPinIcon(leaflet: typeof import("leaflet"), category: NearbyPlace["category"]) {
	const color = nearbyIconColor(category);
	return leaflet.divIcon({
		className: "",
		html: `
			<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:${color};color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.22);border:3px solid #fff;">
				<svg viewBox="0 0 24 24" style="width:18px;height:18px;display:block;" aria-hidden="true">
					${nearbyIconSvg(category)}
				</svg>
			</div>
		`,
		iconSize: [34, 34],
		iconAnchor: [17, 34],
		popupAnchor: [0, -32],
	});
}

type PropertyMapPreviewProps = {
	properties: Property[];
	nearbyPlaces?: NearbyPlace[];
	mapHeightClassName?: string;
	focusedNearbyPlace?: NearbyPlace | null;
	selectedCategory?: string;
	onSelectNearbyPlace?: (place: NearbyPlace) => void;
	onSelectCategory?: (category: string) => void;
};

export function PropertyMapPreview({
	properties,
	nearbyPlaces = [],
	mapHeightClassName = "h-[520px]",
	focusedNearbyPlace = null,
	selectedCategory,
	onSelectNearbyPlace,
	onSelectCategory,
}: PropertyMapPreviewProps) {
	const [internalCategory, setInternalCategory] = useState<string>("All");
	const activeCategory = selectedCategory ?? internalCategory;

	const mapElementRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<LeafletMap | null>(null);
	const markerRefs = useRef<Marker[]>([]);
	const mapPoints = useMemo(
		() => properties.filter((property): property is PropertyWithCoordinates => Boolean(property.coordinates)),
		[properties],
	);

	const displayedNearbyPlaces = useMemo(() => {
		if (!activeCategory || activeCategory === "All") return nearbyPlaces;
		return nearbyPlaces.filter((place) => place.category === activeCategory);
	}, [nearbyPlaces, activeCategory]);
	const locationLabels = useMemo(() => {
		const uniqueLocations = new Set<string>();

		mapPoints.forEach((property) => {
			uniqueLocations.add(formatLocationLabel(property.location ?? ""));
		});

		return Array.from(uniqueLocations).slice(0, 3);
	}, [mapPoints]);
	const hiddenLocationCount = Math.max(0, new Set(mapPoints.map((property) => formatLocationLabel(property.location ?? ""))).size - locationLabels.length);
	const focusedCoordinates = useMemo<[number, number] | null>(
		() => (focusedNearbyPlace ? [focusedNearbyPlace.latitude, focusedNearbyPlace.longitude] : null),
		[focusedNearbyPlace],
	);
	const center = focusedCoordinates ?? mapPoints[0]?.coordinates ?? fallbackCenter;
	const hasPins = mapPoints.length > 0;
	const statusTitle = hasPins
		? nearbyPlaces.length > 0
			? `${mapPoints.length} property · ${nearbyPlaces.length} nearby pinned`
			: `${mapPoints.length} pinned result${mapPoints.length === 1 ? "" : "s"}`
		: "No pinned results";
	const statusMessage = hasPins
		? nearbyPlaces.length > 0
			? "Property and all nearby essentials (schools, health, food, and culture) are pinned. Click any marker for details."
			: "All matched locations stay pinned on the map. Zoom to compare nearby properties or open a marker for the full listing card."
		: "No properties with coordinates were found for this search.";

	useEffect(() => {
		if (!mapElementRef.current) return;

		let cancelled = false;

		async function loadLeaflet() {
			const leaflet = await import("leaflet");
			if (cancelled || !mapElementRef.current) return;

			const pins = mapPoints;

			if (!mapRef.current) {
				mapRef.current = leaflet.map(mapElementRef.current, {
					zoomControl: true,
					scrollWheelZoom: false,
					attributionControl: true,
				}).setView(center, 13);

				leaflet
					.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
						maxZoom: 19,
						attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					})
					.addTo(mapRef.current);
			} else {
				mapRef.current.setView(center, 13, { animate: true });
			}

			const mapInstance = mapRef.current;
			if (!mapInstance) return;

			markerRefs.current.forEach((marker) => marker.remove());
			markerRefs.current = [];

			// 1. Property pins (Red icons)
			pins.forEach((property) => {
				const marker = leaflet.marker(property.coordinates, {
					icon: createPinIcon(leaflet, property),
					zIndexOffset: 500,
				}).addTo(mapInstance);

				marker.bindPopup(`<strong>${property.title}</strong><br />${property.location ?? "Location unavailable"}`);
				markerRefs.current.push(marker);
			});

			// 2. Nearby places pins (Category icons: Blue, Green, Orange, Purple)
			displayedNearbyPlaces.forEach((place) => {
				const isFocused = focusedNearbyPlace?.id === place.id;
				const marker = leaflet.marker([place.latitude, place.longitude], {
					icon: createNearbyPinIcon(leaflet, place.category),
					zIndexOffset: isFocused ? 1000 : 200,
				}).addTo(mapInstance);

				const popupContent = `
					<div style="font-family: inherit; font-size: 13px; line-height: 1.4; padding: 2px;">
						<strong style="display:block; font-size: 14px; margin-bottom: 2px;">${place.name}</strong>
						<span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase; background: ${nearbyIconColor(place.category)}18; color: ${nearbyIconColor(place.category)}; margin-bottom: 4px;">
							${place.category}
						</span>
						<div style="color: #666; font-size: 12px;">📍 ${formatDistance(place.distanceMeters)} away</div>
						${place.address ? `<div style="color: #888; font-size: 11px; margin-top: 2px;">${place.address}</div>` : ""}
					</div>
				`;
				marker.bindPopup(popupContent);

				if (isFocused) {
					marker.openPopup();
				}

				if (onSelectNearbyPlace) {
					marker.on("click", () => {
						onSelectNearbyPlace(place);
					});
				}

				markerRefs.current.push(marker);
			});

			// 3. Fallback if focused place was not in displayedNearbyPlaces list
			if (focusedNearbyPlace && focusedCoordinates && !displayedNearbyPlaces.some((p) => p.id === focusedNearbyPlace.id)) {
				const marker = leaflet.marker(focusedCoordinates, {
					icon: createNearbyPinIcon(leaflet, focusedNearbyPlace.category),
					zIndexOffset: 1000,
				}).addTo(mapInstance);

				marker.bindPopup(`<strong>${focusedNearbyPlace.name}</strong><br />${focusedNearbyPlace.category} • ${formatDistance(focusedNearbyPlace.distanceMeters)} away`).openPopup();
				markerRefs.current.push(marker);
			}

			// 4. View / Bounds fitting
			const allCoordinates: [number, number][] = [
				...pins.map((property) => property.coordinates),
				...displayedNearbyPlaces.map((place) => [place.latitude, place.longitude] as [number, number]),
			];

			if (focusedCoordinates) {
				mapInstance.setView(focusedCoordinates, 15, { animate: true });
			} else if (allCoordinates.length > 1) {
				const bounds = leaflet.latLngBounds(allCoordinates);
				mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
			} else if (pins.length === 1) {
				mapInstance.setView(pins[0].coordinates, 14, { animate: true });
			}
		}

		loadLeaflet();

		return () => {
			cancelled = true;
			mapRef.current?.invalidateSize();
		};
	}, [center, focusedCoordinates, focusedNearbyPlace, mapPoints, displayedNearbyPlaces, onSelectNearbyPlace]);

	useEffect(() => {
		return () => {
			markerRefs.current.forEach((marker) => marker.remove());
			mapRef.current?.remove();
			markerRefs.current = [];
			mapRef.current = null;
		};
	}, []);

	return (
		<div className="flex h-full min-h-[520px] flex-col overflow-hidden">
			<div className={`relative ${mapHeightClassName} shrink-0 bg-[#f3f3f3]`}>
				<div ref={mapElementRef} className="absolute inset-0" />

				{/* Floating category filter pills */}
				{nearbyPlaces.length > 0 && (
					<div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-md backdrop-blur-md">
						<button
							type="button"
							onClick={() => {
								setInternalCategory("All");
								onSelectCategory?.("All");
							}}
							className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
								activeCategory === "All"
									? "bg-[#DE141C] text-white shadow-sm"
									: "bg-transparent text-black/70 hover:bg-black/5"
							}`}
						>
							<span>All</span>
							<span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeCategory === "All" ? "bg-white/25" : "bg-black/10 text-black/60"}`}>
								{nearbyPlaces.length}
							</span>
						</button>
						{(["Education", "Health", "Food", "Culture"] as const).map((cat) => {
							const count = nearbyPlaces.filter((p) => p.category === cat).length;
							if (count === 0) return null;
							const isCatActive = activeCategory === cat;
							return (
								<button
									key={cat}
									type="button"
									onClick={() => {
										setInternalCategory(cat);
										onSelectCategory?.(cat);
									}}
									className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
										isCatActive
											? "bg-[#DE141C] text-white shadow-sm"
											: "bg-transparent text-black/70 hover:bg-black/5"
									}`}
								>
									<span
										className="h-2 w-2 rounded-full"
										style={{ backgroundColor: isCatActive ? "#fff" : nearbyIconColor(cat) }}
									/>
									<span>{cat}</span>
									<span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isCatActive ? "bg-white/25" : "bg-black/10 text-black/60"}`}>
										{count}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>
			<div className="border-t border-black/10 bg-white p-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">Map summary</p>
						<p className="mt-1 text-sm font-semibold text-black">{statusTitle}</p>
						<p className="mt-1 text-sm text-black/55">{statusMessage}</p>
					</div>
				</div>

				{locationLabels.length > 0 ? (
					<div className="mt-4 flex flex-wrap gap-2">
						{locationLabels.map((label) => (
							<span
								key={label}
								className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium text-black/70 shadow-sm"
							>
								{label}
							</span>
						))}
						{hiddenLocationCount > 0 ? (
							<span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] font-medium text-black/60">
								+{hiddenLocationCount}
							</span>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
