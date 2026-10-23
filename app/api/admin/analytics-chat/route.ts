import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { extractPropertyChatContent } from "@/lib/property-chat";
import { supabaseServer } from "@/lib/supabase/server";
import { hasAiConfigured, runAiChatCompletion } from "@/lib/ai/client";

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
		supabaseServer.from("mv_listing_performance").select("*").limit(20),
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

	// Property ID -> readable title map to ensure NO raw UUIDs ever leak to the user
	const propertyMap = new Map<string, string>();
	for (const p of propertyRows) {
		if (p.id) {
			propertyMap.set(String(p.id), text(p.title) || "Untitled Property");
		}
	}

	// Calculate Today and Yesterday ISO dates (YYYY-MM-DD)
	const now = new Date();
	const todayDateStr = now.toISOString().slice(0, 10);
	const yDate = new Date(now);
	yDate.setDate(yDate.getDate() - 1);
	const yesterdayDateStr = yDate.toISOString().slice(0, 10);

	const yesterdayEvents = eventRows.filter((r) => text(r.created_at).startsWith(yesterdayDateStr));
	const yesterdayInquiries = inquiryRows.filter((r) => text(r.created_at).startsWith(yesterdayDateStr));
	const todayEvents = eventRows.filter((r) => text(r.created_at).startsWith(todayDateStr));
	const todayInquiries = inquiryRows.filter((r) => text(r.created_at).startsWith(todayDateStr));

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
		timeWindow: "latest 30 days",
		calendarContext: {
			todayDate: todayDateStr,
			yesterdayDate: yesterdayDateStr,
		},
		yesterdayActivity: {
			date: yesterdayDateStr,
			totalViews: yesterdayEvents.length,
			totalInquiries: yesterdayInquiries.length,
			viewedListings: Array.from(new Set(yesterdayEvents.map((e) => propertyMap.get(text(e.property_id)) || "general listing"))),
			inquiries: yesterdayInquiries.map((i) => ({
				status: text(i.status) || "new",
				priority: text(i.priority) || "medium",
				listing: propertyMap.get(text(i.property_id)) || "general listing",
			})),
		},
		todayActivity: {
			date: todayDateStr,
			totalViews: todayEvents.length,
			totalInquiries: todayInquiries.length,
			viewedListings: Array.from(new Set(todayEvents.map((e) => propertyMap.get(text(e.property_id)) || "general listing"))),
		},
		portfolioOverview: {
			totalProperties: propertyRows.length,
			totalInquiries: inquiryRows.length,
			totalSessions: sessionRows.length,
			totalRecordedEvents: eventRows.length,
			recommendationImpressions: recommendationRows.length,
		},
		leadHealth: {
			highPriority: inquiryRows.filter((row) => text(row.priority) === "high").length,
			newOrUnassigned: inquiryRows.filter((row) => text(row.status) === "new" || text(row.status) === "unassigned").length,
			averageLeadScore: inquiryRows.length ? Number((inquiryRows.reduce((sum, row) => sum + numberValue(row.lead_score), 0) / inquiryRows.length).toFixed(3)) : 0,
			statusBreakdown: statusCounts,
		},
		recommendations: {
			clicked: clickedRecommendations,
			fallback: fallbackRecommendations,
			ctrPct: recommendationRows.length ? Number(((clickedRecommendations / recommendationRows.length) * 100).toFixed(1)) : 0,
			fallbackPct: recommendationRows.length ? Number(((fallbackRecommendations / recommendationRows.length) * 100).toFixed(1)) : 0,
		},
		topListings: safeRows(listingPerformance).map((row) => ({
			title: text(row.title) || "Untitled listing",
			total_views: numberValue(row.total_views),
			total_inquiries: numberValue(row.total_inquiries),
			inquiry_rate_pct: numberValue(row.inquiry_rate_pct),
			avg_dwell_seconds: numberValue(row.avg_dwell_seconds),
		})),
		trafficChannels: safeRows(trafficSources).map((row) => ({
			channel: text(row.source) || "Direct",
			sessions: numberValue(row.session_count),
			page_views: numberValue(row.total_page_views),
			share_pct: numberValue(row.share_pct),
		})),
		agentPerformance: safeRows(agentPerformance).map((row) => ({
			agent_name: text(row.agent_name) || "Unassigned",
			assigned: numberValue(row.total_assigned),
			conversions: numberValue(row.conversions),
			conversion_rate_pct: numberValue(row.conversion_rate_pct),
		})),
	};
}

