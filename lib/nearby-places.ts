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

export const nearbyCategories: { category: NearbyCategory; filters: string[] }[] = [
	{ category: "Education", filters: ['["amenity"~"^(school|college|university|kindergarten)$"]'] },
	{ category: "Health", filters: ['["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"]'] },
	{ category: "Food", filters: ['["amenity"~"^(restaurant|cafe|fast_food|food_court|bar)$"]', '["shop"="bakery"]'] },
	{ category: "Culture", filters: ['["tourism"~"^(museum|attraction)$"]', '["amenity"~"^(arts_centre|community_centre|place_of_worship|theatre)$"]', '["historic"]'] },
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
	"https://overpass.kumi.systems/api/interpreter",
	"https://z.overpass-api.de/api/interpreter",
];

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
	if (normalizedType.includes("memorial")) return 3000;
	return 1500;
}

export function formatDistance(meters: number) {
	if (meters < 1000) return `${meters} m`;
	return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

async function fetchCategoryPlaces({
	latitude,
	longitude,
	radiusMeters,
	category,
	filters,
}: {
	latitude: number;
	longitude: number;
	radiusMeters: number;
	category: NearbyCategory;
	filters: string[];
}) {
	const overpassFilters = filters
		.map((filter) => `nwr(around:${radiusMeters},${latitude},${longitude})${filter};`)
		.join("\n");
	const query = `
		[out:json][timeout:12];
		(
			${overpassFilters}
		);
		out center tags 20;
	`;
	let payload: { elements?: OverpassElement[] } | null = null;

	for (const endpoint of overpassEndpoints) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		try {
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
					"User-Agent": "JewellzRealty/1.0",
				},
				body: `data=${encodeURIComponent(query)}`,
				next: { revalidate: 60 * 60 * 24 },
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

	if (!payload) {
		return [];
	}

	return (payload.elements ?? [])
		.map((element) => {
			const placeLatitude = element.lat ?? element.center?.lat;
			const placeLongitude = element.lon ?? element.center?.lon;
			const name = element.tags?.name;

			if (placeLatitude == null || placeLongitude == null || !name) {
				return null;
			}

			const nearbyPlace: NearbyPlace = {
				id: `${element.type}-${element.id}`,
				name,
				category,
				distanceMeters: distanceMeters(latitude, longitude, placeLatitude, placeLongitude),
				latitude: placeLatitude,
				longitude: placeLongitude,
				googleMapsUri: `https://www.openstreetmap.org/${element.type}/${element.id}`,
			};

			const address = [element.tags?.["addr:street"], element.tags?.["addr:city"]].filter(Boolean).join(", ");
			if (address) {
				nearbyPlace.address = address;
			}

			return nearbyPlace;
		})
		.filter((place): place is NearbyPlace => Boolean(place))
		.sort((first, second) => first.distanceMeters - second.distanceMeters)
		.slice(0, 3);
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
	const groups = await Promise.all(
		nearbyCategories.map(async ({ category, filters }) => ({
			category,
			places: await fetchCategoryPlaces({
				latitude,
				longitude,
				radiusMeters,
				category,
				filters,
			}),
		})),
	);

	return groups;
}
