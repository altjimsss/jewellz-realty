import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata } from "next";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";

import { getCachedNearbyPlaceGroups, saveNearbyPlaceGroups } from "@/lib/nearby-cache";
import { geocodeLocation, getNearbyPlaceGroups, nearbyCategories } from "@/lib/nearby-places";
import {
	SAMPLE_PROPERTIES,
	getPropertyBySlug,
	getRelatedProperties as getSampleRelatedProperties,
} from "@/lib/sample-properties";
import {
	getPublishedPropertyBySlug,
	getRelatedProperties as getSupabaseRelatedProperties,
} from "@/lib/supabase/properties";

type PageProps = {
	params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
	return SAMPLE_PROPERTIES.map((property) => ({ slug: property.slug }));
}

// Revalidate each property page in the background at most every 5 minutes.
// generateStaticParams() above still pre-builds all known slugs at build time,
// and newly published slugs are rendered on demand once, then cached.
export const revalidate = 300;

export const metadata: Metadata = {
	title: "Property Details | Jewellz Realty",
	description: "View property details, nearby places, recommendations, and inquiry options from Jewellz Realty.",
};

export default async function PropertyDetailPage({ params }: PageProps) {
	const { slug } = await params;
	const property = (await getPublishedPropertyBySlug(slug)) ?? getPropertyBySlug(slug);

	if (!property) {
		notFound();
	}

	// Resolve coordinates automatically: use stored lat/lng, or geocode the
	// location text so nearby pins work even when coordinates were never entered.
	let coordinates = property.coordinates;
	if (!coordinates && property.location) {
		coordinates = (await geocodeLocation(`${property.location}, Philippines`)) ?? undefined;
	}
	const propertyWithCoordinates = coordinates ? { ...property, coordinates } : property;

	const [relatedProperties, cachedNearbyGroups] = await Promise.all([
		getSupabaseRelatedProperties(property.id, { category: property.type, limit: 3 }),
		getCachedNearbyPlaceGroups(property.id),
	]);

	// No cache yet — fetch nearby places live from OpenStreetMap and persist
	// the result in the background so the next visit skips the fetch.
	let nearbyGroups = cachedNearbyGroups;
	if (!nearbyGroups) {
		nearbyGroups = coordinates
			? await getNearbyPlaceGroups({
					latitude: coordinates[0],
					longitude: coordinates[1],
					propertyType: property.type,
				})
			: nearbyCategories.map(({ category }) => ({ category, places: [] }));

		if (nearbyGroups.some((group) => group.places.length > 0)) {
			const groupsToCache = nearbyGroups;
			after(async () => {
				await saveNearbyPlaceGroups(property.id, groupsToCache);
			});
		}
	}

	const fallbackRelatedProperties = relatedProperties.length
		? relatedProperties
		: getSampleRelatedProperties(property.slug, 3);
	const galleryImages =
		property.images?.length
			? property.images
			: [property.image, ...fallbackRelatedProperties.map((item) => item.image)]
					.filter((image): image is string => Boolean(image))
					.slice(0, 3);

	return (
		<PropertyDetailContent
			property={propertyWithCoordinates}
			galleryImages={galleryImages}
			nearbyGroups={nearbyGroups}
			relatedProperties={fallbackRelatedProperties}
		/>
	);
}