function fallbackAnalyticsReply(context: Awaited<ReturnType<typeof buildAnalyticsContext>>, message: string) {
	const topListing = context.topListings[0];
	const topSource = context.trafficChannels[0];
	const lower = message.toLowerCase();

	if (lower.includes("yesterday")) {
		const count = context.yesterdayActivity.totalViews;
		const inq = context.yesterdayActivity.totalInquiries;
		const listingNames = context.yesterdayActivity.viewedListings.join(", ") || "Azure Studio Condo";
		return `Yesterday was quiet on new submissions with ${inq} inquiries, but recorded **${count} views** on **${listingNames}**. Overall pipeline remains active with **${context.leadHealth.highPriority} high-priority leads** requiring agent follow-up.\n\n[ACTION:navigate_high_priority|View High-Priority Leads]`;
	}

	if (lower.includes("today")) {
		const count = context.todayActivity.totalViews;
		const inq = context.todayActivity.totalInquiries;
		return `So far today, we've recorded **${count} views** and **${inq} new inquiries**. Overall monthly traffic is standing at ${context.portfolioOverview.totalRecordedEvents} events.\n\n[ACTION:navigate_inquiries|Check Inquiries Pipeline]`;
	}

	if (lower.includes("export") || lower.includes("download") || lower.includes("csv")) {
		return `You can export your data reports directly from here:\n\n[ACTION:export_inquiries|Download Inquiries CSV]\n[ACTION:export_listings|Download Listing Report CSV]`;
	}

	if (lower.includes("lead") || lower.includes("inquiry") || lower.includes("pipeline")) {
		return `You have **${context.portfolioOverview.totalInquiries} total inquiries** logged this month, with **${context.leadHealth.highPriority} high-priority** and **${context.leadHealth.newOrUnassigned} unassigned** leads needing attention.\n\n[ACTION:navigate_high_priority|Open High-Priority Leads]`;
	}

	if (lower.includes("listing") || lower.includes("property") || lower.includes("view")) {
		return topListing
			? `**${topListing.title}** is currently your top-performing property with **${topListing.total_views} views** and **${topListing.total_inquiries} inquiries**.\n\n[ACTION:navigate_listings|Inspect Active Listings]`
			: `Listing analytics are aggregating as visitors explore your catalog.\n\n[ACTION:navigate_listings|View Listings]`;
	}

	if (lower.includes("traffic") || lower.includes("source") || lower.includes("visitor")) {
		return topSource
			? `**${topSource.channel}** is the leading acquisition source with **${topSource.sessions} sessions** and **${topSource.page_views} page views**.\n\n[ACTION:navigate_analytics|Open Full Analytics]`
			: `Traffic source data is collecting. Direct and organic referral channels will appear as sessions occur.\n\n[ACTION:navigate_analytics|View Analytics]`;
	}

	return `I'm monitoring your operations in real time. We currently have **${context.portfolioOverview.totalInquiries} inquiries**, **${context.leadHealth.highPriority} high-priority leads**, and **${context.portfolioOverview.totalProperties} properties** in your active catalog.\n\n[ACTION:navigate_inquiries|Go to Inquiries Pipeline]`;
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

	const context = await buildAnalyticsContext();

	if (!hasAiConfigured()) {
		return NextResponse.json({
			content: fallbackAnalyticsReply(context, message),
			isFallback: true,
			reason: "AI provider is not configured.",
		}, { headers: rateLimitHeaders(limiter) });
	}

	const systemPrompt = `You are "Jewellz Intelligence", the executive AI Chief of Staff and operations copilot for Jewellz Realty CMS.

VOICE & TONE:
- Talk like a sharp, thoughtful human executive partner—warm, articulate, professional, and conversational.
- Answer directly in natural prose. Explain what happened, what it means for business, and what to prioritize.
- If activity was zero or low (e.g., zero inquiries yesterday), frame it naturally like a human colleague would: e.g. "Yesterday was quiet on new submissions with 0 inquiries, but Azure Studio Condo saw 2 page views. Across the month, pipeline momentum is steady with 9 high-priority leads waiting on follow-up."

CRITICAL FORMATTING RULES:
1. NEVER output markdown tables (pipes and dashes like '| col | col |'). The sidebar is narrow (270px) and tables look terrible.
2. NEVER output raw database IDs or UUIDs (e.g. '438513fb-d8c9...'). Always use the property title (e.g. 'Azure Studio Condo') or 'general listing'.
3. Use bolding cleanly for important numbers (e.g., **2 views**, **9 leads**).
4. Use clean paragraphs or concise bullet points with emojis (e.g. 📈, 🎯, ⚡, 🔔) when listing multiple items.
5. Keep responses concise (2 to 4 sentences or a punchy brief).

ACTIONABLE TASK CAPABILITY:
When the user's question or intent aligns with a CMS task (viewing inquiries, inspecting listings, exporting reports, viewing developer partners, or refreshing data), you can attach 1 or 2 interactive action buttons at the very end of your response on their own lines:
Format:
[ACTION:action_name|Button Label]

Supported action_names:
- [ACTION:navigate_inquiries|View Inquiries Pipeline]
- [ACTION:navigate_high_priority|View High-Priority Leads]
- [ACTION:navigate_listings|Inspect Active Listings]
- [ACTION:navigate_developers|View Developer Partners]
- [ACTION:navigate_analytics|Open Full Analytics]
- [ACTION:export_inquiries|Download Inquiries CSV]
- [ACTION:export_listings|Download Listing Report CSV]
- [ACTION:export_agents|Download Agent Report CSV]
- [ACTION:refresh_data|Refresh Workspace Data]

Only suggest 1 or 2 relevant action buttons per message when naturally helpful.`;

	try {
		const aiResult = await runAiChatCompletion({
			caller: "analytics-chat",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				{
					role: "user",
					content: `Live Analytics Context:\n${JSON.stringify(context)}\n\nRecent Conversation:\n${JSON.stringify(history)}\n\nUser Question/Command: ${message}`,
				},
			],
			temperature: 0.35,
			maxTokens: 500,
			timeoutMs: 15_000,
		});

		if (aiResult?.content) {
			return NextResponse.json({ content: aiResult.content, model: aiResult.model, provider: aiResult.provider }, { headers: rateLimitHeaders(limiter) });
		}

		return NextResponse.json({
			content: fallbackAnalyticsReply(context, message),
			isFallback: true,
			reason: "AI provider returned no usable response.",
		}, { headers: rateLimitHeaders(limiter) });
	} catch (error) {
		const isAbortError = error instanceof DOMException && error.name === "AbortError";
		return NextResponse.json({
			content: fallbackAnalyticsReply(context, message),
			isFallback: true,
			reason: isAbortError ? "Analytics chat request timed out." : "Analytics chat request failed.",
		}, { headers: rateLimitHeaders(limiter) });
}

