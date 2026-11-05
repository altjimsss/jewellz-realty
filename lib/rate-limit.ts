type RateLimitOptions = {
	limit: number;
	windowMs: number;
};

type RateLimitState = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, RateLimitState>();
const MAX_BUCKETS = 10_000;
let checksSincePrune = 0;

function now() {
	return Date.now();
}

export function clientKey(request: Request) {
	const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
	const realIp = request.headers.get("x-real-ip")?.trim();
	return forwardedFor || realIp || "local";
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
	const currentTime = now();
	// Expired keys otherwise accumulate forever in long-lived Node processes.
	// Pruning periodically avoids a full map scan on every request.
	checksSincePrune += 1;
	if (checksSincePrune >= 128) {
		checksSincePrune = 0;
		for (const [bucketKey, state] of buckets) {
			if (state.resetAt <= currentTime) buckets.delete(bucketKey);
		}
	}
	const existing = buckets.get(key);

	if (!existing || existing.resetAt <= currentTime) {
		const next = { count: 1, resetAt: currentTime + options.windowMs };
		if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
			const oldestKey = buckets.keys().next().value;
			if (oldestKey !== undefined) buckets.delete(oldestKey);
		}
		buckets.set(key, next);
		return { allowed: true, remaining: options.limit - 1, resetAt: next.resetAt };
	}

	existing.count += 1;
	if (existing.count > options.limit) {
		return { allowed: false, remaining: 0, resetAt: existing.resetAt };
	}

	return { allowed: true, remaining: Math.max(0, options.limit - existing.count), resetAt: existing.resetAt };
}

export function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>) {
	return {
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
	};
}
