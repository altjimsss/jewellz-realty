import type { Property } from "@/types/property";
import { getPropertyBySlug } from "@/lib/sample-properties";
import { getComparablePublishedProperties, getPublicPropertyAnalytics, getPublishedPropertyBySlug, type PublicPropertyAnalytics } from "@/lib/supabase/properties";
import { getCachedNearbyPlaceGroups, saveNearbyPlaceGroups } from "@/lib/nearby-cache";
import { formatDistance, fetchNearbyPlacesFromMapTiles, type NearbyPlaceGroup } from "@/lib/nearby-places";

export type PropertyChatRole = "user" | "assistant";

export type PropertyChatMessage = {
	role: PropertyChatRole;
	content: string;
};

export type PropertyChatRequestBody = {
	slug?: string;
	message: string;
	history: PropertyChatMessage[];
};

export type PropertyChatResponse = {
	content: string;
	fallbackReply: string;
	propertyTitle?: string;
};

export type PropertyChatContext = {
	property: Property;
	summary: string;
	comparisonSummary: string;
	nearbyContext: string;
	analyticsContext: string;
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

	if (!message) {
		return null;
	}

	return { ...(slug ? { slug } : {}), message, history };
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

const LISTING_QUERY_STOP_WORDS = new Set([
	"a", "an", "and", "are", "about", "available", "can", "do", "does", "find", "for", "have", "how", "i", "in", "is", "it", "list", "listing", "me", "our", "please", "property", "show", "tell", "the", "there", "this", "to", "we", "what", "with", "you", "your",
]);

function getNamedListingMatches(query: string, properties: Property[]) {
	const queryTerms = new Set(
		query.toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length > 2 && !LISTING_QUERY_STOP_WORDS.has(term)) ?? [],
	);
	if (!queryTerms.size) return [];

	return properties
		.map((property) => {
			const listingTerms = new Set(`${property.title} ${property.slug}`.toLowerCase().match(/[a-z0-9]+/g) ?? []);
			const matchedTerms = [...queryTerms].filter((term) => listingTerms.has(term));
			return { property, score: matchedTerms.length, matchedTerms };
		})
		.filter(({ score, matchedTerms }) => score >= 2 || matchedTerms.some((term) => term.length >= 7))
		.sort((first, second) => second.score - first.score)
		.slice(0, 3)
		.map(({ property }) => property);
}

function formatComparisonProperty(item: Property) {
	return [
		`- ${item.title}`,
		`slug: ${item.slug}`,
		`type: ${item.type ?? "N/A"}`,
		`location: ${item.location ?? "N/A"}`,
		`price: PHP ${item.price.toLocaleString()}`,
		`beds: ${item.beds ?? "N/A"}`,
		`baths: ${item.baths ?? "N/A"}`,
		`area: ${item.areaSqm ? `${item.areaSqm} sqm` : "N/A"}`,
		item.description ? `description: ${item.description.replace(/\s+/g, " ").trim().slice(0, 500)}` : null,
	].filter(Boolean).join(" | ");
}

function buildComparisonSummary(property: Property, properties: Property[], query: string) {
	const namedMatches = getNamedListingMatches(query, properties).filter((candidate) => candidate.id !== property.id);
	const similarProperties = properties
		.map((candidate) => ({ property: candidate, score: scoreComparableProperty(property, candidate) }))
		.filter((item) => Number.isFinite(item.score))
		.sort((first, second) => second.score - first.score)
		.slice(0, 5)
		.map(({ property: item }) => item);
	const includedProperties = [...new Map([...namedMatches, ...similarProperties].map((item) => [item.id, item])).values()];
	const formattedProperties = includedProperties.map(formatComparisonProperty);

	if (namedMatches.length) {
		return [`MATCHES FOR THE BUYER'S NAMED LISTINGS`, ...namedMatches.map(formatComparisonProperty), "OTHER SIMILAR LISTINGS", ...similarProperties.filter((item) => !namedMatches.some((match) => match.id === item.id)).map(formatComparisonProperty)].join("\n");
	}
	return formattedProperties.length ? formattedProperties.join("\n") : "No comparable published listings are available.";
}

