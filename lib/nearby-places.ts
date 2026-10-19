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

type TagCondition = {
	key: string;
	value?: string;
	regex?: string;
	exists?: boolean;
};

export const nearbyCategories: { category: NearbyCategory; filters: TagCondition[] }[] = [
	{
		category: "Education",
		filters: [{ key: "amenity", regex: "^(school|college|university|kindergarten)$" }],
	},
	{
		category: "Health",
		filters: [{ key: "amenity", regex: "^(hospital|clinic|doctors|pharmacy|dentist)$" }],
	},
	{
		category: "Food",
		filters: [
			{ key: "amenity", regex: "^(restaurant|cafe|fast_food|food_court|bar)$" },
			{ key: "shop", value: "bakery" },
		],
	},
	{
		category: "Culture",
		filters: [
			{ key: "tourism", regex: "^(museum|attraction)$" },
			{ key: "amenity", regex: "^(arts_centre|community_centre|place_of_worship|theatre)$" },
			{ key: "historic", exists: true },
		],
	},
];

type OverpassElement = {
	type: string;
	id: number;
	lat?: number;
	lon?: number;
	center?: {
		lat?: number;
		lon?: number;
	};
	tags?: Record<string, string | undefined>;
};

const overpassEndpoints = [
	"https://overpass-api.de/api/interpreter",
	"https://maps.mail.ru/osm/tools/overpass/api/interpreter",
	"https://overpass.kumi.systems/api/interpreter",
	"https://z.overpass-api.de/api/interpreter",
];

function toOverpassFilter(condition: TagCondition) {
	if (condition.regex) return `["${condition.key}"~"${condition.regex}"]`;
	if (condition.value != null) return `["${condition.key}"="${condition.value}"]`;
	return `["${condition.key}"]`;
}

function matchesCondition(tags: Record<string, string | undefined>, condition: TagCondition) {
	const tagValue = tags[condition.key];
	if (tagValue == null || tagValue === "") return false;
	if (condition.regex) return new RegExp(condition.regex).test(tagValue);
	if (condition.value != null) return tagValue === condition.value;
	return true;
}

function distanceMeters(originLatitude: number, originLongitude: number, placeLatitude: number, placeLongitude: number) {
	const earthRadiusMeters = 6371000;
	const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
	const latitudeDelta = toRadians(placeLatitude - originLatitude);
	const longitudeDelta = toRadians(placeLongitude - originLongitude);
	const originLatRad = toRadians(originLatitude);
	const placeLatRad = toRadians(placeLatitude);
	const haversine =
		Math.sin(latitudeDelta / 2) ** 2 +
		Math.cos(originLatRad) * Math.cos(placeLatRad) * Math.sin(longitudeDelta / 2) ** 2;

	return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function nearbyRadiusForPropertyType(propertyType?: string) {
	const normalizedType = propertyType?.toLowerCase() ?? "";

	if (normalizedType.includes("farm")) return 10000;
	if (normalizedType.includes("lot")) return 5000;
	if (normalizedType.includes("memorial")) return 5000;
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

/**
 * Fetches every nearby category in a single Overpass request. Firing one
 * request per category trips Overpass rate limits (which silently return
 * nothing within a short timeout), so the categories share one query instead.
 */
async function fetchNearbyElements({
	latitude,
	longitude,
	radiusMeters,
}: {
	latitude: number;
	longitude: number;
	radiusMeters: number;
}) {
	const overpassFilters = nearbyCategories
		.flatMap(({ filters }) => filters)
		.map((condition) => `nw(around:${radiusMeters},${latitude},${longitude})${toOverpassFilter(condition)};`)
		.join("\n");
	const query = `
		[out:json][timeout:25];
		(
			${overpassFilters}
		);
		out center tags 60;
	`;
	let payload: { elements?: OverpassElement[] } | null = null;

	for (const endpoint of overpassEndpoints) {
		const controller = new AbortController();
		// Overpass commonly needs well over 5s on rate-limited connections.
		const timeoutId = setTimeout(() => controller.abort(), 25000);

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
					"User-Agent": "JewellzRealty/1.0",
				},
				body: `data=${encodeURIComponent(query)}`,
				signal: controller.signal,
			});

			if (!response.ok) {
				continue;
			}

			payload = (await response.json()) as { elements?: OverpassElement[] };
			break;
		} catch {
			continue;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	return payload?.elements ?? [];
}

