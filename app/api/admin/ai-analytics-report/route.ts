import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

type ReportPeriod = "daily" | "weekly" | "monthly";

type AiAnalyticsReport = {
	title: string;
	executiveSummary: string;
	descriptiveFindings: string[];
	predictiveInsights: string[];
	recommendedActions: string[];
	riskFlags: string[];
	confidence: "low" | "medium" | "high";
};

type RegressionOutput = {
	metric: string;
	method: "linear_regression";
	slope: number;
	intercept: number;
	r2: number;
	observedTotal: number;
	forecastNextPeriod: number;
	trend: "up" | "flat" | "down";
};

type ClassificationOutput = {
	entityType: "listing" | "traffic_source" | "pipeline";
	entityName: string;
	label: "high_opportunity" | "conversion_risk" | "stable" | "needs_data";
	probability: number;
	features: Record<string, number>;
	reason: string;
};

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function pct(numerator: number, denominator: number) {
	return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

function clamp(value: number, min = 0, max = 1) {
	return Math.min(max, Math.max(min, value));
}

function sigmoid(value: number) {
	return 1 / (1 + Math.exp(-value));
}

function safeArray(value: unknown) {
	return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean).slice(0, 8) : [];
}

function periodWindow(period: ReportPeriod) {
	const end = new Date();
	const start = new Date(end);
	if (period === "daily") start.setDate(end.getDate() - 1);
	if (period === "weekly") start.setDate(end.getDate() - 7);
	if (period === "monthly") start.setDate(end.getDate() - 30);
	return { start, end };
}

function toPeriod(value: string | null): ReportPeriod {
	if (value === "daily" || value === "weekly" || value === "monthly") return value;
	return "weekly";
}

function linearRegression(points: number[]): RegressionOutput {
	const n = points.length;
	if (n < 2) {
		return {
			metric: "daily_inquiry_volume",
			method: "linear_regression",
			slope: 0,
			intercept: points[0] ?? 0,
			r2: 0,
			observedTotal: points.reduce((sum, value) => sum + value, 0),
			forecastNextPeriod: points[0] ?? 0,
			trend: "flat",
		};
	}

	const xs = points.map((_, index) => index + 1);
	const xMean = xs.reduce((sum, value) => sum + value, 0) / n;
	const yMean = points.reduce((sum, value) => sum + value, 0) / n;
	const numerator = xs.reduce((sum, x, index) => sum + (x - xMean) * (points[index] - yMean), 0);
	const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
	const slope = denominator ? numerator / denominator : 0;
	const intercept = yMean - slope * xMean;
	const predictions = xs.map((x) => intercept + slope * x);
	const ssResidual = points.reduce((sum, y, index) => sum + (y - predictions[index]) ** 2, 0);
	const ssTotal = points.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
	const r2 = ssTotal ? clamp(1 - ssResidual / ssTotal) : 0;
	const forecastNextPeriod = Math.max(0, intercept + slope * (n + 1));

	return {
		metric: "daily_inquiry_volume",
		method: "linear_regression",
		slope: Number(slope.toFixed(3)),
		intercept: Number(intercept.toFixed(3)),
		r2: Number(r2.toFixed(3)),
		observedTotal: points.reduce((sum, value) => sum + value, 0),
		forecastNextPeriod: Number(forecastNextPeriod.toFixed(2)),
		trend: Math.abs(slope) < 0.1 ? "flat" : slope > 0 ? "up" : "down",
	};
}

