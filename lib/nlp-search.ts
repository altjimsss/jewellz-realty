import { extractSemanticSearchIntent } from "@/lib/ai/search-intent";

export async function nlpSearch(prompt: string) {
	const normalizedPrompt = prompt.trim();
	const intent = await extractSemanticSearchIntent(normalizedPrompt);
	const filters = {
		keyword: normalizedPrompt,
		lookingFor: intent.preferredTypes[0] ?? "",
		location: intent.locationQuery,
		subLocation: "",
		priceMin: "",
		priceMax: "",
		status: "",
		sort: intent.sort,
		nearbyNeed: intent.nearbyNeed,
		familySuitable: intent.familySuitable,
		budgetIntent: intent.budgetIntent,
	};

	return { prompt: normalizedPrompt, intent, filters };
}
