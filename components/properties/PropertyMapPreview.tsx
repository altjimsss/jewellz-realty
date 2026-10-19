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
		return `<path d="M12 3L2 8l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M2 8v6M22 8v6M6 10.5v5a6 6 0 0012 0v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
	if (category === "Health")
		return `<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
	if (category === "Food")
		return `<path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 2v6M10 2v6M14 2v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>`;
	return `<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 10v11M16 10v11M12 10v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
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
function createMarkerEl(size: number, color: string, svgContent: string, focused = false, isProperty = false): HTMLElement {
	const el = document.createElement("div");
	const iconPadding = isProperty ? 14 : 9;
	const iconSize = Math.max(12, size - iconPadding);
	el.style.cssText = `
		display:flex;align-items:center;justify-content:center;
		width:${size}px;height:${size}px;border-radius:9999px;
		background:${color};color:#fff;
		box-shadow:${isProperty ? "0 6px 18px rgba(0,0,0,.35)" : "0 2px 8px rgba(0,0,0,.22)"};
		border:${isProperty ? "3.5px solid #fff" : "2px solid #fff"};
		cursor:pointer;transition:transform .15s ease, box-shadow .15s ease;
		${isProperty ? "z-index:999;" : "z-index:100;"}
		${focused ? "transform:scale(1.28);box-shadow:0 0 0 4px rgba(222,20,28,0.4);z-index:800;" : ""}
	`;
	el.innerHTML = `<svg viewBox="0 0 24 24" style="width:${iconSize}px;height:${iconSize}px;display:block;" aria-hidden="true">${svgContent}</svg>`;
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
	onSelectNearbyPlace?: (place: NearbyPlace | null) => void;
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

			// All visible coordinates for bounding box calculation
			const allCoords: [number, number][] = [
				...mapPoints.map((p) => [p.coordinates[1], p.coordinates[0]] as [number, number]),
				...displayedNearbyPlaces.map((p) => [p.longitude, p.latitude] as [number, number]),
			];

			const zoomToDefault = () => {
				if (!mapRef.current) return;
				const currentMap = mapRef.current;
				if (allCoords.length > 1) {
					const bounds = allCoords.reduce(
						(b, c) => b.extend(c as [number, number]),
						new maplibre.LngLatBounds(allCoords[0], allCoords[0]),
					);
					currentMap.fitBounds(bounds, { padding: 60, maxZoom: 15, speed: 1.2 });
				} else if (mapPoints.length === 1) {
					currentMap.flyTo({ center: [mapPoints[0].coordinates[1], mapPoints[0].coordinates[0]], zoom: 14, speed: 1.2 });
				}
			};

			// Property pin (red, prominent, always on top)
			for (const prop of mapPoints) {
				const [lat, lng] = prop.coordinates;
				const el = createMarkerEl(40, "#DE141C", propertyIconSvg(prop), false, true);
				const popupHtml = `
					<div style="padding:14px 16px;min-width:220px;max-width:270px;font-family:inherit;">
						<div style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:rgba(222,20,28,0.1);color:#DE141C;margin-bottom:8px;">
							<span style="width:6px;height:6px;border-radius:50%;background:#DE141C;"></span>
							${prop.type || "Featured Property"}
						</div>
						<div style="font-size:14px;font-weight:700;line-height:1.3;color:#111;margin-bottom:4px;">
							${prop.title}
						</div>
						${prop.price ? `<div style="font-size:13px;font-weight:700;color:#DE141C;margin-bottom:4px;">₱${Number(prop.price).toLocaleString()}</div>` : ""}
						${prop.location ? `<div style="font-size:11px;color:#666;line-height:1.4;display:flex;align-items:center;gap:3px;">📍 ${prop.location}</div>` : ""}
					</div>
				`;
				const popup = new maplibre.Popup({
					offset: [0, -22],
					anchor: "bottom",
					closeButton: true,
					closeOnClick: true,
					maxWidth: "280px",
				}).setHTML(popupHtml);

				popup.on("close", () => {
					zoomToDefault();
				});

				const marker = new maplibre.Marker({ element: el })
					.setLngLat([lng, lat])
					.setPopup(popup)
					.addTo(map);

				marker.getElement().style.zIndex = "999";
				el.addEventListener("click", (e) => {
					e.stopPropagation();
					marker.togglePopup();
				});
				markersRef.current.push(marker);
			}

			// Nearby pins (smaller, coloured by category, beneath property pin)
			for (const place of displayedNearbyPlaces) {
				const isFocused = focusedNearbyPlace?.id === place.id;
				const color = nearbyIconColor(place.category);
				const el = createMarkerEl(26, color, nearbyIconSvg(place.category), isFocused, false);
				const popupHtml = `
					<div style="padding:14px 16px;min-width:210px;max-width:260px;font-family:inherit;">
						<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
							<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:${color}15;color:${color};">
								<span style="width:6px;height:6px;border-radius:50%;background:${color};"></span>
								${place.category}
							</span>
							<span style="font-size:11px;font-weight:600;color:#555;white-space:nowrap;">
								📍 ${formatDistance(place.distanceMeters)}
							</span>
						</div>
						<div style="font-size:14px;font-weight:700;line-height:1.3;color:#111;margin-bottom:2px;word-break:break-word;">
							${place.name}
						</div>
						${place.address ? `<div style="font-size:11px;line-height:1.4;color:#777;margin-top:4px;">${place.address}</div>` : ""}
					</div>
				`;
				const popup = new maplibre.Popup({
					offset: [0, -16],
					anchor: "bottom",
					closeButton: true,
					closeOnClick: true,
					maxWidth: "280px",
				}).setHTML(popupHtml);

				popup.on("close", () => {
					onSelectNearbyPlace?.(null);
					zoomToDefault();
				});

				const marker = new maplibre.Marker({ element: el })
					.setLngLat([place.longitude, place.latitude])
					.setPopup(popup)
					.addTo(map);

				marker.getElement().style.zIndex = isFocused ? "800" : "100";

				if (isFocused) marker.togglePopup();

				el.addEventListener("click", (e) => {
					e.stopPropagation();
					marker.togglePopup();
					onSelectNearbyPlace?.(place);
				});
				markersRef.current.push(marker);
			}

			if (focusedLngLat) {
				map.flyTo({ center: focusedLngLat, zoom: 16, speed: 1.4 });
			} else {
				zoomToDefault();
			}
		});

		return () => { mounted = false; };
	}, [mapReady, mapPoints, displayedNearbyPlaces, focusedNearbyPlace, focusedLngLat, onSelectNearbyPlace]);

	// ── Status message for the footer ─────────────────────────────────────────
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
			</div>
		</div>
	);
}