function classifyListing(row: {
	title: string;
	total_views: number;
	total_interactions: number;
	avg_dwell_seconds: number;
	total_inquiries: number;
	inquiry_rate_pct: number;
}): ClassificationOutput {
	if (row.total_views < 5 && row.total_interactions < 3) {
		return {
			entityType: "listing",
			entityName: row.title,
			label: "needs_data",
			probability: 0.55,
			features: {
				views: row.total_views,
				interactions: row.total_interactions,
				inquiryRatePct: row.inquiry_rate_pct,
				avgDwellSeconds: row.avg_dwell_seconds,
			},
			reason: "Not enough activity has been recorded to classify this listing confidently.",
		};
	}

	const engagementScore = sigmoid(-1.4 + row.total_views * 0.04 + row.total_interactions * 0.1 + Math.min(row.avg_dwell_seconds, 240) / 180);
	const conversionScore = sigmoid(-1.2 + row.inquiry_rate_pct * 0.35 + row.total_inquiries * 0.22);
	const riskScore = clamp(engagementScore * (1 - conversionScore));
	const opportunityScore = clamp(engagementScore * conversionScore);
	const label = riskScore >= 0.48
		? "conversion_risk"
		: opportunityScore >= 0.42
			? "high_opportunity"
			: "stable";

	return {
		entityType: "listing",
		entityName: row.title,
		label,
		probability: Number((label === "conversion_risk" ? riskScore : label === "high_opportunity" ? opportunityScore : Math.max(0.5, 1 - riskScore)).toFixed(3)),
		features: {
			views: row.total_views,
			interactions: row.total_interactions,
			inquiryRatePct: row.inquiry_rate_pct,
			avgDwellSeconds: row.avg_dwell_seconds,
		},
		reason: label === "conversion_risk"
			? "Engagement is present, but inquiry conversion is weak."
			: label === "high_opportunity"
				? "Engagement and inquiry conversion are both comparatively strong."
				: "Engagement and conversion are within a normal operating range.",
	};
}

function classifyPipeline(highPriority: number, unassignedOrNew: number, inquiries: number): ClassificationOutput {
	const overdueRisk = sigmoid(-1 + highPriority * 0.3 + unassignedOrNew * 0.25 - inquiries * 0.03);
	return {
		entityType: "pipeline",
		entityName: "Lead pipeline",
		label: overdueRisk >= 0.62 ? "conversion_risk" : "stable",
		probability: Number(overdueRisk.toFixed(3)),
		features: { highPriority, unassignedOrNew, inquiries },
		reason: overdueRisk >= 0.62 ? "High-priority or new leads may wait too long without assignment." : "Pipeline load is not showing a severe queue risk.",
	};
}

function fallbackReport(summary: Awaited<ReturnType<typeof buildAnalyticsSummary>>): AiAnalyticsReport {
	const topListing = summary.topListings[0];
	const topSource = summary.trafficSources[0];
	const conversionRisks = summary.modelOutputs.classifications.filter((item) => item.label === "conversion_risk");

	return {
		title: `${summary.periodLabel} AI Analytics Report`,
		executiveSummary: `${summary.periodLabel} analytics tracked ${summary.totals.inquiries} inquiries, ${summary.totals.properties} listings, and ${summary.totals.events} recent events. The inquiry forecast is ${summary.modelOutputs.regressions[0].forecastNextPeriod} for the next comparable period.`,
		descriptiveFindings: [
			topListing ? `${topListing.title} leads listing activity with ${topListing.total_views} views, ${topListing.total_interactions} interactions, and ${topListing.total_inquiries} inquiries.` : "No listing has enough activity to identify a clear leader yet.",
			topSource ? `${topSource.source} is the leading traffic source with ${topSource.session_count} sessions.` : "Traffic source data is not yet populated.",
			`Recommendation CTR is ${summary.recommendations.ctrPct}% and fallback rate is ${summary.recommendations.fallbackPct}%.`,
		],
		predictiveInsights: [
			`Linear regression forecasts ${summary.modelOutputs.regressions[0].forecastNextPeriod} inquiries for the next comparable ${summary.period}.`,
			`Inquiry trend is classified as ${summary.modelOutputs.regressions[0].trend} with R2 ${summary.modelOutputs.regressions[0].r2}.`,
			conversionRisks[0] ? `${conversionRisks[0].entityName} is classified as ${conversionRisks[0].label} with probability ${conversionRisks[0].probability}.` : "No severe conversion-risk classification was detected.",
		],
		recommendedActions: [
			"Review listings classified as conversion risk before increasing promotion spend.",
			"Prioritize high-score and unassigned leads for same-day follow-up.",
			"Compare forecasted inquiry volume against actual volume in the next report cycle.",
		],
		riskFlags: [
			summary.dataQuality.hasSparseData ? "Limited analytics volume means model outputs should be treated as early signals." : "",
			summary.recommendations.fallbackPct > 60 ? "Recommendation fallback rate is high, which can weaken personalization." : "",
			...conversionRisks.slice(0, 2).map((item) => `${item.entityName}: ${item.reason}`),
		].filter(Boolean),
		confidence: summary.dataQuality.hasSparseData ? "low" : summary.modelOutputs.regressions[0].r2 >= 0.45 ? "high" : "medium",
	};
}

