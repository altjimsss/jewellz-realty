import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function sourceFromPayload(source: string, utmSource: string, referrer: string) {
	if (utmSource) return utmSource;
	if (source && source !== "website") return source;
	if (!referrer) return "direct";
	try {
		return new URL(referrer).hostname.replace(/^www\./, "") || "referral";
	} catch {
		return "referral";
	}
}

function eventTypeCandidates(eventType: string) {
	if (eventType === "property_view") return ["property_view", "page_view", "view", "listing_view"];
	if (eventType === "detail_open") return ["detail_open", "property_detail_open", "property_open", "property_click", "click", "page_view", "view"];
	if (eventType === "property_dwell_time") return ["property_dwell_time", "page_view", "view"];
	if (eventType.startsWith("property_gallery_")) return [eventType, "property_click", "click", "page_view", "view"];
	if (eventType === "property_map_open" || eventType === "property_nearby_click") return [eventType, "property_click", "click", "page_view", "view"];
	return [eventType];
}

async function insertWithSchemaFallback(tableName: "analytics_events" | "property_analytics", payload: Record<string, unknown>, eventTypes = eventTypeCandidates(text(payload.event_type))) {
	const removedColumns = new Set<string>();
	let lastResult: Awaited<ReturnType<ReturnType<typeof supabaseServer.from>["insert"]>> | null = null;

	for (const eventType of eventTypes) {
		let nextPayload: Record<string, unknown> = { ...payload, event_type: eventType };
		for (const column of removedColumns) delete nextPayload[column];

		for (let attempt = 0; attempt < 6; attempt += 1) {
			const result = await supabaseServer.from(tableName).insert(nextPayload);
			lastResult = result;
			if (!result.error) return result;

			const missingColumn = result.error.message.match(/'([^']+)' column/)?.[1];
			const shouldDropSession = result.error.message.includes("session_id") && result.error.message.includes("fkey") && "session_id" in nextPayload;
			if (!missingColumn && !shouldDropSession) break;

			const fallbackColumn = shouldDropSession ? "session_id" : missingColumn;
			if (!fallbackColumn || !(fallbackColumn in nextPayload)) break;

			removedColumns.add(fallbackColumn);
			const { [fallbackColumn]: _missingValue, ...fallbackPayload } = nextPayload;
			nextPayload = fallbackPayload;
		}
	}

	return lastResult ?? supabaseServer.from(tableName).insert(payload);
}

async function upsertSessionWithSchemaFallback(payload: Record<string, unknown>) {
	let nextPayload: Record<string, unknown> = { ...payload };

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const result = await supabaseServer.from("sessions").upsert(nextPayload);
		if (!result.error) return result;

		const missingColumn = result.error.message.match(/'([^']+)' column/)?.[1];
		if (missingColumn && missingColumn in nextPayload) {
			const { [missingColumn]: _missingValue, ...fallbackPayload } = nextPayload;
			nextPayload = fallbackPayload;
			continue;
		}

		if (result.error.message.includes("invalid input value for enum") && nextPayload.source !== "other") {
			nextPayload = { ...nextPayload, source: "other" };
			continue;
		}

		return result;
	}

	return supabaseServer.from("sessions").upsert(nextPayload);
}

export async function GET() {
	const [properties, inquiries, listingPerformance, trafficSources] = await Promise.all([
		supabaseServer.from("properties").select("id", { count: "exact", head: true }),
		supabaseServer.from("inquiries").select("id", { count: "exact", head: true }),
		supabaseServer.from("mv_listing_performance").select("*").limit(10),
		supabaseServer.from("mv_traffic_sources").select("*").limit(10),
	]);

	return NextResponse.json({
		properties: properties.count ?? 0,
		inquiries: inquiries.count ?? 0,
		listingPerformance: listingPerformance.data ?? [],
		trafficSources: trafficSources.data ?? [],
	});
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const eventType = text(body?.event) || "page_view";
	const sessionId = text(body?.sessionId);
	const propertyId = text(body?.propertyId);
	const path = text(body?.path);
	const referrer = text(body?.referrer);
	const utmSource = text(body?.utmSource);
	const source = sourceFromPayload(text(body?.source), utmSource, referrer);

	if (sessionId) {
		const { data: existingSession } = await supabaseServer
			.from("sessions")
			.select("id, page_view_count")
			.eq("id", sessionId)
			.maybeSingle();

		await upsertSessionWithSchemaFallback({
			id: sessionId,
			source,
			referrer: referrer || null,
			utm_source: utmSource || null,
			utm_medium: text(body?.utmMedium) || null,
			utm_campaign: text(body?.utmCampaign) || null,
			landing_path: path || null,
			last_seen_at: new Date().toISOString(),
			page_view_count: eventType === "page_view" || eventType === "property_view"
				? Number(existingSession?.page_view_count ?? 0) + 1
				: Number(existingSession?.page_view_count ?? 0),
		});
	}

	const { error } = await insertWithSchemaFallback("analytics_events", {
		event_type: eventType,
		session_id: sessionId || null,
		property_id: propertyId || null,
		page_path: path || null,
		source,
		metadata: body && typeof body === "object" ? body : {},
	});

	if (propertyId) {
		await insertWithSchemaFallback("property_analytics", {
			property_id: propertyId,
			event_type: eventType,
			session_id: sessionId || null,
			source,
			page_path: path || null,
			metadata: body && typeof body === "object" ? body : {},
		});
	}

	const recommendationId = text(body?.recommendationId);
	if (eventType === "recommendation_click" && recommendationId) {
		await supabaseServer
			.from("recommendations")
			.update({ was_clicked: true, clicked_at: new Date().toISOString() })
			.eq("id", recommendationId);
	}

	return NextResponse.json({ tracked: !error, warning: error?.message });
}
