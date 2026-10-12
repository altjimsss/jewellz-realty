import { extractBasicSearchIntent } from "@/lib/ai/search-intent";
import type { PropertyFiltersState } from "@/components/properties/PropertyFilters";
import type { Property } from "@/types/property";

const MAX_SEARCH_LENGTH = 180;
const INJECTION_PATTERNS = [
	/\b(ignore|forget|disregard|override)\b.{0,40}\b(instruction|prompt|system|developer|rule|policy|previous)\b/gi,
	/\b(system|developer|assistant|user)\s*:/gi,
	/\b(act as|pretend to be|you are now|jailbreak|do anything now|dan mode)\b/gi,
	/<\/?(script|iframe|object|embed|style)\b[^>]*>/gi,
	/```[\s\S]*?```/g,
];

function normalize(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9\s.-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizePropertySearchQuery(query: string) {
	let sanitized = query.slice(0, MAX_SEARCH_LENGTH);

	for (const pattern of INJECTION_PATTERNS) {
		sanitized = sanitized.replace(pattern, " ");
	}

	return sanitized
		.replace(/[<>{}\[\]`$\\]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function titleCase(value: string) {
	return value
		.split(/[\s_-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

function unique(values: string[]) {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function locationCandidatesFromProperties(properties: Property[]) {
	const candidates: string[] = [];

	for (const property of properties) {
		const location = property.location?.trim();
		if (!location) continue;

		candidates.push(location);
		for (const part of location.split(",")) {
			const trimmed = part.trim();
			if (trimmed.length > 2) candidates.push(trimmed);
		}
	}

	return unique(candidates).sort((first, second) => second.length - first.length);
}

function typeCandidatesFromProperties(properties: Property[]) {
	return unique(properties.map((property) => property.type ?? "").filter(Boolean));
}

function findKnownLocation(query: string, locationCandidates: string[] = []) {
	const normalizedQuery = normalize(query);
	return locationCandidates.find((location) => normalizedQuery.includes(normalize(location))) ?? "";
}

function inferTypeFromProperties(query: string, typeCandidates: string[] = []) {
	const normalizedQuery = normalize(query);
	return typeCandidates.find((type) => normalizedQuery.includes(normalize(type))) ?? "";
}

function parseMoneyToken(rawValue: string, rawUnit = "") {
	const value = Number(rawValue.replace(/,/g, ""));
	if (!Number.isFinite(value)) return "";

	const unit = rawUnit.toLowerCase();
	const multiplier =
		unit.startsWith("m") || unit.includes("million")
			? 1_000_000
			: unit.startsWith("k") || unit.includes("thousand")
				? 1_000
				: 1;

	return String(Math.round(value * multiplier));
}

function extractBudget(query: string) {
	const normalizedQuery = normalize(query);
	const maxMatch = normalizedQuery.match(/\b(?:below|under|less than|max|maximum|up to|budget)\s*(?:php|p|₱)?\s*([0-9]+(?:[,.][0-9]+)?)(\s*(?:m|million|k|thousand))?\b/i);
	const minMatch = normalizedQuery.match(/\b(?:above|over|more than|min|minimum|from)\s*(?:php|p|₱)?\s*([0-9]+(?:[,.][0-9]+)?)(\s*(?:m|million|k|thousand))?\b/i);

	return {
		priceMin: minMatch ? parseMoneyToken(minMatch[1], minMatch[2]) : "",
		priceMax: maxMatch ? parseMoneyToken(maxMatch[1], maxMatch[2]) : "",
	};
}

export function getNaturalLanguagePropertySearch(query: string, properties: Property[] = []) {
	const keyword = sanitizePropertySearchQuery(query);
	const intent = extractBasicSearchIntent(keyword);
	const knownLocation = findKnownLocation(keyword, locationCandidatesFromProperties(properties));
	const locationHint = knownLocation || intent.locationQuery;
	const budget = extractBudget(keyword);
	const firstType = inferTypeFromProperties(keyword, typeCandidatesFromProperties(properties)) || (intent.preferredTypes[0] ?? "");

	return {
		intent,
		filters: {
			keyword,
			lookingFor: firstType ? titleCase(firstType) : "",
			location: locationHint,
			subLocation: "",
			priceMin: budget.priceMin,
			priceMax: budget.priceMax,
			status: "",
			beds: intent.familySuitable ? "2" : "",
			baths: "",
		} satisfies PropertyFiltersState,
		category: firstType,
	};
}

export function mergeNaturalLanguageFilters(filters: PropertyFiltersState, properties: Property[] = []): PropertyFiltersState {
	const parsed = getNaturalLanguagePropertySearch([
		filters.keyword,
		filters.lookingFor,
		filters.location,
		filters.subLocation,
	].filter(Boolean).join(" "), properties);

	return {
		...filters,
		keyword: sanitizePropertySearchQuery(filters.keyword),
		lookingFor: filters.lookingFor || parsed.filters.lookingFor,
		location: filters.location || parsed.filters.location,
		subLocation: filters.subLocation || parsed.filters.subLocation,
		priceMin: filters.priceMin || parsed.filters.priceMin,
		priceMax: filters.priceMax || parsed.filters.priceMax,
		beds: filters.beds || parsed.filters.beds,
		baths: filters.baths || parsed.filters.baths,
	};
}

export function buildNaturalLanguageSearchHref(query: string) {
	const parsed = getNaturalLanguagePropertySearch(query);
	const params = new URLSearchParams();

	if (parsed.filters.keyword) params.set("search", parsed.filters.keyword);
	if (parsed.filters.lookingFor) params.set("lookingFor", parsed.filters.lookingFor);
	if (parsed.filters.location) params.set("location", parsed.filters.location);
	if (parsed.filters.subLocation) params.set("subLocation", parsed.filters.subLocation);
	if (parsed.filters.priceMin) params.set("priceMin", parsed.filters.priceMin);
	if (parsed.filters.priceMax) params.set("priceMax", parsed.filters.priceMax);
	if (parsed.filters.beds) params.set("beds", parsed.filters.beds);
	if (parsed.category) params.set("category", parsed.category);

	const search = params.toString();
	return search ? `/project-list?${search}` : "/project-list";
}
