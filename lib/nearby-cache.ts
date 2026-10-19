import { supabaseServer } from "@/lib/supabase/server";
import {
	nearbyCategories,
	type NearbyCategory,
	type NearbyPlace,
	type NearbyPlaceGroup,
} from "@/lib/nearby-places";

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
 * table (populated by /api/admin/property-nearby-cache). Returns null when no
 * cache exists yet so callers can fall back to a live Overpass fetch.
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

	if (!data || data.length === 0) {
		return null; // no cache yet — caller should fall back to a live fetch
	}

	const rows = data as CachedNearbyRow[];

	return nearbyCategories.map(({ category }) => ({
		category,
		places: rows
			.filter((row) => row.category === category)
			.slice(0, 3)
			.map((row) => ({
				id: `${row.category}-${row.name}`,
				name: row.name,
				category: row.category,
				distanceMeters: row.distance_meters,
				latitude: Number(row.latitude ?? 0),
				longitude: Number(row.longitude ?? 0),
				address: row.address ?? undefined,
				googleMapsUri: row.map_uri ?? undefined,
			})),
	}));
}

/**
 * Persists freshly fetched nearby places so later page loads skip the live
 * Overpass fetch. Replaces any previous rows for the property.
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
			source: "openstreetmap",
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
