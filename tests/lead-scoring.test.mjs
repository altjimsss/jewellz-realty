import test from "node:test";
import assert from "node:assert/strict";
import { computeLeadScore, priorityFromLeadScore } from "../lib/lead-scoring.ts";

test("lead score is rounded to four decimals and stays within [0, 1]", () => {
	const score = computeLeadScore({ propertyViewCount: 3, propertyInteractionCount: 2, hasPhone: true });
	assert.equal(score, Number(score.toFixed(4)));
	assert.ok(score >= 0 && score <= 1);
});

test("behavior counts and dwell thresholds add score monotonically", () => {
	const base = computeLeadScore({});
	assert.ok(computeLeadScore({ propertyViewCount: 8 }) > base);
	assert.equal(computeLeadScore({ propertyViewCount: 8 }), computeLeadScore({ propertyViewCount: 80 }));
	assert.ok(computeLeadScore({ maxDwellSeconds: 45 }) > base);
	assert.ok(computeLeadScore({ maxDwellSeconds: 90 }) > computeLeadScore({ maxDwellSeconds: 45 }));
	assert.ok(computeLeadScore({ maxDwellSeconds: 180 }) > computeLeadScore({ maxDwellSeconds: 90 }));
	assert.ok(computeLeadScore({ totalDwellSeconds: 300 }) > base);
});

test("contact signals, source, priority, and response time affect score as defined", () => {
	const base = computeLeadScore({});
	assert.ok(computeLeadScore({ hasPhone: true }) > base);
	assert.ok(computeLeadScore({ hasMessage: true }) > base);
	assert.ok(computeLeadScore({ hasSubject: true }) > base);
	assert.ok(computeLeadScore({ source: "property_detail" }) > base);
	assert.ok(computeLeadScore({ source: "appointment" }) > base);
	assert.ok(computeLeadScore({ priority: "high" }) > base);
	assert.ok(computeLeadScore({ priority: "low" }) < base);
	assert.ok(computeLeadScore({ responseTimeHours: 4 }) > base);
	assert.ok(computeLeadScore({ responseTimeHours: 24 }) > base);
	assert.ok(computeLeadScore({ responseTimeHours: 25 }) < base);
});

test("negative and non-finite behavior values are treated as zero", () => {
	const base = computeLeadScore({});
	assert.equal(computeLeadScore({ propertyViewCount: -3, propertyInteractionCount: -2, maxDwellSeconds: -1, totalDwellSeconds: -5 }), base);
	assert.equal(computeLeadScore({ propertyViewCount: Number.NaN, propertyInteractionCount: Number.POSITIVE_INFINITY, maxDwellSeconds: Number.NaN }), base);
	assert.ok(Number.isFinite(computeLeadScore([1, Number.NaN, Number.POSITIVE_INFINITY])));
});

test("array input uses sigmoid of its finite values", () => {
	assert.equal(computeLeadScore([0]), 0.5);
	assert.ok(computeLeadScore([1, 2]) > computeLeadScore([1]));
});

test("priority thresholds are inclusive", () => {
	assert.equal(priorityFromLeadScore(0.72), "high");
	assert.equal(priorityFromLeadScore(0.35), "low");
	assert.equal(priorityFromLeadScore(0.71), "medium");
});
