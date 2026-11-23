import { NextResponse } from "next/server";
import { computeLeadScore } from "@/lib/lead-scoring";
import { supabaseServer } from "@/lib/supabase/server";

const BATCH_SIZE = 100;
const MAX_BATCHES_PER_REQUEST = 10;

type UnscoredInquiry = {
	id: string;
	property_id?: string | null;
	session_id?: string | null;
	buyer_phone?: string | null;
	priority?: string | null;
};

type BehaviorEvent = {
	event_type?: unknown;
	session_id?: unknown;
	property_id?: unknown;
	metadata?: unknown;
};

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function eventName(event: BehaviorEvent) {
	if (event.metadata && typeof event.metadata === "object") {
		const metadataEvent = text((event.metadata as Record<string, unknown>).event);
		if (metadataEvent) return metadataEvent;
	}
	return text(event.event_type);
}

function durationSeconds(event: BehaviorEvent) {
	if (!event.metadata || typeof event.metadata !== "object") return 0;
	const value = Number((event.metadata as Record<string, unknown>).durationSeconds);
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function behaviorBySession(events: BehaviorEvent[]) {
	const viewNames = new Set(["property_view", "page_view", "view", "listing_view"]);
	const interactionNames = new Set([
		"detail_open", "property_detail_open", "property_open", "property_click", "property_gallery_interaction",
		"property_gallery_open", "property_gallery_next", "property_gallery_previous", "property_map_open",
		"property_nearby_click", "recommendation_click",
	]);
	const grouped = new Map<string, { propertyViewCount: number; propertyInteractionCount: number; maxDwellSeconds: number; totalDwellSeconds: number }>();
	for (const event of events) {
		const sessionId = text(event.session_id);
		if (!sessionId) continue;
		const key = `${sessionId}\u0000${text(event.property_id)}`;
		const signals = grouped.get(key) ?? { propertyViewCount: 0, propertyInteractionCount: 0, maxDwellSeconds: 0, totalDwellSeconds: 0 };
		const name = eventName(event);
		if (viewNames.has(name)) signals.propertyViewCount += 1;
		if (interactionNames.has(name) || name.includes("click") || name.includes("open")) signals.propertyInteractionCount += 1;
		if (name === "property_dwell_time") {
			const seconds = durationSeconds(event);
			signals.maxDwellSeconds = Math.max(signals.maxDwellSeconds, seconds);
			signals.totalDwellSeconds += seconds;
		}
		grouped.set(key, signals);
	}
	return grouped;
}

async function requireAdmin(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return { error: "An active admin session is required.", status: 401 as const };
	const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
	if (authError || !authData.user) return { error: "Your admin session is invalid or expired.", status: 401 as const };
	const { data: profile, error } = await supabaseServer.from("profiles").select("role,is_active").eq("id", authData.user.id).maybeSingle();
	if (error) return { error: error.message, status: 500 as const };
	if (profile?.role !== "admin" || profile.is_active !== true) return { error: "Admin access is required.", status: 403 as const };
	return { userId: authData.user.id };
}

export async function POST(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

	let scoredCount = 0;
	for (let batch = 0; batch < MAX_BATCHES_PER_REQUEST; batch += 1) {
		const { data, error } = await supabaseServer
			.from("inquiries")
			.select("id,property_id,session_id,buyer_phone,priority")
			.is("lead_score", null)
			.order("created_at", { ascending: true })
			.limit(BATCH_SIZE);
		if (error) return NextResponse.json({ error: error.message }, { status: 500 });
		const inquiries = (data ?? []) as UnscoredInquiry[];
		if (!inquiries.length) break;

		const sessionIds = [...new Set(inquiries.map((inquiry) => text(inquiry.session_id)).filter(Boolean))];
		let events: BehaviorEvent[] = [];
		if (sessionIds.length) {
			const eventResult = await supabaseServer.from("analytics_events").select("event_type,session_id,property_id,metadata").in("session_id", sessionIds).limit(5000);
			if (!eventResult.error) events = eventResult.data ?? [];
			else if (eventResult.error.message.includes("metadata")) {
				const fallbackEvents = await supabaseServer.from("analytics_events").select("event_type,session_id,property_id").in("session_id", sessionIds).limit(5000);
				events = fallbackEvents.data ?? [];
			}
		}
		const groupedEvents = behaviorBySession(events);

		for (let start = 0; start < inquiries.length; start += 20) {
			const updates = await Promise.all(inquiries.slice(start, start + 20).map(async (inquiry) => {
				const signals = groupedEvents.get(`${text(inquiry.session_id)}\u0000${text(inquiry.property_id)}`);
				const leadScore = computeLeadScore({
					...(signals ?? {}),
					hasPhone: Boolean(text(inquiry.buyer_phone)),
					priority: text(inquiry.priority),
				});
				const result = await supabaseServer.from("inquiries").update({ lead_score: leadScore }).eq("id", inquiry.id).is("lead_score", null);
				return { error: result.error, scored: !result.error };
			}));
			const failedUpdate = updates.find((update) => update.error);
			if (failedUpdate?.error) return NextResponse.json({ error: failedUpdate.error.message, scoredCount }, { status: 500 });
			scoredCount += updates.filter((update) => update.scored).length;
		}
		if (inquiries.length < BATCH_SIZE) break;
	}

	const { count, error: countError } = await supabaseServer.from("inquiries").select("id", { count: "exact", head: true }).is("lead_score", null);
	if (countError) return NextResponse.json({ error: countError.message, scoredCount }, { status: 500 });
	return NextResponse.json({ ok: true, scoredCount, remainingUnscored: count ?? 0 });
}