function parseAiReport(content: string, summary: Awaited<ReturnType<typeof buildAnalyticsSummary>>): AiAnalyticsReport {
	try {
		const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
		const parsed = JSON.parse(cleaned) as Partial<AiAnalyticsReport>;
		const fallback = fallbackReport(summary);
		const descriptiveFindings = safeArray(parsed.descriptiveFindings);
		const predictiveInsights = safeArray(parsed.predictiveInsights);
		const recommendedActions = safeArray(parsed.recommendedActions);
		return {
			title: text(parsed.title) || fallback.title,
			executiveSummary: text(parsed.executiveSummary) || fallback.executiveSummary,
			descriptiveFindings: descriptiveFindings.length ? descriptiveFindings : fallback.descriptiveFindings,
			predictiveInsights: predictiveInsights.length ? predictiveInsights : fallback.predictiveInsights,
			recommendedActions: recommendedActions.length ? recommendedActions : fallback.recommendedActions,
			riskFlags: safeArray(parsed.riskFlags),
			confidence: parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low" ? parsed.confidence : fallback.confidence,
		};
	} catch {
		return fallbackReport(summary);
	}
}

function extractContent(data: unknown) {
	if (!data || typeof data !== "object") return "";
	const choices = (data as { choices?: unknown }).choices;
	if (!Array.isArray(choices)) return "";
	const message = choices[0] && typeof choices[0] === "object" ? (choices[0] as { message?: unknown }).message : null;
	return message && typeof message === "object" ? text((message as { content?: unknown }).content) : "";
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
				// This route only needs to read the current session.
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
		const { data: userResult } = await supabaseServer.auth.getUser(token);
		userId = userResult.user?.id ?? "";
	}

	if (!userId) {
		userId = await getUserIdFromCookies() ?? "";
	}

	if (!userId) return { error: "Invalid or expired admin session.", status: 401 as const };

	const { data: profile, error: profileError } = await supabaseServer
		.from("profiles")
		.select("role, is_active")
		.eq("id", userId)
		.maybeSingle();

	if (profileError) return { error: profileError.message, status: 500 as const };
	if (!profile?.is_active || profile.role !== "admin") return { error: "Admin access is required.", status: 403 as const };

	return { userId };
}

function requireCron(request: Request) {
	const secret = process.env.CRON_SECRET;
	const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	const querySecret = new URL(request.url).searchParams.get("secret");
	if (request.headers.get("x-vercel-cron") === "1") return { ok: true as const };
	if (!secret) return { error: "CRON_SECRET is not configured.", status: 500 as const };
	if (bearer !== secret && querySecret !== secret) return { error: "Cron authorization failed.", status: 401 as const };
	return { ok: true as const };
}