function formatNearbyGroups(groups: NearbyPlaceGroup[]): string {
	const lines = groups
		.filter((group) => group.places.length > 0)
		.map((group) => {
			const placeList = group.places
				.slice(0, 5)
				.map((place) => `${place.name} (${formatDistance(place.distanceMeters)})`)
				.join(", ");
			return `${group.category}: ${placeList}`;
		});

	return lines.length > 0 ? lines.join("\n") : "";
}

async function buildNearbyContext(property: Property): Promise<string> {
	if (!property.id) return "Nearby places data not available for this property.";

	try {
		// Tier 1: Try the Supabase cache first (fast, no external call needed)
		const cached = await getCachedNearbyPlaceGroups(property.id);
		if (cached && cached.length > 0) {
			const formatted = formatNearbyGroups(cached);
			if (formatted) return formatted;
		}

		// Tier 2: Live lookup via Stadia Maps when coordinates are available
		const coords = property.coordinates;
		if (Array.isArray(coords) && coords.length === 2) {
			const [lat, lng] = coords;
			if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
				const liveGroups = await fetchNearbyPlacesFromMapTiles(lat, lng, property.type ?? undefined);
				const formatted = formatNearbyGroups(liveGroups);
				if (formatted) {
					// Save to cache in the background so next requests are instant
					saveNearbyPlaceGroups(property.id, liveGroups).catch(() => {});
					return formatted;
				}
			}
		}

		// Tier 3: No coordinates and no cache
		return "No nearby places data available. The property may not have map coordinates set yet.";
	} catch {
		return "Nearby places data could not be loaded at this time.";
	}
}

export async function buildPropertyChatContext(slug: string, listingQuery = ""): Promise<PropertyChatContext | null> {
	const publishedProperty = await getPublishedPropertyBySlug(slug);
	const property = publishedProperty ?? getPropertyBySlug(slug);

	if (!property) {
		return null;
	}

	const [publishedProperties, nearbyContext, analytics] = await Promise.all([
		getComparablePublishedProperties(),
		buildNearbyContext(property),
		publishedProperty ? getPublicPropertyAnalytics(publishedProperty.id) : Promise.resolve(null),
	]);

	return {
		property,
		summary: propertyToSummary(property),
		comparisonSummary: buildComparisonSummary(property, publishedProperties, listingQuery),
		nearbyContext,
		analyticsContext: buildAnalyticsSummary(analytics),
	};
}

