import type { Property } from "@/types/property";
import { getPropertyBySlug } from "@/lib/sample-properties";
import { getPublishedProperties, getPublishedPropertyBySlug } from "@/lib/supabase/properties";
import { getCachedNearbyPlaceGroups } from "@/lib/nearby-cache";
import { formatDistance } from "@/lib/nearby-places";

export type PropertyChatRole = "user" | "assistant";

export type PropertyChatMessage = {
	role: PropertyChatRole;
	content: string;
};

export type PropertyChatRequestBody = {
	slug: string;
	message: string;
	history: PropertyChatMessage[];
};

export type PropertyChatResponse = {
	content: string;
	fallbackReply: string;
	propertyTitle: string;
};

export type PropertyChatContext = {
	property: Property;
	summary: string;
	comparisonSummary: string;
	nearbyContext: string;
};

function normalizeText(value: unknown) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed || null;
}

function isPropertyChatMessage(value: unknown): value is PropertyChatMessage {
	if (!value || typeof value !== "object") return false;

	const candidate = value as Record<string, unknown>;
	return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
}

export function parsePropertyChatRequestBody(value: unknown): PropertyChatRequestBody | null {
	if (!value || typeof value !== "object") return null;

	const candidate = value as Record<string, unknown>;
	const slug = normalizeText(candidate.slug);
	const message = normalizeText(candidate.message);
	const history = Array.isArray(candidate.history) ? candidate.history.filter(isPropertyChatMessage).slice(-4) : [];

	if (!slug || !message) {
		return null;
	}

	return { slug, message, history };
}

function propertyToSummary(property: Property) {
	const specs = property.specs?.map((spec) => `${spec.label}: ${spec.value}`).join("; ") || "No extra specs provided.";
	const images = property.images?.length ? `${property.images.length} gallery image(s) available.` : "No gallery images available.";
	const description = property.description ?? "No long-form description was provided for this listing.";
	const coords = property.coordinates ? `Coordinates: ${property.coordinates[0]}, ${property.coordinates[1]}` : "No map coordinates available.";

	return [
		`Title: ${property.title}`,
		`Location: ${property.location ?? "Location not specified"}`,
		`Type: ${property.type ?? "Property"}`,
		`Category: ${property.category ?? "Listing"}`,
		`Price: PHP ${property.price.toLocaleString()}`,
		`Bedrooms: ${property.beds ?? "N/A"}`,
		`Bathrooms: ${property.baths ?? "N/A"}`,
		`Area: ${property.areaSqm ? `${property.areaSqm} sqm` : "N/A"}`,
		`Specs: ${specs}`,
		`Gallery: ${images}`,
		`${coords}`,
		`Description: ${description}`,
	].join("\n");
}

function scoreComparableProperty(current: Property, candidate: Property) {
	let score = 0;

	if (candidate.id === current.id) return -Infinity;
	if (current.type && candidate.type === current.type) score += 35;
	if (current.location && candidate.location && candidate.location.toLowerCase().includes(current.location.split(",")[0]?.toLowerCase() ?? "")) score += 20;
	if (current.beds != null && candidate.beds != null && Math.abs(candidate.beds - current.beds) <= 1) score += 10;
	if (current.price > 0 && candidate.price > 0) {
		const priceDelta = Math.abs(candidate.price - current.price) / Math.max(current.price, candidate.price);
		score += Math.max(0, 25 - Math.round(priceDelta * 35));
	}

	return score;
}