async function buildAnalyticsSummary(period: ReportPeriod) {
	const { start, end } = periodWindow(period);
	const [
		properties,
		inquiries,
		sessions,
		listingPerformance,
		dailyInquiryVolume,
		trafficSources,
		agentPerformance,
		recommendations,
		events,
	] = await Promise.all([
		supabaseServer.from("properties").select("id", { count: "exact", head: true }),
		supabaseServer.from("inquiries").select("id, status, priority, lead_score, created_at").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", { ascending: false }).limit(1000),
		supabaseServer.from("sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", start.toISOString()).lte("last_seen_at", end.toISOString()),
		supabaseServer.from("mv_listing_performance").select("*").limit(30),
		supabaseServer.from("mv_daily_inquiry_volume").select("*").limit(period === "monthly" ? 60 : 30),
		supabaseServer.from("mv_traffic_sources").select("*").limit(12),
		supabaseServer.from("mv_agent_performance").select("*").limit(12),
		supabaseServer.from("recommendations").select("was_clicked, is_fallback, generated_at").gte("generated_at", start.toISOString()).lte("generated_at", end.toISOString()).limit(1500),
		supabaseServer.from("analytics_events").select("event_type, created_at").gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).order("created_at", { ascending: false }).limit(1500),
	]);

	const inquiryRows = inquiries.data ?? [];
	const recommendationRows = recommendations.data ?? [];
	const clickedRecommendations = recommendationRows.filter((row) => row.was_clicked).length;
	const fallbackRecommendations = recommendationRows.filter((row) => row.is_fallback).length;
	const dailyRows = (dailyInquiryVolume.data ?? []).map((row) => ({
		date: text(row.inquiry_date),
		total: numberValue(row.total_inquiries),
	}));
	const dailyPoints = dailyRows.map((row) => row.total).reverse();
	const regression = linearRegression(dailyPoints);
	const listingRows = (listingPerformance.data ?? [])
		.map((row) => ({
			title: text(row.title) || "Untitled listing",
			total_views: numberValue(row.total_views),
			detail_opens: numberValue(row.detail_opens),
			total_interactions: numberValue(row.total_interactions),
			avg_dwell_seconds: numberValue(row.avg_dwell_seconds),
			total_inquiries: numberValue(row.total_inquiries),
			inquiry_rate_pct: numberValue(row.inquiry_rate_pct),
		}))
		.sort((a, b) => (b.total_interactions + b.total_inquiries * 5) - (a.total_interactions + a.total_inquiries * 5))
		.slice(0, 10);
	const highPriority = inquiryRows.filter((row) => text(row.priority) === "high").length;
	const unassignedOrNew = inquiryRows.filter((row) => text(row.status) === "new").length;
	const classifications = [
		...listingRows.slice(0, 8).map(classifyListing),
		classifyPipeline(highPriority, unassignedOrNew, inquiryRows.length),
	];

	return {
		period,
		periodLabel: period.charAt(0).toUpperCase() + period.slice(1),
		periodStart: start.toISOString(),
		periodEnd: end.toISOString(),
		generatedAt: new Date().toISOString(),
		totals: {
			properties: properties.count ?? 0,
			inquiries: inquiryRows.length,
			sessions: sessions.count ?? 0,
			events: events.data?.length ?? 0,
		},
		leadMix: {
			highPriority,
			unassignedOrNew,
			averageLeadScore: inquiryRows.length ? Number((inquiryRows.reduce((sum, row) => sum + numberValue(row.lead_score), 0) / inquiryRows.length).toFixed(3)) : 0,
		},
		recommendations: {
			total: recommendationRows.length,
			clicked: clickedRecommendations,
			fallback: fallbackRecommendations,
			ctrPct: pct(clickedRecommendations, recommendationRows.length),
			fallbackPct: pct(fallbackRecommendations, recommendationRows.length),
		},
		trends: {
			dailyInquiryVolume: dailyRows,
			peakEventTypes: Object.entries((events.data ?? []).reduce((acc: Record<string, number>, row) => {
				const type = text(row.event_type) || "unknown";
				acc[type] = (acc[type] ?? 0) + 1;
				return acc;
			}, {})).sort((a, b) => b[1] - a[1]).slice(0, 8),
		},
		topListings: listingRows,
		trafficSources: (trafficSources.data ?? []).map((row) => ({
			source: text(row.source),
			session_count: numberValue(row.session_count),
			total_page_views: numberValue(row.total_page_views),
			share_pct: numberValue(row.share_pct),
		})),
		agentPerformance: (agentPerformance.data ?? []).map((row) => ({
			agent_name: text(row.agent_name),
			total_assigned: numberValue(row.total_assigned),
			conversions: numberValue(row.conversions),
			conversion_rate_pct: numberValue(row.conversion_rate_pct),
			avg_response_time_hours: numberValue(row.avg_response_time_hours),
		})),
		modelOutputs: {
			regressions: [regression],
			classifications,
		},
		dataQuality: {
			hasSparseData: inquiryRows.length < 10 || (events.data?.length ?? 0) < 50,
			sampleSize: {
				inquiries: inquiryRows.length,
				events: events.data?.length ?? 0,
				dailyPoints: dailyPoints.length,
			},
		},
	};
}

