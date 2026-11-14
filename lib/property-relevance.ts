import type { Property } from "@/types/property";

export const PROPERTY_RELEVANCE_WEIGHTS = {
	location: 0.30,
	price: 0.25,
	houseType: 0.20,
	features: 0.15,
	similarity: 0.10,
} as const;

const tokens = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter((part) => part.length > 2) ?? []);
const overlap = (left: Set<string>, right: Set<string>) => {
	if (!left.size || !right.size) return 0;
	const shared = [...left].filter((token) => right.has(token)).length;
	return shared / new Set([...left, ...right]).size;
};

export function scorePropertyRelevance(source: Property, candidate: Property) {
	const w = PROPERTY_RELEVANCE_WEIGHTS;
	const sourceLocation = tokens(source.location ?? "");
	const candidateLocation = tokens(candidate.location ?? "");
	const location = !sourceLocation.size || !candidateLocation.size ? 0.35 : overlap(sourceLocation, candidateLocation);
	const price = source.price > 0 && candidate.price > 0
		? Math.max(0, 1 - Math.abs(Math.log(candidate.price / source.price)) / Math.log(4))
		: 0.35;
	const sourceType = tokens(`${source.type ?? ""} ${source.subtype ?? ""}`);
	const candidateType = tokens(`${candidate.type ?? ""} ${candidate.subtype ?? ""}`);
	const houseType = !sourceType.size || !candidateType.size ? 0.35 : overlap(sourceType, candidateType);
	const sourceFeatures = tokens(`${source.amenities?.join(" ") ?? ""} ${source.keyFeatures?.join(" ") ?? ""} ${source.specs?.map((s) => `${s.label} ${s.value}`).join(" ") ?? ""}`);
	const candidateFeatures = tokens(`${candidate.amenities?.join(" ") ?? ""} ${candidate.keyFeatures?.join(" ") ?? ""} ${candidate.specs?.map((s) => `${s.label} ${s.value}`).join(" ") ?? ""}`);
	const features = overlap(sourceFeatures, candidateFeatures);
	const similarity = overlap(tokens(`${source.title} ${source.description ?? ""}`), tokens(`${candidate.title} ${candidate.description ?? ""}`));
	return location * w.location + price * w.price + houseType * w.houseType + features * w.features + similarity * w.similarity;
}

export function rankRelatedProperties(source: Property, candidates: Property[], limit = 3) {
	const seen = new Set<string>([source.id]);
	return candidates.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	}).map((property) => ({ property, score: scorePropertyRelevance(source, property) }))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ property }) => property);
}
