"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import type { NearbyPlace, NearbyPlaceGroup, NearbyCategory } from "@/lib/nearby-places";
import {
	formatDistance,
	nearbyCategories,
	nearbyRadiusForPropertyType,
	haversineMeters,
	poiClassToCategory,
} from "@/lib/nearby-places";
import type { Property } from "@/types/property";

// Stadia Maps style — vector tiles with full OSM POI data, no result cap
const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY ?? "";
const MAP_STYLE = `https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=${STADIA_KEY}`;

const FALLBACK_CENTER: [number, number] = [121.0583, 13.7563]; // [lng, lat] for MapLibre

type PropertyWithCoordinates = Property & { coordinates: [number, number] };

// ─── Icon helpers (same palette as the old Leaflet implementation) ─────────

function nearbyIconColor(category: NearbyCategory): string {
	if (category === "Education") return "#2563EB";
	if (category === "Health") return "#16A34A";
	if (category === "Food") return "#F97316";
	return "#7C3AED";
}

function nearbyIconSvg(category: NearbyCategory): string {
	if (category === "Education")
		return `<path d="M12 5 4 9l8 4 8-4-8-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 11v3.2c0 1.8 2.7 3.3 6 3.3s6-1.5 6-3.3V11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	if (category === "Health")
		return `<rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8.5v7M8.5 12h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	if (category === "Food")
		return `<path d="M7 4v7M10 4v7M7 8h3M15 4v16M18 4v16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 20h13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	return `<path d="M4 20h16M5 10h14M7 10v10M12 10v10M17 10v10M6 7l6-3 6 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function propertyIconSvg(property: Property): string {
	const type = (property.type ?? property.category ?? "").toLowerCase();
	if (type.includes("condo") || type.includes("apartment"))
		return `<path d="M7 20V5h10v15M10 8h1M13 8h1M10 11h1M13 11h1M10 14h1M13 14h1M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
	if (type.includes("house") || type.includes("townhouse"))
		return `<path d="M4 11 12 5l8 6v9H5v-9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
	if (type.includes("farm"))
		return `<path d="M12 20V9M12 9c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4ZM12 9c0-2.2-1.8-4-4-4 0 2.2 1.8 4 4 4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	if (type.includes("memorial"))
		return `<path d="M12 5a4 4 0 0 0-4 4v11h8V9a4 4 0 0 0-4-4Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 20h12M12 9v6M9.5 11.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
	return `<path d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="11" r="2" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
}

/** Creates a round HTML marker element for MapLibre */
function createMarkerEl(size: number, color: string, svgContent: string, focused = false): HTMLElement {
	const el = document.createElement("div");
	el.style.cssText = `
		display:flex;align-items:center;justify-content:center;
		width:${size}px;height:${size}px;border-radius:9999px;
		background:${color};color:#fff;
		box-shadow:0 8px 20px rgba(0,0,0,.28);border:3px solid #fff;
		cursor:pointer;transition:transform .15s;
		${focused ? "transform:scale(1.25);" : ""}
	`;
	el.innerHTML = `<svg viewBox="0 0 24 24" style="width:${size - 14}px;height:${size - 14}px;display:block;" aria-hidden="true">${svgContent}</svg>`;
	return el;
}

// ─── Classify a MapLibre POI feature into one of our four categories ───────

function classifyFeature(props: Record<string, unknown>): NearbyCategory | null {
	// OpenMapTiles schema uses `class` and `subclass`; fall back to raw OSM tags
	for (const key of ["class", "subclass", "amenity", "shop", "tourism", "historic"]) {
		const val = String(props[key] ?? "").toLowerCase();
		if (val && poiClassToCategory[val]) return poiClassToCategory[val];
	}
	return null;
}

// ─── Component types ────────────────────────────────────────────────────────

type PropertyMapPreviewProps = {
	properties: Property[];
	nearbyPlaces?: NearbyPlace[];
	mapHeightClassName?: string;
	focusedNearbyPlace?: NearbyPlace | null;
	selectedCategory?: string;
	onSelectNearbyPlace?: (place: NearbyPlace) => void;
	onSelectCategory?: (category: string) => void;
	/** Called once when MapLibre finds POIs from the loaded tile data */
	onNearbyPlacesFound?: (groups: NearbyPlaceGroup[]) => void;
};

export function PropertyMapPreview({
	properties,
	nearbyPlaces = [],
	mapHeightClassName = "h-[520px]",
	focusedNearbyPlace = null,
	selectedCategory,
	onSelectNearbyPlace,
	onSelectCategory,
	onNearbyPlacesFound,
}: PropertyMapPreviewProps) {
	const [internalCategory, setInternalCategory] = useState<string>("All");
	const activeCategory = selectedCategory ?? internalCategory;

	const mapElRef = useRef<HTMLDivElement | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const mapRef = useRef<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const markersRef = useRef<any[]>([]);
	const [mapReady, setMapReady] = useState(false);
	const queryDoneRef = useRef(false);

	// Keep a ref to nearbyPlaces so the async idle callback sees the latest value
	const nearbyPlacesRef = useRef(nearbyPlaces);
	useEffect(() => { nearbyPlacesRef.current = nearbyPlaces; }, [nearbyPlaces]);

	const mapPoints = useMemo(
		() => properties.filter((p): p is PropertyWithCoordinates => Boolean(p.coordinates)),
		[properties],
	);

	const displayedNearbyPlaces = useMemo(() => {
		if (!activeCategory || activeCategory === "All") return nearbyPlaces;
		return nearbyPlaces.filter((p) => p.category === activeCategory);
	}, [nearbyPlaces, activeCategory]);

	// MapLibre uses [lng, lat]; our Property.coordinates are [lat, lng]
	const focusedLngLat = useMemo<[number, number] | null>(
		() => (focusedNearbyPlace ? [focusedNearbyPlace.longitude, focusedNearbyPlace.latitude] : null),
		[focusedNearbyPlace],
	);

	const propCenter: [number, number] = mapPoints[0]?.coordinates
		? [mapPoints[0].coordinates[1], mapPoints[0].coordinates[0]]
		: FALLBACK_CENTER;

	// ── EFFECT 1: Initialize map once ────────────────────────────────────────
	useEffect(() => {
		if (!mapElRef.current) return;
		let destroyed = false;

		import("maplibre-gl").then((maplibre) => {
			if (destroyed || !mapElRef.current || mapRef.current) return;

			if (typeof window !== "undefined") {
				maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
			}

			const map = new maplibre.Map({
				container: mapElRef.current!,
				style: MAP_STYLE,
				center: propCenter,
				zoom: 14,
				scrollZoom: false,
			});
			mapRef.current = map;

			map.once("load", () => {
				if (destroyed) return;
				setMapReady(true);

				// Query POIs from loaded tiles — fires once, only if no cached data
				map.once("idle", () => {
					if (destroyed || queryDoneRef.current) return;
					if (nearbyPlacesRef.current.length > 0) return; // cached data already present

					const prop = mapPoints[0];
					if (!prop || !onNearbyPlacesFound) return;

					const [propLat, propLng] = prop.coordinates; // our [lat, lng]
					const radiusMeters = nearbyRadiusForPropertyType(prop.type ?? "");

					// Dynamically find all layers backed by the `poi` source layer
					const style = map.getStyle();
					const poiLayerIds = (style?.layers ?? [])
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.filter((l: any) => l["source-layer"] === "poi")
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						.map((l: any) => l.id as string);

					if (poiLayerIds.length === 0) return;

					const features = map.queryRenderedFeatures(undefined, {
						layers: poiLayerIds,
						filter: ["has", "name"],
					});

					const byCategory = new Map<NearbyCategory, NearbyPlace[]>(
						nearbyCategories.map(({ category }) => [category, []]),
					);
					const seen = new Set<string>();

					for (const feature of features) {
						if (feature.geometry.type !== "Point") continue;
						const props = (feature.properties ?? {}) as Record<string, unknown>;
						const name = String(props.name ?? "").trim();
						if (!name) continue;

						const category = classifyFeature(props);
						if (!category) continue;

						const [lng, lat] = feature.geometry.coordinates as [number, number];
						const dist = haversineMeters(propLat, propLng, lat, lng);
						if (dist > radiusMeters) continue;

						const key = `${category}|${name.toLowerCase()}`;
						if (seen.has(key)) continue;
						seen.add(key);

						byCategory.get(category)!.push({
							id: `ml-${feature.id ?? name}-${category}`,
							name,
							category,
							distanceMeters: dist,
							latitude: lat,
							longitude: lng,
						});
					}

					const groups: NearbyPlaceGroup[] = nearbyCategories.map(({ category }) => ({
						category,
						places: (byCategory.get(category) ?? [])
							.sort((a, b) => a.distanceMeters - b.distanceMeters)
							.slice(0, 8),
					}));

					if (groups.some((g) => g.places.length > 0)) {
						queryDoneRef.current = true;
						onNearbyPlacesFound(groups);
					}
				});
			});
		});

		return () => {
			destroyed = true;
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
			setMapReady(false);
			queryDoneRef.current = false;
		};
		// Intentionally empty — map init runs once per mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── EFFECT 2: Update markers whenever data/focus changes ─────────────────
	useEffect(() => {
		if (!mapReady || !mapRef.current) return;
		let mounted = true;

		import("maplibre-gl").then((maplibre) => {
			if (!mounted || !mapRef.current) return;
			const map = mapRef.current;

			// Clear old markers
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];

			// Property pin (red)
			for (const prop of mapPoints) {
				const [lat, lng] = prop.coordinates;
				const el = createMarkerEl(36, "#DE141C", propertyIconSvg(prop));
				const popup = new maplibre.Popup({ offset: [0, -22], closeButton: true })
					.setHTML(`<strong>${prop.title}</strong><br>${prop.location ?? ""}`);
				const marker = new maplibre.Marker({ element: el })
					.setLngLat([lng, lat])
					.setPopup(popup)
					.addTo(map);
				markersRef.current.push(marker);
			}

			// Nearby pins (coloured by category)
			for (const place of displayedNearbyPlaces) {
				const isFocused = focusedNearbyPlace?.id === place.id;
				const color = nearbyIconColor(place.category);
				const el = createMarkerEl(34, color, nearbyIconSvg(place.category), isFocused);
				const popupHtml = `
					<div style="font:13px/1.4 inherit;padding:2px">
						<strong style="display:block;font-size:14px;margin-bottom:2px">${place.name}</strong>
						<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;text-transform:uppercase;background:${color}20;color:${color};margin-bottom:4px">${place.category}</span>
						<div style="color:#666;font-size:12px">📍 ${formatDistance(place.distanceMeters)} away</div>
						${place.address ? `<div style="color:#888;font-size:11px;margin-top:2px">${place.address}</div>` : ""}
					</div>
				`;
				const popup = new maplibre.Popup({ offset: [0, -20], closeButton: true }).setHTML(popupHtml);
				const marker = new maplibre.Marker({ element: el })
					.setLngLat([place.longitude, place.latitude])
					.setPopup(popup)
					.addTo(map);

				if (isFocused) marker.togglePopup();

				el.addEventListener("click", () => onSelectNearbyPlace?.(place));
				markersRef.current.push(marker);
			}

			// Fit view to all visible points
			const allCoords: [number, number][] = [
				...mapPoints.map((p) => [p.coordinates[1], p.coordinates[0]] as [number, number]),
				...displayedNearbyPlaces.map((p) => [p.longitude, p.latitude] as [number, number]),
			];

			if (focusedLngLat) {
				map.flyTo({ center: focusedLngLat, zoom: 16, speed: 1.4 });
			} else if (allCoords.length > 1) {
				const bounds = allCoords.reduce(
					(b, c) => b.extend(c as [number, number]),
					new maplibre.LngLatBounds(allCoords[0], allCoords[0]),
				);
				map.fitBounds(bounds, { padding: 60, maxZoom: 15, animate: true });
			} else if (mapPoints.length === 1) {
				map.flyTo({ center: [mapPoints[0].coordinates[1], mapPoints[0].coordinates[0]], zoom: 14 });
			}
		});

		return () => { mounted = false; };
	}, [mapReady, mapPoints, displayedNearbyPlaces, focusedNearbyPlace, focusedLngLat, onSelectNearbyPlace]);

	// ── Status labels for the footer ─────────────────────────────────────────
	const locationLabels = useMemo(() => {
		const unique = new Set(mapPoints.map((p) => (p.location ?? "").split(",")[0]?.trim() || "Unknown area"));
		return Array.from(unique).slice(0, 3);
	}, [mapPoints]);

	const hiddenLocationCount = Math.max(
		0,
		new Set(mapPoints.map((p) => (p.location ?? "").split(",")[0]?.trim() || "Unknown area")).size -
			locationLabels.length,
	);

	const hasPins = mapPoints.length > 0;
	const statusTitle = hasPins
		? nearbyPlaces.length > 0
			? `${mapPoints.length} property · ${nearbyPlaces.length} nearby pinned`
			: `${mapPoints.length} pinned result${mapPoints.length === 1 ? "" : "s"}`
		: "No pinned results";
	const statusMessage = hasPins
		? nearbyPlaces.length > 0
			? "Property and all nearby essentials are pinned. Click any marker for details."
			: "Property pinned. Nearby places will appear once the map finishes loading."
		: "No properties with coordinates found.";

	return (
		<div className="flex h-full min-h-[520px] flex-col overflow-hidden">
			<div className={`relative ${mapHeightClassName} shrink-0 bg-[#f0f0f0]`}>
				<div ref={mapElRef} className="absolute inset-0" />

				{/* Category filter pills (shown once we have nearby data) */}
				{nearbyPlaces.length > 0 && (
					<div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-md backdrop-blur-md">
						<button
							type="button"
							onClick={() => { setInternalCategory("All"); onSelectCategory?.("All"); }}
							className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${activeCategory === "All" ? "bg-[#DE141C] text-white shadow-sm" : "bg-transparent text-black/70 hover:bg-black/5"}`}
						>
							<span>All</span>
							<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeCategory === "All" ? "bg-white/25" : "bg-black/10 text-black/60"}`}>
								{nearbyPlaces.length}
							</span>
						</button>
						{(["Education", "Health", "Food", "Culture"] as const).map((cat) => {
							const count = nearbyPlaces.filter((p) => p.category === cat).length;
							if (count === 0) return null;
							const isActive = activeCategory === cat;
							return (
								<button
									key={cat}
									type="button"
									onClick={() => { setInternalCategory(cat); onSelectCategory?.(cat); }}
									className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${isActive ? "bg-[#DE141C] text-white shadow-sm" : "bg-transparent text-black/70 hover:bg-black/5"}`}
								>
									<span
										className="h-2 w-2 rounded-full"
										style={{ backgroundColor: isActive ? "#fff" : nearbyIconColor(cat) }}
									/>
									<span>{cat}</span>
									<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/25" : "bg-black/10 text-black/60"}`}>
										{count}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Map footer */}
			<div className="border-t border-black/10 bg-white p-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">Map summary</p>
						<p className="mt-1 text-sm font-semibold text-black">{statusTitle}</p>
						<p className="mt-1 text-sm text-black/55">{statusMessage}</p>
					</div>
				</div>
				{locationLabels.length > 0 && (
					<div className="mt-4 flex flex-wrap gap-2">
						{locationLabels.map((label) => (
							<span key={label} className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium text-black/70 shadow-sm">
								{label}
							</span>
						))}
						{hiddenLocationCount > 0 && (
							<span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] font-medium text-black/60">
								+{hiddenLocationCount}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
