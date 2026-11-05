"use client";

import { useEffect, useRef } from "react";
import {
	haversineMeters,
	nearbyCategories,
	nearbyRadiusForPropertyType,
	poiClassToCategory,
	type NearbyCategory,
	type NearbyPlace,
	type NearbyPlaceGroup,
} from "@/lib/nearby-places";
import type { Property } from "@/types/property";

const STADIA_KEY =
	process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY ||
	"292b5eae-f656-470c-a59d-6a24c1ea49ae";
const MAP_STYLE = "https://tiles.stadiamaps.com/styles/alidade_smooth.json?api_key=" + STADIA_KEY;

type Props = {
	property: Property;
	onPlacesFound: (groups: NearbyPlaceGroup[]) => void;
};

/** Uses MapLibre's rendered POIs to populate nearby places when cache data is absent. */
export function NearbyPoiDiscovery({ property, onPlacesFound }: Props) {
	const mapElement = useRef<HTMLDivElement>(null);
	const placesFound = useRef(onPlacesFound);
	placesFound.current = onPlacesFound;

	useEffect(() => {
		if (!mapElement.current || !property.coordinates) return;
		let map: { remove: () => void } | null = null;
		let cancelled = false;

		void import("maplibre-gl").then((maplibre) => {
			if (cancelled || !mapElement.current) return;
			const [latitude, longitude] = property.coordinates!;
			const discoveryMap = new maplibre.Map({
				container: mapElement.current,
				style: MAP_STYLE,
				center: [longitude, latitude],
				zoom: 14,
				interactive: false,
				attributionControl: false,
				preserveDrawingBuffer: false,
			});
			map = discoveryMap;

			discoveryMap.once("idle", () => {
				if (cancelled) return;
				const poiLayers = (discoveryMap.getStyle().layers ?? [])
					.filter((layer) => "source-layer" in layer && layer["source-layer"] === "poi")
					.map((layer) => layer.id);
				if (!poiLayers.length) return;

				const radius = nearbyRadiusForPropertyType(property.type);
				const grouped = new Map<NearbyCategory, NearbyPlace[]>(
					nearbyCategories.map(({ category }) => [category, []]),
				);
				const seen = new Set<string>();
				const features = discoveryMap.queryRenderedFeatures(undefined, {
					layers: poiLayers,
					filter: ["has", "name"],
				});

				for (const feature of features) {
					if (feature.geometry.type !== "Point") continue;
					const props = (feature.properties ?? {}) as Record<string, unknown>;
					const name = String(props.name ?? "").trim();
					if (!name) continue;
					const category = ["class", "subclass", "amenity", "shop", "tourism", "historic"]
						.map((key) => poiClassToCategory[String(props[key] ?? "").toLowerCase()])
						.find((match) => match !== undefined);
					if (!category) continue;

					const [lng, lat] = feature.geometry.coordinates as [number, number];
					const distanceMeters = haversineMeters(latitude, longitude, lat, lng);
					if (distanceMeters > radius) continue;
					const key = category + "|" + name.toLowerCase();
					if (seen.has(key)) continue;
					seen.add(key);
					grouped.get(category)!.push({
						id: "maplibre-" + (feature.id ?? key),
						name,
						category,
						distanceMeters,
						latitude: lat,
						longitude: lng,
					});
				}

				const groups = nearbyCategories.map(({ category }) => ({
					category,
					places: (grouped.get(category) ?? [])
						.sort((a, b) => a.distanceMeters - b.distanceMeters)
						.slice(0, 8),
				}));
				if (groups.some((group) => group.places.length > 0)) {
					placesFound.current(groups);
				}
			});
		}).catch((error) => {
			console.error("MapLibre nearby-place discovery failed", error);
		});

		return () => {
			cancelled = true;
			map?.remove();
		};
	}, [property.id, property.type, property.coordinates]);

	return (
		<div
			ref={mapElement}
			aria-hidden="true"
			style={{
				position: "fixed",
				left: "-2000px",
				top: 0,
				width: 1024,
				height: 1024,
				overflow: "hidden",
				pointerEvents: "none",
			}}
		/>
	);
}
