import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function numberFromMetadata(metadata: unknown, key: string) {
	if (!metadata || typeof metadata !== "object") return 0;
	const value = (metadata as Record<string, unknown>)[key];
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : 0;
}

function eventName(row: { event_type?: unknown; metadata?: unknown }) {
	const metadataEvent = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>).event : "";
	return text(metadataEvent) || text(row.event_type);
}

export async function getLeadBehaviorSignals(propertyId: string, sessionId: string) {
	if (!propertyId || !sessionId) {
		return { propertyViewCount: 0, propertyInteractionCount: 0, maxDwellSeconds: 0, totalDwellSeconds: 0 };
	}

	const result = await supabaseServer
		.from("analytics_events")
		.select("event_type, metadata")
		.eq("property_id", propertyId)
		.eq("session_id", sessionId)
		.limit(200);

	let rows: Array<{ event_type?: unknown; metadata?: unknown }> = result.data ?? [];
	if (result.error?.message.includes("'metadata' column")) {
		const fallbackResult = await supabaseServer
			.from("analytics_events")
			.select("event_type")
			.eq("property_id", propertyId)
			.eq("session_id", sessionId)
			.limit(200);
		rows = fallbackResult.data ?? [];
	}

	const viewEvents = new Set(["property_view", "page_view", "view", "listing_view"]);
	const interactionEvents = new Set([
		"detail_open", "property_detail_open", "property_open", "property_click",
		"property_gallery_interaction", "property_gallery_open", "property_gallery_next",
		"property_gallery_previous", "property_map_open", "property_nearby_click", "recommendation_click",
	]);
	let propertyViewCount = 0;
	let propertyInteractionCount = 0;
	let maxDwellSeconds = 0;
	let totalDwellSeconds = 0;

	for (const row of rows) {
		const name = eventName(row);
		if (viewEvents.has(name)) propertyViewCount += 1;
		if (interactionEvents.has(name) || name.includes("click") || name.includes("open")) propertyInteractionCount += 1;
		if (name === "property_dwell_time") {
			const seconds = numberFromMetadata(row.metadata, "durationSeconds");
			maxDwellSeconds = Math.max(maxDwellSeconds, seconds);
			totalDwellSeconds += seconds;
		}
	}

	return { propertyViewCount, propertyInteractionCount, maxDwellSeconds, totalDwellSeconds };
}
