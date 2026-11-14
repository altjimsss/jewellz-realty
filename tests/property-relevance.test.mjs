import test from "node:test";
import assert from "node:assert/strict";
import { rankRelatedProperties, scorePropertyRelevance } from "../lib/property-relevance.ts";

const source = {
	id: "source", slug: "source", title: "Family home near schools", price: 3_000_000,
	description: "A comfortable family home with a garden", location: "Calamba, Laguna", type: "House", subtype: "Townhouse",
	keyFeatures: ["garden", "parking"], amenities: ["playground"], specs: [],
};

test("rank emphasizes matching area, price, house subtype and features over description similarity", () => {
	const close = { ...source, id: "close", slug: "close", title: "Family home near schools" };
	const proseOnly = { ...source, id: "prose", slug: "prose", location: "Baguio, Benguet", price: 12_000_000, subtype: "Single Detached", keyFeatures: ["pool"], amenities: [] };
	assert.ok(scorePropertyRelevance(source, close) > scorePropertyRelevance(source, proseOnly));
	assert.equal(rankRelatedProperties(source, [proseOnly, close], 2)[0].id, "close");
});

test("missing attributes receive neutral scores and the current property and duplicates are removed", () => {
	const sparse = { id: "sparse", slug: "sparse", title: "Available property", price: 0 };
	const ranked = rankRelatedProperties(source, [source, sparse, sparse], 3);
	assert.deepEqual(ranked.map((property) => property.id), ["sparse"]);
	assert.ok(scorePropertyRelevance(source, sparse) > 0);
});
