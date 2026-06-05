import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { extractPropertyChatContent } from "@/lib/property-chat";
import { supabaseServer } from "@/lib/supabase/server";

type ChatMessage = {
	role: "assistant" | "user";
	content: string;
};

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
}

async function getUserIdFromCookies() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !supabaseKey) return null;

	const cookieStore = await cookies();
	const supabase = createServerClient(supabaseUrl, supabaseKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll() {
				// This route only reads the current session.
			},
		},
	});

	const { data, error } = await supabase.auth.getUser();
	if (error || !data.user) return null;
	return data.user.id;
}

async function requireAdmin(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	let userId = "";

	if (token) {
		const { data } = await supabaseServer.auth.getUser(token);
		userId = data.user?.id ?? "";
	}

	if (!userId) {
		userId = await getUserIdFromCookies() ?? "";
	}

	if (!userId) return { error: "Invalid or expired admin session.", status: 401 as const };

	const { data: profile, error } = await supabaseServer
		.from("profiles")
		.select("role, is_active")
		.eq("id", userId)
		.maybeSingle();

	if (error) return { error: error.message, status: 500 as const };
	if (!profile?.is_active || profile.role !== "admin") return { error: "Admin access is required.", status: 403 as const };

	return { userId };
}

function safeRows<T extends Record<string, unknown>>(result: { data: T[] | null; error: { message: string } | null }) {
	return result.error ? [] : result.data ?? [];
}

function compactHistory(value: unknown): ChatMessage[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const role = (item as { role?: unknown }).role;
			const content = text((item as { content?: unknown }).content);
			if ((role !== "assistant" && role !== "user") || !content) return null;
			return { role, content: content.slice(0, 500) };
		})
		.filter((item): item is ChatMessage => Boolean(item))
		.slice(-5);
}

async function buildAnalyticsContext() {
	const since = new Date();
	since.setDate(since.getDate() - 30);

	const [
		properties,
		inquiries,
		listingPerformance,
		trafficSources,
		dailyInquiryVolume,
		agentPerformance,
		recommendations,
		events,
		sessions,
	] = await Promise.all([
		supabaseServer.from("properties").select("id, title, price, location, property_type, status, created_at").limit(300),
		supabaseServer.from("inquiries").select("id, status, priority, lead_score, property_id, created_at").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(300),
		supabaseServer.from("mv_listing_performance").select("*").limit(15),
		supabaseServer.from("mv_traffic_sources").select("*").limit(10),
		supabaseServer.from("mv_daily_inquiry_volume").select("*").limit(30),
		supabaseServer.from("mv_agent_performance").select("*").limit(10),
		supabaseServer.from("recommendations").select("was_clicked, is_fallback, generated_at").gte("generated_at", since.toISOString()).limit(300),
		supabaseServer.from("analytics_events").select("event_type, property_id, created_at").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(500),
		supabaseServer.from("sessions").select("id").limit(300),
	]);

	const propertyRows = safeRows(properties);
	const inquiryRows = safeRows(inquiries);
	const recommendationRows = safeRows(recommendations);
	const eventRows = safeRows(events);
	const sessionRows = safeRows(sessions);
	const clickedRecommendations = recommendationRows.filter((row) => row.was_clicked).length;
	const fallbackRecommendations = recommendationRows.filter((row) => row.is_fallback).length;
	const statusCounts = inquiryRows.reduce<Record<string, number>>((acc, row) => {
		const status = text(row.status) || "unknown";
		acc[status] = (acc[status] ?? 0) + 1;
		return acc;
	}, {});
	const eventCounts = eventRows.reduce<Record<string, number>>((acc, row) => {
		const eventType = text(row.event_type) || "unknown";
		acc[eventType] = (acc[eventType] ?? 0) + 1;
		return acc;
	}, {});

	return {
		window: "latest 30 days where timestamped data is available",
		totals: {
			properties: propertyRows.length,
			inquiries: inquiryRows.length,
			sessions: sessionRows.length,
			analyticsEvents: eventRows.length,
			recommendations: recommendationRows.length,
		},
		leadHealth: {
			highPriority: inquiryRows.filter((row) => text(row.priority) === "high").length,
			newOrUnassigned: inquiryRows.filter((row) => text(row.status) === "new" || text(row.status) === "unassigned").length,
			averageLeadScore: inquiryRows.length ? Number((inquiryRows.reduce((sum, row) => sum + numberValue(row.lead_score), 0) / inquiryRows.length).toFixed(3)) : 0,
			statusCounts,
		},
		recommendationHealth: {
			clicked: clickedRecommendations,
			fallback: fallbackRecommendations,
			ctrPct: recommendationRows.length ? Number(((clickedRecommendations / recommendationRows.length) * 100).toFixed(1)) : 0,
			fallbackPct: recommendationRows.length ? Number(((fallbackRecommendations / recommendationRows.length) * 100).toFixed(1)) : 0,
		},
		events: {
			counts: eventCounts,
			recent: eventRows.slice(0, 10).map((row) => ({
				event_type: text(row.event_type),
				property_id: text(row.property_id),
				created_at: text(row.created_at),
			})),
		},
		listings: safeRows(listingPerformance).map((row) => ({
			title: text(row.title) || "Untitled listing",
			total_views: numberValue(row.total_views),
			detail_opens: numberValue(row.detail_opens),
			total_interactions: numberValue(row.total_interactions),
			total_inquiries: numberValue(row.total_inquiries),
			inquiry_rate_pct: numberValue(row.inquiry_rate_pct),
			avg_dwell_seconds: numberValue(row.avg_dwell_seconds),
		})),
		trafficSources: safeRows(trafficSources).map((row) => ({
			source: text(row.source) || "unknown",
			session_count: numberValue(row.session_count),
			total_page_views: numberValue(row.total_page_views),
			share_pct: numberValue(row.share_pct),
		})),
		inquiryTrend: safeRows(dailyInquiryVolume).map((row) => ({
			date: text(row.inquiry_date),
			total_inquiries: numberValue(row.total_inquiries),
		})),
		agents: safeRows(agentPerformance).map((row) => ({
			agent_name: text(row.agent_name) || "Unassigned",
			total_assigned: numberValue(row.total_assigned),
			conversions: numberValue(row.conversions),
			conversion_rate_pct: numberValue(row.conversion_rate_pct),
			avg_response_time_hours: numberValue(row.avg_response_time_hours),
		})),
		inventorySample: propertyRows.slice(0, 25).map((row) => ({
			title: text(row.title),
			price: numberValue(row.price),
			location: text(row.location),
			property_type: text(row.property_type),
			status: text(row.status),
		})),
		dataQuality: {
			sparseEvents: eventRows.length < 50,
			sparseInquiries: inquiryRows.length < 10,
			note: "If a table or materialized view is missing, that dataset is omitted rather than fabricated.",
		},
	};
}