async function fetchGooglePlacesCategory({
	latitude,
	longitude,
	radiusMeters,
	category,
	apiKey,
}: {
	latitude: number;
	longitude: number;
	radiusMeters: number;
	category: NearbyCategory;
	apiKey: string;
}): Promise<NearbyPlace[]> {
	const categoryTypes: Record<NearbyCategory, string[]> = {
		Education: ["school", "university", "secondary_school", "primary_school"],
		Health: ["hospital", "doctor", "pharmacy"],
		Food: ["restaurant", "cafe", "bakery"],
		Culture: ["place_of_worship", "museum", "tourist_attraction"],
	};

	try {
		const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask": "places.id,places.displayName,places.location,places.formattedAddress,places.googleMapsUri",
			},
			body: JSON.stringify({
				includedTypes: categoryTypes[category],
				maxResultCount: 5,
				locationRestriction: {
					circle: {
						center: { latitude, longitude },
						radius: radiusMeters,
					},
				},
			}),
		});

		if (!response.ok) return [];

		const data = (await response.json()) as {
			places?: {
				id: string;
				displayName?: { text?: string };
				location?: { latitude?: number; longitude?: number };
				formattedAddress?: string;
				googleMapsUri?: string;
			}[];
		};

		return (data.places ?? [])
			.map((place) => {
				const pLat = place.location?.latitude;
				const pLng = place.location?.longitude;
				const name = place.displayName?.text;
				if (pLat == null || pLng == null || !name) return null;

				const nearby: NearbyPlace = {
					id: `google-${place.id}`,
					name,
					category,
					distanceMeters: distanceMeters(latitude, longitude, pLat, pLng),
					latitude: pLat,
					longitude: pLng,
					address: place.formattedAddress,
					googleMapsUri: place.googleMapsUri,
				};
				return nearby;
			})
			.filter((p): p is NearbyPlace => Boolean(p))
			.sort((a, b) => a.distanceMeters - b.distanceMeters)
			.slice(0, 3);
	} catch {
		return [];
	}
}

export async function getNearbyPlaceGroups({
	latitude,
	longitude,
	propertyType,
}: {
	latitude?: number;
	longitude?: number;
	propertyType?: string;
}): Promise<NearbyPlaceGroup[]> {
	if (latitude == null || longitude == null) {
		return nearbyCategories.map(({ category }) => ({ category, places: [] }));
	}

	const radiusMeters = nearbyRadiusForPropertyType(propertyType);
	const googleApiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

	if (googleApiKey) {
		try {
			const googleGroups = await Promise.all(
				nearbyCategories.map(async ({ category }) => ({
					category,
					places: await fetchGooglePlacesCategory({ latitude, longitude, radiusMeters, category, apiKey: googleApiKey }),
				})),
			);
			if (googleGroups.some((g) => g.places.length > 0)) {
				return googleGroups;
			}
		} catch {
			// Fall back to OpenStreetMap Overpass
		}
	}

	const elements = await fetchNearbyElements({ latitude, longitude, radiusMeters });

	const placesByCategory = new Map<NearbyCategory, NearbyPlace[]>(
		nearbyCategories.map(({ category }) => [category, []]),
	);

	for (const element of elements) {
		const placeLatitude = element.lat ?? element.center?.lat;
		const placeLongitude = element.lon ?? element.center?.lon;
		const tags = element.tags ?? {};
		const name = tags.name;

		if (placeLatitude == null || placeLongitude == null || !name) {
			continue;
		}

		const matchedCategories = nearbyCategories.filter(({ filters }) =>
			filters.some((condition) => matchesCondition(tags, condition)),
		);

		for (const { category } of matchedCategories) {
			const place: NearbyPlace = {
				id: `${element.type}-${element.id}`,
				name,
				category,
				distanceMeters: distanceMeters(latitude, longitude, placeLatitude, placeLongitude),
				latitude: placeLatitude,
				longitude: placeLongitude,
				googleMapsUri: `https://www.openstreetmap.org/${element.type}/${element.id}`,
			};

			const address = [tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", ");
			if (address) {
				place.address = address;
			}

			placesByCategory.get(category)?.push(place);
		}
	}

	return nearbyCategories.map(({ category }) => ({
		category,
		places: (placesByCategory.get(category) ?? [])
			.sort((first, second) => first.distanceMeters - second.distanceMeters)
			.slice(0, 3),
	}));
}
