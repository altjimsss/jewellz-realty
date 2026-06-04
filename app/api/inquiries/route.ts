import { NextResponse } from "next/server";
import { computeLeadScore, priorityFromLeadScore } from "@/lib/lead-scoring";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function databaseSource(value: string) {
	const normalized = value.toLowerCase();
	if (normalized.includes("facebook")) return "social_media_facebook";
	if (normalized.includes("instagram")) return "social_media_instagram";
	if (normalized.includes("email")) return "email_campaign";
	if (normalized.includes("phone")) return "phone";
	if (normalized.includes("walk")) return "walk_in";
	if (normalized.includes("referral")) return "referral";
	if (normalized.includes("organic") || normalized.includes("search")) return "organic_search";
	if (normalized.includes("direct")) return "direct";
	return "other";
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

async function getBehaviorSignals(propertyId: string, sessionId: string) {
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
		"detail_open",
		"property_detail_open",
		"property_open",
		"property_click",
		"property_gallery_interaction",
		"property_gallery_open",
		"property_gallery_next",
		"property_gallery_previous",
		"property_map_open",
		"property_nearby_click",
		"recommendation_click",
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
			const dwellSeconds = numberFromMetadata(row.metadata, "durationSeconds");
			maxDwellSeconds = Math.max(maxDwellSeconds, dwellSeconds);
			totalDwellSeconds += dwellSeconds;
		}
	}

	return { propertyViewCount, propertyInteractionCount, maxDwellSeconds, totalDwellSeconds };
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const buyerName = text(body?.buyerName);
	const buyerEmail = text(body?.buyerEmail);
	const buyerPhone = text(body?.buyerPhone);
	const buyerMessage = text(body?.message || body?.buyerMessage || body?.subject);
	const propertyId = text(body?.propertyId);
	const source = text(body?.source) || "website";
	const requestedPriority = text(body?.priority);
	const sessionId = text(body?.sessionId);

	if (!buyerName || !buyerEmail) {
		return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
	}

	const behaviorSignals = await getBehaviorSignals(propertyId, sessionId);
	const leadScore = computeLeadScore({
		...behaviorSignals,
		hasPhone: Boolean(buyerPhone),
		hasMessage: Boolean(buyerMessage),
		hasSubject: Boolean(text(body?.subject)),
		source,
		priority: requestedPriority,
	});
	const payload = {
		property_id: propertyId || null,
		buyer_name: buyerName,
		buyer_email: buyerEmail,
		buyer_phone: buyerPhone || null,
		buyer_message: buyerMessage || null,
		session_id: sessionId || null,
		source: databaseSource(source),
		status: "new",
		priority: requestedPriority || priorityFromLeadScore(leadScore),
		lead_score: leadScore,
	};

	const { data, error } = await supabaseServer.from("inquiries").insert(payload).select("id").single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true, inquiryId: data?.id });
}
