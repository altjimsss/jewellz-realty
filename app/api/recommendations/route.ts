import { NextResponse } from "next/server";
import { generatePropertyEmbedding, formatEmbeddingForPostgres } from "@/lib/ai/property-embeddings";
import { extractSemanticSearchIntent, type PropertySearchIntent } from "@/lib/ai/search-intent";
import { formatDistance } from "@/lib/nearby-places";
import { supabaseServer } from "@/lib/supabase/server";

type RecommendationFilters = {
	keyword?: string;
	lookingFor?: string;
	location?: string;
	subLocation?: string;
	priceMin?: string;
	priceMax?: string;
	status?: string;
};

type RecommendationCandidate = {
	id: string;
	title: string;
	type?: string;
	category?: string;
	location?: string;
	price?: number;
	description?: string;
	specs?: Array<{ label: string; value: string }>;
	beds?: number;
	baths?: number;
	coordinates?: [number, number];
	featured?: boolean;
};

type AiRecommendation = {
	id: string;
	reason: string;
	confidence?: number;
	recommendationId?: string;
};

type NumberedCandidate = RecommendationCandidate & {
	rankNumber: number;
};

type VectorRecommendationRow = {
	id: string;
	similarity: number;
};

type CachedNearbyPlaceRow = {
	property_id: string;
	category: string;
	name: string;
	distance_meters: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toText(value: unknown) {
	return typeof value === "string" ? value : "";
}

function toFilters(value: unknown): RecommendationFilters {
	if (!isRecord(value)) return {};

	return {
		keyword: toText(value.keyword),
		lookingFor: toText(value.lookingFor),
		location: toText(value.location),
		subLocation: toText(value.subLocation),
		priceMin: toText(value.priceMin),
		priceMax: toText(value.priceMax),
		status: toText(value.status),
	};
}

function toCandidates(value: unknown): RecommendationCandidate[] {
	if (!Array.isArray(value)) return [];

	return value
		.flatMap((item): RecommendationCandidate[] => {
			if (!isRecord(item) || typeof item.id !== "string" || typeof item.title !== "string") return [];

			return [{
				id: item.id,
				title: item.title,
				type: toText(item.type),
				category: toText(item.category),
				location: toText(item.location),
				price: typeof item.price === "number" ? item.price : undefined,
				description: toText(item.description).slice(0, 180),
				beds: typeof item.beds === "number" ? item.beds : undefined,
				baths: typeof item.baths === "number" ? item.baths : undefined,
				specs: Array.isArray(item.specs)
					? item.specs
							.map((spec) => {
								if (!isRecord(spec)) return null;
								return { label: toText(spec.label), value: toText(spec.value) };
							})
							.filter((spec): spec is { label: string; value: string } => Boolean(spec?.label || spec?.value))
							.slice(0, 5)
					: [],
				coordinates: Array.isArray(item.coordinates) && typeof item.coordinates[0] === "number" && typeof item.coordinates[1] === "number"
					? [item.coordinates[0], item.coordinates[1]]
					: undefined,
				featured: Boolean(item.featured),
			}];
		});
}

function extractContent(data: unknown) {
	if (!isRecord(data)) return null;
	const choices = data.choices;
	if (!Array.isArray(choices)) return null;
	const firstChoice = choices[0];
	if (!isRecord(firstChoice)) return null;
	const message = firstChoice.message;
	if (!isRecord(message)) return null;
	return typeof message.content === "string" ? message.content : null;
}

function toNumber(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function normalizeMatchText(value: unknown) {
	return toText(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function parseAiRecommendations(content: string, candidates: NumberedCandidate[]): AiRecommendation[] {
	const cleaned = content
		.trim()
		.replace(/^```(?:json)?/i, "")
		.replace(/```$/i, "")
		.trim();
	const objectStart = cleaned.indexOf("{");
	const objectEnd = cleaned.lastIndexOf("}");
	const arrayStart = cleaned.indexOf("[");
	const arrayEnd = cleaned.lastIndexOf("]");
	const hasObject = objectStart >= 0 && objectEnd >= objectStart;
	const hasArray = arrayStart >= 0 && arrayEnd >= arrayStart;
	const jsonText = hasObject ? cleaned.slice(objectStart, objectEnd + 1) : hasArray ? cleaned.slice(arrayStart, arrayEnd + 1) : cleaned;
	const parsed: unknown = JSON.parse(jsonText);
	const recommendationItems = Array.isArray(parsed)
		? parsed
		: isRecord(parsed) && Array.isArray(parsed.recommendations)
			? parsed.recommendations
			: [];
	const propertyById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
	const propertyByRank = new Map(candidates.map((candidate) => [candidate.rankNumber, candidate]));
	const propertyByTitle = new Map(candidates.map((candidate) => [normalizeMatchText(candidate.title), candidate]));
	const parsedRecommendations = recommendationItems
		.flatMap((item): AiRecommendation[] => {
			if (typeof item === "number" || typeof item === "string") {
				const rankNumber = toNumber(item);
				const property = rankNumber ? propertyByRank.get(rankNumber) : propertyByTitle.get(normalizeMatchText(item));

				return property
					? [{
							id: property.id,
							reason: "This property is one of the closest AI-ranked alternatives to your search.",
							confidence: undefined,
						}]
					: [];
			}

			if (!isRecord(item)) return [];
			const directId = toText(item.id);
			const rankNumber = toNumber(item.candidateNumber ?? item.candidate_number ?? item.number ?? item.rank ?? item.index);
			const title = normalizeMatchText(item.title ?? item.propertyTitle ?? item.property_title ?? item.name);
			const property = propertyById.get(directId) ?? (rankNumber ? propertyByRank.get(rankNumber) : undefined) ?? propertyByTitle.get(title);
			if (!property) return [];
			const reason = toText(item.reason).slice(0, 180) || "This property is semantically close to your search.";
			const confidence = typeof item.confidence === "number" ? Math.max(0, Math.min(100, item.confidence)) : undefined;
			return [{ id: property.id, reason, confidence }];
		})
		.slice(0, 6);

	if (parsedRecommendations.length > 0) return parsedRecommendations;

	const candidateNumbers = Array.from(content.matchAll(/\b(?:candidate|property|option|number)?\s*#?\s*(\d{1,2})\b/gi))
		.map((match) => Number(match[1]))
		.filter((rankNumber) => propertyByRank.has(rankNumber));

	return Array.from(new Set(candidateNumbers))
		.slice(0, 6)
		.map((rankNumber) => {
			const property = propertyByRank.get(rankNumber);
			return {
				id: property?.id ?? "",
				reason: "This property is one of the closest AI-ranked alternatives to your search.",
				confidence: undefined,
			};
		})
		.filter((item) => item.id);
}

function formatCandidateForPrompt(candidate: NumberedCandidate) {
	const specs = candidate.specs?.length
		? candidate.specs.map((spec) => `${spec.label}: ${spec.value}`).join(", ")
		: "No specs";

	return [
		`${candidate.rankNumber}. ${candidate.title}`,
		`type=${candidate.type || "Unknown"}`,
		`location=${candidate.location || "Unknown"}`,
		`price=${candidate.price ?? "Unknown"}`,
		`specs=${specs}`,
		`desc=${candidate.description || "No description"}`,
	].join(" | ");
}

function tokenize(value: string) {
	return value
		.toLowerCase()
		.split(/[\s,.-]+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 2);
}

function scoreCandidate(candidate: RecommendationCandidate, category: string, filters: RecommendationFilters) {
	const searchText = [
		candidate.title,
		candidate.type,
		candidate.category,
		candidate.location,
		candidate.description,
		...(candidate.specs ?? []).map((spec) => `${spec.label} ${spec.value}`),
	].join(" ").toLowerCase();
	const categoryText = category.toLowerCase();
	const locationTokens = tokenize(`${filters.location ?? ""} ${filters.subLocation ?? ""}`);
	const keywordTokens = tokenize(`${filters.keyword ?? ""} ${filters.lookingFor ?? ""}`);
	const priceMin = filters.priceMin ? Number(filters.priceMin) : undefined;
	const priceMax = filters.priceMax ? Number(filters.priceMax) : undefined;
	let score = 0;

	if (categoryText && categoryText !== "all" && candidate.type?.toLowerCase() === categoryText) score += 45;
	if (filters.lookingFor && candidate.type?.toLowerCase().includes(filters.lookingFor.toLowerCase())) score += 35;
	for (const token of keywordTokens) if (searchText.includes(token)) score += 12;
	for (const token of locationTokens) if (candidate.location?.toLowerCase().includes(token)) score += 18;
	if (Number.isFinite(priceMin) && candidate.price && candidate.price >= (priceMin as number)) score += 8;
	if (Number.isFinite(priceMax) && candidate.price && candidate.price <= (priceMax as number)) score += 12;
	if (candidate.featured) score += 4;

	return score;
}

function getShortlistedCandidates(candidates: RecommendationCandidate[], category: string, filters: RecommendationFilters) {
	return candidates
		.map((candidate) => ({ candidate, score: scoreCandidate(candidate, category, filters) }))
		.sort((first, second) => second.score - first.score)
		.slice(0, 10)
		.map(({ candidate }, index) => ({ ...candidate, rankNumber: index + 1 }));
}

function buildPrompt(category: string, filters: RecommendationFilters, candidates: NumberedCandidate[]) {
	return [
		"You are an AI recommendation engine for Jewellz Realty.",
		"An exact property search returned zero results. Recommend the closest alternative listings.",
		"Use semantic intent, not only exact words. Consider property category/type, location, budget, specs, description, and buyer lifestyle fit.",
		`Return exactly ${Math.min(6, candidates.length)} recommendations unless there are fewer candidates.`,
		"Return JSON only with this shape: {\"recommendations\":[{\"candidateNumber\":1,\"reason\":\"short buyer-friendly reason\",\"confidence\":0-100}]}",
		"Use candidateNumber from the numbered candidate list. Do not output property IDs.",
		"Every candidateNumber must match one candidate number from the list.",
		"",
		`Active category tab: ${category || "All"}`,
		`Search filters: ${JSON.stringify(filters)}`,
		"Candidate properties:",
		candidates.map(formatCandidateForPrompt).join("\n"),
	].join("\n");
}

function getRecommendationModels() {
	const configuredModels = (process.env.OPENROUTER_RECOMMENDATION_MODEL ?? "")
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);

	return [
		...configuredModels,
		"z-ai/glm-4.5-air:free",
		"openai/gpt-oss-120b:free",
		"nvidia/nemotron-3-super-120b-a12b:free",
		"meta-llama/llama-3.2-3b-instruct:free",
	].filter((model, index, models) => models.indexOf(model) === index);
}

function toNullableNumber(value: string | undefined) {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function wantsNearbyContext(filters: RecommendationFilters) {
	const search = `${filters.keyword ?? ""} ${filters.lookingFor ?? ""} ${filters.location ?? ""} ${filters.subLocation ?? ""}`.toLowerCase();

	return [
		"near",
		"nearby",
		"school",
		"education",
		"hospital",
		"clinic",
		"health",
		"restaurant",
		"food",
		"mall",
		"church",
		"culture",
		"walk",
	].some((token) => search.includes(token));
}

async function getCachedNearbyRows(candidates: RecommendationCandidate[]) {
	const candidateIds = candidates.slice(0, 8).map((candidate) => candidate.id);

	if (candidateIds.length === 0) return [];

	const { data, error } = await supabaseServer
		.from("property_nearby_places")
		.select("property_id, category, name, distance_meters")
		.in("property_id", candidateIds)
		.order("distance_meters", { ascending: true });

	if (error) {
		console.error("Nearby cache lookup failed", error.message);
		return [];
	}

	return (data ?? []) as CachedNearbyPlaceRow[];
}

async function getNearbySearchContext(candidates: RecommendationCandidate[]) {
	const rows = await getCachedNearbyRows(candidates);
	const contexts = candidates.slice(0, 8).flatMap((candidate) => {
		const nearby = rows
			.filter((row) => row.property_id === candidate.id)
			.slice(0, 8)
			.map((row) => `${row.category}: ${row.name} (${formatDistance(row.distance_meters)})`);

		return nearby.length ? [`${candidate.title} cached nearby places: ${nearby.join(" | ")}`] : [];
	});

	return contexts.join(" || ");
}

function buildRawSearchText(category: string, filters: RecommendationFilters) {
	return [
		filters.keyword,
		filters.lookingFor,
		filters.location,
		filters.subLocation,
		category !== "All" ? category : "",
	].filter(Boolean).join(" ");
}

async function buildRecommendationQuery(category: string, filters: RecommendationFilters, candidates: RecommendationCandidate[], intent: PropertySearchIntent) {
	const nearbyContext = wantsNearbyContext(filters) ? await getNearbySearchContext(candidates) : "";

	return [
		`Looking for: ${filters.lookingFor || intent.preferredTypes.join(", ") || (category !== "All" ? category : "") || (filters.keyword ?? "") || "property"}`,
		`Keyword: ${filters.keyword || ""}`,
		`AI extracted intent: ${JSON.stringify(intent)}`,
		`Location: ${[filters.location, filters.subLocation].filter(Boolean).join(", ")}`,
		`Budget: ${filters.priceMin || "any"} to ${filters.priceMax || "any"} PHP`,
		`Category tab: ${category || "All"}`,
		nearbyContext ? `Live OpenStreetMap nearby context: ${nearbyContext}` : "",
	].join(" | ");
}

function buildVectorReason(category: string, filters: RecommendationFilters, similarity: number, intent: PropertySearchIntent) {
	const context = [
		filters.lookingFor || intent.preferredTypes.join(" or ") || (category !== "All" ? category : ""),
		intent.nearbyNeed ? `near ${intent.nearbyNeed.toLowerCase()} places` : "",
		intent.budgetIntent === "affordable" ? "affordable options" : "",
		intent.budgetIntent === "luxury" ? "premium options" : "",
		filters.location,
		filters.subLocation,
		filters.priceMin || filters.priceMax ? "your budget range" : "",
	]
		.filter(Boolean)
		.join(", ");
	const percent = Math.round(Math.max(0, Math.min(1, similarity)) * 100);

	return context
		? `AI semantic match for ${context} based on property details. ${percent}% similarity.`
		: `AI semantic match based on property details. ${percent}% similarity.`;
}

async function getVectorRecommendations(category: string, filters: RecommendationFilters, candidates: RecommendationCandidate[]) {
	const intent = await extractSemanticSearchIntent(buildRawSearchText(category, filters));
	const queryEmbedding = await generatePropertyEmbedding(await buildRecommendationQuery(category, filters, candidates, intent));
	const singlePreferredType = intent.preferredTypes.length === 1 ? intent.preferredTypes[0] : null;
	const categoryFilter = singlePreferredType ?? (category !== "All" && intent.propertyIntent !== "residential" ? category : null);
	const { data, error } = await supabaseServer.rpc("match_recommended_properties", {
		query_embedding: formatEmbeddingForPostgres(queryEmbedding),
		match_count: 12,
		category_filter: categoryFilter ? categoryFilter.toLowerCase() : null,
		min_price: toNullableNumber(filters.priceMin),
		max_price: toNullableNumber(filters.priceMax),
	});

	if (error) {
		console.error("Vector recommendation lookup failed", error.message);
		return [];
	}

	let vectorRows = (data ?? []) as VectorRecommendationRow[];

	if (vectorRows.length === 0 && categoryFilter) {
		const broadResult = await supabaseServer.rpc("match_recommended_properties", {
			query_embedding: formatEmbeddingForPostgres(queryEmbedding),
			match_count: 12,
			category_filter: null,
			min_price: toNullableNumber(filters.priceMin),
			max_price: toNullableNumber(filters.priceMax),
		});
		vectorRows = (broadResult.data ?? []) as VectorRecommendationRow[];
	}

	const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
	const nearbyRows = intent.nearbyNeed ? await getCachedNearbyRows(candidates) : [];
	const matchedPrices = vectorRows
		.map((item) => candidateById.get(item.id)?.price)
		.filter((price): price is number => typeof price === "number" && price > 0);
	const lowestMatchedPrice = matchedPrices.length ? Math.min(...matchedPrices) : 0;
	const highestMatchedPrice = matchedPrices.length ? Math.max(...matchedPrices) : 0;

	return vectorRows
		.map((item) => {
			const candidate = candidateById.get(item.id);
			const normalizedType = candidate?.type?.toLowerCase() ?? "";
			const typeMatches = intent.preferredTypes.some((type) => normalizedType === type.toLowerCase());
			const isResidentialMatch = intent.propertyIntent === "residential" && ["house", "condo", "apartment", "townhouse"].includes(normalizedType);
			const isNonResidentialPenalty = intent.propertyIntent === "residential" && ["lot", "farm", "memorial"].includes(normalizedType);
			const nearbyMatches = nearbyRows.filter((row) => row.property_id === item.id && row.category === intent.nearbyNeed);
			const closestNearby = nearbyMatches[0]?.distance_meters;
			const nearbyBoost = closestNearby != null ? Math.max(0, 12 - closestNearby / 500) : 0;
			const affordabilityBoost =
				intent.budgetIntent === "affordable" && candidate?.price && highestMatchedPrice > lowestMatchedPrice
					? ((highestMatchedPrice - candidate.price) / (highestMatchedPrice - lowestMatchedPrice)) * 30
					: intent.budgetIntent === "affordable" && candidate?.price
					? Math.max(0, 12 - candidate.price / 1_000_000)
					: 0;
			const luxuryBoost =
				intent.budgetIntent === "luxury" && candidate?.price && highestMatchedPrice > lowestMatchedPrice
					? ((candidate.price - lowestMatchedPrice) / (highestMatchedPrice - lowestMatchedPrice)) * 22
					: 0;
			const familySuitabilityBoost = intent.familySuitable && candidate?.beds ? Math.min(18, candidate.beds * 6) : 0;
			const score =
				item.similarity * 100 +
				(typeMatches ? 45 : 0) +
				(isResidentialMatch ? 35 : 0) -
				(isNonResidentialPenalty ? 80 : 0) +
				familySuitabilityBoost +
				nearbyBoost +
				affordabilityBoost +
				luxuryBoost;

			return {
				id: item.id,
				reason: buildVectorReason(category, filters, item.similarity, intent),
				confidence: Math.round(Math.max(0, Math.min(100, score))),
				score,
			};
		})
		.sort((first, second) => second.score - first.score)
		.slice(0, 6)
		.map(({ id, reason, confidence }) => ({ id, reason, confidence }));
}

async function persistRecommendations(recommendations: AiRecommendation[], body: Record<string, unknown>, source: string) {
	const sessionId = toText(body.sessionId);
	if (recommendations.length === 0) return recommendations;

	const rows = recommendations.map((recommendation) => ({
		session_id: sessionId || null,
		property_id: recommendation.id,
		reason: recommendation.reason,
		confidence: recommendation.confidence ?? null,
		is_fallback: source !== "ai" && source !== "semantic-vector",
		was_clicked: false,
		generated_at: new Date().toISOString(),
		source,
	}));

	const { data, error } = await supabaseServer
		.from("recommendations")
		.insert(rows)
		.select("id, property_id");

	if (error || !data) {
		console.error("Recommendation persistence failed", error?.message);
		return recommendations;
	}

	const rowByPropertyId = new Map(data.map((row: { id: string; property_id: string }) => [row.property_id, row.id]));
	return recommendations.map((recommendation) => ({
		...recommendation,
		recommendationId: rowByPropertyId.get(recommendation.id),
	}));
}

export async function POST(request: Request) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
	}

	if (!isRecord(body)) {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
	}

	const apiKey = process.env.OPENROUTER_API_KEY;

	if (!apiKey) {
		return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
	}

	const category = toText(body.category) || "All";
	const filters = toFilters(body.filters);
	const candidates = toCandidates(body.properties);
	const numberedCandidates = getShortlistedCandidates(candidates, category, filters);

	if (candidates.length === 0) {
		return NextResponse.json({ recommendations: [] });
	}

	const vectorRecommendations = await getVectorRecommendations(category, filters, candidates);

	if (vectorRecommendations.length > 0) {
		return NextResponse.json({
			recommendations: await persistRecommendations(vectorRecommendations, body, "semantic-vector"),
			model: "Xenova/all-MiniLM-L6-v2",
			source: "semantic-vector",
		});
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 45_000);

	try {
		let lastProviderStatus = 502;
		let lastProviderError = "AI recommendation provider request failed.";

		for (const model of getRecommendationModels()) {
			const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
					"X-Title": "Jewellz Realty",
				},
				body: JSON.stringify({
					model,
					messages: [
						{
							role: "system",
							content: "You are a strict JSON recommendation API. Output valid JSON only.",
						},
						{ role: "user", content: buildPrompt(category, filters, numberedCandidates) },
					],
					max_tokens: 350,
					response_format: { type: "json_object" },
					reasoning: { enabled: false },
					temperature: 0.2,
				}),
				signal: controller.signal,
			});
			const data: unknown = await response.json().catch(() => null);

			if (!response.ok) {
				lastProviderStatus = response.status;
				lastProviderError = `AI recommendation model failed: ${model}`;
				if ([400, 404, 429, 502, 503].includes(response.status)) continue;
				return NextResponse.json({ error: lastProviderError }, { status: response.status });
			}

			const content = extractContent(data);
			const recommendations = content ? parseAiRecommendations(content, numberedCandidates) : [];

			if (recommendations.length === 0) {
				lastProviderStatus = 422;
				lastProviderError = `AI model returned no valid property IDs: ${model}`;
				continue;
			}

			return NextResponse.json({ recommendations: await persistRecommendations(recommendations, body, "ai"), model, source: "ai" });
		}

		return NextResponse.json({ error: lastProviderError }, { status: lastProviderStatus });
	} catch (error) {
		const isAbortError = error instanceof DOMException && error.name === "AbortError";

		return NextResponse.json(
			{ error: isAbortError ? "AI recommendation request timed out." : "AI recommendation request failed." },
			{ status: isAbortError ? 504 : 502 },
		);
	} finally {
		clearTimeout(timeoutId);
	}
}
