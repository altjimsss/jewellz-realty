import { getOrCreateSessionId } from "@/lib/session";

type AnalyticsEventPayload = {
	event: string;
	sessionId: string;
	source: string;
	path?: string;
	referrer?: string;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	[key: string]: unknown;
};

type QueuedEvent = {
	body: AnalyticsEventPayload;
	resolve: (value: { event: string; payload: AnalyticsEventPayload; ok: boolean }) => void;
};

const FLUSH_INTERVAL_MS = 650;
const MAX_BATCH_SIZE = 12;
const MAX_QUEUE_SIZE = 60;
const DEDUPE_WINDOW_MS = 10_000;

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const recentEventKeys = new Map<string, number>();

function getUtmParams() {
	if (typeof window === "undefined") return {};

	const params = new URLSearchParams(window.location.search);
	return {
		utmSource: params.get("utm_source") ?? undefined,
		utmMedium: params.get("utm_medium") ?? undefined,
		utmCampaign: params.get("utm_campaign") ?? undefined,
	};
}

function getBrowserName(userAgent: string) {
	if (/Edg\//.test(userAgent)) return "Edge";
	if (/OPR\//.test(userAgent)) return "Opera";
	if (/Chrome\//.test(userAgent)) return "Chrome";
	if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
	if (/Firefox\//.test(userAgent)) return "Firefox";
	return "Other";
}

function getOsName(userAgent: string) {
	if (/Windows/i.test(userAgent)) return "Windows";
	if (/Android/i.test(userAgent)) return "Android";
	if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
	if (/Mac OS X/i.test(userAgent)) return "macOS";
	if (/Linux/i.test(userAgent)) return "Linux";
	return "Other";
}

function getDeviceType(userAgent: string) {
	if (/iPad|Tablet/i.test(userAgent)) return "tablet";
	if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) return "mobile";
	return "desktop";
}

function getVisitorEnvironment() {
	if (typeof window === "undefined") return {};
	const userAgent = window.navigator.userAgent;
	return {
		anonymousVisitorId: getOrCreateSessionId(),
		deviceType: getDeviceType(userAgent),
		browser: getBrowserName(userAgent),
		os: getOsName(userAgent),
		language: window.navigator.language,
	};
}

function getEventKey(body: AnalyticsEventPayload) {
	if (body.event === "property_dwell_time") return "";
	const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
	return `${body.sessionId}:${body.event}:${propertyId}:${body.path ?? ""}`;
}

function shouldDropDuplicate(body: AnalyticsEventPayload) {
	const key = getEventKey(body);
	if (!key) return false;

	const currentTime = Date.now();
	const previousTime = recentEventKeys.get(key) ?? 0;
	recentEventKeys.set(key, currentTime);

	for (const [eventKey, seenAt] of recentEventKeys) {
		if (currentTime - seenAt > DEDUPE_WINDOW_MS) recentEventKeys.delete(eventKey);
	}

	return currentTime - previousTime < DEDUPE_WINDOW_MS;
}

async function postAnalyticsBatch(items: QueuedEvent[]) {
	const events = items.map((item) => item.body);

	try {
		const response = await fetch("/api/analytics", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(events.length === 1 ? events[0] : { events }),
			keepalive: true,
		});
		for (const item of items) item.resolve({ event: item.body.event, payload: item.body, ok: response.ok });
	} catch {
		for (const item of items) item.resolve({ event: item.body.event, payload: item.body, ok: false });
	}
}

function flushQueue() {
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}

	if (queue.length === 0) return;
	const batch = queue.splice(0, MAX_BATCH_SIZE);
	void postAnalyticsBatch(batch);

	if (queue.length > 0) {
		flushTimer = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
	}
}

function scheduleFlush() {
	if (queue.length >= MAX_BATCH_SIZE) {
		flushQueue();
		return;
	}

	if (!flushTimer) flushTimer = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
}

if (typeof window !== "undefined") {
	window.addEventListener("pagehide", () => {
		if (queue.length === 0) return;
		const pending = queue.splice(0);
		const events = pending.map((item) => item.body);
		const sent = navigator.sendBeacon?.("/api/analytics", new Blob([JSON.stringify({ events })], { type: "application/json" }));
		for (const item of pending) {
			// sendBeacon has no response, but it is the best available page-exit path.
			item.resolve({ event: item.body.event, payload: item.body, ok: Boolean(sent) });
		}
	});
}

export function trackEvent(event: string, payload: Record<string, unknown> = {}) {
	const browserPayload =
		typeof window === "undefined"
			? {}
			: {
					path: window.location.pathname,
					referrer: document.referrer || undefined,
					...getUtmParams(),
					...getVisitorEnvironment(),
				};

	const body = {
		event,
		sessionId: getOrCreateSessionId(),
		source: "website",
		...browserPayload,
		...payload,
	} satisfies AnalyticsEventPayload;

	if (shouldDropDuplicate(body)) return Promise.resolve({ event, payload: body, ok: true });

	return new Promise<{ event: string; payload: AnalyticsEventPayload; ok: boolean }>((resolve) => {
		if (queue.length >= MAX_QUEUE_SIZE) queue.shift()?.resolve({ event, payload: body, ok: false });
		queue.push({ body, resolve });
		if (event === "property_dwell_time" || payload.immediate === true) flushQueue();
		else scheduleFlush();
	});
}
