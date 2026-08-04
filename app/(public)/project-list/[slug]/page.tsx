import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";

import { getCachedNearbyPlaceGroups } from "@/lib/nearby-cache";
import { getNearbyPlaceGroups } from "@/lib/nearby-places";
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

	const [latitude, longitude] = property.coordinates ?? [];

	const [relatedProperties, nearbyGroups] = await Promise.all([
		getSupabaseRelatedProperties(property.id, { category: property.type, limit: 3 }),
		getCachedNearbyPlaceGroups(property.id).then(
			(cached) =>
				cached ??
				getNearbyPlaceGroups({ latitude, longitude, propertyType: property.type }),
		),
	]);
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
			property={property}
			galleryImages={galleryImages}
			nearbyGroups={nearbyGroups}
			relatedProperties={fallbackRelatedProperties}
		/>
	);
}
