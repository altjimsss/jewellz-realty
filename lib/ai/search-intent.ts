export type PropertySearchIntent = {
	propertyIntent: "residential" | "land" | "agricultural" | "memorial" | "any";
	preferredTypes: string[];
	budgetIntent: "affordable" | "luxury" | "any";
	nearbyNeed: "Education" | "Health" | "Food" | "Culture" | null;
	familySuitable: boolean;
	sort: "price_asc" | "price_desc" | "relevance";
	locationQuery: string;
	confidence: number;
};

type IntentExample = {
	key: keyof Omit<PropertySearchIntent, "preferredTypes" | "sort" | "locationQuery" | "confidence">;
	value: string | boolean | null;
	text: string;
	weight?: number;
};

const LOCATION_STOP_WORDS = new Set([
	"affordable",
	"budget",
	"cheap",
	"children",
	"close",
	"family",
	"find",
	"for",
	"home",
	"house",
	"living",
	"near",
	"place",
	"property",
	"small",
]);

const intentExamples: IntentExample[] = [
	{ key: "propertyIntent", value: "residential", text: "residential home house condo apartment townhouse place to live family residence", weight: 1.2 },
	{ key: "propertyIntent", value: "land", text: "vacant lot land parcel residential lot investment land", weight: 1.1 },
	{ key: "propertyIntent", value: "agricultural", text: "farm agricultural land farmland crops rural property", weight: 1.1 },
	{ key: "propertyIntent", value: "memorial", text: "memorial lot cemetery grave lawn burial property", weight: 1.1 },
	{ key: "budgetIntent", value: "affordable", text: "affordable cheap budget low cost inexpensive economical lowest price", weight: 1.15 },
	{ key: "budgetIntent", value: "luxury", text: "luxury premium exclusive high end expensive upscale", weight: 1.15 },
	{ key: "nearbyNeed", value: "Education", text: "near school college university education kindergarten students children campus", weight: 1.1 },
	{ key: "nearbyNeed", value: "Health", text: "near hospital clinic pharmacy doctor health medical", weight: 1.1 },
	{ key: "nearbyNeed", value: "Food", text: "near restaurant cafe food dining mall shops commercial center", weight: 1.05 },
	{ key: "nearbyNeed", value: "Culture", text: "near church worship museum culture community center landmark", weight: 1.05 },
	{ key: "familySuitable", value: true, text: "family suitable small family children kids starter home multiple bedrooms", weight: 1.1 },
];

const directTypePatterns: Array<{ type: string; pattern: RegExp }> = [
	{ type: "Condo", pattern: /\b(condo|condos|condominium|studio|unit)\b/i },
	{ type: "House", pattern: /\b(house|houses|home|homes|residence|residential)\b/i },
	{ type: "Lot", pattern: /\b(lot|lots|land|parcel)\b/i },
	{ type: "Farm", pattern: /\b(farm|farms|farmland|agricultural)\b/i },
	{ type: "Memorial", pattern: /\b(memorial|cemetery|grave|lawn)\b/i },
];

function cosineSimilarity(first: number[], second: number[]) {
	let dot = 0;
	let firstMagnitude = 0;
	let secondMagnitude = 0;

	for (let index = 0; index < first.length; index += 1) {
		dot += first[index] * second[index];
		firstMagnitude += first[index] ** 2;
		secondMagnitude += second[index] ** 2;
	}

	return dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
}

function emptyIntent(): PropertySearchIntent {
	return {
		propertyIntent: "any",
		preferredTypes: [],
		budgetIntent: "any",
		nearbyNeed: null,
		familySuitable: false,
		sort: "relevance",
		locationQuery: "",
		confidence: 0,
	};
}

function unique(values: string[]) {
	return Array.from(new Set(values));
}

function inferPreferredTypes(intent: PropertySearchIntent, text: string) {
	const directTypes = directTypePatterns
		.filter(({ pattern }) => pattern.test(text))
		.map(({ type }) => type);

	if (directTypes.length > 0) return unique(directTypes);

	if (intent.propertyIntent === "residential") return ["House", "Condo"];
	if (intent.propertyIntent === "land") return ["Lot"];
	if (intent.propertyIntent === "agricultural") return ["Farm"];
	if (intent.propertyIntent === "memorial") return ["Memorial"];

	return [];
}

