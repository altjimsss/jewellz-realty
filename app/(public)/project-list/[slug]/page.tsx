import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";

import { getCachedNearbyPlaceGroups } from "@/lib/nearby-cache";
import { geocodeLocation, nearbyCategories } from "@/lib/nearby-places";
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

	// Read the nearby cache only — never block the page on OpenStreetMap
	// (Overpass can take 30s+ when rate-limited). When the cache is empty the
	// PropertyLocationMap client fetches /api/nearby and warms it.
	const [relatedProperties, cachedNearbyGroups] = await Promise.all([
		getSupabaseRelatedProperties(property.id, { category: property.type, limit: 3 }),
		getCachedNearbyPlaceGroups(property.id),
	]);
	const nearbyGroups = cachedNearbyGroups ?? nearbyCategories.map(({ category }) => ({ category, places: [] }));

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
