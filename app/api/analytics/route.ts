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

		await supabaseServer.from("sessions").upsert({
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

	const { error } = await supabaseServer.from("analytics_events").insert({
		event_type: eventType,
		session_id: sessionId || null,
		property_id: propertyId || null,
		page_path: path || null,
		source,
		metadata: body && typeof body === "object" ? body : {},
	});

	if (propertyId) {
		await supabaseServer.from("property_analytics").insert({
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
