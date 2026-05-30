import type { Property } from "@/types/property";
import { getPropertyBySlug } from "@/lib/sample-properties";

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
};

function normalizeText(value: unknown) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed || null;
}

export function isPropertyChatMessage(value: unknown): value is PropertyChatMessage {
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

export function buildPropertyChatContext(slug: string): PropertyChatContext | null {
	const property = getPropertyBySlug(slug);

	if (!property) {
		return null;
	}

	const specs = property.specs?.map((spec) => `${spec.label}: ${spec.value}`).join("; ") || "No extra specs provided.";
	const images = property.images?.length ? `${property.images.length} gallery image(s) available.` : "No gallery images available.";
	const description = property.description ?? "No long-form description was provided for this listing.";

	return {
		property,
		summary: [
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
			`Description: ${description}`,
		].join("\n"),
	};
}

export function buildPropertyChatConversation(history: PropertyChatMessage[]) {
	return history.length
		? history.map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.content}`).join("\n")
		: "No previous conversation.";
}

export function buildPropertyChatPrompt(context: PropertyChatContext, message: string, conversation: string) {
	return [
		"You are the Jewellz Realty property assistant.",
		"Answer only from the listing context and recent conversation.",
		"If a detail is missing, say you do not have that information.",
		"Keep the answer concise and sales-oriented.",
		"For viewings or contact requests, point the user to the inquiry form.",
		"",
		"LISTING CONTEXT",
		context.summary,
		"",
		"CONVERSATION",
		conversation,
		"",
		`USER QUESTION: ${message}`,
		"",
		"Write a direct answer with at most 4 short bullet points or 3 short paragraphs.",
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