function fallbackAnalyticsReply(context: Awaited<ReturnType<typeof buildAnalyticsContext>>, message: string) {
	const topListing = context.listings.slice().sort((a, b) => b.total_views - a.total_views)[0];
	const riskListing = context.listings
		.slice()
		.sort((a, b) => (b.total_views - b.total_inquiries * 6) - (a.total_views - a.total_inquiries * 6))[0];
	const topSource = context.trafficSources.slice().sort((a, b) => b.session_count - a.session_count)[0];
	const lower = message.toLowerCase();
	const sparseNote = context.dataQuality.sparseEvents || context.dataQuality.sparseInquiries
		? " Data is still sparse, so treat this as directional until more sessions and inquiries are recorded."
		: "";

	if (lower.includes("traffic") || lower.includes("source") || lower.includes("visitor")) {
		return topSource
			? `${topSource.source} is the top recorded source with ${topSource.session_count} sessions and ${topSource.total_page_views} page views.${sparseNote}`
			: `Traffic source rows are not available yet. Keep UTM/referrer capture active, then compare source sessions against inquiries.${sparseNote}`;
	}

	if (lower.includes("listing") || lower.includes("property") || lower.includes("view")) {
		return topListing
			? `${topListing.title} leads visibility with ${topListing.total_views} views and ${topListing.total_inquiries} inquiries. ${riskListing ? `${riskListing.title} is worth checking if views stay high but inquiries stay low.` : ""}${sparseNote}`
			: `Listing performance rows are empty, so I cannot rank properties yet. Property view, dwell-time, and inquiry events need to keep flowing into Supabase.${sparseNote}`;
	}

	if (lower.includes("lead") || lower.includes("inquiry") || lower.includes("pipeline")) {
		return `There are ${context.totals.inquiries} inquiries in the latest analytics window, ${context.leadHealth.highPriority} high-priority leads, and ${context.leadHealth.newOrUnassigned} new or unassigned leads. Start with high-priority unassigned leads, then review listings with views but weak inquiry rate.${sparseNote}`;
	}

	if (lower.includes("recommend") || lower.includes("ctr")) {
		return `Recommendation CTR is ${context.recommendationHealth.ctrPct}% from ${context.recommendationHealth.clicked}/${context.totals.recommendations} clicked recommendations. Fallback rate is ${context.recommendationHealth.fallbackPct}%.${sparseNote}`;
	}

	if (lower.includes("summary") || lower.includes("summarize") || lower.includes("overview") || lower.includes("attention")) {
		return `${topListing ? `${topListing.title} is the current top listing. ` : ""}${topSource ? `${topSource.source} is the strongest traffic source. ` : ""}${context.leadHealth.highPriority} high-priority leads need attention.${sparseNote}`;
	}

	return `I can answer that if you ask it in terms of traffic, listings, leads, recommendations, or forecast risk. I will keep the answer limited to your specific question.`;
}

