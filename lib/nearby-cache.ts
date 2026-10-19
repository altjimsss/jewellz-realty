import { supabaseServer } from "@/lib/supabase/server";
import { nearbyCategories, type NearbyCategory, type NearbyPlace, type NearbyPlaceGroup } from "@/lib/nearby-places";

type CachedNearbyRow = {
	category: NearbyCategory;
	name: string;
	distance_meters: number;
	latitude: number | string | null;
	longitude: number | string | null;
	address: string | null;
	map_uri: string | null;
};

/**
 * Reads nearby places for a property from the cached `property_nearby_places`
 * table. Returns null when no cache exists so callers can fall back to a
 * client-side MapLibre queryRenderedFeatures lookup.
 */
export async function getCachedNearbyPlaceGroups(
	propertyId: string,
): Promise<NearbyPlaceGroup[] | null> {
	const { data, error } = await supabaseServer
		.from("property_nearby_places")
		.select("category, name, distance_meters, latitude, longitude, address, map_uri")
		.eq("property_id", propertyId)
		.order("distance_meters", { ascending: true });

	if (error) {
		console.error("Failed to load cached nearby places", error.message);
		return null;
	}

	if (!data || data.length === 0) return null;

	const rows = data as CachedNearbyRow[];

	// A cache missing both Education and Health was saved from an incomplete
	// query. Treat it as stale so the client-side lookup rebuilds it.
	const hasCategory = (c: NearbyCategory) => rows.some((r) => r.category === c);
	if (!hasCategory("Education") && !hasCategory("Health")) return null;

	return nearbyCategories.map(({ category }) => ({
		category,
		places: rows
			.filter((r) => r.category === category)
			.slice(0, 8)
			.map((r) => ({
				id: `${r.category}-${r.name}`,
				name: r.name,
				category: r.category,
				distanceMeters: r.distance_meters,
				latitude: Number(r.latitude ?? 0),
				longitude: Number(r.longitude ?? 0),
				address: r.address ?? undefined,
				googleMapsUri: r.map_uri ?? undefined,
			})),
	}));
}

/**
 * Persists nearby places found by the client-side MapLibre lookup so later
 * page loads serve cached data from the server (instant, no map query needed).
 */
export async function saveNearbyPlaceGroups(propertyId: string, groups: NearbyPlaceGroup[]) {
	const places: {
		property_id: string;
		category: NearbyCategory;
		name: string;
		distance_meters: number;
		latitude: number;
		longitude: number;
		address: string | null;
		map_uri: string | null;
		source: string;
		fetched_at: string;
	}[] = groups.flatMap((group) =>
		group.places.map((place: NearbyPlace) => ({
			property_id: propertyId,
			category: group.category,
			name: place.name,
			distance_meters: place.distanceMeters,
			latitude: place.latitude,
			longitude: place.longitude,
			address: place.address ?? null,
			map_uri: place.googleMapsUri ?? null,
			source: "maplibre",
			fetched_at: new Date().toISOString(),
		})),
	);

	const { error: deleteError } = await supabaseServer
		.from("property_nearby_places")
		.delete()
		.eq("property_id", propertyId);

	if (deleteError) {
		console.error("Failed to clear nearby cache", deleteError.message);
		return;
	}

	if (places.length === 0) return;

	const { error: insertError } = await supabaseServer.from("property_nearby_places").insert(places);
	if (insertError) {
		console.error("Failed to save nearby cache", insertError.message);
	}
}