function buildComparisonSummary(property: Property, properties: Property[]) {
	const comparableProperties = properties
		.map((candidate) => ({ property: candidate, score: scoreComparableProperty(property, candidate) }))
		.filter((item) => Number.isFinite(item.score))
		.sort((first, second) => second.score - first.score)
		.slice(0, 5)
		.map(({ property: item }) =>
			[
				`- ${item.title}`,
				`type: ${item.type ?? "N/A"}`,
				`location: ${item.location ?? "N/A"}`,
				`price: PHP ${item.price.toLocaleString()}`,
				`beds: ${item.beds ?? "N/A"}`,
				`baths: ${item.baths ?? "N/A"}`,
				`area: ${item.areaSqm ? `${item.areaSqm} sqm` : "N/A"}`,
			].join(" | "),
		);

	return comparableProperties.length ? comparableProperties.join("\n") : "No comparable published listings are available.";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPlaceRow = Record<string, any>;

async function buildNearbyContext(property: Property): Promise<string> {
	if (!property.id) return "Nearby places data not available.";

	try {
		const groups = await getCachedNearbyPlaceGroups(property.id);
		if (!groups || groups.length === 0) return "No nearby places data cached yet for this property.";

		const lines = groups
			.filter((group) => group.places.length > 0)
			.map((group) => {
				const placeList = group.places
					.slice(0, 5)
					.map((place: AnyPlaceRow) => {
						const distMeters = place.distanceMeters ?? 0;
						return `${place.name} (${formatDistance(distMeters)})`;
					})
					.join(", ");
				return `${group.category}: ${placeList}`;
			});

		return lines.length > 0 ? lines.join("\n") : "No nearby places found for this property.";
	} catch {
		return "Nearby places data unavailable.";
	}
}

export async function buildPropertyChatContext(slug: string): Promise<PropertyChatContext | null> {
	const property = await getPublishedPropertyBySlug(slug) ?? getPropertyBySlug(slug);

	if (!property) {
		return null;
	}

	const [publishedProperties, nearbyContext] = await Promise.all([
		getPublishedProperties(),
		buildNearbyContext(property),
	]);

	return {
		property,
		summary: propertyToSummary(property),
		comparisonSummary: buildComparisonSummary(property, publishedProperties),
		nearbyContext,
	};
}

export function buildPropertyChatConversation(history: PropertyChatMessage[]) {
	return history.length
		? history.map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`).join("\n")
		: "No previous conversation.";
}

export function buildPropertyChatPrompt(context: PropertyChatContext, message: string, conversation: string) {
	return [
		"You are the Jewellz Realty property assistant for buyers browsing a listing.",
		"Your job is to answer FAQs, explain listing details, help users decide fit, compare properties, and answer map or location-related questions.",
		"Use only the provided listing, nearby places, and comparison context. Do not invent fees, availability dates, financing terms, or legal details.",
		"If a detail is missing, say it is not listed and suggest booking an appointment or contacting Jewellz Realty.",
		"For viewings, contact requests, reservation, or exact availability, point the user to the Book an Appointment button or inquiry form.",
		"When asked about nearby places (schools, hospitals, restaurants, churches, malls, etc.), use the NEARBY PLACES section to give accurate answers with distances.",
		"When asked about the map or location, use the coordinates and nearby places to give helpful answers about the area.",
		"When comparing properties, mention price, type, location, bedrooms/bathrooms, area, and best-fit buyer.",
		"Keep answers helpful, concise, and practical.",
		"",
		"CURRENT LISTING CONTEXT",
		context.summary,
		"",
		"NEARBY PLACES (sourced from OpenStreetMap / Stadia Maps)",
		context.nearbyContext,
		"",
		"COMPARABLE PUBLISHED LISTINGS",
		context.comparisonSummary,
		"",
		"CONVERSATION",
		conversation,
		"",
		`USER QUESTION: ${message}`,
		"",
		"Write a direct answer with at most 5 short bullets or 3 short paragraphs.",
	].join("\n");
}

export function extractPropertyChatContent(value: unknown) {
	if (!value || typeof value !== "object") return null;

	const candidate = value as {
		choices?: Array<{ message?: { content?: unknown } }>;
	};

	const content = candidate.choices?.[0]?.message?.content;
	return typeof content === "string" ? content : null;
}