async function generateAiReport(summary: Awaited<ReturnType<typeof buildAnalyticsSummary>>) {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) return fallbackReport(summary);

	const model = process.env.OPENROUTER_ANALYTICS_MODEL ?? process.env.OPENROUTER_RECOMMENDATION_MODEL ?? "openai/gpt-oss-120b:free";
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
					content: "You are a real estate analytics analyst. Return strict JSON only. Interpret the supplied regression and classification outputs. Be practical and honest about sample-size limits. Do not invent numbers beyond the supplied summary.",
				},
				{
					role: "user",
					content: `Create a ${summary.period} CMS analytics report. JSON shape: {"title":"","executiveSummary":"","descriptiveFindings":[""],"predictiveInsights":[""],"recommendedActions":[""],"riskFlags":[""],"confidence":"low|medium|high"}\n\n${JSON.stringify(summary)}`,
				},
			],
			temperature: 0.2,
			max_tokens: 1400,
		}),
	});

	if (!response.ok) return fallbackReport(summary);
	const content = extractContent(await response.json().catch(() => null));
	return content ? parseAiReport(content, summary) : fallbackReport(summary);
}

async function storeReport(report: AiAnalyticsReport, summary: Awaited<ReturnType<typeof buildAnalyticsSummary>>, userId: string | null) {
	const reportType = `cms_analytics_${summary.period}`;
	await supabaseServer.from("ai_analytics_reports").insert({
		report_type: reportType,
		period_label: summary.period,
		period_start: summary.periodStart,
		period_end: summary.periodEnd,
		summary,
		report,
		model_outputs: summary.modelOutputs,
		created_by: userId,
	});
}

async function createReport(period: ReportPeriod, userId: string | null) {
	try {
		const summary = await buildAnalyticsSummary(period);
		const report = await generateAiReport(summary);
		await storeReport(report, summary, userId).catch(() => undefined);
		return { report, summary };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unable to build AI analytics report.";
		throw new Error(`AI analytics data source failed: ${message}`);
	}
}

function isReportStorageError(message: string) {
	const normalized = message.toLowerCase();
	return normalized.includes("ai_analytics_reports")
		|| normalized.includes("period_label")
		|| normalized.includes("model_outputs")
		|| normalized.includes("relation")
		|| normalized.includes("column");
}

export async function GET(request: Request) {
	const url = new URL(request.url);
	const period = toPeriod(url.searchParams.get("period"));
	const run = url.searchParams.get("run") === "1";

	if (run) {
		const cron = requireCron(request);
		if ("error" in cron) return NextResponse.json({ error: cron.error }, { status: cron.status });
		return NextResponse.json(await createReport(period, null));
	}

	const admin = await requireAdmin(request);
	if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

	const { data, error } = await supabaseServer
		.from("ai_analytics_reports")
		.select("id, report_type, period_label, period_start, period_end, report, model_outputs, created_at")
		.eq("period_label", period)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		if (isReportStorageError(error.message)) {
			const generated = await createReport(period, admin.userId).catch((reportError) => {
				const message = reportError instanceof Error ? reportError.message : "Unable to build AI analytics report.";
				return { error: message };
			});
			if ("error" in generated) {
				return NextResponse.json({ error: generated.error }, { status: 500 });
			}
			return NextResponse.json({
				...generated,
				storedReport: null,
				storageWarning: "AI report storage is not ready. Run supabase/performance-hardening.sql to persist reports.",
			});
		}

		return NextResponse.json({ error: error.message }, { status: 500 });
	}
	return NextResponse.json({ report: data?.report ?? null, storedReport: data ?? null });
}

export async function POST(request: Request) {
	const limiter = checkRateLimit(`ai-analytics:${clientKey(request)}`, { limit: 12, windowMs: 60 * 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many AI analytics requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const admin = await requireAdmin(request);
	if ("error" in admin) {
		return NextResponse.json({ error: admin.error }, { status: admin.status, headers: rateLimitHeaders(limiter) });
	}

	const body = await request.json().catch(() => null);
	const period = toPeriod(text((body as { period?: unknown } | null)?.period) || new URL(request.url).searchParams.get("period"));
	const result = await createReport(period, admin.userId).catch((error) => {
		const message = error instanceof Error ? error.message : "Unable to build AI analytics report.";
		return { error: message };
	});
	if ("error" in result) {
		return NextResponse.json({ error: result.error }, { status: 500, headers: rateLimitHeaders(limiter) });
	}

	return NextResponse.json(result, { headers: rateLimitHeaders(limiter) });
}
