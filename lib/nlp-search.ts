import { extractSemanticSearchIntent } from "@/lib/ai/search-intent";
import { getNaturalLanguagePropertySearch, sanitizePropertySearchQuery } from "@/lib/property-search";

export async function nlpSearch(prompt: string) {
	const normalizedPrompt = sanitizePropertySearchQuery(prompt);
	const intent = await extractSemanticSearchIntent(normalizedPrompt);
	const parsed = getNaturalLanguagePropertySearch(normalizedPrompt);
	const filters = {
		...parsed.filters,
		lookingFor: intent.preferredTypes[0] ?? parsed.filters.lookingFor,
		location: parsed.filters.location || intent.locationQuery,
		sort: intent.sort,
		nearbyNeed: intent.nearbyNeed,
		familySuitable: intent.familySuitable,
		budgetIntent: intent.budgetIntent,
	};

	return { prompt: normalizedPrompt, intent, filters };
}