function extractLocationHint(searchText: string) {
	const normalized = searchText.toLowerCase().replace(/[^a-z0-9\s,.-]+/g, " ");
	const explicitLocation = normalized.match(/\b(?:in|at|around|near|nearby)\s+([a-z][a-z\s.-]{2,40})/i)?.[1] ?? "";
	const source = explicitLocation || normalized;
	const tokens = source
		.split(/[\s,.-]+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 2 && !LOCATION_STOP_WORDS.has(token));

	return tokens.slice(0, 3).join(" ");
}

export function extractBasicSearchIntent(searchText: string): PropertySearchIntent {
	const intent = emptyIntent();
	const normalized = searchText.toLowerCase();

	if (/\b(cheap|affordable|budget|low cost|lowest|inexpensive|economical)\b/.test(normalized)) {
		intent.budgetIntent = "affordable";
		intent.sort = "price_asc";
	}

	if (/\b(luxury|premium|exclusive|high end|high-end|upscale)\b/.test(normalized)) {
		intent.budgetIntent = "luxury";
		intent.sort = "price_desc";
	}

	if (/\b(family|families|children|kids|starter)\b/.test(normalized)) {
		intent.familySuitable = true;
		intent.propertyIntent = "residential";
	}

	for (const { type, pattern } of directTypePatterns) {
		if (pattern.test(searchText)) {
			intent.preferredTypes.push(type);
		}
	}

	if (intent.preferredTypes.some((type) => ["House", "Condo"].includes(type))) intent.propertyIntent = "residential";
	if (intent.preferredTypes.includes("Lot")) intent.propertyIntent = "land";
	if (intent.preferredTypes.includes("Farm")) intent.propertyIntent = "agricultural";
	if (intent.preferredTypes.includes("Memorial")) intent.propertyIntent = "memorial";

	if (/\b(school|college|university|education|campus|kindergarten)\b/.test(normalized)) intent.nearbyNeed = "Education";
	if (/\b(hospital|clinic|pharmacy|doctor|medical|health)\b/.test(normalized)) intent.nearbyNeed = "Health";
	if (/\b(food|restaurant|cafe|dining|mall|shops)\b/.test(normalized)) intent.nearbyNeed = "Food";
	if (/\b(church|worship|museum|culture|landmark)\b/.test(normalized)) intent.nearbyNeed = "Culture";

	intent.preferredTypes = unique(intent.preferredTypes);
	intent.locationQuery = extractLocationHint(searchText);
	intent.confidence = intent.preferredTypes.length > 0 || intent.budgetIntent !== "any" || intent.nearbyNeed || intent.familySuitable ? 0.7 : 0.2;

	return intent;
}

export async function extractSemanticSearchIntent(searchText: string): Promise<PropertySearchIntent> {
	const { generatePropertyEmbedding } = await import("@/lib/ai/property-embeddings");
	const intent = extractBasicSearchIntent(searchText);
	const queryEmbedding = await generatePropertyEmbedding(searchText);
	const exampleEmbeddings = await Promise.all(intentExamples.map((example) => generatePropertyEmbedding(example.text)));
	let strongestScore = intent.confidence;

	intentExamples.forEach((example, index) => {
		const score = cosineSimilarity(queryEmbedding, exampleEmbeddings[index]) * (example.weight ?? 1);

		if (score < 0.42) return;

		strongestScore = Math.max(strongestScore, score);

		if (example.key === "propertyIntent" && intent.propertyIntent === "any") {
			intent.propertyIntent = example.value as PropertySearchIntent["propertyIntent"];
		}

		if (example.key === "budgetIntent" && intent.budgetIntent === "any") {
			intent.budgetIntent = example.value as PropertySearchIntent["budgetIntent"];
			intent.sort = intent.budgetIntent === "affordable" ? "price_asc" : "price_desc";
		}

		if (example.key === "nearbyNeed" && !intent.nearbyNeed) {
			intent.nearbyNeed = example.value as PropertySearchIntent["nearbyNeed"];
		}

		if (example.key === "familySuitable" && example.value === true) {
			intent.familySuitable = true;
			if (intent.propertyIntent === "any") intent.propertyIntent = "residential";
		}
	});

	intent.preferredTypes = inferPreferredTypes(intent, searchText);
	intent.confidence = Math.max(0, Math.min(1, strongestScore));

	return intent;
}