function getAnalyticsChatModels() {
	const configuredModels = (process.env.OPENROUTER_ANALYTICS_MODEL ?? process.env.OPENROUTER_RECOMMENDATION_MODEL ?? "")
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);

	return [
		...configuredModels,
		"z-ai/glm-4.5-air:free",
		"openai/gpt-oss-120b:free",
		"nvidia/nemotron-3-super-120b-a12b:free",
	].filter((model, index, models) => models.indexOf(model) === index);
}

export async function POST(request: Request) {
	const limiter = checkRateLimit(`analytics-chat:${clientKey(request)}`, { limit: 30, windowMs: 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many analytics chat requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const admin = await requireAdmin(request);
	if ("error" in admin) {
		return NextResponse.json({ error: admin.error }, { status: admin.status, headers: rateLimitHeaders(limiter) });
	}

	const body = await request.json().catch(() => null);
	const message = text((body as { message?: unknown } | null)?.message);
	const history = compactHistory((body as { history?: unknown } | null)?.history);

	if (!message) {
		return NextResponse.json({ error: "Message is required." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		const context = await buildAnalyticsContext();
		return NextResponse.json({
			content: fallbackAnalyticsReply(context, message),
			isFallback: true,
			reason: "OPENROUTER_API_KEY is not configured.",
		}, { headers: rateLimitHeaders(limiter) });
	}

	const context = await buildAnalyticsContext();

	try {
		let lastStatus = 502;
		for (const model of getAnalyticsChatModels()) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 8_000);
			const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
					"X-Title": "Jewellz Realty CMS Analytics",
				},
				body: JSON.stringify({
					model,
					messages: [
						{
							role: "system",
							content: "You are the Jewellz Realty CMS analytics assistant. Answer only the admin's latest question. Do not add unrelated summaries, extra sections, or unsolicited recommendations. Use only the supplied analytics context and chat history. Never invent metrics. If the question is outside CMS analytics, say you can only answer CMS analytics questions. If data is sparse or missing, say that briefly. Keep the response concise and directly scoped to the question.",
						},
						{
							role: "user",
							content: `Analytics context:\n${JSON.stringify(context)}\n\nRecent chat:\n${JSON.stringify(history)}\n\nAdmin question: ${message}`,
						},
					],
					temperature: 0.25,
					max_tokens: 420,
				}),
				signal: controller.signal,
			}).catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") return null;
				throw error;
			}).finally(() => clearTimeout(timeoutId));

			if (!response) continue;

			const data: unknown = await response.json().catch(() => null);
			if (!response.ok) {
				lastStatus = response.status;
				if ([400, 404, 429, 502, 503].includes(response.status)) continue;
				return NextResponse.json({ error: "Analytics chat provider request failed." }, { status: response.status, headers: rateLimitHeaders(limiter) });
			}

			const content = extractPropertyChatContent(data);
			if (content) return NextResponse.json({ content, model }, { headers: rateLimitHeaders(limiter) });
		}

		return NextResponse.json({
			content: fallbackAnalyticsReply(context, message),
			isFallback: true,
			reason: `Analytics chat provider returned no usable response. Last status: ${lastStatus}.`,
		}, { headers: rateLimitHeaders(limiter) });
	} catch (error) {
		const isAbortError = error instanceof DOMException && error.name === "AbortError";
		return NextResponse.json({
			content: fallbackAnalyticsReply(context, message),
			isFallback: true,
			reason: isAbortError ? "Analytics chat request timed out." : "Analytics chat request failed.",
		}, { headers: rateLimitHeaders(limiter) });
	}
}
