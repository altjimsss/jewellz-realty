export type LeadScoreInput = {
	propertyViewCount?: number;
	propertyInteractionCount?: number;
	maxDwellSeconds?: number;
	totalDwellSeconds?: number;
	hasPhone?: boolean;
	hasMessage?: boolean;
	hasSubject?: boolean;
	source?: string;
	priority?: string;
	responseTimeHours?: number | null;
};

function sigmoid(value: number) {
	return 1 / (1 + Math.exp(-value));
}

export function computeLeadScore(input: LeadScoreInput | number[]) {
	if (Array.isArray(input)) {
		return sigmoid(input.reduce((total, value) => total + value, 0));
	}

	const views = Math.min(input.propertyViewCount ?? 0, 8);
	const interactions = Math.min(input.propertyInteractionCount ?? 0, 12);
	const maxDwellSeconds = Math.max(0, input.maxDwellSeconds ?? 0);
	const totalDwellSeconds = Math.max(0, input.totalDwellSeconds ?? 0);
	const priority = input.priority?.toLowerCase();
	const source = input.source?.toLowerCase();
	let rawScore = -2;

	rawScore += Math.min(1.6, views * 0.22);
	rawScore += Math.min(1.4, interactions * 0.16);
	if (maxDwellSeconds >= 180) rawScore += 0.95;
	else if (maxDwellSeconds >= 90) rawScore += 0.65;
	else if (maxDwellSeconds >= 45) rawScore += 0.35;
	if (totalDwellSeconds >= 300) rawScore += 0.45;
	if (input.hasPhone) rawScore += 0.7;
	if (input.hasMessage) rawScore += 0.65;
	if (input.hasSubject) rawScore += 0.25;
	if (source?.includes("appointment")) rawScore += 1;
	if (source?.includes("property")) rawScore += 0.35;
	if (priority === "high") rawScore += 1.1;
	if (priority === "low") rawScore -= 0.6;

	if (typeof input.responseTimeHours === "number") {
		if (input.responseTimeHours <= 4) rawScore += 0.7;
		else if (input.responseTimeHours <= 24) rawScore += 0.25;
		else rawScore -= 0.2;
	}

	return Number(sigmoid(rawScore).toFixed(4));
}

export function priorityFromLeadScore(score: number) {
	if (score >= 0.72) return "high";
	if (score <= 0.35) return "low";
	return "medium";
}