export async function buildPropertyCatalogChatPrompt(message: string, conversation: string, listingQuery = message) {
	const properties = await getComparablePublishedProperties();
	const queryTerms = [...new Set(listingQuery.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
		.filter((term) => term.length > 2 && !LISTING_QUERY_STOP_WORDS.has(term));
	const namedMatches = getNamedListingMatches(listingQuery, properties);
	const rankedMatches = properties
		.map((property) => {
			const searchableText = `${property.title} ${property.slug} ${property.type ?? ""} ${property.subtype ?? ""} ${property.location ?? ""} ${property.description ?? ""}`.toLowerCase();
			const score = queryTerms.reduce((total, term) => total + (searchableText.includes(term) ? (property.title.toLowerCase().includes(term) ? 4 : 1) : 0), 0);
			return { property, score };
		})
		.filter(({ score }) => score > 0)
		.sort((first, second) => second.score - first.score)
		.slice(0, 8)
		.map(({ property }) => property);
	const selectedListings = [...new Map([...namedMatches, ...rankedMatches].map((property) => [property.id, property])).values()].slice(0, 8);
	const listingsText = selectedListings.length
		? selectedListings.map(formatComparisonProperty).join("\n")
		: "No published listings matched this request.";

	return [
		"You are Jewel, a friendly Jewellz Realty guide helping a buyer browse published property listings.",
		"Answer questions about listings using only the published listings supplied below. If the buyer names a specific listing, use the matching listing details and its exact slug. If no matching listing is supplied, say you could not find it in the published listings and offer to help search by another name or location.",
		"Do not invent prices, locations, property features, availability, fees, or legal details. Keep the answer conversational and concise. Do not use markdown tables.",
		"When a listing is named or recommended, append [ACTION:view-property:exact-slug:Property Name] using its exact slug from the list. Only suggest a booking action when the buyer asks to book or view a listing and the target listing is known; use [ACTION:book-appointment] only if a current listing is in context.",
		"",
		"PUBLISHED LISTINGS MATCHING THE BUYER'S REQUEST",
		listingsText,
		"",
		"CONVERSATION SO FAR",
		conversation,
		"",
		`BUYER'S QUESTION: ${message}`,
	].join("\n");
}

function buildAnalyticsSummary(analytics: PublicPropertyAnalytics | null) {
	if (!analytics) return "No aggregated listing activity data is available.";
	return [
		`Views: ${Math.round(analytics.totalViews)}`,
		`Detail opens: ${Math.round(analytics.detailOpens)}`,
		`Interactions: ${Math.round(analytics.totalInteractions)}`,
		`Average time on listing: ${Math.round(analytics.avgDwellSeconds)} seconds`,
	].join("; ");
}

export function buildPropertyChatConversation(history: PropertyChatMessage[]) {
	return history.length
		? history.map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`).join("\n")
		: "No previous conversation.";
}

export function buildPropertyChatPrompt(context: PropertyChatContext, message: string, conversation: string) {
	return [
		"You are Jewel, a friendly real estate guide at Jewellz Realty helping a buyer who is browsing this listing.",
		"Answer questions about the property, nearby places, comparisons, and viewing steps.",
		"Be warm, natural, and conversational — like a knowledgeable friend who happens to know a lot about real estate.",
		"Do NOT use markdown tables, headers, or heavy formatting. Write in plain, friendly sentences.",
		"Only use bullet points if listing 3 or more distinct items where a list genuinely helps.",
		"If a detail is missing, say so naturally and offer to book an appointment or connect them with Jewellz Realty.",
		"For viewings, reservations, or exact availability, offer to set up an appointment and attach the booking action so a button appears inline in your reply.",
		"When comparing properties, weave the comparison into a short conversational paragraph, not a table.",
		"When you recommend another property, mention it by name and attach a view-property action with its exact slug from COMPARABLE LISTINGS.",
		"Use only the provided listing, nearby places, and comparison context — never invent fees, dates, or legal details.",
		"",
		"LISTING",
		context.summary,
		"",
		"NEARBY PLACES (sourced from OpenStreetMap / Stadia Maps)",
		context.nearbyContext,
		"",
		"AGGREGATED LISTING ACTIVITY (property-level totals only; no visitor or inquiry records)",
		context.analyticsContext,
		"",
		"COMPARABLE LISTINGS",
		context.comparisonSummary,
		"",
		"CONVERSATION SO FAR",
		conversation,
		"",
		`BUYER'S QUESTION: ${message}`,
		"",
		"Reply naturally in 2–4 conversational sentences or a short friendly paragraph. If a list genuinely helps, use at most 4–5 short bullets. Never use markdown tables.",
		"After your reply text, append any relevant [ACTION:...] tokens on the same line. They are hidden from the buyer and rendered as inline buttons inside your chat bubble:",
		"- [ACTION:book-appointment] when they want to view, schedule, reserve, or check availability.",
		"- [ACTION:view-property:exact-slug:Property Name] for each comparable property you recommend or name. Use the slug exactly as given in COMPARABLE LISTINGS.",
		"- [ACTION:share-listing] only when they ask how to share or send this listing to someone.",
		"Only add actions when they genuinely help this specific reply — not every message. Multiple tokens are allowed.",
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
