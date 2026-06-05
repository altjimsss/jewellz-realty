type RateLimitOptions = {
	limit: number;
	windowMs: number;
};

type RateLimitState = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

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
	const existing = buckets.get(key);

	if (!existing || existing.resetAt <= currentTime) {
		const next = { count: 1, resetAt: currentTime + options.windowMs };
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
