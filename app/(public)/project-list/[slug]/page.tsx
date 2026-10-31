import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";

import { getCachedNearbyPlaceGroups, saveNearbyPlaceGroups } from "@/lib/nearby-cache";
import { fetchNearbyPlacesFromStadia, geocodeLocation, nearbyCategories } from "@/lib/nearby-places";
import {
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

// Always render from the latest property row so CMS edits show up immediately.
export const dynamic = "force-dynamic";

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

	let nearbyGroups = cachedNearbyGroups;
	if (!nearbyGroups && propertyWithCoordinates.coordinates) {
		const [lat, lng] = propertyWithCoordinates.coordinates;
		nearbyGroups = await fetchNearbyPlacesFromStadia(lat, lng, property.type);
		// Asynchronously save to Supabase cache
		saveNearbyPlaceGroups(property.id, nearbyGroups).catch(() => {});
	}
	if (!nearbyGroups) {
		nearbyGroups = nearbyCategories.map(({ category }) => ({ category, places: [] }));
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
