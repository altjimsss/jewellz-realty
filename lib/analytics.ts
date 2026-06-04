import { getOrCreateSessionId } from "@/lib/session";

function getUtmParams() {
	if (typeof window === "undefined") return {};

	const params = new URLSearchParams(window.location.search);
	return {
		utmSource: params.get("utm_source") ?? undefined,
		utmMedium: params.get("utm_medium") ?? undefined,
		utmCampaign: params.get("utm_campaign") ?? undefined,
	};
}

export async function trackEvent(event: string, payload: Record<string, unknown> = {}) {
	const browserPayload =
		typeof window === "undefined"
			? {}
			: {
					path: window.location.pathname,
					referrer: document.referrer || undefined,
					...getUtmParams(),
				};

	const body = {
		event,
		sessionId: getOrCreateSessionId(),
		source: "website",
		...browserPayload,
		...payload,
	};

	try {
		const response = await fetch("/api/analytics", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			keepalive: true,
		});
		return { event, payload: body, ok: response.ok };
	} catch {
		return { event, payload: body, ok: false };
	}
}
