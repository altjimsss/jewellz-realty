"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Property } from "@/types/property";

type PropertyMapPreviewProps = {
	properties: Property[];
	mapHeightClassName?: string;
};

type GeocodeResult = {
	lat: string;
	lon: string;
	display_name?: string;
};

const fallbackCenter: [number, number] = [13.7563, 121.0583];

type PropertyWithCoordinates = Property & {
	coordinates: [number, number];
};

function formatLocationLabel(location: string) {
	const value = location.trim();
	if (!value) return "Unknown area";

	return value.split(",")[0]?.trim() || value;
}

function createPinIcon(leaflet: typeof import("leaflet")) {
	return leaflet.divIcon({
		className: "",
		html: `
			<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#DE141C;color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.24);border:3px solid #fff;">
				<div style="width:8px;height:8px;border-radius:9999px;background:#fff;"></div>
			</div>
		`,
		iconSize: [30, 30],
		iconAnchor: [15, 30],
		popupAnchor: [0, -28],
	});
	}

	export function PropertyMapPreview({ properties, mapHeightClassName = "h-[520px]" }: PropertyMapPreviewProps) {
	const mapElementRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<LeafletMap | null>(null);
	const markerRefs = useRef<Marker[]>([]);
	const mapPoints = useMemo(
		() => properties.filter((property): property is PropertyWithCoordinates => Boolean(property.coordinates)),
		[properties],
	);
	const locationLabels = useMemo(() => {
		const uniqueLocations = new Set<string>();

		mapPoints.forEach((property) => {
			uniqueLocations.add(formatLocationLabel(property.location ?? ""));
		});

		return Array.from(uniqueLocations).slice(0, 3);
	}, [mapPoints]);
	const hiddenLocationCount = Math.max(0, new Set(mapPoints.map((property) => formatLocationLabel(property.location ?? ""))).size - locationLabels.length);
	const center = mapPoints[0]?.coordinates ?? fallbackCenter;
	const hasPins = mapPoints.length > 0;
	const statusTitle = hasPins ? `${mapPoints.length} pinned result${mapPoints.length === 1 ? "" : "s"}` : "No pinned results";
	const statusMessage = hasPins
		? "All matched locations stay pinned on the map. Zoom to compare nearby properties or open a marker for the full listing card."
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

			pins.forEach((property) => {
				const marker = leaflet.marker(property.coordinates, {
					icon: createPinIcon(leaflet),
					}).addTo(mapInstance);

				marker.bindPopup(`<strong>${property.title}</strong><br />${property.location ?? "Location unavailable"}`);
				markerRefs.current.push(marker);
			});

			if (pins.length > 1) {
				const bounds = leaflet.latLngBounds(pins.map((property) => property.coordinates));
				mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
			}
		}

		loadLeaflet();

		return () => {
			cancelled = true;
			mapRef.current?.invalidateSize();
		};
	}, [center, mapPoints]);

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