export type NearbyCategory = "Education" | "Health" | "Food" | "Culture";

export type NearbyPlace = {
	id: string;
	name: string;
	category: NearbyCategory;
	distanceMeters: number;
	latitude: number;
	longitude: number;
	address?: string;
	googleMapsUri?: string;
};

export type NearbyPlaceGroup = {
	category: NearbyCategory;
	places: NearbyPlace[];
};

export const nearbyCategories: { category: NearbyCategory }[] = [
	{ category: "Education" },
	{ category: "Health" },
	{ category: "Food" },
	{ category: "Culture" },
];

/**
 * Maps OpenMapTiles POI `class` / `subclass` values (used in Stadia Maps vector
 * tiles) to our four display categories. These are the values returned by
 * map.queryRenderedFeatures() from the `poi` source layer.
 */
export const poiClassToCategory: Record<string, NearbyCategory> = {
	// Education
	school: "Education",
	college: "Education",
	university: "Education",
	kindergarten: "Education",
	childcare: "Education",
	// Health
	hospital: "Health",
	pharmacy: "Health",
	doctor: "Health",
	dentist: "Health",
	clinic: "Health",
	healthcare: "Health",
	// Food
	restaurant: "Food",
	cafe: "Food",
	fast_food: "Food",
	food_court: "Food",
	bar: "Food",
	pub: "Food",
	bakery: "Food",
	supermarket: "Food",
	convenience: "Food",
	marketplace: "Food",
	grocery: "Food",
	// Culture
	place_of_worship: "Culture",
	museum: "Culture",
	attraction: "Culture",
	bank: "Culture",
	atm: "Culture",
	theatre: "Culture",
	arts_centre: "Culture",
	community_centre: "Culture",
	townhall: "Culture",
	viewpoint: "Culture",
	gallery: "Culture",
	historic: "Culture",
	monument: "Culture",
};

export function nearbyRadiusForPropertyType(propertyType?: string) {
	const t = propertyType?.toLowerCase() ?? "";
	if (t.includes("farm")) return 10000;
	if (t.includes("lot")) return 5000;
	if (t.includes("memorial")) return 5000;
	return 3000;
}

export async function geocodeLocation(query: string): Promise<[number, number] | null> {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) return null;

	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmedQuery)}`,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": "JewellzRealty/1.0",
				},
				next: { revalidate: 60 * 60 * 24 },
			},
		);

		if (!response.ok) return null;

		const results = (await response.json()) as { lat?: string; lon?: string }[];
		const first = results[0];
		const latitude = Number(first?.lat);
		const longitude = Number(first?.lon);

		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
		return [latitude, longitude];
	} catch {
		return null;
	}
}

export function formatDistance(meters: number) {
	if (meters < 1000) return `${meters} m`;
	return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

/** Haversine distance in metres between two WGS-84 points. */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
