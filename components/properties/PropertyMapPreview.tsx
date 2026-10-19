"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import type { NearbyPlace, NearbyPlaceGroup, NearbyCategory } from "@/lib/nearby-places";
import { formatDistance } from "@/lib/nearby-places";
import type { Property } from "@/types/property";

// Stadia Maps raster tile URL with Retina support — 100% compatible with all browsers (no WebGL required)
const STADIA_KEY =
	process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY ||
	process.env.STADIA_MAPS_API_KEY ||
	"292b5eae-f656-470c-a59d-6a24c1ea49ae";

const STADIA_TILE_URL = `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`;

const FALLBACK_CENTER: [number, number] = [13.7563, 121.0583]; // Leaflet uses [lat, lng]

type PropertyWithCoordinates = Property & { coordinates: [number, number] };

// ─── Color & SVG Helpers ──────────────────────────────────────────────────

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPropertyIcon(L: any, prop: Property) {
	const svg = propertyIconSvg(prop);
	return L.divIcon({
		className: "jewellz-marker-wrapper",
		html: `
			<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:#DE141C;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.35);border:3.5px solid #fff;cursor:pointer;">
				<svg viewBox="0 0 24 24" style="width:26px;height:26px;display:block;" aria-hidden="true">${svg}</svg>
			</div>
		`,
		iconSize: [40, 40],
		iconAnchor: [20, 20],
		popupAnchor: [0, -22],
	});
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createNearbyIcon(L: any, category: NearbyCategory) {
	const color = nearbyIconColor(category);
	const svg = nearbyIconSvg(category);
	return L.divIcon({
		className: "jewellz-marker-wrapper",
		html: `
			<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.22);border:2px solid #fff;cursor:pointer;">
				<svg viewBox="0 0 24 24" style="width:17px;height:17px;display:block;" aria-hidden="true">${svg}</svg>
			</div>
		`,
		iconSize: [26, 26],
		iconAnchor: [13, 13],
		popupAnchor: [0, -15],
	});
}

// ─── Component Props ────────────────────────────────────────────────────────

type PropertyMapPreviewProps = {
	properties: Property[];
	nearbyPlaces?: NearbyPlace[];
	mapHeightClassName?: string;
	focusedNearbyPlace?: NearbyPlace | null;
	selectedCategory?: string;
	onSelectNearbyPlace?: (place: NearbyPlace | null) => void;
	onSelectCategory?: (category: string) => void;
	onNearbyPlacesFound?: (groups: NearbyPlaceGroup[]) => void;
};

export function PropertyMapPreview({
	properties,
	nearbyPlaces = [],
	mapHeightClassName = "h-[520px]",
	focusedNearbyPlace = null,
	selectedCategory,
	onSelectNearbyPlace,
}: PropertyMapPreviewProps) {
	const [internalCategory] = useState<string>("All");
	const activeCategory = selectedCategory ?? internalCategory;

	const mapElRef = useRef<HTMLDivElement | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const mapRef = useRef<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const markersRef = useRef<any[]>([]);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const markersMapRef = useRef<Map<string, { marker: any; coords: [number, number] }>>(new Map());
	const [mapReady, setMapReady] = useState(false);
	const isOpeningPopupRef = useRef(false);

	const onSelectNearbyPlaceRef = useRef(onSelectNearbyPlace);
	useEffect(() => { onSelectNearbyPlaceRef.current = onSelectNearbyPlace; }, [onSelectNearbyPlace]);

	const focusedNearbyPlaceRef = useRef(focusedNearbyPlace);
	useEffect(() => { focusedNearbyPlaceRef.current = focusedNearbyPlace; }, [focusedNearbyPlace]);

	const mapPoints = useMemo(
		() => properties.filter((p): p is PropertyWithCoordinates => Boolean(p.coordinates)),
		[properties],
	);

	const displayedNearbyPlaces = useMemo(() => {
		if (!activeCategory || activeCategory === "All") return nearbyPlaces;
		return nearbyPlaces.filter((p) => p.category === activeCategory);
	}, [nearbyPlaces, activeCategory]);

	const propCenter: [number, number] = mapPoints[0]?.coordinates
		? [mapPoints[0].coordinates[0], mapPoints[0].coordinates[1]]
		: FALLBACK_CENTER;

	const allCoords = useMemo<[number, number][]>(() => [
		...mapPoints.map((p) => p.coordinates),
		...displayedNearbyPlaces.map((p) => [p.latitude, p.longitude] as [number, number]),
	], [mapPoints, displayedNearbyPlaces]);

	const zoomToDefault = () => {
		if (!mapRef.current) return;
		const map = mapRef.current;
		if (allCoords.length > 1) {
			map.fitBounds(allCoords, { padding: [60, 60], maxZoom: 15 });
		} else if (mapPoints.length === 1) {
			map.flyTo(mapPoints[0].coordinates, 14);
		}
	};

	// ── EFFECT 1: Initialize Leaflet Map once ────────────────────────────────
	useEffect(() => {
		if (!mapElRef.current) return;
		let destroyed = false;

		import("leaflet").then((L) => {
			if (destroyed || !mapElRef.current || mapRef.current) return;

			// Clear previous Leaflet container state if hot-reloaded
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((mapElRef.current as any)._leaflet_id) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mapElRef.current as any)._leaflet_id = null;
			}

			const map = L.map(mapElRef.current, {
				zoomControl: true,
				scrollWheelZoom: false,
				attributionControl: true,
			}).setView(propCenter, 14);

			L.tileLayer(STADIA_TILE_URL, {
				maxZoom: 20,
				attribution:
					'&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			}).addTo(map);

			// Listen to popupclose to reset zoom only when explicitly closed by the user
			map.on("popupclose", () => {
				if (isOpeningPopupRef.current) return;
				setTimeout(() => {
					if (!isOpeningPopupRef.current) {
						onSelectNearbyPlaceRef.current?.(null);
						zoomToDefault();
					}
				}, 60);
			});

			mapRef.current = map;
			setMapReady(true);

			setTimeout(() => {
				map.invalidateSize();
			}, 150);
		});

		return () => {
			destroyed = true;
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];
			markersMapRef.current.clear();
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
			setMapReady(false);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ── EFFECT 2: Render Markers ─────────────────────────────────────────────
	useEffect(() => {
		if (!mapReady || !mapRef.current) return;
		let mounted = true;

		import("leaflet").then((L) => {
			if (!mounted || !mapRef.current) return;
			const map = mapRef.current;

			// Clear old markers
			markersRef.current.forEach((m) => m.remove());
			markersRef.current = [];
			markersMapRef.current.clear();

			// 1. Property pin (red, prominent, always on top)
			for (const prop of mapPoints) {
				const [lat, lng] = prop.coordinates;
				const propId = `prop-${prop.id}`;

				const popupHtml = `
					<div style="padding:16px 18px;min-width:240px;max-width:280px;font-family:inherit;background:#ffffff;">
						<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding-right:18px;">
							<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:rgba(222,20,28,0.1);color:#DE141C;">
								<span style="width:6px;height:6px;border-radius:50%;background:#DE141C;"></span>
								${prop.type || "Featured Property"}
							</span>
						</div>
						<div style="font-size:14px;font-weight:700;line-height:1.35;color:#111;margin-bottom:4px;">
							${prop.title}
						</div>
						${prop.price ? `<div style="font-size:14px;font-weight:700;color:#DE141C;margin-bottom:4px;">₱${Number(prop.price).toLocaleString()}</div>` : ""}
						${prop.location ? `<div style="font-size:11px;color:#737373;line-height:1.4;margin-bottom:12px;">📍 ${prop.location}</div>` : `<div style="height:6px;"></div>`}
						<button type="button" onclick="window.dispatchEvent(new CustomEvent('open-inquire-card')); const el = document.getElementById('inquire-us-container'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const inp = el.querySelector('input'); if (inp) inp.focus(); }" style="display:flex;align-items:center;justify-content:center;width:100%;padding:8px 14px;border-radius:10px;background:#DE141C;color:#ffffff;font-size:11px;font-weight:600;border:none;cursor:pointer;transition:background 0.15s ease;">
							Inquire About Property
						</button>
					</div>
				`;

				const marker = L.marker([lat, lng], {
					icon: createPropertyIcon(L, prop),
					zIndexOffset: 1000,
				}).addTo(map);

				marker.bindPopup(popupHtml, {
					offset: [0, -8],
					closeButton: true,
					autoPan: false,
					maxWidth: 300,
					minWidth: 240,
					className: "jewellz-modern-popup",
				});

				marker.on("click", () => {
					isOpeningPopupRef.current = true;
					map.setView([lat, lng], 16, { animate: true });
					setTimeout(() => {
						isOpeningPopupRef.current = false;
					}, 350);
				});

				markersRef.current.push(marker);
				markersMapRef.current.set(propId, { marker, coords: [lat, lng] });
			}

			// 2. Nearby pins (smaller, coloured by category, beneath property pin)
			for (const place of displayedNearbyPlaces) {
				const color = nearbyIconColor(place.category);

				const popupHtml = `
					<div style="padding:16px 18px;min-width:240px;max-width:280px;font-family:inherit;background:#ffffff;">
						<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;padding-right:18px;">
							<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:${color}18;color:${color};">
								<span style="width:6px;height:6px;border-radius:50%;background:${color};"></span>
								${place.category}
							</span>
							<span style="font-size:11px;font-weight:600;color:#666;white-space:nowrap;">
								📍 ${formatDistance(place.distanceMeters)}
							</span>
						</div>
						<div style="font-size:14px;font-weight:700;line-height:1.35;color:#111;margin-bottom:4px;word-break:break-word;">
							${place.name}
						</div>
						${place.address ? `<div style="font-size:11px;line-height:1.4;color:#737373;margin-bottom:12px;">${place.address}</div>` : `<div style="height:6px;"></div>`}
						<a href="https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px 14px;border-radius:10px;background:#111111;color:#ffffff;font-size:11px;font-weight:600;text-decoration:none;">
							<span>Get Directions</span>
							<svg viewBox="0 0 24 24" style="width:13px;height:13px;" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<line x1="5" y1="12" x2="19" y2="12"></line>
								<polyline points="12 5 19 12 12 19"></polyline>
							</svg>
						</a>
					</div>
				`;

				const marker = L.marker([place.latitude, place.longitude], {
					icon: createNearbyIcon(L, place.category),
					zIndexOffset: 500,
				}).addTo(map);

				marker.bindPopup(popupHtml, {
					offset: [0, -6],
					closeButton: true,
					autoPan: false,
					maxWidth: 300,
					minWidth: 240,
					className: "jewellz-modern-popup",
				});

				marker.on("click", () => {
					isOpeningPopupRef.current = true;
					map.setView([place.latitude, place.longitude], 16, { animate: true });
					onSelectNearbyPlaceRef.current?.(place);
					setTimeout(() => {
						isOpeningPopupRef.current = false;
					}, 350);
				});

				markersRef.current.push(marker);
				markersMapRef.current.set(place.id, { marker, coords: [place.latitude, place.longitude] });
			}

			// If a place was already selected when markers were created, open its popup now!
			if (focusedNearbyPlaceRef.current) {
				const entry = markersMapRef.current.get(focusedNearbyPlaceRef.current.id);
				if (entry) {
					isOpeningPopupRef.current = true;
					entry.marker.openPopup();
					map.setView(entry.coords, 16, { animate: true });
					setTimeout(() => {
						isOpeningPopupRef.current = false;
					}, 350);
				}
			} else {
				zoomToDefault();
			}
		});

		return () => { mounted = false; };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mapReady, mapPoints, displayedNearbyPlaces]);

	// ── EFFECT 3: React to focusedNearbyPlace changes ────────────────────────
	useEffect(() => {
		if (!mapRef.current || !mapReady) return;
		const map = mapRef.current;

		if (!focusedNearbyPlace) {
			map.closePopup();
			zoomToDefault();
			return;
		}

		const entry = markersMapRef.current.get(focusedNearbyPlace.id);
		if (entry) {
			isOpeningPopupRef.current = true;
			entry.marker.openPopup();
			map.setView(entry.coords, 16, { animate: true });
			setTimeout(() => {
				isOpeningPopupRef.current = false;
			}, 350);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [focusedNearbyPlace, mapReady]);

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
