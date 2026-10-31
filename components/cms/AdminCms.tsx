"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, BarChart3, Bell, Bot, BriefcaseBusiness, Building2, CheckCircle2, ChevronRight, Download, FileText, FolderTree, Home, Inbox, LayoutDashboard, LogOut, MessageSquare, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Settings, UploadCloud, UserCheck, UserCircle, Users, X } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { uploadFileWithProgress, UploadCancelledError } from "@/lib/supabase/upload-with-progress";
import { AgentPerformanceTable } from "@/components/dashboard/AgentPerformanceTable";
import { InquiryVolumeChart } from "@/components/dashboard/InquiryVolumeChart";
import { LeadScoreBadge } from "@/components/dashboard/LeadScoreBadge";
import { ListingPerformanceChart } from "@/components/dashboard/ListingPerformanceChart";
import { TrafficSourceChart } from "@/components/dashboard/TrafficSourceChart";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";
import { SafeImage } from "@/components/ui/SafeImage";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";
import type { Property } from "@/types/property";
import { AgentsWorkspace } from "./AgentsWorkspace";
import { DeveloperPartnersWorkspace } from "./DeveloperPartnersWorkspace";
import { SettingsWorkspace } from "./SettingsWorkspace";
import { AdminContentSkeleton } from "./AdminContentSkeleton";
import { EntityEditor, InfoCard, SectionShell } from "./blocks";
import { careerApplicationFields, careerJobFields, emptySelection, emptyWorkspace, galleryFields, partnerLogoFields, projectFields, propertyCategoryOptions, propertyFields, propertySidebarCategoryOptions, siteStatFields } from "./constants";
import type { CmsNavGroup, CmsPayload, CmsPrimary, CmsRow, CmsSection, FieldOption, FieldSpec, Role, SelectionState, Workspace } from "./types";
import { asText, labelForRow } from "./utils";
import { AdminCalendarWidget } from "./AdminCalendarWidget";
import { PropertyWizard } from "./PropertyWizard";
import { InquiryWorkflowManager } from "./InquiryWorkflowManager";
import { categoryFromParam, primaryForSection, sectionFromParam } from "./routing";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function asRole(value: unknown): Role {
	return value === "admin" || value === "agent" || value === "developer_partner" || value === "buyer" ? value : null;
}

function optionalId(row: CmsRow | undefined) {
	return row?.id == null ? null : asText(row.id);
}

function optionFromRow(row: CmsRow, label: string, fallback = "Unnamed record", meta?: Record<string, string>): FieldOption {
	return {
		label: label.trim() || fallback,
		value: asText(row.id),
		meta,
	};
}

function displayCategory(value: unknown) {
	return asText(value)
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ") || "Property";
}

function toNumberValue(value: unknown) {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toNullableNumber(value: unknown) {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function hoursSince(value: unknown) {
	const timestamp = new Date(asText(value)).getTime();
	if (!Number.isFinite(timestamp)) return null;
	return (Date.now() - timestamp) / 36e5;
}

function relativeAge(value: unknown) {
	const hours = hoursSince(value);
	if (hours == null) return "No date";
	if (hours < 1) return "Just now";
	if (hours < 24) return `${Math.floor(hours)}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}


function csvEscape(value: unknown) {
	const textValue = asText(value);
	return /[",\n\r]/.test(textValue) ? `"${textValue.replaceAll('"', '""')}"` : textValue;
}

function downloadCsv(filename: string, rows: CmsRow[], columns: string[]) {
	const csv = [
		columns.join(","),
		...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
	].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

type AnalyticsCategory = "trafficBehavior" | "propertyPerformance" | "predictiveAnalytics" | "userEngagement";
const analyticsChildSections = new Set<CmsSection>(["trafficBehavior", "propertyPerformance", "predictiveAnalytics", "userEngagement"]);

function localRegression(points: number[]) {
	const n = points.length;
	if (n < 2) {
		return {
			metric: "daily_inquiry_volume",
			slope: 0,
			intercept: points[0] ?? 0,
			r2: 0,
			observations: n,
			observedTotal: points.reduce((sum, value) => sum + value, 0),
			forecastNextPeriod: points[0] ?? 0,
			trend: "flat" as const,
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
	const r2 = ssTotal ? Math.max(0, Math.min(1, 1 - ssResidual / ssTotal)) : 0;
	const forecastNextPeriod = Math.max(0, intercept + slope * (n + 1));

	return {
		metric: "daily_inquiry_volume",
		slope: Number(slope.toFixed(3)),
		intercept: Number(intercept.toFixed(3)),
		r2: Number(r2.toFixed(3)),
		observations: n,
		observedTotal: points.reduce((sum, value) => sum + value, 0),
		forecastNextPeriod: Number(forecastNextPeriod.toFixed(2)),
		trend: Math.abs(slope) < 0.1 ? "flat" as const : slope > 0 ? "up" as const : "down" as const,
	};
}

const analyticsColors = ["#111111", "#71717a", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function numberAverage(values: number[]) {
	const clean = values.filter((value) => Number.isFinite(value));
	return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
}

function locationLabel(row: CmsRow) {
	return asText(row.city || row.location_city || row.province || row.location || "Unknown");
}

function propertyPrice(row: CmsRow) {
	return toNullableNumber(row.price) ?? toNullableNumber(row.starting_price) ?? 0;
}

function propertyArea(row: CmsRow) {
	return toNullableNumber(row.lot_area_sqm) ?? toNullableNumber(row.floor_area_sqm) ?? toNullableNumber(row.area_sqm) ?? 0;
}

function groupByLabel<T>(rows: T[], getLabel: (row: T) => string) {
	return rows.reduce((acc: Record<string, T[]>, row) => {
		const label = getLabel(row) || "Unknown";
		acc[label] = [...(acc[label] ?? []), row];
		return acc;
	}, {});
}

function utcDayKey(offsetDays = 0) {
	const date = new Date();
	date.setUTCHours(0, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() + offsetDays);
	return date.toISOString().slice(0, 10);
}

function dailyEngagementRows(events: CmsRow[], days = 14) {
	const viewTypes = new Set(["property_view", "page_view", "view", "listing_view"]);
	const buckets = new Map<string, { visitors: Set<string>; sessionViews: Map<string, number> }>();
	for (let offset = -(days - 1); offset <= 0; offset += 1) {
		buckets.set(utcDayKey(offset), { visitors: new Set<string>(), sessionViews: new Map<string, number>() });
	}

	for (const event of events) {
		if (!viewTypes.has(asText(event.event_type))) continue;
		const key = asText(event.created_at).slice(0, 10);
		const bucket = buckets.get(key);
		if (!bucket) continue;
		const visitor = asText(event.session_id);
		if (!visitor) continue;
		bucket.visitors.add(visitor);
		bucket.sessionViews.set(visitor, (bucket.sessionViews.get(visitor) ?? 0) + 1);
	}

	return Array.from(buckets.entries()).map(([date, bucket]) => {
		const sessions = bucket.sessionViews.size;
		const singleViewSessions = Array.from(bucket.sessionViews.values()).filter((count) => count <= 1).length;
		return {
			date: date.slice(5),
			sessions,
			visitors: bucket.visitors.size,
			bounceRate: sessions ? Number(((singleViewSessions / sessions) * 100).toFixed(1)) : 0,
		};
	});
}

function dailyInquirySeries(rows: CmsRow[], days = 21) {
	const counts = new Map<string, number>();
	for (const row of rows) {
		const key = asText(row.inquiry_date).slice(0, 10);
		if (!key) continue;
		counts.set(key, (counts.get(key) ?? 0) + (toNullableNumber(row.total_inquiries) ?? 0));
	}

	return Array.from({ length: days }, (_, index) => {
		const key = utcDayKey(-(days - 1 - index));
		return { date: key.slice(5), value: counts.get(key) ?? 0 };
	});
}

function buildDemandForecast(rows: CmsRow[], historyDays = 21, forecastDays = 7) {
	const series = dailyInquirySeries(rows, historyDays);
	const regression = localRegression(series.map((row) => row.value));
	const forecast = Array.from({ length: forecastDays }, (_, index) => ({
		date: utcDayKey(index + 1).slice(5),
		value: Number(Math.max(0, regression.intercept + regression.slope * (historyDays + index + 1)).toFixed(2)),
	}));

	return { series, forecast, regression };
}

function buildConversionForecast(events: CmsRow[], inquiryVolumeRows: CmsRow[], days = 21, forecastDays = 7) {
	const viewTypes = new Set(["property_view", "page_view", "view", "listing_view"]);
	const viewsByDay = new Map<string, number>();
	for (const event of events) {
		if (!viewTypes.has(asText(event.event_type))) continue;
		const key = asText(event.created_at).slice(0, 10);
		viewsByDay.set(key, (viewsByDay.get(key) ?? 0) + 1);
	}

	const inquiryCounts = new Map<string, number>();
	for (const row of inquiryVolumeRows) {
		const key = asText(row.inquiry_date).slice(0, 10);
		if (!key) continue;
		inquiryCounts.set(key, (inquiryCounts.get(key) ?? 0) + (toNullableNumber(row.total_inquiries) ?? 0));
	}

	const series = Array.from({ length: days }, (_, index) => {
		const date = utcDayKey(-(days - 1 - index));
		const views = viewsByDay.get(date) ?? 0;
		const inquiries = inquiryCounts.get(date) ?? 0;
		return {
			date,
			views,
			inquiries,
			rate: views > 0 ? Number(((inquiries / views) * 100).toFixed(2)) : null,
		};
	});

	const observedRates = series.map((row) => row.rate).filter((rate): rate is number => rate !== null);
	const regression = localRegression(observedRates);
	const forecast = Array.from({ length: forecastDays }, (_, index) => {
		const raw = regression.intercept + regression.slope * (observedRates.length + index + 1);
		return { date: utcDayKey(index + 1), value: Number(Math.max(0, Math.min(100, raw)).toFixed(2)) };
	});

	return { series, forecast, regression, observations: observedRates.length };
}

function monthlyPriceSeries(properties: CmsRow[]) {
	const months = new Map<string, number[]>();
	for (const property of properties) {
		const price = propertyPrice(property);
		const month = asText(property.created_at).slice(0, 7);
		if (price <= 0 || !/^\d{4}-\d{2}$/.test(month)) continue;
		months.set(month, [...(months.get(month) ?? []), price]);
	}

	return Array.from(months.entries())
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([month, prices]) => ({
			month,
			label: new Date(`${month}-01T00:00:00Z`).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
			average: Math.round(numberAverage(prices)),
			count: prices.length,
		}));
}

function nextMonthLabel(month: string) {
	const [year, monthNumber] = month.split("-").map(Number);
	const date = new Date(Date.UTC(year, monthNumber, 1));
	return date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function histogram(values: number[], bucketCount = 8) {
	const clean = values.filter((value) => Number.isFinite(value) && value > 0);
	if (!clean.length) return [];
	const min = Math.min(...clean);
	const max = Math.max(...clean);
	const width = Math.max(1, (max - min) / bucketCount);
	const buckets = Array.from({ length: bucketCount }, (_, index) => ({
		range: `${Math.round(min + width * index).toLocaleString()}-${Math.round(min + width * (index + 1)).toLocaleString()}`,
		count: 0,
	}));

	for (const value of clean) {
		const index = Math.min(bucketCount - 1, Math.floor((value - min) / width));
		buckets[index].count += 1;
	}

	return buckets;
}

function hasMeaningfulChartValue<T extends Record<string, unknown>>(rows: T[], keys: string[]) {
	return rows.some((row) => keys.some((key) => Number(row[key] ?? 0) > 0));
}

function AnalyticsChartCard({ title, description, isLive = true, children }: { title: string; description: string; isLive?: boolean; children: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</div>
					<p className="mt-1 text-sm text-zinc-500">{description}</p>
				</div>
				<span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${isLive ? "bg-zinc-100 text-zinc-600 ring-zinc-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
					{isLive ? "Live" : "Waiting"}
				</span>
			</div>
			<div className="mt-4 h-64">{children}</div>
		</div>
	);
}

function ChartEmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-full items-center justify-center rounded-lg border border-dashed border-black/10 bg-zinc-50 px-4 text-center">
			<p className="max-w-sm text-sm leading-6 text-black/45">{message}</p>
		</div>
	);
}

type ReadoutMetric = { label: string; value: string; meta?: string };

const AI_READOUT_STORAGE_KEY = "jewellz.aiReadoutEnabled";
const AI_READOUT_EVENT = "jewellz:ai-readout-change";

function readAiReadoutEnabled() {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem(AI_READOUT_STORAGE_KEY) === "1";
}

function useAiReadoutEnabled() {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => {
		const sync = () => setEnabled(readAiReadoutEnabled());
		const timer = window.setTimeout(sync, 0);
		window.addEventListener(AI_READOUT_EVENT, sync);
		window.addEventListener("storage", sync);
		return () => {
			window.clearTimeout(timer);
			window.removeEventListener(AI_READOUT_EVENT, sync);
			window.removeEventListener("storage", sync);
		};
	}, []);

	const toggle = useCallback(() => {
		const next = !readAiReadoutEnabled();
		window.localStorage.setItem(AI_READOUT_STORAGE_KEY, next ? "1" : "0");
		window.dispatchEvent(new Event(AI_READOUT_EVENT));
	}, []);

	return { enabled, toggle };
}

type AiAnalyticsReport = {
	title: string;
	executiveSummary: string;
	descriptiveFindings: string[];
	predictiveInsights: string[];
	recommendedActions: string[];
	riskFlags: string[];
	confidence: "low" | "medium" | "high";
	narrativeSource?: "ai" | "deterministic";
};

type ModelReadoutCategory = "traffic" | "property" | "engagement" | "predictive";

const narrativeHeadingByCategory: Record<ModelReadoutCategory, string> = {
	traffic: "Traffic insights",
	property: "Listing insights",
	predictive: "Predictive insights",
	engagement: "Engagement insights",
};

type ModelReadoutProps = {
	category: ModelReadoutCategory;
	title: string;
	insight: string;
	actions: string[];
	metrics: ReadoutMetric[];
};

function ModelReadout({ category, title, insight, actions, metrics }: ModelReadoutProps) {
	const { enabled: aiEnabled, toggle: toggleAi } = useAiReadoutEnabled();
	const [state, setState] = useState<{ loading: boolean; error?: string; report?: AiAnalyticsReport; generatedAt?: string }>({ loading: false });
	const [regenerating, setRegenerating] = useState(false);

	const loadReport = useCallback(async () => {
		try {
			const response = await fetch(`/api/admin/ai-analytics-report?period=weekly&category=${category}`, { cache: "no-store" });
			const data = await response.json().catch(() => null) as { report?: AiAnalyticsReport | null; storedReport?: { created_at?: string } | null; error?: string } | null;
			if (!response.ok) throw new Error(data?.error || "Unable to load the AI analytics report.");
			setState({ loading: false, report: data?.report ?? undefined, generatedAt: data?.storedReport?.created_at });
		} catch (error) {
			setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load the AI analytics report." });
		}
	}, [category]);

	const regenerateReport = useCallback(async () => {
		setRegenerating(true);
		try {
			const response = await fetch(`/api/admin/ai-analytics-report?period=weekly&category=${category}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ period: "weekly", category }),
			});
			const data = await response.json().catch(() => null) as { report?: AiAnalyticsReport; error?: string } | null;
			if (!response.ok) throw new Error(data?.error || "Unable to regenerate the AI analytics report.");
			setState({ loading: false, report: data?.report ?? undefined, generatedAt: new Date().toISOString() });
		} catch (error) {
			setState({ loading: false, error: error instanceof Error ? error.message : "Unable to regenerate the AI analytics report." });
		} finally {
			setRegenerating(false);
		}
	}, [category]);

	// AI is only requested when the operator turns it on, so leaving it off
	// means zero AI tokens are spent for this readout.
	useEffect(() => {
		if (!aiEnabled) return;
		const timer = window.setTimeout(() => {
			setState({ loading: true });
			void loadReport();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [aiEnabled, loadReport]);

	const report = aiEnabled ? state.report : undefined;
	const sourceLabel = report?.narrativeSource === "ai" ? "AI narrative" : report?.narrativeSource === "deterministic" ? "Deterministic fallback" : "Stored report";

	return (
		<div className="rounded-2xl border border-black/10 bg-[#111111] p-4 text-white">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Model readout</div>
					<h4 className="mt-2 text-lg font-semibold tracking-[-0.03em]">{title}</h4>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{report ? <span className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${report.narrativeSource === "ai" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{sourceLabel}</span> : null}
					{report ? <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">{report.confidence} confidence</span> : null}
					<button
						type="button"
						onClick={toggleAi}
						title={aiEnabled ? "Turn the AI narrative off to save AI tokens" : "Turn the AI narrative on (uses AI tokens)"}
						className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${aiEnabled ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "border-white/15 bg-white/10 text-white/70 hover:bg-white/20"}`}
					>
						AI narrative: {aiEnabled ? "ON" : "OFF"}
					</button>
					{aiEnabled ? (
						<button
							type="button"
							onClick={() => void regenerateReport()}
							disabled={regenerating || state.loading}
							className="rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{regenerating ? "Regenerating..." : "Regenerate"}
						</button>
					) : null}
				</div>
			</div>

			{!aiEnabled ? <p className="mt-2 text-[11px] text-white/45">AI narrative is off — deterministic metrics only, no AI tokens are used.</p> : null}

			<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<div key={metric.label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
						<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{metric.label}</div>
						<div className="mt-1 text-lg font-semibold tracking-[-0.03em]">{metric.value}</div>
						{metric.meta ? <div className="mt-0.5 text-[11px] leading-4 text-white/50">{metric.meta}</div> : null}
					</div>
				))}
			</div>

			{aiEnabled && state.loading ? <p className="mt-4 text-sm text-white/60">Building the AI report from tracked sessions, inquiries, listings, and recommendation data...</p> : null}
			{aiEnabled && state.error ? <p className="mt-4 text-sm text-red-300">{state.error} Showing deterministic model output only.</p> : null}

			{aiEnabled && report ? (
				<div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-white/5 p-3">
					<p className="text-sm leading-6 text-white/75">{report.executiveSummary}</p>
					{report.predictiveInsights.length ? (
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{narrativeHeadingByCategory[category]}</p>
							<ul className="mt-1.5 space-y-1 text-sm leading-6 text-white/70">
								{report.predictiveInsights.map((item) => <li key={item}>• {item}</li>)}
							</ul>
						</div>
					) : null}
					{report.recommendedActions.length ? (
						<div>
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">Recommended actions</p>
							<div className="mt-1.5 grid gap-2 md:grid-cols-3">
								{report.recommendedActions.slice(0, 3).map((action) => (
									<div key={action} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/70">{action}</div>
								))}
							</div>
						</div>
					) : null}
					{report.riskFlags.length ? (
						<div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-200">
							{report.riskFlags.map((risk) => <p key={risk}>{risk}</p>)}
						</div>
					) : null}
				</div>
			) : null}

			<p className="mt-4 text-sm leading-6 text-white/70">{insight}</p>
			<div className="mt-3 grid gap-2 md:grid-cols-3">
				{actions.map((action) => (
					<div key={action} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/70">{action}</div>
				))}
			</div>
			{aiEnabled && report?.narrativeSource && state.generatedAt ? <p className="mt-3 text-[11px] text-white/40">Stored {new Date(state.generatedAt).toLocaleString()}</p> : null}
		</div>
	);
}

function EChart({ option }: { option: Record<string, unknown> }) {
	return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge lazyUpdate />;
}

function PricePerSqmHeatmap({ properties }: { properties: CmsRow[] }) {
	const grouped = Object.entries(groupByLabel(properties, locationLabel))
		.map(([location, rows]) => {
			const avgPricePerSqm = numberAverage(rows.map((row) => {
				const area = propertyArea(row);
				return area ? propertyPrice(row) / area : 0;
			}));
			return { location, avgPricePerSqm };
		})
		.filter((row) => row.avgPricePerSqm > 0)
		.sort((a, b) => b.avgPricePerSqm - a.avgPricePerSqm)
		.slice(0, 12);
	const max = Math.max(...grouped.map((row) => row.avgPricePerSqm), 1);
	const xLabels = grouped.map((row) => row.location);
	const option = {
		grid: { top: 8, right: 14, bottom: 68, left: 18 },
		tooltip: {
			formatter: (params: { data?: [number, number, number] }) => {
				const data = params.data;
				if (!data) return "";
				return `${xLabels[data[0]]}<br/>PHP ${Math.round(data[2]).toLocaleString()} / sqm`;
			},
		},
		xAxis: {
			type: "category",
			data: xLabels,
			axisLabel: { rotate: 28, color: "#71717a", fontSize: 10 },
			axisLine: { lineStyle: { color: "#e5e7eb" } },
			axisTick: { show: false },
		},
		yAxis: {
			type: "category",
			data: ["PHP/sqm"],
			axisLabel: { color: "#71717a", fontSize: 11 },
			axisLine: { show: false },
			axisTick: { show: false },
		},
		visualMap: {
			min: 0,
			max,
			show: false,
			inRange: { color: ["#f4f4f5", "#d4d4d8", "#71717a", "#111111"] },
		},
		series: [{
			type: "heatmap",
			data: grouped.map((row, index) => [index, 0, Math.round(row.avgPricePerSqm)]),
			itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "#ffffff" },
			label: {
				show: true,
				color: "#111111",
				fontSize: 10,
				formatter: (params: { data?: [number, number, number] }) => params.data ? `${Math.round(params.data[2] / 1000)}k` : "",
			},
		}],
	};

	return grouped.length ? <EChart option={option} /> : <p className="text-sm text-black/45">Add prices and area values to populate the heatmap.</p>;
}

function AnalyticsVisualSuite({
	category,
	properties,
	inquiries,
	listingRows,
	inquiryVolumeRows,
	trafficRows,
	sessions,
	events,
}: {
	category: AnalyticsCategory;
	properties: CmsRow[];
	inquiries: CmsRow[];
	listingRows: Array<{ title: string; total_views: number; detail_opens: number; total_interactions: number; total_inquiries: number; inquiry_rate_pct: number; avg_dwell_seconds: number }>;
	inquiryVolumeRows: Array<{ inquiry_date: string; total_inquiries: number }>;
	trafficRows: Array<{ source: string; session_count: number; total_page_views: number; share_pct: number }>;
	sessions: CmsRow[];
	events: CmsRow[];
}) {
	const visitorsOverTime = dailyEngagementRows(events);
	const visitorsAreLive = hasMeaningfulChartValue(visitorsOverTime, ["sessions", "visitors"]);
	const trafficPieIsLive = hasMeaningfulChartValue(trafficRows, ["session_count"]);
	const trafficPie = trafficRows.map((row) => ({ name: row.source || "Unknown", value: row.session_count }));
	const mostViewedRaw = listingRows.slice().sort((a, b) => b.total_views - a.total_views).slice(0, 8);
	const mostViewedIsLive = hasMeaningfulChartValue(mostViewedRaw, ["total_views"]);
	const mostViewed = mostViewedRaw;
	const bounceRows = visitorsOverTime;
	const bounceIsLive = visitorsOverTime.some((row) => row.sessions > 0);
	const priceByLocationRaw = Object.entries(groupByLabel(properties, locationLabel))
		.map(([location, rows]) => ({ location, price: Math.round(numberAverage(rows.map(propertyPrice))) }))
		.filter((row) => row.price > 0)
		.sort((a, b) => b.price - a.price)
		.slice(0, 8);
	const priceByLocationIsLive = hasMeaningfulChartValue(priceByLocationRaw, ["price"]);
	const priceByLocation = priceByLocationRaw;
	const viewsVsInquiriesRaw = listingRows.slice().sort((a, b) => b.total_views - a.total_views).slice(0, 8);
	const viewsVsInquiriesIsLive = hasMeaningfulChartValue(viewsVsInquiriesRaw, ["total_views", "total_inquiries"]);
	const viewsVsInquiries = viewsVsInquiriesRaw;
	const monthlyPrices = monthlyPriceSeries(properties);
	const priceTrendIsLive = monthlyPrices.length > 0;
	const priceRegression = localRegression(monthlyPrices.map((row) => row.average));
	const priceForecastIsLive = monthlyPrices.length >= 2 && monthlyPrices.some((row) => row.average > 0);
	const priceForecastMonth = monthlyPrices.length ? nextMonthLabel(monthlyPrices[monthlyPrices.length - 1].month) : "";
	const priceForecastValue = priceForecastIsLive ? Math.max(0, priceRegression.intercept + priceRegression.slope * (monthlyPrices.length + 1)) : 0;
	const priceTrendRows = [
		...monthlyPrices.map((row, index) => ({
			label: row.label,
			average: row.average,
			forecast: index === monthlyPrices.length - 1 && priceForecastIsLive ? row.average : null,
			listings: row.count,
		})),
		...(priceForecastIsLive ? [{ label: priceForecastMonth, average: null, forecast: Math.round(priceForecastValue), listings: 0 }] : []),
	];
	const demand = buildDemandForecast(inquiryVolumeRows, 21, 7);
	const demandRegression = demand.regression;
	const demandRows = [
		...demand.series.map((row, index) => ({ date: row.date, demand: row.value, forecast: index === demand.series.length - 1 ? row.value : null })),
		...demand.forecast.map((row) => ({ date: row.date, demand: null, forecast: row.value })),
	];
	const demandRowsAreLive = demand.series.some((row) => row.value > 0);
	const conversion = buildConversionForecast(events, inquiryVolumeRows, 21, 7);
	const conversionForecastIsLive = conversion.observations >= 3;
	const lastObservedIndex = conversion.series.map((row) => row.rate !== null).lastIndexOf(true);
	const conversionRows = [
		...conversion.series.map((row, index) => ({ date: row.date, rate: row.rate, forecast: index === lastObservedIndex ? row.rate : null })),
		...conversion.forecast.map((row) => ({ date: row.date, rate: null, forecast: row.value })),
	];
	const priceHistogramRaw = histogram(properties.map(propertyPrice));
	const priceHistogramIsLive = hasMeaningfulChartValue(priceHistogramRaw, ["count"]);
	const priceHistogram = priceHistogramRaw;
	const clusterRowsRaw = properties
		.map((row) => {
			const area = propertyArea(row);
			const price = propertyPrice(row);
			return {
				location: locationLabel(row),
				price,
				pricePerSqm: area ? Math.round(price / area) : 0,
				area,
			};
		})
		.filter((row) => row.price > 0 && row.pricePerSqm > 0);
	const clusterRowsAreLive = hasMeaningfulChartValue(clusterRowsRaw, ["price", "pricePerSqm"]);
	const clusterRows = clusterRowsRaw;
	const clusterOption = {
		grid: { top: 18, right: 20, bottom: 42, left: 60 },
		tooltip: {
			formatter: (params: { data?: [number, number, number, string] }) => {
				const data = params.data;
				if (!data) return "";
				return `${data[3]}<br/>Price: PHP ${Math.round(data[0]).toLocaleString()}<br/>PHP/sqm: ${Math.round(data[1]).toLocaleString()}<br/>Area: ${Math.round(data[2]).toLocaleString()} sqm`;
			},
		},
		xAxis: {
			type: "value",
			name: "Price",
			nameTextStyle: { color: "#71717a" },
			axisLabel: { color: "#71717a", fontSize: 11, formatter: (value: number) => `${Math.round(value / 1000000)}m` },
			splitLine: { lineStyle: { color: "#eeeeee" } },
		},
		yAxis: {
			type: "value",
			name: "PHP/sqm",
			nameTextStyle: { color: "#71717a" },
			axisLabel: { color: "#71717a", fontSize: 11 },
			splitLine: { lineStyle: { color: "#eeeeee" } },
		},
		visualMap: {
			min: Math.min(...clusterRows.map((row) => row.area), 0),
			max: Math.max(...clusterRows.map((row) => row.area), 1),
			show: false,
			inRange: { symbolSize: [8, 28], color: ["#a1a1aa", "#111111"] },
		},
		series: [{
			name: "Properties",
			type: "scatter",
			data: clusterRows.map((row) => [row.price, row.pricePerSqm, row.area, row.location]),
			itemStyle: { opacity: 0.82 },
		}],
	};
	const totalViews = listingRows.reduce((sum, row) => sum + row.total_views, 0);
	const totalDetailOpens = listingRows.reduce((sum, row) => sum + row.detail_opens + row.total_interactions, 0);
	const totalInquiries = inquiries.length;
	const funnelRowsAreLive = totalViews > 0 || totalDetailOpens > 0 || totalInquiries > 0;
	const funnelRows = [
		{ label: "Viewed", value: totalViews },
		{ label: "Saved", value: Math.max(0, totalDetailOpens) },
		{ label: "Inquired", value: totalInquiries },
	];
	const funnelOption = {
		tooltip: { trigger: "item", formatter: "{b}: {c}" },
		series: [{
			type: "funnel",
			left: "8%",
			top: 10,
			bottom: 10,
			width: "84%",
			sort: "descending",
			gap: 3,
			minSize: "24%",
			maxSize: "100%",
			label: { color: "#111111", fontWeight: 600 },
			labelLine: { show: false },
			itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
			data: funnelRows.map((row, index) => ({ name: row.label, value: row.value, itemStyle: { color: analyticsColors[index] } })),
		}],
	};
	const durationRowsRaw = histogram(listingRows.map((row) => row.avg_dwell_seconds), 7);
	const durationRowsAreLive = hasMeaningfulChartValue(durationRowsRaw, ["count"]);
	const durationRows = durationRowsRaw;
	let returningUsers = 0;
	let newUsers = 0;
	for (const session of sessions) {
		const startedAt = asText(session.started_at).slice(0, 10);
		const lastSeenAt = asText(session.last_seen_at).slice(0, 10);
		if (!startedAt || !lastSeenAt) continue;
		if (lastSeenAt > startedAt) returningUsers += 1;
		else newUsers += 1;
	}
	const totalVisitors = newUsers + returningUsers;
	const userTypeRows = totalVisitors ? [{ name: "New", value: newUsers }, { name: "Returning", value: returningUsers }] : [];
	const totalSessions14d = visitorsOverTime.reduce((sum, row) => sum + row.sessions, 0);
	const avgBounceRate = numberAverage(visitorsOverTime.filter((row) => row.sessions > 0).map((row) => row.bounceRate));
	const sessionTrend = localRegression(visitorsOverTime.map((row) => row.sessions));
	const windowStart = utcDayKey(-13);
	const visitorWindow = new Set<string>();
	const viewTypeNames = new Set(["property_view", "page_view", "view", "listing_view"]);
	for (const event of events) {
		if (!viewTypeNames.has(asText(event.event_type))) continue;
		if (asText(event.created_at).slice(0, 10) < windowStart) continue;
		const visitor = asText(event.session_id);
		if (visitor) visitorWindow.add(visitor);
	}
	const topSource = trafficRows[0] ?? null;
	const trafficInsight = {
		title: "Traffic & behavior readout",
		metrics: [
			{ label: "Sessions (14d)", value: String(totalSessions14d), meta: `${visitorWindow.size} unique visitors` },
			{ label: "Avg bounce rate", value: `${avgBounceRate.toFixed(0)}%`, meta: "single-view sessions" },
			{ label: "Top source share", value: `${topSource?.share_pct ?? 0}%`, meta: topSource?.source || "No source yet" },
			{ label: "Next-day sessions", value: String(sessionTrend.forecastNextPeriod), meta: `${sessionTrend.trend} trend · R2 ${sessionTrend.r2}` },
		],
		insight: topSource
			? `${topSource.source || "Direct"} leads with ${topSource.share_pct}% of sessions and ${topSource.total_page_views} page views. Across the last 14 days the session trend is ${sessionTrend.trend} (R2 ${sessionTrend.r2}) with a next-day forecast of ${sessionTrend.forecastNextPeriod} sessions; average bounce is ${avgBounceRate.toFixed(0)}%.`
			: `No session sources are recorded yet. The 14-day session trend is ${sessionTrend.trend} with a next-day forecast of ${sessionTrend.forecastNextPeriod} sessions — add UTM/referrer capture to unlock channel-level recommendations.`,
		actions: ["Compare top source against inquiry quality.", "Watch high-bounce days before scaling campaigns.", "Keep UTM capture on all ads and social posts."],
	};
	const totalListingViews = listingRows.reduce((sum, row) => sum + row.total_views, 0);
	const totalListingInquiries = listingRows.reduce((sum, row) => sum + row.total_inquiries, 0);
	const listingConversionRate = totalListingViews ? (totalListingInquiries / totalListingViews) * 100 : 0;
	const avgDwellSeconds = numberAverage(listingRows.map((row) => row.avg_dwell_seconds).filter((value) => value > 0));
	const lowViewNoInquiry = listingRows.filter((row) => row.total_views >= 5 && row.inquiry_rate_pct < 2).length;
	const propertyInsight = {
		title: "Property performance readout",
		metrics: [
			{ label: "Total listing views", value: String(totalListingViews), meta: `${listingRows.length} listings tracked` },
			{ label: "View → inquiry", value: `${listingConversionRate.toFixed(2)}%`, meta: `${totalListingInquiries} inquiries` },
			{ label: "Avg dwell time", value: `${avgDwellSeconds.toFixed(0)}s`, meta: "recorded on property pages" },
			{ label: "High-view, low-inquiry", value: String(lowViewNoInquiry), meta: "listings under 2% conversion" },
		],
		insight: mostViewed[0]
			? `${mostViewed[0].title} leads with ${mostViewed[0].total_views} views and ${mostViewed[0].total_inquiries} inquiries (${mostViewed[0].inquiry_rate_pct}% conversion). Overall the catalog converts ${listingConversionRate.toFixed(2)}% of views to inquiries; ${lowViewNoInquiry} listing${lowViewNoInquiry === 1 ? " has" : "s have"} 5+ views but under 2% conversion — those are the pricing, gallery, or CTA candidates.`
			: "Listing performance data is still sparse. Views and inquiries will sharpen this section.",
		actions: ["Review high-view low-inquiry listings.", "Compare price per sqm by location.", "Improve galleries for listings with low engagement."],
	};
	const predictiveInsight = {
		title: "Predictive readout",
		insight: `The inquiry trend over the last ${demand.series.length} days is ${demandRegression.trend}; the next-day forecast is ${demandRegression.forecastNextPeriod} inquiries, with R2 ${demandRegression.r2}. The views-to-inquiry conversion rate has ${conversion.observations} observed days with traffic (trend ${conversion.regression.trend}, R2 ${conversion.regression.r2}); the next-period conversion forecast is ${conversion.forecast[0]?.value ?? 0}%. Treat low-R2 forecasts as directional only.`,
		actions: ["Use forecasts as early warning, not certainty.", "Validate predicted demand against next report.", "Flag large price outliers for review."],
	};
	const predictiveMetrics: ReadoutMetric[] = [
		{ label: "Next-day inquiries", value: String(demandRegression.forecastNextPeriod), meta: `${demandRegression.trend} trend · R2 ${demandRegression.r2}` },
		{ label: "Next 7-day inquiries", value: demand.forecast.reduce((sum, row) => sum + row.value, 0).toFixed(1), meta: `${demandRegression.observations} observed days` },
		{ label: "Conversion forecast", value: `${conversion.forecast[0]?.value ?? 0}%`, meta: `${conversion.observations} days with tracked views` },
		{ label: "Conversion trend", value: conversion.regression.trend, meta: `R2 ${conversion.regression.r2} · ${conversion.observations} days` },
	];
	const engagementInsight = {
		title: "Engagement readout",
		metrics: [
			{ label: "View → engagement", value: `${(totalViews ? (totalDetailOpens / totalViews) * 100 : 0).toFixed(1)}%`, meta: `${totalDetailOpens} detail/gallery/map actions` },
			{ label: "Engagement → inquiry", value: `${(totalDetailOpens ? (totalInquiries / totalDetailOpens) * 100 : 0).toFixed(1)}%`, meta: `${totalInquiries} inquiries` },
			{ label: "End-to-end funnel", value: `${(totalViews ? (totalInquiries / totalViews) * 100 : 0).toFixed(2)}%`, meta: "views to inquiries" },
			{ label: "Returning / new", value: `${returningUsers} / ${newUsers}`, meta: "visitors in loaded window" },
		],
		insight: `The funnel recorded ${totalViews} views, ${totalDetailOpens} detail/gallery/map interactions, and ${totalInquiries} inquiries: ${(totalViews ? (totalDetailOpens / totalViews) * 100 : 0).toFixed(1)}% of views engage, ${(totalDetailOpens ? (totalInquiries / totalDetailOpens) * 100 : 0).toFixed(1)}% of engaged sessions inquire, and ${(totalViews ? (totalInquiries / totalViews) * 100 : 0).toFixed(2)}% convert end-to-end. Returning visitors: ${returningUsers} of ${totalVisitors}.`,
		actions: ["Improve CTAs where views do not become inquiries.", "Use gallery and map interactions to find listing intent.", "Use dwell-time outliers to find strong listings."],
	};

	return (
		<div className="mt-5 space-y-5">
			{category === "trafficBehavior" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Sessions & visitors over time" description="Distinct sessions and visitors per day from tracked page views." isLive={visitorsAreLive}>
						{visitorsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={visitorsOverTime} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="visitors" name="Unique visitors" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#111111" }} />
								<Line type="monotone" dataKey="sessions" name="Sessions" stroke="#71717a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="No sessions have been recorded for the recent visitor window yet." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Traffic sources" description="Organic, direct, social, referral, and UTM/session sources." isLive={trafficPieIsLive}>
						{trafficPieIsLive ? <ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie data={trafficPie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
									{trafficPie.map((_, index) => <Cell key={index} fill={analyticsColors[index % analyticsColors.length]} />)}
								</Pie>
								<Tooltip content={<CmsChartTooltip />} />
							</PieChart>
						</ResponsiveContainer> : <ChartEmptyState message="No session source rows are available yet. Record UTM/referrer data to populate mv_traffic_sources." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Most viewed properties" description="Horizontal bar chart ranked by listing views." isLive={mostViewedIsLive}>
						{mostViewedIsLive ? <ResponsiveContainer width="100%" height="100%">
							<BarChart data={mostViewed} layout="vertical" margin={{ top: 6, right: 12, left: 10, bottom: 0 }}>
								<CartesianGrid horizontal={false} stroke="#e8e8e8" />
								<XAxis type="number" hide />
								<YAxis dataKey="title" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} width={138} />
								<Tooltip content={<CmsChartTooltip />} />
								<Bar dataKey="total_views" name="Views" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={14} />
							</BarChart>
						</ResponsiveContainer> : <ChartEmptyState message="No listing view counts yet. Property page tracking must write property_view events first." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Bounce rate over time" description="Share of sessions with one or fewer page views." isLive={bounceIsLive}>
						{bounceIsLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={bounceRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} unit="%" />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="bounceRate" name="Bounce rate" stroke="#71717a" strokeWidth={2.5} dot={false} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="Bounce rate needs tracked sessions with page-view counts before it can be calculated." />}
					</AnalyticsChartCard>
				</div>
				<div className="mt-4"><ModelReadout category="traffic" {...trafficInsight} /></div>
			</div> : null}

			{category === "propertyPerformance" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Average asking price by listing month" description="Monthly average of recorded listing prices, not synthetic price points." isLive={priceTrendIsLive}>
						{priceTrendIsLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={priceTrendRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}m`} />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="average" name="Average price" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#111111" }} />
								<Line type="monotone" dataKey="forecast" name="Next month forecast" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="Monthly price trends need listings with a numeric price and created_at date." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Price comparison across locations" description="Bar chart of average listing price by city or area." isLive={priceByLocationIsLive}>
						{priceByLocationIsLive ? <ResponsiveContainer width="100%" height="100%">
							<BarChart data={priceByLocation} margin={{ top: 8, right: 12, left: -18, bottom: 34 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="location" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} interval={0} angle={-20} textAnchor="end" />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}m`} />
								<Tooltip content={<CmsChartTooltip />} />
								<Bar dataKey="price" name="Avg price" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={30} />
							</BarChart>
						</ResponsiveContainer> : <ChartEmptyState message="Location price comparison needs listings with both location and price." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Property views vs inquiries" description="Grouped bar chart comparing listing views and submitted inquiries." isLive={viewsVsInquiriesIsLive}>
						{viewsVsInquiriesIsLive ? <ResponsiveContainer width="100%" height="100%">
							<BarChart data={viewsVsInquiries} margin={{ top: 8, right: 12, left: -18, bottom: 38 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="title" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} interval={0} angle={-20} textAnchor="end" />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Bar dataKey="total_views" name="Views" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={24} />
								<Bar dataKey="total_inquiries" name="Inquiries" fill="#71717a" radius={[6, 6, 0, 0]} maxBarSize={24} />
							</BarChart>
						</ResponsiveContainer> : <ChartEmptyState message="No property views or inquiry totals are available in mv_listing_performance yet." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Price per sqm by area" description="Heatmap of average PHP per sqm.">
						<PricePerSqmHeatmap properties={properties} />
					</AnalyticsChartCard>
				</div>
				<div className="mt-4"><ModelReadout category="property" {...propertyInsight} /></div>
			</div> : null}

			{category === "predictiveAnalytics" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Conversion-rate forecast" description="Daily views-to-inquiry conversion rate from tracked page views and inquiries, plus a 7-day regression forecast." isLive={conversionForecastIsLive}>
						{conversionForecastIsLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={conversionRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(value) => `${value}%`} />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="rate" name="Conversion rate" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#111111" }} />
								<Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="5 4" dot={false} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="The conversion-rate forecast needs at least 3 days with tracked page views in the last 21 days." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Demand forecast" description="Daily inquiries for the last 21 days plus a 7-day linear-regression forecast." isLive={demandRowsAreLive}>
						{demandRowsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<AreaChart data={demandRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Area type="monotone" dataKey="demand" name="Demand" stroke="#111111" fill="#111111" fillOpacity={0.12} strokeWidth={2.5} />
								<Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2563eb" strokeWidth={2.5} dot={false} />
							</AreaChart>
						</ResponsiveContainer> : <ChartEmptyState message="The demand forecast needs recorded inquiries in the last 21 days." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Price distribution" description="Histogram of real listing prices." isLive={priceHistogramIsLive}>
						{priceHistogramIsLive ? <ResponsiveContainer width="100%" height="100%">
							<BarChart data={priceHistogram} margin={{ top: 8, right: 12, left: -18, bottom: 34 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} interval={0} angle={-18} textAnchor="end" />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Bar dataKey="count" name="Listings" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={28} />
							</BarChart>
						</ResponsiveContainer> : <ChartEmptyState message="Price distribution needs listings with numeric price values." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Property clusters" description="Scatter plot by price and price per sqm." isLive={clusterRowsAreLive}>
						{clusterRowsAreLive ? <EChart option={clusterOption} /> : <ChartEmptyState message="Property clustering needs listings with price and area/sqm values." />}
					</AnalyticsChartCard>
				</div>
				<div className="mt-4"><ModelReadout category="predictive" title={predictiveInsight.title} insight={predictiveInsight.insight} actions={predictiveInsight.actions} metrics={predictiveMetrics} /></div>
			</div> : null}

			{category === "userEngagement" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Conversion funnel" description="Viewed to detail/gallery/map engagement to inquired." isLive={funnelRowsAreLive}>
						{funnelRowsAreLive ? <EChart option={funnelOption} /> : <ChartEmptyState message="The funnel needs recorded views, engagement events, or inquiries." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Session duration" description="Bar chart from recorded property dwell time." isLive={durationRowsAreLive}>
						{durationRowsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<BarChart data={durationRows} margin={{ top: 8, right: 12, left: -18, bottom: 28 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} interval={0} angle={-18} textAnchor="end" />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Bar dataKey="count" name="Sessions" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={28} />
							</BarChart>
						</ResponsiveContainer> : <ChartEmptyState message="Session duration needs property dwell-time rows from property analytics events." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Returning vs new visitors" description="Distinct visitors grouped by whether they have one or multiple sessions." isLive={totalVisitors > 0}>
						{totalVisitors > 0 ? <ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie data={userTypeRows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
									{userTypeRows.map((_, index) => <Cell key={index} fill={analyticsColors[index % analyticsColors.length]} />)}
								</Pie>
								<Tooltip content={<CmsChartTooltip />} />
							</PieChart>
						</ResponsiveContainer> : <ChartEmptyState message="New vs returning visitors needs tracked sessions with visitor IDs." />}
					</AnalyticsChartCard>
				</div>
				<div className="mt-4"><ModelReadout category="engagement" {...engagementInsight} /></div>
			</div> : null}
		</div>
	);
}

type AnalyticsChatAction = { id: string; label: string };

const analyticsChatActionLabels: Record<string, string> = {
	navigate_inquiries: "View Inquiries",
	navigate_high_priority: "View High-Priority Leads",
	navigate_listings: "View Listings",
	navigate_developers: "View Developer Partners",
	navigate_analytics: "Open Analytics",
	export_inquiries: "Download Inquiries CSV",
	export_listings: "Download Listings CSV",
	export_agents: "Download Agents CSV",
	refresh_data: "Refresh Data",
};

function parseAnalyticsChatActions(raw: string): { text: string; actions: AnalyticsChatAction[] } {
	const actions: AnalyticsChatAction[] = [];
	const text = raw
		.replace(/\[ACTION:([a-zA-Z0-9_]+)(?:\s*[|:]\s*([^\]]+))?\]/g, (_match, rawId: string, rawLabel?: string) => {
			const id = rawId.trim();
			const label = analyticsChatActionLabels[id];
			if (label && !actions.some((action) => action.id === id)) {
				actions.push({ id, label: rawLabel?.trim() || label });
			}
			return "";
		})
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

	return { text, actions };
}

function renderAnalyticsChatText(text: string) {
	return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
		if (part.startsWith("**") && part.endsWith("**")) {
			return (
				<strong key={index} className="font-semibold text-black/85">
					{part.slice(2, -2)}
				</strong>
			);
		}
		return part;
	});
}

const ANALYTICS_CHAT_STORAGE_KEY = "jewellz-admin-analytics-chat";
const ANALYTICS_CHAT_WELCOME = "Ask me about traffic, listings, demand, funnel drop-offs, or which properties need attention.";

type AnalyticsChatMessage = { id: string; role: "assistant" | "user"; text: string; isLoading?: boolean; actions?: AnalyticsChatAction[] };

function getAnalyticsChatStorageKey(userId?: string | null) {
	return userId ? `${ANALYTICS_CHAT_STORAGE_KEY}:${userId}` : ANALYTICS_CHAT_STORAGE_KEY;
}

function loadAnalyticsChatMessages(userId?: string | null): AnalyticsChatMessage[] | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.sessionStorage.getItem(getAnalyticsChatStorageKey(userId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as AnalyticsChatMessage[];
		if (!Array.isArray(parsed)) return null;
		const filtered = parsed.filter((message) => message && typeof message.id === "string" && (message.role === "assistant" || message.role === "user") && typeof message.text === "string");
		return filtered.length > 0 ? filtered : null;
	} catch {
		return null;
	}
}

function saveAnalyticsChatMessages(messages: AnalyticsChatMessage[], userId?: string | null) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(getAnalyticsChatStorageKey(userId), JSON.stringify(messages));
	} catch {
		// Ignore storage failures (private mode, quota, etc.)
	}
}

function clearAnalyticsChatMessages(userId?: string | null) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(getAnalyticsChatStorageKey(userId));
	} catch {
		// Ignore storage failures
	}
}

function createAnalyticsChatWelcomeMessage(): AnalyticsChatMessage {
	return { id: "welcome", role: "assistant", text: ANALYTICS_CHAT_WELCOME };
}

function AnalyticsChatSidebar(props: {
	onAction?: (actionId: string) => void;
	messages: AnalyticsChatMessage[];
	onMessagesChange: (messages: AnalyticsChatMessage[]) => void;
	isThinking: boolean;
	setIsThinking: (value: boolean) => void;
}) {
	const { onAction, messages, onMessagesChange, isThinking, setIsThinking } = props;
	const [question, setQuestion] = useState("");

	function createMessageId(prefix: string) {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}

	async function submitQuestion() {
		const trimmed = question.trim();
		if (!trimmed || isThinking) return;
		const assistantId = createMessageId("assistant");
		const userMessage: AnalyticsChatMessage = { id: createMessageId("user"), role: "user", text: trimmed };
		onMessagesChange([
			...messages,
			userMessage,
			{ id: assistantId, role: "assistant", text: "Analyzing", isLoading: true },
		]);
		const history = [
			...messages,
			userMessage,
		]
			.filter((message) => !("isLoading" in message) || !message.isLoading)
			.slice(-8)
			.map((message) => ({ role: message.role, content: message.text }));
		setQuestion("");
		setIsThinking(true);

		try {
			const { data } = await supabaseBrowser.auth.getSession();
			const token = data.session?.access_token;
			const response = await fetch("/api/admin/analytics-chat", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: "same-origin",
				body: JSON.stringify({
					message: trimmed,
					history,
				}),
			});
			const payload = await response.json().catch(() => null) as { content?: unknown; error?: unknown } | null;
			const rawReply = response.ok && typeof payload?.content === "string" && payload.content.trim()
				? payload.content.trim()
				: typeof payload?.error === "string" && payload.error.trim()
					? payload.error.trim()
					: "I could not read the analytics response. Try again in a moment.";
			const { text: reply, actions } = parseAnalyticsChatActions(rawReply);
		onMessagesChange([
			...messages,
			userMessage,
			{ id: assistantId, role: "assistant" as const, text: reply, actions, isLoading: false },
		]);
		} catch {
		onMessagesChange([
			...messages,
			userMessage,
			{ id: assistantId, role: "assistant" as const, text: "The analytics assistant could not connect to the AI service right now.", isLoading: false },
		]);
		} finally {
			setIsThinking(false);
		}
	}

	return (
			<aside className="sticky top-3 flex h-[calc(100vh-104px)] min-h-[560px] flex-col overflow-hidden rounded-lg border border-black/10 bg-[#fbfbfa] shadow-sm lg:fixed lg:right-0 lg:top-[2.75rem] lg:z-20 lg:h-[calc(100vh-2.75rem)] lg:w-[276px] lg:rounded-none lg:border-y-0 lg:border-l lg:border-r-0">
				<div className="border-b border-black/10 bg-[#fbfbfa] px-3 py-2.5">
					<div className="flex items-center gap-2.5">
						<div className="min-w-0">
							<div className="flex items-center gap-1.5">
								<p className="text-sm font-semibold text-black">Analytics Chat</p>
								<span className="inline-flex items-center gap-1 rounded-full bg-[#111111] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white">
									<span className="h-1.5 w-1.5 rounded-full bg-white/70" />
									AI
								</span>
							</div>
							<p className="text-[11px] leading-4 text-black/45">{isThinking ? "Analyzing CMS data..." : "Assistant is ready."}</p>
						</div>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfbfa] p-3 text-[11px] text-black/55" aria-live="polite">
					<div className="space-y-3">
					{messages.map((message, index) => (
						<div key={message.id || index} className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
							{message.role === "assistant" ? (
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white ring-1 ring-black/10">
									<Bot className="h-4 w-4" />
								</div>
							) : null}
							<div className={`max-w-[82%] rounded-[14px] px-3 py-2 text-[12px] leading-5 ${message.role === "user" ? "bg-[#111111] text-white" : "border border-black/10 bg-white text-black/75"}`}>
								{message.isLoading ? (
									<div className="flex items-center gap-2 text-[11px] font-semibold text-black/60">
										<span>Analyzing</span>
										<Image src="/assets/thinking.svg" alt="Analyzing" width={18} height={18} className="h-[18px] w-[18px] shrink-0" style={{ animation: "thinking-pulse 0.95s ease-in-out infinite", transformOrigin: "center" }} />
									</div>
								) : (
									<div className="whitespace-pre-line">
										{renderAnalyticsChatText(message.text)}
										{message.actions && message.actions.length > 0 ? (
											<div className="mt-2 flex flex-wrap gap-1.5">
												{message.actions.map((action) => (
													<button
														key={action.id}
														type="button"
														onClick={() => onAction?.(action.id)}
														className="flex items-center gap-1 rounded-md border border-black/15 bg-white px-2 py-1 text-[10px] font-semibold text-[#111111] transition hover:border-black/30 hover:bg-zinc-50"
													>
														<ArrowRight className="h-2.5 w-2.5" />
														{action.label}
													</button>
												))}
											</div>
										) : null}
									</div>
								)}
							</div>
							{message.role === "user" ? (
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#111111] text-white">
									<UserCircle className="h-4 w-4" />
								</div>
							) : null}
						</div>
					))}
					</div>
				</div>
				<div className="shrink-0 border-t border-black/10 bg-[#fbfbfa] p-2.5">
					<form
						className="flex gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							submitQuestion();
						}}
					>
						<input
							value={question}
							onChange={(event) => setQuestion(event.target.value)}
							aria-label="Type your message..."
							placeholder="Type your message..."
							disabled={isThinking}
							className="h-9 min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 text-[12px] text-black/80 outline-none placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-60"
						/>
						<button type="submit" disabled={isThinking || !question.trim()} className="h-9 rounded-md bg-[#111111] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50">Send</button>
					</form>
				</div>
				<style>{`
					@keyframes thinking-pulse {
						0%, 100% { transform: scale(0.72); opacity: 0.45; }
						50% { transform: scale(1.08); opacity: 1; }
					}
				`}</style>
			</aside>
	);
}

function formatHour(hour: number) {
	const suffix = hour >= 12 ? "PM" : "AM";
	const displayHour = hour % 12 || 12;
	return `${displayHour} ${suffix}`;
}

const NEW_RECORD_ID = "__new__";
const DEFAULT_PROPERTY_VALUES = { status: "draft", badge: "none" };

function PeakEngagementChart({ events }: { events: CmsRow[] }) {
	const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
	const dayCounts = dayLabels.map((day) => ({ day, count: 0 }));

	for (const event of events) {
		const date = new Date(asText(event.created_at));
		if (Number.isNaN(date.getTime())) continue;
		hourCounts[date.getHours()].count += 1;
		dayCounts[date.getDay()].count += 1;
	}

	const peakHour = hourCounts.reduce((best, row) => row.count > best.count ? row : best, hourCounts[0]);
	const peakDay = dayCounts.reduce((best, row) => row.count > best.count ? row : best, dayCounts[0]);

	return (
		<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Peak Engagement Periods</div>
					<p className="mt-1 text-sm text-black/55">Based on analytics event timestamps.</p>
				</div>
				<div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-black/70">
					Peak: {peakDay.day}, {formatHour(peakHour.hour)}
				</div>
			</div>
			<div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
				<div>
					<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Time of day</div>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={hourCounts} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#ececec" />
								<XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Bar dataKey="count" name="Events" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={18} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
				<div>
					<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Day of week</div>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={dayCounts} layout="vertical" margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
								<CartesianGrid horizontal={false} stroke="#ececec" />
								<XAxis type="number" hide allowDecimals={false} />
								<YAxis dataKey="day" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} width={44} />
								<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Bar dataKey="count" name="Events" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={14} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
}

function AgentMetricsSummary({ agentId, agentEmail, agentPerformance }: { agentId: string | null; agentEmail?: string; agentPerformance: CmsRow[] }) {
	if (!agentId || agentId === NEW_RECORD_ID) {
		return (
			<div className="rounded-lg border border-dashed border-black/15 bg-zinc-50 p-4 text-sm text-black/55">
				Select an existing agent to see their login email, assignment, conversion, and response metrics.
			</div>
		);
	}

	const metrics = agentPerformance.find((row) => asText(row.agent_id) === asText(agentId));

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Account & Live Performance</div>
			<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<InfoCard label="Login Email" value={agentEmail ?? "No login account"} hint="Email the agent uses to sign in." />
				<InfoCard label="Assigned" value={asText(metrics?.total_assigned ?? 0)} hint="Leads assigned to this agent." />
				<InfoCard label="Conversions" value={asText(metrics?.conversions ?? 0)} hint="Reserved or closed-won leads." />
				<InfoCard label="Avg Response" value={metrics?.avg_response_time_hours == null ? "n/a" : `${metrics.avg_response_time_hours}h`} hint="Creation to first contact." />
			</div>
			{!metrics ? (
				<p className="mt-3 text-sm text-black/55">No performance row exists for this agent yet. It will appear once assignments and pipeline activity are recorded.</p>
			) : null}
		</div>
	);
}

function OverviewBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
	return (
		<div className="h-40 border-b border-black/10">
			{rows.length ? (
				<div className="h-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={rows} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
							<CartesianGrid vertical={false} stroke="#ececec" />
							<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
							<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
							<Tooltip content={<OverviewTrendTooltip />} cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }} />
							<Line type="monotone" dataKey="value" name="Inquiries" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#ffffff", stroke: "#111111", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#111111", stroke: "#ffffff", strokeWidth: 2 }} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			) : (
				<p className="flex h-full items-center text-sm text-black/45">No chart data yet.</p>
			)}
		</div>
	);
}

function OverviewTrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string }>; label?: string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 font-semibold text-[#111111]">{label}</div>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center justify-between gap-4 text-black/60">
					<span>{item.name}</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
		</div>
	);
}

function OverviewPipelineBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
	return (
		<div className="h-44">
			{rows.length ? (
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 10, left: -8, bottom: 4 }}>
						<CartesianGrid horizontal={false} stroke="#ececec" />
						<XAxis type="number" hide allowDecimals={false} />
						<YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickFormatter={(value) => asText(value).replaceAll("_", " ")} tick={{ fontSize: 11, fill: "#71717a" }} width={92} />
						<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
						<Bar dataKey="value" name="Leads" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={16} />
					</BarChart>
				</ResponsiveContainer>
			) : (
				<p className="text-sm text-black/45">No pipeline activity yet.</p>
			)}
		</div>
	);
}

function OverviewListingChart({ rows }: { rows: Array<{ title: string; views: number; rate: number }> }) {
	return (
		<div className="h-56">
			{rows.length ? (
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={rows} margin={{ top: 8, right: 8, left: -22, bottom: 18 }}>
						<CartesianGrid vertical={false} stroke="#ececec" />
						<XAxis dataKey="title" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(value) => compactChartLabel(asText(value))} />
						<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
						<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
						<Bar dataKey="views" name="Views" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={28} />
					</BarChart>
				</ResponsiveContainer>
			) : (
				<p className="flex h-full items-center text-sm text-black/45">No listing analytics yet.</p>
			)}
		</div>
	);
}

function CmsChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string | number }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 font-semibold text-[#111111]">{label}</div>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center justify-between gap-4 text-black/60">
					<span className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
						{item.name}
					</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
		</div>
	);
}

function compactChartLabel(value: string) {
	return value.length > 10 ? `${value.slice(0, 9)}...` : value;
}

function PropertyPublicPreview({ payload, currentRow, imageUrls }: { payload: CmsPayload; currentRow: CmsRow | null; imageUrls: string[] }) {
	const title = asText(payload.title || currentRow?.title || "Untitled Property");
	const type = displayCategory(payload.category || currentRow?.category);
	const location = [payload.city, payload.province].filter(Boolean).join(", ") || [currentRow?.city, currentRow?.province].filter(Boolean).join(", ") || "Location not specified";
	const description = asText(payload.description || currentRow?.description || "Add a clear buyer-friendly description so visitors understand what makes this property worth viewing.");
	const image = asText(currentRow?.cover_image_url).trim() || undefined;
	const price = Number(payload.price || currentRow?.price || 0);
	const latitude = toNumberValue(payload.latitude || currentRow?.latitude);
	const longitude = toNumberValue(payload.longitude || currentRow?.longitude);
	const galleryImages = imageUrls.length ? imageUrls : image ? [image] : [];
	const property: Property = {
		id: asText(currentRow?.id || "preview-property"),
		slug: asText(payload.slug || currentRow?.slug || "preview-property"),
		title,
		price: Number.isFinite(price) ? price : 0,
		description,
		location,
		coordinates: latitude != null && longitude != null ? [latitude, longitude] : undefined,
		image: galleryImages[0],
		images: galleryImages.length ? galleryImages : undefined,
		videoUrl: asText(payload.video_url || currentRow?.video_url).trim() || undefined,
		beds: Number(payload.bedrooms || currentRow?.bedrooms || 0),
		baths: Number(payload.bathrooms || currentRow?.bathrooms || 0),
		areaSqm: Number(payload.floor_area_sqm || payload.lot_area_sqm || currentRow?.floor_area_sqm || currentRow?.lot_area_sqm || 0),
		type,
		category: payload.status === "published" || currentRow?.status === "published" ? "For Sale" : displayCategory(payload.status || currentRow?.status || "Draft"),
		specs: [
			{ label: "Lot Area", value: payload.lot_area_sqm || currentRow?.lot_area_sqm ? `${payload.lot_area_sqm || currentRow?.lot_area_sqm} sqm` : "N/A" },
			{ label: "Levels", value: asText(payload.floor_count || currentRow?.floor_count || "N/A") },
			{ label: "Garage", value: asText(payload.parking_slots || currentRow?.parking_slots || "0") },
		],
	};

	const fallbackRelatedProperties: Property[] = [
		{ ...property, id: `${property.id}-preview-1`, slug: `${property.slug}-preview-1` },
		{ ...property, id: `${property.id}-preview-2`, slug: `${property.slug}-preview-2`, title: `Similar ${type}` },
		{ ...property, id: `${property.id}-preview-3`, slug: `${property.slug}-preview-3`, title: `Nearby ${type}` },
	];

	const nearbyGroups: NearbyPlaceGroup[] = [
		{ category: "Education", places: [] },
		{ category: "Health", places: [] },
		{ category: "Food", places: [] },
		{ category: "Culture", places: [] },
	];

	return (
		<PropertyDetailContent
			property={property}
			galleryImages={property.images ?? []}
			nearbyGroups={nearbyGroups}
			relatedProperties={fallbackRelatedProperties}
			backHref="#"
			developerName={asText(currentRow?.developer_id) || "Jewellz Realty"}
			previewMode
		/>
	);
}

type AdminCmsProps = {
	initialPrimary?: CmsPrimary;
	initialSection?: CmsSection;
	initialPropertyCategory?: string;
	initialPropertyId?: string | null;
};

type DestructiveAction = {
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => Promise<void>;
};

function routeForPrimary(primary: CmsPrimary) {
	const routes: Record<CmsPrimary, string> = {
		dashboard: "/admin",
		listings: "/admin/listings",
		inquiries: "/admin/inquiries",
		analytics: "/admin?section=analytics",
		people: "/admin/agents",
		content: "/admin?section=gallery",
		settings: "/admin/settings",
	};

	return routes[primary];
}

function routeForSection(section: CmsSection) {
	const routes: Partial<Record<CmsSection, string>> = {
		overview: "/admin",
		properties: "/admin/listings",
		projects: "/admin/listings?section=projects",
		inquiries: "/admin/inquiries",
		pipeline: "/admin/inquiries?section=pipeline",
		timeline: "/admin/inquiries?section=timeline",
		analytics: "/admin?section=analytics",
		trafficBehavior: "/admin?section=trafficBehavior",
		propertyPerformance: "/admin?section=propertyPerformance",
		predictiveAnalytics: "/admin?section=predictiveAnalytics",
		userEngagement: "/admin?section=userEngagement",
		traffic: "/admin?section=traffic",
		agentPerformance: "/admin?section=agentPerformance",
		developerPortfolio: "/admin?section=developerPortfolio",
		agents: "/admin/agents",
		developers: "/admin/agents?section=developers",
		profiles: "/admin/agents?section=profiles",
		gallery: "/admin?section=gallery",
		careerJobs: "/admin?section=careerJobs",
		careerApplications: "/admin?section=careerApplications",
		logos: "/admin?section=logos",
		stats: "/admin?section=stats",
		settings: "/admin/settings",
		activityLogs: "/admin/settings?section=activityLogs",
	};

	return routes[section] ?? "/admin";
}

/*
 * Every admin route renders this same client component, so switching sections
 * only needs a URL update. Using router.push here remounts AdminCms for the new
 * route, which refetches the whole workspace and makes the loading skeleton
 * appear *after* the section has already rendered. The native History API keeps
 * the address bar (and Next's usePathname/useSearchParams) in sync without a
 * route transition, so no remount and no pointless skeleton. Entries are pushed
 * so browser back/forward can step through the sections (see the popstate sync
 * in the component below).
 */
function syncAdminUrl(href: string) {
	if (typeof window === "undefined") return;
	window.history.pushState(null, "", href);
}

/*
 * The CMS is mounted at several routes, so browser back/forward or any route
 * re-mount can re-create the component. Keeping the last loaded workspace in
 * memory for this tab lets a re-mount paint the data immediately instead of
 * feeding a loading skeleton after content has already been visible.
 */
type AdminWorkspaceSnapshot = {
	userId: string;
	sessionUser: User;
	profile: CmsRow;
	agentProfile: CmsRow | null;
	developerProfile: CmsRow | null;
	workspace: Workspace;
};

let adminWorkspaceSnapshot: AdminWorkspaceSnapshot | null = null;

/* Resolve a section/primary pair from an admin URL, mirroring the route files. */
function adminSectionFromLocation(): { primary: CmsPrimary; section: CmsSection; category: string } | null {
	const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
	const params = new URLSearchParams(window.location.search);
	const paramSection = params.get("section") ?? undefined;

	if (pathname === "/admin") {
		const section = sectionFromParam(paramSection, "overview");
		return { primary: primaryForSection(section), section, category: "all" };
	}
	if (pathname === "/admin/inquiries") {
		const section = sectionFromParam(paramSection, "inquiries");
		return { primary: "inquiries", section: section === "pipeline" || section === "timeline" ? section : "inquiries", category: "all" };
	}
	if (pathname === "/admin/listings") {
		const section = sectionFromParam(paramSection, "properties") === "projects" ? "projects" : "properties";
		return { primary: "listings", section, category: categoryFromParam(params.get("category") ?? undefined) };
	}
	if (pathname === "/admin/agents") {
		const section = sectionFromParam(paramSection, "agents");
		return { primary: "people", section: section === "developers" || section === "profiles" ? section : "agents", category: "all" };
	}
	if (pathname === "/admin/settings") {
		const section = sectionFromParam(paramSection, "settings") === "activityLogs" ? "activityLogs" : "settings";
		return { primary: "settings", section, category: "all" };
	}
	return null;
}

const PROPERTY_IMAGE_BUCKET = "property-images";
const GALLERY_IMAGE_FOLDER = "gallery";

type StagedPhoto = {
	id: string;
	file: File;
	previewUrl: string;
	status: "uploading" | "done" | "error";
	progress: number;
	storageUrl: string | null;
	storagePath: string | null;
	error?: string;
};

function newStagedPhotoId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeFileName(fileName: string) {
	return fileName
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function storagePathFromPublicUrl(url: string, bucket = PROPERTY_IMAGE_BUCKET) {
	const marker = `/storage/v1/object/public/${bucket}/`;
	const markerIndex = url.indexOf(marker);
	return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : null;
}

function GalleryImageManager({ galleryItem, canEdit, onChanged, onRequestDelete }: { galleryItem: CmsRow | null; canEdit: boolean; onChanged: () => Promise<void> | void; onRequestDelete: (action: DestructiveAction) => void }) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadMessage, setUploadMessage] = useState("");
	const [savingImage, setSavingImage] = useState(false);
	const imageUrl = asText(galleryItem?.image_url);
	const galleryItemId = asText(galleryItem?.id);

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		setSelectedFile(event.target.files?.[0] ?? null);
		setUploadMessage("");
	}

	async function uploadReplacementImage() {
		if (!galleryItemId || !selectedFile) return;

		setSavingImage(true);
		setUploadMessage("Uploading gallery photo...");

		const extension = selectedFile.name.includes(".") ? selectedFile.name.split(".").pop() : "jpg";
		const baseName = sanitizeFileName(selectedFile.name.replace(/\.[^.]+$/, "")) || "gallery-photo";
		const filePath = `${GALLERY_IMAGE_FOLDER}/${galleryItemId}/${Date.now()}-${baseName}.${extension}`;

		const { error: uploadError } = await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).upload(filePath, selectedFile, {
			cacheControl: "3600",
			upsert: false,
		});

		if (uploadError) {
			setUploadMessage(`Upload failed: ${uploadError.message}. Check that the "${PROPERTY_IMAGE_BUCKET}" storage bucket exists and allows CMS uploads.`);
			setSavingImage(false);
			return;
		}

		const { data: publicUrlData } = supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(filePath);
		const nextImageUrl = publicUrlData.publicUrl;
		const { error: updateError } = await supabaseBrowser.from("gallery_items").update({ image_url: nextImageUrl }).eq("id", galleryItemId);

		if (updateError) {
			setUploadMessage(updateError.message);
			setSavingImage(false);
			return;
		}

		const previousStoragePath = storagePathFromPublicUrl(imageUrl, PROPERTY_IMAGE_BUCKET);
		if (previousStoragePath?.startsWith(`${GALLERY_IMAGE_FOLDER}/`)) {
			await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove([previousStoragePath]);
		}

		setSelectedFile(null);
		setUploadMessage("Gallery photo updated. The Image URL field now uses the uploaded file.");
		await onChanged();
		setSavingImage(false);
	}

	function deleteGalleryItem() {
		if (!galleryItem) return;

		onRequestDelete({
			title: "Delete this gallery photo?",
			description: `This will permanently delete ${asText(galleryItem.title || "this gallery item")} from the public gallery.`,
			confirmLabel: "Verify password and delete photo",
			onConfirm: async () => {
				const { error } = await supabaseBrowser.from("gallery_items").delete().eq("id", galleryItem.id);
				if (error) {
					setUploadMessage(error.message);
					return;
				}

				const storagePath = storagePathFromPublicUrl(imageUrl, PROPERTY_IMAGE_BUCKET);
				if (storagePath?.startsWith(`${GALLERY_IMAGE_FOLDER}/`)) {
					await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove([storagePath]);
				}

				await onChanged();
			},
		});
	}

	if (!galleryItemId) {
		return (
			<div className="rounded-lg border border-dashed border-black/15 bg-zinc-50 px-4 py-5">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Gallery Photo</div>
				<p className="mt-1 text-sm text-black/55">Create and save the gallery item first. After it exists, you can upload, replace, preview, or delete its photo here.</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Gallery Photo</div>
					<p className="mt-1 text-sm text-black/55">Upload a replacement image or edit the Image URL field above, then save changes.</p>
				</div>
				{canEdit ? (
					<button type="button" onClick={deleteGalleryItem} className="rounded-md border border-black/15 bg-white px-3 py-2 text-xs font-medium text-[#111111] transition hover:bg-zinc-100">
						Delete photo
					</button>
				) : null}
			</div>

			{imageUrl ? (
				<div className="mt-4 overflow-hidden rounded-xl border border-black/10 bg-white">
					<SafeImage src={imageUrl} alt={asText(galleryItem?.title || "Gallery image")} width={900} height={420} unoptimized className="h-56 w-full object-cover" fallbackContent={<div className="grid h-56 w-full place-items-center bg-zinc-100 text-xs text-black/45">Image link is not a valid image. Replace the URL or upload a photo.</div>} />
					<div className="border-t border-black/10 px-3 py-2 text-xs text-black/45">{imageUrl}</div>
				</div>
			) : (
				<div className="mt-4 rounded-xl border border-dashed border-black/15 bg-white px-4 py-10 text-center text-sm text-black/45">No photo URL saved yet.</div>
			)}

			<div className="mt-4 rounded-xl border border-dashed border-black/15 bg-white p-4">
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Replace Photo</div>
					<input type="file" accept="image/*" disabled={!canEdit || savingImage} onChange={handleFileChange} className="mt-2 block w-full text-sm text-black/60 file:mr-4 file:rounded-md file:border-0 file:bg-[#111111] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60" />
				</label>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs text-black/45">{selectedFile ? selectedFile.name : "Choose a JPG, PNG, or WebP image."}</p>
					<button type="button" onClick={uploadReplacementImage} disabled={!canEdit || savingImage || !selectedFile} className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
						{savingImage ? "Uploading..." : "Upload and replace"}
					</button>
				</div>
				{uploadMessage ? <p className="mt-2 text-xs text-black/55">{uploadMessage}</p> : null}
			</div>
		</div>
	);
}

function PropertyImagesManager({
	propertyId,
	canEdit,
	onChanged,
	onRequestDelete,
	stagedPhotos,
	onAddStagedPhotos,
	onRemoveStagedPhoto,
	onRetryStagedPhoto,
}: {
	propertyId: string | null;
	canEdit: boolean;
	onChanged: () => Promise<void> | void;
	onRequestDelete: (action: DestructiveAction) => void;
	stagedPhotos?: StagedPhoto[];
	onAddStagedPhotos?: (files: File[]) => void;
	onRemoveStagedPhoto?: (photo: StagedPhoto) => void;
	onRetryStagedPhoto?: (photo: StagedPhoto) => void;
}) {
	const [images, setImages] = useState<CmsRow[]>([]);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [uploadMessage, setUploadMessage] = useState("");
	const [saving, setSaving] = useState(false);

	async function loadImages() {
		if (!propertyId) {
			setImages([]);
			return;
		}

		const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
		setImages(data ?? []);
	}

	function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
		setSelectedFiles(Array.from(event.target.files ?? []));
		setUploadMessage("");
	}

	async function uploadSelectedImages() {
		if (!propertyId || selectedFiles.length === 0) return;

		setSaving(true);
		setUploadMessage(`Uploading ${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"}...`);

		const nextRows = [];
		const existingCover = images.some((image) => Boolean(image.is_cover));

		for (const [index, file] of selectedFiles.entries()) {
			const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
			const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "property-image";
			const filePath = `${propertyId}/${Date.now()}-${index}-${baseName}.${extension}`;

			const { error: uploadError } = await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).upload(filePath, file, {
				cacheControl: "3600",
				upsert: false,
			});

			if (uploadError) {
				setUploadMessage(`Upload failed: ${uploadError.message}. Check that the "${PROPERTY_IMAGE_BUCKET}" storage bucket exists and allows CMS uploads.`);
				setSaving(false);
				return;
			}

			const { data: publicUrlData } = supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(filePath);
			const publicUrl = publicUrlData.publicUrl;
			const isCover = !existingCover && index === 0 && images.length === 0;

			nextRows.push({
				property_id: propertyId,
				storage_url: publicUrl,
				caption: file.name.replace(/\.[^.]+$/, ""),
				sort_order: images.length + index,
				is_cover: isCover,
			});
		}

		if (nextRows.length) {
			const { error: insertError } = await supabaseBrowser.from("property_images").insert(nextRows);
			if (insertError) {
				setUploadMessage(insertError.message);
				setSaving(false);
				return;
			}

			const coverRow = nextRows.find((row) => row.is_cover);
			if (coverRow) {
				await supabaseBrowser.from("properties").update({ cover_image_url: coverRow.storage_url }).eq("id", propertyId);
			}
		}

		await loadImages();
		await onChanged();
		setSelectedFiles([]);
		setUploadMessage(`Uploaded ${nextRows.length} image${nextRows.length === 1 ? "" : "s"}.`);
		setSaving(false);
	}

	useEffect(() => {
		let active = true;

		void (async () => {
			await Promise.resolve();
			if (!propertyId) {
				if (active) setImages([]);
				return;
			}

			const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
			if (active) setImages(data ?? []);
		})();

		return () => {
			active = false;
		};
	}, [propertyId]);

	async function deleteImage(id: string) {
		const image = images.find((item) => asText(item.id) === id);
		onRequestDelete({
			title: "Delete this property photo?",
			description: `This will permanently delete ${asText(image?.caption || image?.storage_url || "this image")} from the listing gallery.`,
			confirmLabel: "Verify password and delete photo",
			onConfirm: async () => {
				await supabaseBrowser.from("property_images").delete().eq("id", id);
				const storagePath = storagePathFromPublicUrl(asText(image?.storage_url));
				if (storagePath) {
					await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove([storagePath]);
				}
				await loadImages();
				await onChanged();
			},
		});
	}

	async function setCoverImage(image: CmsRow) {
		if (!propertyId) return;
		setSaving(true);
		await supabaseBrowser.from("property_images").update({ is_cover: false }).eq("property_id", propertyId);
		await supabaseBrowser.from("property_images").update({ is_cover: true }).eq("id", image.id);
		await supabaseBrowser.from("properties").update({ cover_image_url: image.storage_url }).eq("id", propertyId);
		await loadImages();
		await onChanged();
		setSaving(false);
	}

	if (!propertyId) {
		const staged = stagedPhotos ?? [];
		const readyCount = staged.filter((photo) => photo.status === "done").length;
		const uploadingCount = staged.filter((photo) => photo.status === "uploading").length;
		const errorCount = staged.filter((photo) => photo.status === "error").length;
		const firstError = staged.find((photo) => photo.status === "error")?.error;

		return (
			<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Photo Uploads</div>
						<div className="mt-1 text-sm text-black/60">
							Photos upload immediately as you select them. They are attached automatically when you create the listing.
						</div>
					</div>
					{staged.length > 0 && (
						<div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
							{readyCount > 0 && (
								<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
									{readyCount} ready
								</span>
							)}
							{uploadingCount > 0 && (
								<span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
									{uploadingCount} uploading
								</span>
							)}
							{errorCount > 0 && (
								<span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
									{errorCount} failed
								</span>
							)}
						</div>
					)}
				</div>
				{canEdit && (
					<label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-white p-4 text-sm text-black/50 transition hover:border-black/25 hover:bg-zinc-50">
						<UploadCloud className="h-4 w-4 shrink-0 text-black/40" />
						<span>{staged.length > 0 ? "Add more photos…" : "Click to select photos…"}</span>
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp,image/gif"
							multiple
							className="sr-only"
							onChange={(event) => {
								const files = Array.from(event.target.files ?? []);
								event.target.value = "";
								if (files.length > 0) onAddStagedPhotos?.(files);
							}}
						/>
					</label>
				)}
				{staged.length > 0 && (
					<div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
						{staged.map((photo) => (
							<div
								key={photo.id}
								className="group relative aspect-square overflow-hidden rounded-lg border border-black/10 bg-white"
							>
								<img
									src={photo.previewUrl}
									alt={photo.file.name}
									className={`h-full w-full object-cover ${photo.status === "error" ? "opacity-60" : ""}`}
								/>
								{photo.status === "uploading" && (
									<div className="absolute inset-x-0 bottom-0 bg-black/65 p-1.5 text-[10px] font-semibold text-white">
										<div className="flex items-center justify-between gap-1">
											<span>Uploading…</span>
											<span className="tabular-nums">{photo.progress}%</span>
										</div>
										<div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/30">
											<div
												className="h-full rounded-full bg-white transition-[width]"
												style={{ width: `${photo.progress}%` }}
											/>
										</div>
									</div>
								)}
								{photo.status === "done" && (
									<span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
										<CheckCircle2 className="h-3.5 w-3.5" />
									</span>
								)}
								{photo.status === "error" && (
									<div
										className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-950/75 p-1 text-center text-[10px] font-medium text-white"
										title={photo.error ?? "Upload failed"}
									>
										<span className="line-clamp-3 break-words px-1">
											{photo.error ?? "Upload failed"}
										</span>
										<button
											type="button"
											onClick={() => onRetryStagedPhoto?.(photo)}
											className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700"
										>
											Retry
										</button>
									</div>
								)}
								{canEdit && (
									<button
										type="button"
										onClick={() => onRemoveStagedPhoto?.(photo)}
										title="Remove photo"
										className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-90 transition hover:bg-black"
									>
										<X className="h-3 w-3" />
									</button>
								)}
							</div>
						))}
					</div>
				)}
				{staged.length > 0 && (
					<p className="mt-2 text-xs">
						{uploadingCount > 0 ? (
							<span className="font-medium text-amber-700">
								Uploading {uploadingCount} photo{uploadingCount === 1 ? "" : "s"}… &ldquo;Create listing&rdquo; unlocks when the upload finishes.
							</span>
						) : errorCount > 0 ? (
							<>
								<span className="block font-medium text-red-700">
									{errorCount} photo{errorCount === 1 ? "" : "s"} failed to upload. Retry or remove {errorCount === 1 ? "it" : "them"}, or create the listing without {errorCount === 1 ? "it" : "them"}.
								</span>
								{firstError && (
									<span className="mt-1 block break-words text-[11px] font-normal text-red-600">
										{firstError}
									</span>
								)}
							</>
						) : (
							<span className="font-medium text-emerald-700">
								✓ {readyCount} photo{readyCount === 1 ? "" : "s"} ready and will be attached when you click &ldquo;Create listing&rdquo;.
							</span>
						)}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Photo Uploads</div>
					<div className="mt-1 text-sm text-black/60">Choose one or more photos, then upload them in one action. The first uploaded photo becomes the cover if no cover exists yet.</div>
				</div>
				<div className="text-xs text-black/45">{images.length} images</div>
			</div>

			<div className="mt-4 rounded-xl border border-dashed border-black/15 bg-white p-4">
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Upload Photos</div>
					<input type="file" accept="image/*" multiple disabled={!canEdit || saving} onChange={handleFilesChange} className="mt-2 block w-full text-sm text-black/60 file:mr-4 file:rounded-md file:border-0 file:bg-[#111111] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60" />
				</label>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs text-black/45">{selectedFiles.length ? `${selectedFiles.length} selected: ${selectedFiles.map((file) => file.name).join(", ")}` : "Choose one or more JPG, PNG, or WebP images."}</p>
					<button type="button" onClick={uploadSelectedImages} disabled={!canEdit || saving || selectedFiles.length === 0} className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
						{saving ? "Uploading..." : "Upload photos"}
					</button>
				</div>
				{uploadMessage ? <p className="mt-2 text-xs text-black/55">{uploadMessage}</p> : null}
			</div>

			<div className="mt-4 grid gap-2 md:grid-cols-2">
				{images.map((image) => (
					<div key={asText(image.id)} className="min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white p-3">
						{image.storage_url ? (
							<SafeImage
								src={asText(image.storage_url)}
								alt={asText(image.caption || "Property image")}
								width={360}
								height={144}
								unoptimized
								className="mb-3 h-36 w-full rounded-xl object-cover"
								fallbackContent={<div className="mb-3 grid h-36 w-full place-items-center rounded-xl bg-zinc-100 text-xs text-black/45">Image unavailable</div>}
							/>
						) : null}
						<div className="truncate text-sm font-medium text-[#111111]">{image.caption || image.storage_url}</div>
						<div className="mt-1 break-all text-xs text-black/45">{image.storage_url}</div>
						<div className="mt-3 flex items-center justify-between gap-2 text-xs text-black/55">
							<span>Sort order: {image.sort_order}</span>
							<span>{image.is_cover ? "Cover" : "Secondary"}</span>
						</div>
						{canEdit ? (
							<div className="mt-3 flex flex-wrap gap-2">
								<button type="button" onClick={() => setCoverImage(image)} disabled={saving || Boolean(image.is_cover)} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/65 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">Set cover</button>
								<button type="button" onClick={() => deleteImage(asText(image.id))} className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-[#111111] transition hover:bg-zinc-100">Delete</button>
							</div>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}
// InquiryPanel replaced by modular InquiryWorkflowManager component (./InquiryWorkflowManager.tsx)


function AnalyticsPanel({
	activeReport,
	isAdmin,
	properties,
	inquiries,
	recommendations,
	listingPerformance,
	dailyInquiryVolume,
	trafficSources,
	agentPerformance,
	developerPortfolio,
	engagementEvents,
	sessions,
	selectedPortfolioDeveloperId,
	selectedPortfolioPropertyId,
	onSelectPortfolioDeveloper,
	onSelectPortfolioProperty,
	selectedDateFilter: _selectedDateFilter = null,
}: {
	activeReport: CmsSection;
	isAdmin: boolean;
	properties: CmsRow[];
	inquiries: CmsRow[];
	recommendations: CmsRow[];
	listingPerformance: CmsRow[];
	dailyInquiryVolume: CmsRow[];
	trafficSources: CmsRow[];
	agentPerformance: CmsRow[];
	developerPortfolio: CmsRow[];
	engagementEvents: CmsRow[];
	sessions: CmsRow[];
	selectedPortfolioDeveloperId: string | null;
	selectedPortfolioPropertyId: string | null;
	onSelectPortfolioDeveloper: (id: string | null) => void;
	onSelectPortfolioProperty: (id: string | null) => void;
	selectedDateFilter?: string | null;
}) {
	const inquiryCounts = inquiries.reduce((acc: Record<string, number>, item) => {
		const status = asText(item.status || "unclassified");
		acc[status] = (acc[status] ?? 0) + 1;
		return acc;
	}, {});

	const priorityCounts = inquiries.reduce((acc: Record<string, number>, item) => {
		const priority = asText(item.priority || "unclassified");
		acc[priority] = (acc[priority] ?? 0) + 1;
		return acc;
	}, {});

	const recommendationStats = (() => {
		if (!recommendations.length) return { total: 0, clicked: 0, fallback: 0 };
		const total = recommendations.length;
		const clicked = recommendations.filter((item) => item.was_clicked).length;
		const fallback = recommendations.filter((item) => item.is_fallback).length;
		return { total, clicked, fallback };
	})();

	const clickThrough = recommendationStats.total ? (recommendationStats.clicked / recommendationStats.total) * 100 : 0;
	const fallbackRate = recommendationStats.total ? (recommendationStats.fallback / recommendationStats.total) * 100 : 0;
	const pipelineChartRows = Object.entries(inquiryCounts).map(([label, value]) => ({ label, value }));
	const inquiryVolumeRows = dailyInquiryVolume.map((row) => ({
		inquiry_date: asText(row.inquiry_date),
		total_inquiries: toNullableNumber(row.total_inquiries) ?? 0,
	}));
	const agentPerformanceRows = agentPerformance.map((row) => ({
		agent_id: asText(row.agent_id),
		agent_name: asText(row.agent_name),
		total_assigned: toNullableNumber(row.total_assigned) ?? 0,
		conversions: toNullableNumber(row.conversions) ?? 0,
		conversion_rate_pct: toNullableNumber(row.conversion_rate_pct) ?? 0,
		avg_response_time_hours: toNullableNumber(row.avg_response_time_hours),
	}));
	const listingChartRows = listingPerformance.map((row) => ({
		property_id: asText(row.property_id),
		title: asText(row.title),
		total_views: toNullableNumber(row.total_views) ?? 0,
		detail_opens: toNullableNumber(row.detail_opens) ?? 0,
		total_interactions: toNullableNumber(row.total_interactions) ?? 0,
		avg_dwell_seconds: toNullableNumber(row.avg_dwell_seconds) ?? 0,
		total_inquiries: toNullableNumber(row.total_inquiries) ?? 0,
		inquiry_rate_pct: toNullableNumber(row.inquiry_rate_pct) ?? 0,
	}));
	const selectedPortfolioDeveloper = selectedPortfolioDeveloperId
		? developerPortfolio.find((row) => asText(row.developer_id) === selectedPortfolioDeveloperId) ?? null
		: null;
	const selectedDeveloperProperties = selectedPortfolioDeveloperId
		? properties.filter((property) => asText(property.developer_id) === selectedPortfolioDeveloperId)
		: [];
	const selectedPortfolioProperty = selectedPortfolioPropertyId
		? properties.find((property) => asText(property.id) === selectedPortfolioPropertyId) ?? null
		: null;
	const selectedPropertyPerformance = selectedPortfolioPropertyId
		? listingChartRows.find((row) => row.property_id === selectedPortfolioPropertyId) ?? null
		: null;
	const selectedPropertyInquiries = selectedPortfolioPropertyId
		? inquiries.filter((inquiry) => asText(inquiry.property_id) === selectedPortfolioPropertyId)
		: [];
	const selectedPropertyRecommendationClicks = selectedPortfolioPropertyId
		? recommendations.filter((recommendation) => asText(recommendation.property_id) === selectedPortfolioPropertyId || asText(recommendation.recommended_property_id) === selectedPortfolioPropertyId).filter((recommendation) => Boolean(recommendation.was_clicked)).length
		: 0;
	const selectedPropertyChartRows = selectedPortfolioPropertyId ? [
		{ label: "Views", value: selectedPropertyPerformance?.total_views ?? 0 },
		{ label: "Interactions", value: selectedPropertyPerformance?.total_interactions ?? selectedPropertyPerformance?.detail_opens ?? 0 },
		{ label: "Inquiries", value: selectedPropertyPerformance?.total_inquiries ?? selectedPropertyInquiries.length },
		{ label: "Rec Clicks", value: selectedPropertyRecommendationClicks },
	] : [];
	const trafficChartRows = trafficSources.map((row) => ({
		source: asText(row.source),
		session_count: toNullableNumber(row.session_count) ?? 0,
		total_page_views: toNullableNumber(row.total_page_views) ?? 0,
		share_pct: toNullableNumber(row.share_pct) ?? 0,
	}));
	const normalizedAnalyticsReport: CmsSection = activeReport === "traffic" ? "trafficBehavior" : activeReport;
	const activeAnalyticsCategory = normalizedAnalyticsReport === "trafficBehavior" || normalizedAnalyticsReport === "propertyPerformance" || normalizedAnalyticsReport === "predictiveAnalytics" || normalizedAnalyticsReport === "userEngagement"
		? normalizedAnalyticsReport
		: null;
	const reportTitle = normalizedAnalyticsReport === "trafficBehavior"
		? "Traffic & User Behavior"
		: normalizedAnalyticsReport === "propertyPerformance"
			? "Property Performance"
			: normalizedAnalyticsReport === "predictiveAnalytics"
				? "Predictive Analytics"
				: normalizedAnalyticsReport === "userEngagement"
					? "User Engagement"
		: activeReport === "agentPerformance"
			? "Agent Performance"
			: activeReport === "developerPortfolio"
				? "Developer Portfolio"
				: "Analytics Overview";
	const reportDescription = normalizedAnalyticsReport === "trafficBehavior"
		? "Visitor trends, traffic channels, listing visibility, and bounce indicators."
		: normalizedAnalyticsReport === "propertyPerformance"
			? "Listing price, location, view, inquiry, and price-per-sqm comparisons."
			: normalizedAnalyticsReport === "predictiveAnalytics"
				? "Forecasts, distributions, and property clusters for decision support."
				: normalizedAnalyticsReport === "userEngagement"
					? "Funnel movement, session duration, and new versus returning behavior."
		: activeReport === "agentPerformance"
			? "Agent workload, response speed, and conversion performance."
			: activeReport === "developerPortfolio"
				? "Developer partner portfolio performance and conversion totals."
				: "Operational KPI view powered by materialized views and live inquiry tables.";
	const showOverviewReport = activeReport === "analytics";
	const showTrafficReport = activeReport === "traffic";
	const showAgentReport = activeReport === "agentPerformance";
	const showDeveloperReport = activeReport === "developerPortfolio";
	const developerPortfolioLevel = selectedPortfolioProperty ? "property" : selectedPortfolioDeveloper ? "developer" : "portfolio";
	const weekStart = new Date();
	weekStart.setUTCDate(weekStart.getUTCDate() - 6);
	const weekStartKey = weekStart.toISOString().slice(0, 10);
	const viewEventTypes = new Set(["property_view", "page_view", "view", "listing_view"]);
	const weeklyVisitorKeys = new Set<string>();
	for (const event of engagementEvents) {
		if (!viewEventTypes.has(asText(event.event_type))) continue;
		if (asText(event.created_at).slice(0, 10) < weekStartKey) continue;
		const visitor = asText(event.session_id);
		if (visitor) weeklyVisitorKeys.add(visitor);
	}
	const weeklyVisitors = weeklyVisitorKeys.size;
	const overviewDemand = buildDemandForecast(dailyInquiryVolume, 21, 7);
	const nextDayForecast = overviewDemand.forecast[0]?.value ?? 0;
	const topListing = listingChartRows.slice().sort((a, b) => b.total_views - a.total_views)[0] ?? null;
	const totalListingViews = listingChartRows.reduce((sum, row) => sum + row.total_views, 0);
	const funnelCompletionRate = totalListingViews ? (inquiries.length / totalListingViews) * 100 : 0;
	const activeListings = properties.filter((property) => {
		const status = asText(property.status || property.publish_status || property.listing_status).toLowerCase();
		return status === "active" || status === "published" || status === "available";
	}).length || properties.length;
	const avgPropertyPrice = numberAverage(properties.map(propertyPrice));


	return (
		<div>
		<SectionShell title={reportTitle} description={reportDescription}>
			<div className="mb-6 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-black/5 pb-4">
				<div className="flex items-center gap-2.5">
					<span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-black/70">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Live Materialized Engine
					</span>
					<span className="hidden sm:inline text-xs text-black/40">Real-time sync with inquiry tables</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{showOverviewReport ? (
						<button
							type="button"
							onClick={() => downloadCsv("jewellz-inquiries.csv", inquiries, ["id", "buyer_name", "buyer_email", "buyer_phone", "status", "priority", "lead_score", "source", "created_at"])}
							className="group inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] shadow-xs transition hover:border-black/25 hover:bg-zinc-50 active:scale-[0.98]"
						>
							<svg className="h-3.5 w-3.5 text-black/40 group-hover:text-black/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
							</svg>
							<span>Export Inquiries</span>
						</button>
					) : null}
					{showOverviewReport || showTrafficReport || showDeveloperReport ? (
						<button
							type="button"
							onClick={() => downloadCsv("jewellz-listing-performance.csv", listingPerformance, ["property_id", "title", "total_views", "detail_opens", "total_interactions", "avg_dwell_seconds", "total_inquiries", "inquiry_rate_pct"])}
							className="group inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] shadow-xs transition hover:border-black/25 hover:bg-zinc-50 active:scale-[0.98]"
						>
							<svg className="h-3.5 w-3.5 text-black/40 group-hover:text-black/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
							</svg>
							<span>Listings Report</span>
						</button>
					) : null}
					{showOverviewReport || showAgentReport ? (
						<button
							type="button"
							onClick={() => downloadCsv("jewellz-agent-performance.csv", agentPerformance, ["agent_id", "agent_name", "total_assigned", "conversions", "conversion_rate_pct", "avg_response_time_hours"])}
							className="group inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] shadow-xs transition hover:border-black/25 hover:bg-zinc-50 active:scale-[0.98]"
						>
							<svg className="h-3.5 w-3.5 text-black/40 group-hover:text-black/80 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
							</svg>
							<span>Agent Report</span>
						</button>
					) : null}
				</div>
			</div>

			{showOverviewReport ? (
				<div className="mb-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
					<div className="group flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition duration-200 hover:border-black/25 hover:shadow-xs">
						<div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Traffic Snapshot</span>
								<span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-black/60">7D</span>
							</div>
							<div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111111]">{weeklyVisitors.toLocaleString()}</div>
						</div>
						<p className="mt-3 text-xs leading-relaxed text-black/50">Distinct visitors with at least one tracked session in the last 7 days.</p>
					</div>

					<div className="group flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition duration-200 hover:border-black/25 hover:shadow-xs">
						<div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Top Property</span>
								<span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-black/60">Most Viewed</span>
							</div>
							<div className="mt-3 truncate text-base font-semibold text-[#111111]" title={topListing?.title || "No listing yet"}>
								{topListing?.title || "No listing yet"}
							</div>
						</div>
						<div className="mt-3 flex items-center gap-2">
							<span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-black/75">
								{topListing?.total_views ?? 0} views
							</span>
							<span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-black/75">
								{topListing?.total_inquiries ?? 0} inquiries
							</span>
						</div>
					</div>

					<div className="group flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition duration-200 hover:border-black/25 hover:shadow-xs">
						<div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Next-Day Demand</span>
								<span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-black/60">Forecast</span>
							</div>
							<div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111111]">{nextDayForecast.toFixed(1)}</div>
						</div>
						<p className="mt-3 text-xs leading-relaxed text-black/50">
							Linear-regression inquiry forecast from the last 21 days ({overviewDemand.regression.trend} trend, R2 {overviewDemand.regression.r2}).
						</p>
					</div>

					<div className="group flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition duration-200 hover:border-black/25 hover:shadow-xs">
						<div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Conversion Funnel</span>
								<span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-black/60">Rate</span>
							</div>
							<div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111111]">{funnelCompletionRate.toFixed(1)}%</div>
						</div>
						<div className="mt-3">
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
								<div className="h-full rounded-full bg-[#111111] transition-[width] duration-500" style={{ width: `${Math.min(Math.max(funnelCompletionRate * 5, 4), 100)}%` }} />
							</div>
							<p className="mt-1.5 text-[11px] text-black/45">View-to-inquiry funnel completion</p>
						</div>
					</div>

					<div className="group flex flex-col justify-between rounded-xl border border-black/10 bg-white p-4 transition duration-200 hover:border-black/25 hover:shadow-xs">
						<div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Portfolio Velocity</span>
								<span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-black/60">Inventory</span>
							</div>
							<div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#111111]">{inquiries.length} Inquiries</div>
						</div>
						<div className="mt-3 border-t border-black/5 pt-2 text-xs text-black/55 flex items-center justify-between">
							<span>{activeListings} Active listings</span>
							<span className="font-semibold text-black/75">₱{(avgPropertyPrice / 1000000).toFixed(2)}M avg</span>
						</div>
					</div>
				</div>
			) : null}

			{isAdmin && activeAnalyticsCategory ? (
				<div className="mb-6">
					<AnalyticsVisualSuite
						category={activeAnalyticsCategory}
						properties={properties}
						inquiries={inquiries}
						listingRows={listingChartRows}
						inquiryVolumeRows={inquiryVolumeRows}
						trafficRows={trafficChartRows}
						sessions={sessions}
						events={engagementEvents}
					/>
				</div>
			) : null}

			{isAdmin && showOverviewReport ? (
				<div className="mb-6 grid gap-3.5 sm:grid-cols-3">
					<div className="group rounded-xl border border-black/10 bg-zinc-50/70 p-4 transition duration-200 hover:bg-white hover:border-black/20 hover:shadow-xs">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Traffic Acquisition</span>
							<span className="rounded-md bg-white border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/70">Top Channel</span>
						</div>
						<div className="mt-2.5 flex items-baseline gap-2">
							<span className="text-base font-semibold capitalize text-[#111111] truncate">{trafficSources[0]?.source || "Direct"}</span>
							<span className="text-xs font-semibold text-black/45">({trafficSources[0]?.session_count ?? 0} sessions)</span>
						</div>
						<p className="mt-1 text-xs text-black/50">Primary visitor entry point across analytics channels.</p>
					</div>

					<div className="group rounded-xl border border-black/10 bg-zinc-50/70 p-4 transition duration-200 hover:bg-white hover:border-black/20 hover:shadow-xs">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Agent Performance</span>
							<span className="rounded-md bg-white border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/70">Lead Response</span>
						</div>
						<div className="mt-2.5 flex items-baseline gap-2">
							<span className="text-base font-semibold text-[#111111] truncate">{agentPerformance[0]?.agent_name || "Unassigned"}</span>
							<span className="text-xs font-semibold text-black/45">({agentPerformance[0]?.conversions ?? 0} won)</span>
						</div>
						<p className="mt-1 text-xs text-black/50">Top converting representative with assigned buyer requests.</p>
					</div>

					<div className="group rounded-xl border border-black/10 bg-zinc-50/70 p-4 transition duration-200 hover:bg-white hover:border-black/20 hover:shadow-xs">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Developer Partner</span>
							<span className="rounded-md bg-white border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/70">Portfolio</span>
						</div>
						<div className="mt-2.5 flex items-baseline gap-2">
							<span className="text-base font-semibold text-[#111111] truncate">{developerPortfolio[0]?.company_name || "Partner Network"}</span>
							<span className="text-xs font-semibold text-black/45">({developerPortfolio[0]?.total_listings ?? 0} units)</span>
						</div>
						<p className="mt-1 text-xs text-black/50">Active developer catalog footprint in market catalog.</p>
					</div>
				</div>
			) : null}

			{showOverviewReport ? (
				<div className="mb-6 grid gap-5 xl:grid-cols-12">
					{/* Lead Pipeline & Priority Distribution - 7 cols */}
					<div className="xl:col-span-7 flex flex-col justify-between rounded-xl border border-black/10 bg-white p-5 transition duration-200 hover:border-black/20">
						<div>
							<div className="flex items-start justify-between gap-3">
								<div>
									<div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">Pipeline Distribution</div>
									<h3 className="mt-1 text-sm font-semibold text-[#111111]">Lead Conversion Pipeline</h3>
								</div>
								<span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-black/70">
									{pipelineChartRows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)} Total Leads
								</span>
							</div>

							<div className="mt-4 h-56">
								{pipelineChartRows.length ? (
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={pipelineChartRows} layout="vertical" margin={{ top: 8, right: 14, left: -4, bottom: 0 }}>
											<CartesianGrid horizontal={false} stroke="#f4f4f5" />
											<XAxis type="number" hide allowDecimals={false} />
											<YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickFormatter={(value) => asText(value).replaceAll("_", " ")} tick={{ fontSize: 11, fill: "#71717a" }} width={100} />
											<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
											<Bar dataKey="value" name="Leads" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={16} />
										</BarChart>
									</ResponsiveContainer>
								) : <p className="text-sm text-black/45 py-12 text-center">No inquiry activity recorded yet.</p>}
							</div>
						</div>

						{/* Priority Split */}
						<div className="mt-5 border-t border-black/5 pt-4">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">Priority Distribution</span>
								<span className="text-[11px] text-black/40">Inquiry Urgency</span>
							</div>
							<div className="mt-2.5 flex flex-wrap gap-2">
								{Object.entries(priorityCounts).length ? (
									Object.entries(priorityCounts).map(([priority, count]) => {
										const isHigh = priority.toLowerCase() === "high";
										const isMedium = priority.toLowerCase() === "medium";
										return (
											<span
												key={priority}
												className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
													isHigh
														? "bg-black text-white"
														: isMedium
															? "bg-zinc-200 text-zinc-900"
															: "bg-zinc-100 text-zinc-700"
												}`}
											>
												<span className={`h-1.5 w-1.5 rounded-full ${isHigh ? "bg-red-400" : isMedium ? "bg-amber-400" : "bg-zinc-400"}`} />
												{priority}: {count}
											</span>
										);
									})
								) : (
									<span className="text-xs text-black/45">No priority tags recorded</span>
								)}
							</div>
						</div>
					</div>

					{/* Volume & Recommendation Analytics - 5 cols */}
					<div className="xl:col-span-5 flex flex-col gap-5">
						<div className="rounded-xl border border-black/10 bg-white p-5 transition duration-200 hover:border-black/20">
							<div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">Inquiry Volume</div>
							<div className="mt-3">
								<InquiryVolumeChart rows={inquiryVolumeRows} />
							</div>
						</div>

						<div className="rounded-xl border border-black/10 bg-white p-5 transition duration-200 hover:border-black/20">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">Recommendation Engine</span>
								<span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-black/60">Vector Match</span>
							</div>

							<div className="mt-4 grid grid-cols-2 gap-3">
								<div className="rounded-lg border border-black/5 bg-zinc-50/80 p-3">
									<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">Total Shown</div>
									<div className="mt-1 text-xl font-semibold text-[#111111]">{recommendationStats.total}</div>
								</div>
								<div className="rounded-lg border border-black/5 bg-zinc-50/80 p-3">
									<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">Clicked</div>
									<div className="mt-1 text-xl font-semibold text-[#111111]">{recommendationStats.clicked}</div>
								</div>
								<div className="rounded-lg border border-black/5 bg-zinc-50/80 p-3">
									<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">CTR %</div>
									<div className="mt-1 text-xl font-semibold text-[#111111]">{clickThrough.toFixed(1)}%</div>
								</div>
								<div className="rounded-lg border border-black/5 bg-zinc-50/80 p-3">
									<div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">Fallback Rate</div>
									<div className="mt-1 text-xl font-semibold text-[#111111]">{fallbackRate.toFixed(1)}%</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{isAdmin && showOverviewReport ? (
				<div className="grid gap-5">
					<div className="rounded-xl border border-black/10 bg-white p-5 transition duration-200 hover:border-black/20">
						<div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">Listing Performance Matrix</div>
						<div className="mt-3">
							<ListingPerformanceChart rows={listingChartRows} />
						</div>
					</div>

					<div className="rounded-xl border border-black/10 bg-white p-5 transition duration-200 hover:border-black/20">
						<PeakEngagementChart events={engagementEvents} />
					</div>
				</div>
			) : null}

			{isAdmin && showTrafficReport ? (
				<div className="grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Traffic Sources</div>
						<div className="mt-3">
							<TrafficSourceChart rows={trafficChartRows} />
						</div>
					</div>
				</div>
			) : null}

			{isAdmin && showAgentReport ? (
				<div className="grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Agent Performance</div>
						<div className="mt-3">
							<AgentPerformanceTable rows={agentPerformanceRows} />
						</div>
					</div>
				</div>
			) : null}

			{isAdmin && showDeveloperReport ? (
				<div className="grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
									{developerPortfolioLevel === "property" ? "Property Analytics" : developerPortfolioLevel === "developer" ? "Developer Properties" : "Developer Portfolio"}
								</div>
								<p className="mt-1 text-sm text-black/55">
									{developerPortfolioLevel === "property"
										? "Property-level engagement and lead performance."
										: developerPortfolioLevel === "developer"
											? "Listings owned by this developer. Click one to inspect its analytics."
											: "Click a developer to open its portfolio page."}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{selectedPortfolioProperty ? (
									<button type="button" onClick={() => onSelectPortfolioProperty(null)} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Back to properties</button>
								) : null}
								{selectedPortfolioDeveloper ? (
									<button type="button" onClick={() => { onSelectPortfolioDeveloper(null); onSelectPortfolioProperty(null); }} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Back to developers</button>
								) : null}
							</div>
						</div>

						{developerPortfolioLevel === "portfolio" ? <div className="mt-3 overflow-x-auto">
							<table className="min-w-full text-left text-sm">
								<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
									<tr>
										<th className="py-2 pr-4">Developer</th>
										<th className="py-2 pr-4">Listings</th>
										<th className="py-2 pr-4">Views</th>
										<th className="py-2 pr-4">Conversions</th>
									</tr>
								</thead>
								<tbody>
									{developerPortfolio.map((row) => {
										const developerId = asText(row.developer_id);
										const active = selectedPortfolioDeveloperId === developerId;
										return (
												<tr key={developerId} onClick={() => { onSelectPortfolioDeveloper(developerId); onSelectPortfolioProperty(null); }} className={`cursor-pointer border-t border-black/5 transition ${active ? "bg-zinc-100" : "hover:bg-zinc-50"}`}>
												<td className="py-2 pr-4 font-medium text-[#111111]">{row.company_name}</td>
												<td className="py-2 pr-4">{row.total_listings ?? 0}</td>
												<td className="py-2 pr-4">{row.total_views ?? 0}</td>
												<td className="py-2 pr-4">{row.total_conversions ?? 0}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div> : null}

						{developerPortfolioLevel === "developer" && selectedPortfolioDeveloper ? (
							<div className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Properties By {selectedPortfolioDeveloper.company_name}</div>
								<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
									{selectedDeveloperProperties.length === 0 ? <p className="rounded-md bg-white px-3 py-4 text-sm text-black/50 md:col-span-2 xl:col-span-3">No properties found for this developer.</p> : null}
									{selectedDeveloperProperties.map((property) => {
										const propertyId = asText(property.id);
										const performance = listingChartRows.find((row) => row.property_id === propertyId);
										const active = selectedPortfolioPropertyId === propertyId;
										return (
											<button key={propertyId} type="button" onClick={() => onSelectPortfolioProperty(propertyId)} className={`rounded-md border px-3 py-2 text-left transition ${active ? "border-black/20 bg-white shadow-sm" : "border-black/10 bg-white hover:bg-zinc-50"}`}>
												<div className="truncate text-sm font-semibold text-[#111111]">{property.title ?? "Untitled property"}</div>
												<div className="mt-1 truncate text-xs text-black/45">{property.city ?? ""} {property.province ?? ""}</div>
												<div className="mt-3 flex items-center justify-between gap-3 text-xs text-black/50">
													<span>{performance?.total_views ?? 0} views</span>
													<span>{performance?.total_interactions ?? performance?.detail_opens ?? 0} interactions</span>
												</div>
											</button>
										);
									})}
								</div>
							</div>
						) : null}

						{developerPortfolioLevel === "property" && selectedPortfolioProperty ? (
							<div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
								<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Property Analytics</div>
											<div className="mt-1 text-lg font-semibold text-[#111111]">{selectedPortfolioProperty.title}</div>
											<p className="mt-1 text-sm text-black/50">{selectedPortfolioProperty.city ?? ""} {selectedPortfolioProperty.province ?? ""}</p>
										</div>
										<LeadScoreBadge score={selectedPropertyPerformance ? Math.min(1, (selectedPropertyPerformance.inquiry_rate_pct ?? 0) / 10) : null} />
									</div>
									<div className="mt-4 h-72">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={selectedPropertyChartRows} margin={{ top: 8, right: 8, left: -22, bottom: 18 }}>
												<CartesianGrid vertical={false} stroke="#ececec" />
												<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
												<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
												<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
												<Bar dataKey="value" name="Count" fill="#111111" radius={[7, 7, 0, 0]} maxBarSize={42} />
											</BarChart>
										</ResponsiveContainer>
									</div>
								</div>

								<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Engagement Detail</div>
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<InfoCard label="Total views" value={selectedPropertyPerformance?.total_views ?? 0} hint="Property page views." />
										<InfoCard label="Interactions" value={selectedPropertyPerformance?.total_interactions ?? selectedPropertyPerformance?.detail_opens ?? 0} hint="Gallery, map, inquiry, and recommendation interactions." />
										<InfoCard label="Inquiries" value={selectedPropertyPerformance?.total_inquiries ?? selectedPropertyInquiries.length} hint="Submitted leads for this property." />
										<InfoCard label="Avg. browse time" value={`${Math.round(selectedPropertyPerformance?.avg_dwell_seconds ?? 0)}s`} hint="Average recorded dwell time per property visit." />
										<InfoCard label="Inquiry rate" value={`${selectedPropertyPerformance?.inquiry_rate_pct ?? 0}%`} hint="Inquiry conversion percentage." />
									</div>
									<div className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-black/60">
										<div className="font-medium text-[#111111]">Recent property leads</div>
										<div className="mt-2 space-y-2">
											{selectedPropertyInquiries.slice(0, 4).map((inquiry) => (
												<div key={asText(inquiry.id)} className="flex items-center justify-between gap-3 border-t border-black/5 pt-2 first:border-t-0 first:pt-0">
													<span className="truncate">{inquiry.buyer_name ?? inquiry.buyer_email}</span>
													<span className="shrink-0 text-xs text-black/45">{relativeAge(inquiry.created_at)}</span>
												</div>
											))}
											{selectedPropertyInquiries.length === 0 ? <p className="text-sm text-black/45">No inquiries for this property yet.</p> : null}
										</div>
									</div>
								</div>
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</SectionShell>
		</div>
	);
}

function playNotificationChime() {
	if (typeof window === "undefined") return;
	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();
		if (ctx.state === "suspended") void ctx.resume();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(587.33, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
		gain.gain.setValueAtTime(0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.35);
	} catch {
		// Audio policy safely handled
	}
}

function formatRelativeTime(isoString?: string) {
	if (!isoString) return "just now";
	const diff = Date.now() - new Date(isoString).getTime();
	if (Number.isNaN(diff)) return "recently";
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

type AdminLiveNotification = {
	id: string;
	type: "agent_progress" | "new_inquiry" | "status_change";
	title: string;
	message: string;
	inquiryId?: string;
	agentName?: string;
	propertyTitle?: string;
	oldStatus?: string;
	newStatus?: string;
	note?: string;
	timestamp: string;
	read: boolean;
};

type CreatedListingToast = {
	propertyId: string | null;
	title: string;
	slug: string;
	status: string;
	photoCount: number;
};

type ActionToast = {
	tone: "success" | "error";
	title: string;
	message: string;
	href?: string;
	hrefLabel?: string;
};

export default function AdminCms({
	initialPrimary = "dashboard",
	initialSection = "overview",
	initialPropertyCategory = "all",
	initialPropertyId = null,
}: AdminCmsProps) {
	const router = useRouter();
	// Never reuse in-memory data during server rendering; it is per browser tab.
	const cachedSnapshot = typeof window === "undefined" ? null : adminWorkspaceSnapshot;
	const [loading, setLoading] = useState(!cachedSnapshot);
	// Never paint a snapshot from a previous auth session until the current
	// browser session has been verified against this request.
	const [authChecked, setAuthChecked] = useState(false);
	const [isRefreshingWorkspace, setIsRefreshingWorkspace] = useState(false);
	const [message, setMessage] = useState("");
	const [saving, setSaving] = useState(false);
	const [sessionUser, setSessionUser] = useState<User | null>(cachedSnapshot?.sessionUser ?? null);
	const [profile, setProfile] = useState<CmsRow | null>(cachedSnapshot?.profile ?? null);
	const [agentProfile, setAgentProfile] = useState<CmsRow | null>(cachedSnapshot?.agentProfile ?? null);
	const [developerProfile, setDeveloperProfile] = useState<CmsRow | null>(cachedSnapshot?.developerProfile ?? null);
	const [workspace, setWorkspace] = useState<Workspace>(cachedSnapshot?.workspace ?? emptyWorkspace);
	const [selectedPropertyImages, setSelectedPropertyImages] = useState<CmsRow[]>([]);
	const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
	const stagedUploadControllers = useRef<Record<string, AbortController>>({});
	const [destructiveAction, setDestructiveAction] = useState<DestructiveAction | null>(null);
	const [destructivePassword, setDestructivePassword] = useState("");
	const [destructiveMessage, setDestructiveMessage] = useState("");
	const [confirmingDestructiveAction, setConfirmingDestructiveAction] = useState(false);
	const [dashboardSearch, setDashboardSearch] = useState("");
	const [showNotifications, setShowNotifications] = useState(false);
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [adminNotifications, setAdminNotifications] = useState<AdminLiveNotification[]>([]);
	const [adminToast, setAdminToast] = useState<AdminLiveNotification | null>(null);
	const [createdListingToast, setCreatedListingToast] = useState<CreatedListingToast | null>(null);
	const [actionToast, setActionToast] = useState<ActionToast | null>(null);
	const [unreadNotifCount, setUnreadNotifCount] = useState(0);
	const [selection, setSelection] = useState<SelectionState>({ ...emptySelection, properties: initialPropertyId });
	const [activePrimary, setActivePrimary] = useState<CmsPrimary>(initialPrimary);
	const [activeSection, setActiveSection] = useState<CmsSection>(initialSection);
	const [propertyCategoryFilter, setPropertyCategoryFilter] = useState(initialPropertyCategory);
	const [showSecondarySidebar, setShowSecondarySidebar] = useState(true);
	const [showAnalyticsAssistant, setShowAnalyticsAssistant] = useState(true);
	const [selectedPortfolioDeveloperId, setSelectedPortfolioDeveloperId] = useState<string | null>(null);
	const [selectedPortfolioPropertyId, setSelectedPortfolioPropertyId] = useState<string | null>(null);
	const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
	const [analyticsChatMessages, setAnalyticsChatMessages] = useState<AnalyticsChatMessage[]>(() => {
		if (typeof window === "undefined") return [createAnalyticsChatWelcomeMessage()];
		const stored = loadAnalyticsChatMessages(null);
		return stored && stored.length > 0 ? stored : [createAnalyticsChatWelcomeMessage()];
	});
	const [analyticsChatIsThinking, setAnalyticsChatIsThinking] = useState(false);

	useEffect(() => {
		if (!actionToast || actionToast.tone === "error" || actionToast.href) return;
		const timer = setTimeout(() => setActionToast(null), 5000);
		return () => clearTimeout(timer);
	}, [actionToast]);

	// Live subscription for Admin: listen for agent progress (inquiry_timeline) and incoming leads (inquiries)
	useEffect(() => {
		if (!sessionUser) return;
		let mounted = true;

		const channel = supabaseBrowser
			.channel("admin_realtime_activity_listener")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "inquiry_timeline" },
				async (payload) => {
					if (!mounted) return;
					const newRow = payload.new as {
						id?: string;
						inquiry_id?: string;
						changed_by?: string;
						old_status?: string;
						new_status?: string;
						note?: string;
						created_at?: string;
					};
					if (!newRow || !newRow.inquiry_id) return;

					// Fetch related inquiry and agent details
					const [inqRes, agentRes] = await Promise.all([
						supabaseBrowser
							.from("inquiries")
							.select("id, buyer_name, buyer_email, property_id, status, assigned_agent_id, properties(title)")
							.eq("id", newRow.inquiry_id)
							.maybeSingle(),
						newRow.changed_by
							? supabaseBrowser
									.from("agents")
									.select("id, full_name")
									.or(`id.eq.${newRow.changed_by},profile_id.eq.${newRow.changed_by}`)
									.maybeSingle()
							: Promise.resolve({ data: null }),
					]);

					const inq = inqRes.data;
					const agent = agentRes.data;
					const agentName = agent?.full_name || "Agent";
					const buyerName = inq?.buyer_name || "Lead";
					const propTitle = (inq?.properties as { title?: string } | null)?.title || "Listing";
					const newStatusLabel = (newRow.new_status || inq?.status || "updated").replace("_", " ");

					const notif: AdminLiveNotification = {
						id: `notif_${newRow.id || Date.now()}`,
						type: "agent_progress",
						title: `Lead Progress: ${agentName}`,
						message: `${agentName} updated ${buyerName} to "${newStatusLabel}"`,
						inquiryId: newRow.inquiry_id,
						agentName,
						propertyTitle: propTitle,
						oldStatus: newRow.old_status ?? undefined,
						newStatus: newRow.new_status ?? undefined,
						note: newRow.note ?? undefined,
						timestamp: newRow.created_at || new Date().toISOString(),
						read: false,
					};

					setAdminNotifications((prev) => [notif, ...prev.slice(0, 49)]);
					setAdminToast(notif);
					setUnreadNotifCount((prev) => prev + 1);
					playNotificationChime();

					// Sync status in workspace inquiries state in real-time
					setWorkspace((prev) => ({
						...prev,
						inquiries: prev.inquiries.map((item) =>
							item.id === newRow.inquiry_id
								? { ...item, status: newRow.new_status || item.status, last_activity_at: new Date().toISOString() }
								: item
						),
					}));
				}
			)
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "inquiries" },
				async (payload) => {
					if (!mounted) return;
					const newInq = payload.new as CmsRow;
					if (!newInq || !newInq.id) return;

					let propTitle = "Property";
					if (newInq.property_id) {
						const { data: prop } = await supabaseBrowser
							.from("properties")
							.select("title")
							.eq("id", newInq.property_id)
							.maybeSingle();
						if (prop?.title) propTitle = prop.title;
					}

					const notif: AdminLiveNotification = {
						id: `notif_inq_${newInq.id}_${Date.now()}`,
						type: "new_inquiry",
						title: "New Lead Received!",
						message: `${newInq.buyer_name || "A visitor"} submitted an inquiry for ${propTitle}.`,
						inquiryId: asText(newInq.id),
						propertyTitle: propTitle,
						newStatus: "new",
						timestamp: asText(newInq.created_at) || new Date().toISOString(),
						read: false,
					};

					setAdminNotifications((prev) => [notif, ...prev.slice(0, 49)]);
					setAdminToast(notif);
					setUnreadNotifCount((prev) => prev + 1);
					playNotificationChime();

					setWorkspace((prev) => {
						const exists = prev.inquiries.some((item) => item.id === newInq.id);
						if (exists) return prev;
						return { ...prev, inquiries: [newInq, ...prev.inquiries] };
					});
				}
			)
			.subscribe();

		return () => {
			mounted = false;
			void supabaseBrowser.removeChannel(channel);
		};
	}, [sessionUser?.id]);

	function handleOpenAdminNotification(notif: AdminLiveNotification) {
		if (notif.inquiryId) {
			setActivePrimary("inquiries");
			setActiveSection("inquiries");
			setSelection((curr) => ({ ...curr, inquiries: notif.inquiryId ?? null }));
			syncAdminUrl("/admin/inquiries");
		}
		setShowNotifications(false);
		setAdminToast(null);
	}

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const stored = loadAnalyticsChatMessages(sessionUser?.id ?? null);
			const nextMessages = stored && stored.length > 0 ? stored : [createAnalyticsChatWelcomeMessage()];
			if (cancelled) return;
			setAnalyticsChatMessages((current) => {
				if (JSON.stringify(current) === JSON.stringify(nextMessages)) return current;
				return nextMessages;
			});
			setAnalyticsChatIsThinking(false);
		})();
		return () => {
			cancelled = true;
		};
	}, [sessionUser?.id]);

	useEffect(() => {
		saveAnalyticsChatMessages(analyticsChatMessages, sessionUser?.id ?? null);
	}, [analyticsChatMessages, sessionUser?.id]);

	const role = asRole(profile?.role);
	const isAdmin = role === "admin";
	const isAgent = role === "agent";
	const isDeveloper = role === "developer_partner";
	const canEditCatalog = isAdmin;
	const canEditContent = isAdmin;
	const canEditSettings = isAdmin;
	const canEditInquiries = isAdmin || isAgent || isDeveloper;
	const canReassignInquiries = isAdmin;

	const selectedPropertyId = selection.properties === NEW_RECORD_ID ? NEW_RECORD_ID : selection.properties ?? optionalId(workspace.properties[0]);
	const selectedProjectId = selection.projects === NEW_RECORD_ID ? NEW_RECORD_ID : selection.projects ?? optionalId(workspace.projects[0]);
	const selectedDeveloperId = selection.developers === NEW_RECORD_ID ? NEW_RECORD_ID : selection.developers ?? optionalId(workspace.developers[0]);
	const selectedAgentId = selection.agents === NEW_RECORD_ID ? NEW_RECORD_ID : selection.agents ?? optionalId(workspace.agents[0]);
	const selectedInquiryId = selection.inquiries ?? null;
	const selectedCareerJobId = selection.careerJobs === NEW_RECORD_ID ? NEW_RECORD_ID : selection.careerJobs ?? optionalId(workspace.careerJobs[0]);
	const selectedCareerApplicationId = selection.careerApplications ?? optionalId(workspace.careerApplications[0]);
	const selectedGalleryItem = workspace.galleryItems.find((row) => asText(row.id) === asText(selection.galleryItems)) ?? null;
	const selectedProperty = workspace.properties.find((row) => asText(row.id) === asText(selectedPropertyId)) ?? null;
	const selectedPropertyImageUrls = useMemo(
		() => selectedPropertyImages.map((image) => asText(image.storage_url).trim()).filter(Boolean),
		[selectedPropertyImages],
	);
	const dashboardSearchResults = useMemo(() => {
		const query = dashboardSearch.trim().toLowerCase();
		if (!query) return [];
		return [
			...workspace.properties.map((row) => ({ label: asText(row.title), meta: "Property", open: () => { setActivePrimary("listings"); setActiveSection("properties"); setPropertyCategoryFilter("all"); setSelection((current) => ({ ...current, properties: asText(row.id) })); syncAdminUrl("/admin/listings"); } })),
			...workspace.projects.map((row) => ({ label: asText(row.project_name ?? row.slug), meta: "Project", open: () => { setActivePrimary("listings"); setActiveSection("projects"); setSelection((current) => ({ ...current, projects: asText(row.id) })); syncAdminUrl("/admin/listings?section=projects"); } })),
			...workspace.inquiries.map((row) => ({ label: asText(row.buyer_name ?? row.buyer_email), meta: "Inquiry", open: () => { setActivePrimary("inquiries"); setActiveSection("inquiries"); setSelection((current) => ({ ...current, inquiries: asText(row.id) })); syncAdminUrl("/admin/inquiries"); } })),
		].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)).slice(0, 6);
	}, [dashboardSearch, workspace.inquiries, workspace.projects, workspace.properties]);

	function requestDestructiveAction(action: DestructiveAction) {
		setDestructiveAction(action);
		setDestructivePassword("");
		setDestructiveMessage("");
	}

	async function confirmDestructiveAction() {
		if (!destructiveAction) return;
		if (!sessionUser?.email) {
			setDestructiveMessage("Cannot verify password because the current user email is missing.");
			return;
		}
		if (!destructivePassword) {
			setDestructiveMessage("Enter your password to continue.");
			return;
		}

		setConfirmingDestructiveAction(true);
		setDestructiveMessage("Verifying password...");
		const { error } = await supabaseBrowser.auth.signInWithPassword({
			email: sessionUser.email,
			password: destructivePassword,
		});

		if (error) {
			setDestructiveMessage("Password verification failed. Nothing was deleted.");
			setConfirmingDestructiveAction(false);
			return;
		}

		setDestructiveMessage("Deleting...");
		await destructiveAction.onConfirm();
		setDestructiveAction(null);
		setDestructivePassword("");
		setDestructiveMessage("");
		setConfirmingDestructiveAction(false);
	}
	const navGroups = useMemo<CmsNavGroup[]>(() => {
		const groups: CmsNavGroup[] = [
			{
				id: "dashboard",
				label: "Dashboard",
				icon: LayoutDashboard,
				items: [{ id: "overview", label: "Overview", hint: "Counts and status", icon: Home }],
			},
			{
				id: "listings",
				label: "Listings",
				icon: Building2,
				items: [
					{ id: "properties", label: "Properties", hint: `${workspace.properties.length} listings`, icon: Building2 },
					{ id: "projects", label: "Projects", hint: `${workspace.projects.length} projects`, icon: FolderTree },
				],
			},
			{
				id: "inquiries",
				label: "Inquiries",
				icon: MessageSquare,
				items: [
					{ id: "inquiries", label: "All Inquiries", hint: `${workspace.inquiries.length} leads`, icon: MessageSquare },
					{ id: "pipeline", label: "Lead Stages", hint: "New to closed", icon: FolderTree },
					{ id: "timeline", label: "Activity History", hint: "Inquiry notes", icon: FileText },
				],
			},
		];

		if (isAdmin) {
			groups.push(
				{
					id: "analytics",
					label: "Analytics",
					icon: BarChart3,
					items: [
						{ id: "analytics", label: "Overview", hint: "Performance summary", icon: BarChart3 },
						{ id: "trafficBehavior", label: "Traffic & User Behavior", hint: "Visitors and sessions", icon: BarChart3 },
						{ id: "propertyPerformance", label: "Property Performance", hint: "Listing KPIs", icon: Building2 },
						{ id: "predictiveAnalytics", label: "Predictive Analytics", hint: "Forecasts and clusters", icon: BarChart3 },
						{ id: "userEngagement", label: "User Engagement", hint: "Funnel and actions", icon: MessageSquare },
						{ id: "agentPerformance", label: "Agent Performance", hint: "Conversion rates", icon: Users },
						{ id: "developerPortfolio", label: "Developer Portfolio", hint: "Portfolio KPIs", icon: Building2 },
					],
				},
				{
					id: "people",
					label: "People",
					icon: Users,
					items: [
						{ id: "agents", label: "Agents", hint: `${workspace.agents.length} agents`, icon: Users },
						{ id: "developers", label: "Developer Partners", hint: `${workspace.developers.length} partners`, icon: Building2 },
						{ id: "profiles", label: "Profiles & Buyers", hint: "Auth profiles", icon: UserCircle },
					],
				},
				{
					id: "content",
					label: "Content",
					icon: FileText,
					items: [
						{ id: "gallery", label: "Gallery", hint: `${workspace.galleryItems.length} items`, icon: FileText },
						{ id: "careerJobs", label: "Career Cards", hint: `${workspace.careerJobs.length} roles`, icon: BriefcaseBusiness },
						{ id: "careerApplications", label: "Applications", hint: `${workspace.careerApplications.length} received`, icon: Inbox },
						{ id: "logos", label: "Partner Logos", hint: `${workspace.partnerLogos.length} logos`, icon: Building2 },
						{ id: "stats", label: "Site Stats", hint: `${workspace.siteStats.length} counters`, icon: BarChart3 },
					],
				},
				{
					id: "settings",
					label: "System",
					icon: Settings,
					items: [
						{ id: "settings", label: "System Settings", hint: "System config", icon: Settings },
						{ id: "activityLogs", label: "Activity Logs", hint: "Audit trail", icon: FileText },
					],
				},
			);
		}

		return groups;
	}, [isAdmin, workspace.agents.length, workspace.careerApplications.length, workspace.careerJobs.length, workspace.developers.length, workspace.galleryItems.length, workspace.inquiries.length, workspace.partnerLogos.length, workspace.projects.length, workspace.properties.length, workspace.siteStats.length]);
	const navItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);
	const currentSection = navItems.some((item) => item.id === activeSection) ? activeSection : "overview";
	const activeNavItem = navItems.find((item) => item.id === currentSection);
	const activeNavGroup = navGroups.find((group) => group.id === activePrimary) ?? navGroups[0];
	const activeSidebarItems = activeNavGroup?.items ?? [];
	const analyticsOverviewItem = activeSidebarItems.find((item) => item.id === "analytics");
	const AnalyticsOverviewIcon = analyticsOverviewItem?.icon;
	const analyticsChildItems = activeSidebarItems.filter((item) => analyticsChildSections.has(item.id));
	const analyticsStandaloneItems = activeSidebarItems.filter((item) => item.id !== "analytics" && !analyticsChildSections.has(item.id));
	const isAnalyticsChildSection = analyticsChildSections.has(currentSection);
	const assistantContentOffset = isAdmin && showAnalyticsAssistant ? "xl:pr-[292px]" : "";
	const selectedPortfolioDeveloperLabel = selectedPortfolioDeveloperId
		? asText(workspace.developerPortfolio.find((row) => asText(row.developer_id) === selectedPortfolioDeveloperId)?.company_name)
			|| asText(workspace.developers.find((row) => asText(row.id) === selectedPortfolioDeveloperId)?.company_name)
		: "";
	const selectedPortfolioPropertyLabel = selectedPortfolioPropertyId
		? asText(workspace.properties.find((row) => asText(row.id) === selectedPortfolioPropertyId)?.title)
		: "";
	const visibleProperties = useMemo(() => {
		if (propertyCategoryFilter === "all") {
			return workspace.properties;
		}

		return workspace.properties.filter((property) => property.category === propertyCategoryFilter);
	}, [propertyCategoryFilter, workspace.properties]);
	const selectedCategoryLabel = propertyCategoryFilter === "all" ? "All Categories" : (propertyCategoryOptions.find((option) => option.value === propertyCategoryFilter)?.label ?? "All Categories");
	const developerOptions = useMemo(
		() => workspace.developers.map((developer) => optionFromRow(developer, asText(developer.company_name ?? developer.slug), "Unnamed developer")),
		[workspace.developers],
	);
	const projectOptions = useMemo(
		() => workspace.projects.map((project) => optionFromRow(project, `${asText(project.project_name ?? project.slug)}${project.location_city ? ` · ${project.location_city}` : ""}`, "Unnamed project", { developer_id: asText(project.developer_id) })),
		[workspace.projects],
	);
	const agentOptions = useMemo(
		() => workspace.agents.map((agent) => optionFromRow(agent, `${asText(agent.full_name ?? agent.license_number ?? agent.specialization ?? agent.profile_id)}${agent.is_top_agent ? " · Top agent" : ""}`, "Unnamed agent")),
		[workspace.agents],
	);
	const profileEmailById = useMemo(
		() => new Map(workspace.profiles.map((profile) => [asText(profile.id), asText(profile.email)])),
		[workspace.profiles],
	);
	const selectedAgentProfileEmail = useMemo(() => {
		const selectedAgent = workspace.agents.find((row) => asText(row.id) === asText(selectedAgentId));
		return selectedAgent?.profile_id ? profileEmailById.get(asText(selectedAgent.profile_id)) : undefined;
	}, [workspace.agents, selectedAgentId, profileEmailById]);
	const agentRowMeta = useCallback(
		(row: CmsRow) => {
			const email = row.profile_id ? profileEmailById.get(asText(row.profile_id)) : undefined;
			const parts = [row.license_number ? `PRC ${asText(row.license_number)}` : "no license"];
			if (email) parts.push(email);
			if (row.is_top_agent) parts.push("top agent");
			return parts.join(" • ");
		},
		[profileEmailById],
	);
	const propertyEditorFields = useMemo<FieldSpec[]>(
		() => propertyFields.map((field) => {
			if (field.name === "developer_id") return { ...field, options: developerOptions };
			if (field.name === "project_id") return { ...field, options: projectOptions };
			if (field.name === "assigned_agent_id") return { ...field, options: agentOptions };
			return field;
		}),
		[agentOptions, developerOptions, projectOptions],
	);
	const projectEditorFields = useMemo<FieldSpec[]>(
		() => projectFields.map((field) => field.name === "developer_id" ? { ...field, options: developerOptions } : field),
		[developerOptions],
	);

	function openPrimary(group: CmsNavGroup) {
		setActivePrimary(group.id);
		setActiveSection(group.items[0].id);
		syncAdminUrl(routeForPrimary(group.id));
	}

	function openSection(section: CmsSection) {
		setActiveSection(section);
		syncAdminUrl(routeForSection(section));
	}

	function openPropertyCategory(category: string) {
		setActivePrimary("listings");
		setActiveSection("properties");
		setPropertyCategoryFilter(category);
		setSelection((current) => ({ ...current, properties: null }));
		syncAdminUrl(category === "all" ? "/admin/listings" : `/admin/listings?category=${category}`);
	}

	function openPropertyForEditing(propertyId: string) {
		setActivePrimary("listings");
		setActiveSection("properties");
		setPropertyCategoryFilter("all");
		setSelection((current) => ({ ...current, properties: propertyId }));
		syncAdminUrl("/admin/listings");
	}

	function handleAnalyticsChatAction(actionId: string) {
		switch (actionId) {
			case "navigate_high_priority":
			case "navigate_inquiries":
				openSection("inquiries");
				break;
			case "navigate_listings":
				openSection("properties");
				break;
			case "navigate_developers":
				openSection("developers");
				break;
			case "navigate_analytics":
				openSection("analytics");
				break;
			case "export_inquiries":
				downloadCsv("jewellz-inquiries.csv", workspace.inquiries, ["id", "buyer_name", "buyer_email", "buyer_phone", "status", "priority", "lead_score", "source", "created_at"]);
				break;
			case "export_listings":
				downloadCsv("jewellz-listing-performance.csv", workspace.listingPerformance, ["property_id", "title", "total_views", "detail_opens", "total_interactions", "avg_dwell_seconds", "total_inquiries", "inquiry_rate_pct"]);
				break;
			case "export_agents":
				downloadCsv("jewellz-agent-performance.csv", workspace.agentPerformance, ["agent_id", "agent_name", "total_assigned", "conversions", "conversion_rate_pct", "avg_response_time_hours"]);
				break;
			case "refresh_data":
				void reloadWorkspace();
				break;
		}
	}

	async function loadWorkspace(currentUser: User, currentProfile: CmsRow, currentAgent: CmsRow | null, currentDeveloper: CmsRow | null) {
		const agentId = currentAgent?.id ?? null;
		const developerId = currentDeveloper?.id ?? null;
		const activeRole = asRole(currentProfile?.role);
		const activeIsAdmin = activeRole === "admin";
		const activeIsAgent = activeRole === "agent";
		const activeIsDeveloper = activeRole === "developer_partner";

		const propertyQuery = activeIsAgent && agentId
			? supabaseBrowser.from("properties").select("*").eq("assigned_agent_id", agentId).order("created_at", { ascending: false })
			: activeIsDeveloper && developerId
				? supabaseBrowser.from("properties").select("*").eq("developer_id", developerId).order("created_at", { ascending: false })
				: supabaseBrowser.from("properties").select("*").order("created_at", { ascending: false });

		const projectQuery = activeIsDeveloper && developerId
			? supabaseBrowser.from("projects").select("*").eq("developer_id", developerId).order("created_at", { ascending: false })
			: supabaseBrowser.from("projects").select("*").order("created_at", { ascending: false });

		const inquiryQuery = activeIsAgent && agentId
			? supabaseBrowser.from("inquiries").select("*").eq("assigned_agent_id", agentId).order("created_at", { ascending: false })
			: activeIsDeveloper && developerId
				? supabaseBrowser.from("inquiries").select("*").eq("developer_id", developerId).order("created_at", { ascending: false })
				: supabaseBrowser.from("inquiries").select("*").order("created_at", { ascending: false });

		const [propertiesResult, projectsResult, inquiriesResult] = await Promise.all([propertyQuery, projectQuery, inquiryQuery]);

		const nextWorkspace: Workspace = {
			...emptyWorkspace,
			properties: propertiesResult.data ?? [],
			projects: projectsResult.data ?? [],
			inquiries: inquiriesResult.data ?? [],
		};

		if (activeIsAdmin) {
			const [
				developersResult,
				agentsResult,
				galleryResult,
				careerJobsResult,
				careerApplicationsResult,
				partnerLogosResult,
				siteStatsResult,
				settingsResult,
				listingPerformanceResult,
				dailyInquiryVolumeResult,
				trafficSourcesResult,
				agentPerformanceResult,
				developerPortfolioResult,
				recommendationsResult,
				engagementEventsResult,
				sessionsResult,
				profilesResult,
				activityLogsResult,
			] = await Promise.all([
				supabaseBrowser.from("developer_partners").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("agents").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("gallery_items").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("career_jobs").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("career_applications").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("partner_logos").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("site_stats").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("system_settings").select("*").order("updated_at", { ascending: false }),
				supabaseBrowser.from("mv_listing_performance").select("*"),
				supabaseBrowser.from("mv_daily_inquiry_volume").select("*"),
				supabaseBrowser.from("mv_traffic_sources").select("*"),
				supabaseBrowser.from("mv_agent_performance").select("*"),
				supabaseBrowser.from("mv_developer_portfolio").select("*"),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at"),
				supabaseBrowser.from("analytics_events").select("id, event_type, session_id, created_at").order("created_at", { ascending: false }).limit(1000),
				supabaseBrowser.from("sessions").select("id, anonymous_visitor_id, page_view_count, started_at, last_seen_at").order("last_seen_at", { ascending: false }).limit(2000),
				supabaseBrowser.from("profiles").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
			]);

			nextWorkspace.developers = developersResult.data ?? [];
			nextWorkspace.agents = agentsResult.data ?? [];
			nextWorkspace.galleryItems = galleryResult.data ?? [];
			nextWorkspace.careerJobs = careerJobsResult.data ?? [];
			nextWorkspace.careerApplications = careerApplicationsResult.data ?? [];
			nextWorkspace.partnerLogos = partnerLogosResult.data ?? [];
			nextWorkspace.siteStats = siteStatsResult.data ?? [];
			nextWorkspace.settings = settingsResult.data ?? [];
			nextWorkspace.listingPerformance = listingPerformanceResult.data ?? [];
			nextWorkspace.dailyInquiryVolume = dailyInquiryVolumeResult.data ?? [];
			nextWorkspace.trafficSources = trafficSourcesResult.data ?? [];
			nextWorkspace.agentPerformance = agentPerformanceResult.data ?? [];
			nextWorkspace.developerPortfolio = developerPortfolioResult.data ?? [];
			nextWorkspace.recommendations = recommendationsResult.data ?? [];
			nextWorkspace.engagementEvents = engagementEventsResult.data ?? [];
			nextWorkspace.sessions = sessionsResult.data ?? [];
			nextWorkspace.profiles = profilesResult.data ?? [];
			nextWorkspace.activityLogs = activityLogsResult.data ?? [];
		} else if (activeIsDeveloper && developerId) {
			const [developerResult, recommendationsResult] = await Promise.all([
				supabaseBrowser.from("developer_partners").select("*").eq("id", developerId).maybeSingle(),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at").eq("buyer_id", currentUser?.id),
			]);
			setDeveloperProfile(developerResult.data ?? null);
			nextWorkspace.recommendations = recommendationsResult.data ?? [];
		} else if (activeIsAgent && agentId) {
			const [agentResult, recommendationsResult] = await Promise.all([
				supabaseBrowser.from("agents").select("*").eq("id", agentId).maybeSingle(),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at").eq("buyer_id", currentUser?.id),
			]);
			setAgentProfile(agentResult.data ?? null);
			nextWorkspace.recommendations = recommendationsResult.data ?? [];
		}

		setWorkspace(nextWorkspace);
		adminWorkspaceSnapshot = {
			userId: currentUser.id,
			sessionUser: currentUser,
			profile: currentProfile,
			agentProfile: currentAgent,
			developerProfile: currentDeveloper,
			workspace: nextWorkspace,
		};
		setTimeout(() => setMessage(""), 2000);
	}

	async function reloadWorkspace() {
		if (!sessionUser || !profile) return;
		setIsRefreshingWorkspace(true);
		setMessage("Syncing...");
		try {
			await loadWorkspace(sessionUser, profile, agentProfile, developerProfile);
		} finally {
			setIsRefreshingWorkspace(false);
			setTimeout(() => setMessage(""), 2000);
		}
	}

	async function loadPropertyImages(propertyId: string | null) {
		if (!propertyId) {
			setSelectedPropertyImages([]);
			return;
		}

		const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
		setSelectedPropertyImages(data ?? []);
	}

	useEffect(() => {
		const propertyId = !selectedPropertyId || selectedPropertyId === NEW_RECORD_ID ? null : asText(selectedPropertyId);
		const timer = window.setTimeout(() => {
			void loadPropertyImages(propertyId);
		}, 0);
		return () => window.clearTimeout(timer);
	}, [selectedPropertyId]);

	useEffect(() => {
		let active = true;
		void (async () => {
			try {
			const { data: sessionResult } = await supabaseBrowser.auth.getSession();
			const user = sessionResult.session?.user ?? null;

			if (!user) {
				if (active) {
					adminWorkspaceSnapshot = null;
					setSessionUser(null);
					setProfile(null);
					setLoading(false);
					setMessage("Sign in to open the CMS.");
				}
				return;
			}

			const { data: profileResult } = await supabaseBrowser.from("profiles").select("*").eq("id", user.id).maybeSingle();
			if (!profileResult) {
				if (active) {
					adminWorkspaceSnapshot = null;
					setSessionUser(user);
					setProfile(null);
					setLoading(false);
					setMessage("No profile row found for the current auth user.");
				}
				return;
			}

			if (profileResult.role !== "admin") {
				if (active) {
					adminWorkspaceSnapshot = null;
					setLoading(false);
					router.replace("/login?next=/admin");
				}
				return;
			}

			let currentAgent = null;
			let currentDeveloper = null;
			if (profileResult.role === "agent") {
				const { data } = await supabaseBrowser.from("agents").select("*").eq("profile_id", user.id).maybeSingle();
				currentAgent = data ?? null;
			}
			if (profileResult.role === "developer_partner") {
				const { data } = await supabaseBrowser.from("developer_partners").select("*").eq("profile_id", user.id).maybeSingle();
				currentDeveloper = data ?? null;
			}

			if (!active) return;
			if (adminWorkspaceSnapshot && adminWorkspaceSnapshot.userId !== user.id) {
				adminWorkspaceSnapshot = null;
				setWorkspace(emptyWorkspace);
				setLoading(true);
			}
			setSessionUser(user);
			setProfile(profileResult);
			setAgentProfile(currentAgent);
			setDeveloperProfile(currentDeveloper);
			await loadWorkspace(user, profileResult, currentAgent, currentDeveloper);
			if (active) {
				setLoading(false);
				setMessage("");
			}
			} finally {
				if (active) setAuthChecked(true);
			}
		})();

		return () => {
			active = false;
		};
	}, []);

	// Browser back/forward walks through the section history entries without
	// remounting the CMS, so apply the URL's section to the local state.
	useEffect(() => {
		function handlePopState() {
			const target = adminSectionFromLocation();
			if (!target) return;
			setActivePrimary(target.primary);
			setActiveSection(target.section);
			setPropertyCategoryFilter(target.category);
		}

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	// Real-time synchronization for Admin Inquiry Pipeline
	useEffect(() => {
		if (!sessionUser) return;
		let mounted = true;

		// 1. Supabase Realtime channel for live inquiry pipeline updates
		const channel = supabaseBrowser
			.channel("admin_inquiries_pipeline_realtime")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "inquiries",
				},
				(payload) => {
					if (!mounted) return;
					const newRow = payload.new as CmsRow;
					if (payload.eventType === "INSERT") {
						setWorkspace((prev) => ({
							...prev,
							inquiries: [newRow, ...prev.inquiries.filter((i) => asText(i.id) !== asText(newRow.id))],
						}));
					} else if (payload.eventType === "UPDATE") {
						setWorkspace((prev) => ({
							...prev,
							inquiries: prev.inquiries.map((i) =>
								asText(i.id) === asText(newRow.id) ? { ...i, ...newRow } : i
							),
						}));
					} else if (payload.eventType === "DELETE") {
						const oldRow = payload.old as CmsRow;
						setWorkspace((prev) => ({
							...prev,
							inquiries: prev.inquiries.filter((i) => asText(i.id) !== asText(oldRow.id)),
						}));
					}
				}
			)
			.subscribe();

		// 2. Periodic background polling every 15s to keep all admin views synchronized
		const syncInterval = setInterval(async () => {
			if (!mounted) return;
			const { data: latestInquiries } = await supabaseBrowser
				.from("inquiries")
				.select("*")
				.order("created_at", { ascending: false });

			if (latestInquiries && Array.isArray(latestInquiries) && mounted) {
				setWorkspace((prev) => {
					const currentSignature = prev.inquiries
						.map((i) => `${asText(i.id)}_${asText(i.status)}_${asText(i.assigned_agent_id)}_${asText(i.last_activity_at)}`)
						.join(",");
					const newSignature = latestInquiries
						.map((i) => `${asText(i.id)}_${asText(i.status)}_${asText(i.assigned_agent_id)}_${asText(i.last_activity_at)}`)
						.join(",");
					if (currentSignature === newSignature) return prev;
					return {
						...prev,
						inquiries: latestInquiries as CmsRow[],
					};
				});
			}
		}, 15000);

		return () => {
			mounted = false;
			void supabaseBrowser.removeChannel(channel);
			clearInterval(syncInterval);
		};
	}, [sessionUser?.id]);

	const activityCountsByDate = useMemo(() => {
		const map: Record<string, { inquiries: number; events: number; logs: number }> = {};
		const touch = (iso: string) => {
			if (!map[iso]) map[iso] = { inquiries: 0, events: 0, logs: 0 };
			return map[iso];
		};
		for (const inquiry of workspace.inquiries) {
			const dateStr = asText(inquiry.created_at).slice(0, 10);
			if (dateStr && dateStr.length === 10) {
				touch(dateStr).inquiries += 1;
			}
		}
		for (const event of workspace.engagementEvents) {
			const dateStr = asText(event.created_at).slice(0, 10);
			if (dateStr && dateStr.length === 10) {
				touch(dateStr).events += 1;
			}
		}
		for (const log of workspace.activityLogs) {
			const dateStr = asText(log.created_at ?? log.occurred_at).slice(0, 10);
			if (dateStr && dateStr.length === 10) {
				touch(dateStr).logs += 1;
			}
		}
		return map;
	}, [workspace.inquiries, workspace.engagementEvents, workspace.activityLogs]);

	const filteredInquiries = useMemo(() => {
		if (!selectedDateFilter) return workspace.inquiries;
		return workspace.inquiries.filter((item) => asText(item.created_at).slice(0, 10) === selectedDateFilter);
	}, [workspace.inquiries, selectedDateFilter]);

	const filteredEngagementEvents = useMemo(() => {
		if (!selectedDateFilter) return workspace.engagementEvents;
		return workspace.engagementEvents.filter((item) => asText(item.created_at).slice(0, 10) === selectedDateFilter);
	}, [workspace.engagementEvents, selectedDateFilter]);

	const filteredActivityLogs = useMemo(() => {
		if (!selectedDateFilter) return workspace.activityLogs;
		return workspace.activityLogs.filter((item) => asText(item.created_at ?? item.occurred_at).slice(0, 10) === selectedDateFilter);
	}, [workspace.activityLogs, selectedDateFilter]);

	const stats = useMemo(() => ({
		propertyCount: workspace.properties.length,
		inquiryCount: filteredInquiries.length,
		projectCount: workspace.projects.length,
		developerCount: workspace.developers.length,
		agentCount: workspace.agents.length,
		publishedCount: workspace.properties.filter((item) => item.status === "published").length,
		closedCount: filteredInquiries.filter((item) => ["reserved", "closed_won"].includes(asText(item.status))).length,
	}), [filteredInquiries, workspace.agents.length, workspace.developers.length, workspace.properties, workspace.projects.length]);
	const urgentLeads = useMemo(
		() => filteredInquiries
			.filter((item) => !["reserved", "closed_won", "closed_lost"].includes(asText(item.status)))
			.filter((item) => asText(item.priority) === "high" || (toNullableNumber(item.lead_score) ?? 0) >= 0.72 || (!item.first_contacted_at && (hoursSince(item.created_at) ?? 0) >= 24))
			.sort((first, second) => (toNullableNumber(second.lead_score) ?? 0) - (toNullableNumber(first.lead_score) ?? 0))
			.slice(0, 5),
		[filteredInquiries],
	);
	const unassignedLeads = useMemo(
		() => filteredInquiries.filter((item) => !asText(item.assigned_agent_id) && !["reserved", "closed_won", "closed_lost"].includes(asText(item.status))).slice(0, 5),
		[filteredInquiries],
	);
	const draftListings = useMemo(
		() => workspace.properties.filter((item) => asText(item.status || "draft") === "draft").slice(0, 5),
		[workspace.properties],
	);
	const lowPerformingListings = useMemo(
		() => workspace.listingPerformance
			.filter((item) => (toNullableNumber(item.total_views) ?? 0) >= 5 && (toNullableNumber(item.inquiry_rate_pct) ?? 0) < 2)
			.slice(0, 5),
		[workspace.listingPerformance],
	);
	const overviewInquiryTrend = useMemo(
		() => {
			if (selectedDateFilter) {
				const relevant = workspace.dailyInquiryVolume.filter((row) => asText(row.inquiry_date) <= selectedDateFilter);
				const rowsToUse = relevant.length ? relevant.slice(-8) : workspace.dailyInquiryVolume.slice(-8);
				return rowsToUse.map((row) => ({
					label: asText(row.inquiry_date).slice(5) || "day",
					value: toNullableNumber(row.total_inquiries) ?? 0,
				}));
			}
			return workspace.dailyInquiryVolume
				.slice()
				.reverse()
				.slice(-8)
				.map((row) => ({
					label: asText(row.inquiry_date).slice(5) || "day",
					value: toNullableNumber(row.total_inquiries) ?? 0,
				}));
		},
		[workspace.dailyInquiryVolume, selectedDateFilter],
	);
	const overviewPipelineRows = useMemo(() => {
		const counts = filteredInquiries.reduce((acc: Record<string, number>, inquiry) => {
			const status = asText(inquiry.status || "new");
			acc[status] = (acc[status] ?? 0) + 1;
			return acc;
		}, {});
		return Object.entries(counts).map(([label, value]) => ({ label, value }));
	}, [filteredInquiries]);
	const recentOverviewInquiries = useMemo(
		() => filteredInquiries
			.slice()
			.sort((first, second) => new Date(asText(second.created_at)).getTime() - new Date(asText(first.created_at)).getTime())
			.slice(0, 5),
		[filteredInquiries],
	);
	const listingPreviewRows = useMemo(
		() => workspace.listingPerformance
			.slice(0, 4)
			.map((row) => ({
				title: asText(row.title || "Untitled listing"),
				views: toNullableNumber(row.total_views) ?? 0,
				rate: toNullableNumber(row.inquiry_rate_pct) ?? 0,
			})),
		[workspace.listingPerformance],
	);
	function openInquiryForEditing(inquiryId: string) {
		setActivePrimary("inquiries");
		setActiveSection("inquiries");
		setSelection((current) => ({ ...current, inquiries: inquiryId }));
		syncAdminUrl("/admin/inquiries");
	}

	async function saveEntity(table: string, payload: CmsPayload, currentRow: CmsRow | null, idKey = "id") {
		setMessage(`Saving ${table}...`);
		setSaving(true);

		const recordLabel = labelForRow(payload as CmsRow);
		const result = currentRow ? await supabaseBrowser.from(table).update(payload).eq(idKey, currentRow[idKey]) : await supabaseBrowser.from(table).insert(payload);
		if (result.error) {
			setMessage(result.error.message);
			setActionToast({
				tone: "error",
				title: "Could not save changes",
				message: result.error.message,
			});
			setSaving(false);
			return false;
		}

		setSaving(false);
		await reloadWorkspace();
		if (!(table === "properties" && !currentRow)) {
			setActionToast({
				tone: "success",
				title: currentRow ? "Changes saved" : "Record created",
				message: `${recordLabel} ${currentRow ? "updated" : "created"} successfully.`,
			});
		}
		return true;
	}

	async function deleteEntity(table: string, currentRow: CmsRow, idKey = "id") {
		if (!currentRow) return;
		requestDestructiveAction({
			title: `Delete ${labelForRow(currentRow)}?`,
			description: `This will permanently delete this record from ${table}. This action cannot be undone.`,
			confirmLabel: "Verify password and delete",
			onConfirm: async () => {
				setMessage(`Deleting from ${table}...`);
				setSaving(true);
				if (table === "agents") {
					const { data } = await supabaseBrowser.auth.getSession();
					const token = data.session?.access_token;
					const response = await fetch("/api/admin/agents", {
						method: "DELETE",
						headers: {
							"Content-Type": "application/json",
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
						credentials: "same-origin",
						body: JSON.stringify({ id: currentRow.id, profileId: currentRow.profile_id }),
					});
					const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
					if (!response.ok || !payload?.ok) {
						setMessage(payload?.error ?? "Unable to delete the agent account.");
						setSaving(false);
						return;
					}
				} else if (table === "developer_partners") {
					const { data } = await supabaseBrowser.auth.getSession();
					const token = data.session?.access_token;
					const response = await fetch("/api/admin/developers", {
						method: "DELETE",
						headers: {
							"Content-Type": "application/json",
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
						credentials: "same-origin",
						body: JSON.stringify({ id: currentRow.id }),
					});
					const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
					if (!response.ok || !payload?.ok) {
						const result = await supabaseBrowser.from(table).delete().eq(idKey, currentRow[idKey]);
						if (result.error) {
							setMessage(result.error.message);
							setSaving(false);
							return;
						}
					}
				} else {
					const result = await supabaseBrowser.from(table).delete().eq(idKey, currentRow[idKey]);
					if (result.error) {
						setMessage(result.error.message);
						setSaving(false);
						return;
					}
				}
				setSaving(false);
				await reloadWorkspace();
			},
		});
	}

	function updateStagedPhoto(id: string, patch: Partial<StagedPhoto>) {
		setStagedPhotos((previous) =>
			previous.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)),
		);
	}

	async function uploadStagedPhoto(photo: StagedPhoto) {
		stagedUploadControllers.current[photo.id]?.abort();
		const controller = new AbortController();
		stagedUploadControllers.current[photo.id] = controller;
		updateStagedPhoto(photo.id, { status: "uploading", progress: 0, error: undefined });

		try {
			const extension = photo.file.name.includes(".") ? photo.file.name.split(".").pop() : "jpg";
			const baseName = sanitizeFileName(photo.file.name.replace(/\.[^.]+$/, "")) || "property-image";
			const storagePath = `staged/${photo.id}-${baseName}.${extension}`;

			const result = await uploadFileWithProgress({
				bucket: PROPERTY_IMAGE_BUCKET,
				path: storagePath,
				file: photo.file,
				contentType: photo.file.type || "image/jpeg",
				signal: controller.signal,
				onProgress: ({ percent }) => updateStagedPhoto(photo.id, { progress: percent }),
			});

			if (controller.signal.aborted) {
				await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove([result.path]);
				return;
			}

			updateStagedPhoto(photo.id, {
				status: "done",
				progress: 100,
				storageUrl: result.publicUrl,
				storagePath: result.path,
				error: undefined,
			});
		} catch (error) {
			if (
				error instanceof UploadCancelledError ||
				(error instanceof Error && error.name === "AbortError")
			) {
				return;
			}
			updateStagedPhoto(photo.id, {
				status: "error",
				error: error instanceof Error ? error.message : "Photo upload failed.",
			});
		} finally {
			delete stagedUploadControllers.current[photo.id];
		}
	}

	function addStagedPhotos(files: File[]) {
		const photos: StagedPhoto[] = files.map((file) => ({
			id: newStagedPhotoId(),
			file,
			previewUrl: URL.createObjectURL(file),
			status: "uploading",
			progress: 0,
			storageUrl: null,
			storagePath: null,
		}));
		setStagedPhotos((previous) => [...previous, ...photos]);
		for (const photo of photos) void uploadStagedPhoto(photo);
	}

	function removeStagedPhoto(photo: StagedPhoto) {
		stagedUploadControllers.current[photo.id]?.abort();
		delete stagedUploadControllers.current[photo.id];
		URL.revokeObjectURL(photo.previewUrl);
		if (photo.storagePath) {
			void supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove([photo.storagePath]);
		}
		setStagedPhotos((previous) => previous.filter((item) => item.id !== photo.id));
	}

	function clearStagedPhotos() {
		Object.values(stagedUploadControllers.current).forEach((controller) => controller.abort());
		stagedUploadControllers.current = {};
		const stagedPaths = stagedPhotos
			.map((photo) => photo.storagePath)
			.filter((path): path is string => Boolean(path));
		if (stagedPaths.length > 0) {
			void supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove(stagedPaths);
		}
		stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
		setStagedPhotos([]);
	}

	async function saveProperty(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.developer_id) {
			setMessage("Choose a Developer Partner first. If none exists, create one under People → Developer Partners.");
			return false;
		}
		if (!payload.title || !payload.slug || !payload.address || !payload.city || !payload.province) {
			setMessage("Property records need title, slug, address, city, and province.");
			return false;
		}

		// Auto-resolve coordinates from address if not manually set
		let lat = Number(payload.latitude);
		let lng = Number(payload.longitude);
		let finalLat = Number.isFinite(lat) && lat !== 0 ? lat : null;
		let finalLng = Number.isFinite(lng) && lng !== 0 ? lng : null;

		if (finalLat == null || finalLng == null) {
			setMessage("Resolving map coordinates from address...");
			try {
				const query = [payload.address, payload.city, payload.province, "Philippines"].filter(Boolean).join(", ");
				const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
					headers: { "User-Agent": "JewellzRealty/1.0" },
				});
				if (res.ok) {
					const data = (await res.json()) as { lat?: string; lon?: string }[];
					if (data[0]?.lat && data[0]?.lon) {
						finalLat = Number(Number(data[0].lat).toFixed(6));
						finalLng = Number(Number(data[0].lon).toFixed(6));
						payload.latitude = finalLat;
						payload.longitude = finalLng;
					}
				}
			} catch (err) {
				console.warn("Auto-geocoding property failed:", err);
			}
		}

		if (payload.status === "published" && !payload.published_at) {
			payload.published_at = new Date().toISOString();
		}

		if (sessionUser?.id) {
			payload.updated_by = sessionUser.id;
			if (!currentRow) payload.created_by = sessionUser.id;
		}

		const success = await saveEntity("properties", payload, currentRow);
		if (!success) return false;

		let propertyId: string | null = currentRow ? String(currentRow.id) : null;
		let attachedCount = 0;

		if (!currentRow) {
			const { data: insertedProp } = await supabaseBrowser
				.from("properties")
				.select("id")
				.eq("slug", payload.slug)
				.maybeSingle();
			propertyId = insertedProp?.id ? String(insertedProp.id) : null;
		}

		// Photos are uploaded to temporary storage as soon as they are selected.
		// After the property row exists, move them into the property folder and
		// create the property_images rows.
		if (!currentRow && propertyId && stagedPhotos.length > 0) {
			const pid = propertyId;
			const photosToAttach = stagedPhotos.filter(
				(photo) => photo.status === "done" && photo.storageUrl,
			);

			if (photosToAttach.length > 0) {
				setMessage(`Attaching ${photosToAttach.length} uploaded photo${photosToAttach.length === 1 ? "" : "s"}...`);
			}

			for (const photo of photosToAttach) {
				const extension = photo.file.name.includes(".") ? photo.file.name.split(".").pop() : "jpg";
				const baseName = sanitizeFileName(photo.file.name.replace(/\.[^.]+$/, "")) || "property-image";
				const targetPath = `${pid}/${Date.now()}-${attachedCount}-${baseName}.${extension}`;
				let publicUrl = photo.storageUrl as string;

				if (photo.storagePath) {
					const { error: moveError } = await supabaseBrowser.storage
						.from(PROPERTY_IMAGE_BUCKET)
						.move(photo.storagePath, targetPath);
					if (moveError) {
						console.warn("Could not move staged photo into the property folder:", moveError.message);
					} else {
						publicUrl = supabaseBrowser.storage
							.from(PROPERTY_IMAGE_BUCKET)
							.getPublicUrl(targetPath).data.publicUrl;
					}
				}

				const isCover = attachedCount === 0;
				const { error: insertError } = await supabaseBrowser.from("property_images").insert({
					property_id: pid,
					storage_url: publicUrl,
					caption: photo.file.name.replace(/\.[^.]+$/, ""),
					sort_order: attachedCount,
					is_cover: isCover,
				});
				if (insertError) {
					setMessage(`Photo attach failed: ${insertError.message}`);
					continue;
				}
				if (isCover) {
					await supabaseBrowser.from("properties").update({ cover_image_url: publicUrl }).eq("id", pid);
				}
				attachedCount += 1;
			}

			stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
			setStagedPhotos([]);
			await reloadWorkspace();
		}

		if (!currentRow) {
			if (propertyId) {
				setSelection((current) => ({ ...current, properties: propertyId }));
				syncAdminUrl(`/admin/listings/${propertyId}`);
			}
			setCreatedListingToast({
				propertyId,
				title: asText(payload.title) || "Untitled property",
				slug: asText(payload.slug),
				status: asText(payload.status) || "draft",
				photoCount: attachedCount,
			});
			setMessage(
				attachedCount > 0
					? `Property created with ${attachedCount} photo${attachedCount === 1 ? "" : "s"}!`
					: "Property created successfully.",
			);
		} else {
			setMessage("Property saved successfully.");
			setActionToast({
				tone: "success",
				title: "Changes saved",
				message: "Property details updated successfully.",
				href: payload.status === "published" && asText(payload.slug) ? `/project-list/${encodeURIComponent(asText(payload.slug))}` : undefined,
				hrefLabel: "View on website",
			});
		}

		if (finalLat != null && finalLng != null && propertyId) {
			setMessage("Property saved! Pre-warming nearby places in cache...");
			fetch(`/api/nearby?lat=${finalLat}&lng=${finalLng}&propertyId=${encodeURIComponent(String(propertyId))}&type=${encodeURIComponent(String(payload.category ?? ""))}`)
				.then(() => setMessage("Property saved and nearby cache ready!"))
				.catch(() => {});
		}

		return true;
	}

	async function saveProject(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.developer_id || !payload.project_name || !payload.slug) {
			setMessage("Projects need a Developer Partner, Project Name, and Slug.");
			return;
		}
		await saveEntity("projects", payload, currentRow);
	}

	async function saveDeveloper(payload: CmsPayload, currentRow: CmsRow | null) {
		const companyName = asText(payload.company_name).trim();
		if (!companyName) {
			setMessage("Developer partners need a company name.");
			return;
		}
		if (!asText(payload.slug).trim()) {
			payload.slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
		}

		setMessage("Saving developer partner...");
		setSaving(true);

		// First try direct saveEntity via client
		const directSuccess = await saveEntity("developer_partners", payload, currentRow);
		if (directSuccess) return;

		// Fallback to server API which uses service-role supabaseServer to bypass client RLS issues
		try {
			const { data } = await supabaseBrowser.auth.getSession();
			const token = data.session?.access_token;
			const response = await fetch("/api/admin/developers", {
				method: currentRow ? "PATCH" : "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: "same-origin",
				body: JSON.stringify(
					currentRow
						? {
								id: currentRow.id,
								company_name: payload.company_name,
								slug: payload.slug,
								logo_url: payload.logo_url,
								website_url: payload.website_url,
								contact_email: payload.contact_email,
								contact_phone: payload.contact_phone,
								description: payload.description,
								is_active: payload.is_active,
						  }
						: {
								company_name: payload.company_name,
								slug: payload.slug,
								logo_url: payload.logo_url,
								website_url: payload.website_url,
								contact_email: payload.contact_email,
								contact_phone: payload.contact_phone,
								description: payload.description,
								is_active: payload.is_active,
						  }
				),
			});

			const resJson = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (response.ok && resJson?.ok) {
				setMessage("Developer partner saved successfully.");
				setSaving(false);
				await reloadWorkspace();
				return;
			} else if (resJson?.error) {
				setMessage(resJson.error);
			}
		} catch (err) {
			console.error("Developer fallback failed", err);
		}
		setSaving(false);
	}

	async function saveAgent(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!currentRow && !payload.profile_id) {
			setMessage("Agents need a profile_id linked to auth.users. Use the Register Agent form above to create a new agent.");
			return;
		}
		const savedOk = await saveEntity("agents", payload, currentRow);
		if (savedOk !== false) {
			// Sync profiles.avatar_url so the agent portal sidebar and preview reflect the new photo immediately.
			const targetProfileId = String(payload.profile_id ?? currentRow?.profile_id ?? "");
			if (targetProfileId) {
				try {
					const profileSync: Record<string, unknown> = {};
					if (payload.full_name) profileSync.full_name = payload.full_name;
					if ("photo_url" in payload) profileSync.avatar_url = payload.photo_url ?? null;
					if (Object.keys(profileSync).length > 0) {
						await supabaseBrowser.from("profiles").update(profileSync).eq("id", targetProfileId);
					}
				} catch (err) {
					console.error("Profile sync for agent photo failed:", err);
				}
			}
		}
	}

	async function saveGalleryItem(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.section || !payload.title || !payload.image_url) {
			setMessage("Gallery items need section, title, and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("gallery_items", payload, currentRow);
	}

	async function saveCareerJob(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.title || !payload.description) {
			setMessage("Career cards need title and description.");
			return;
		}
		await saveEntity("career_jobs", payload, currentRow);
	}

	async function saveCareerApplication(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!currentRow) {
			setMessage("Applications are created from the public Careers page. Select an existing application to update its status or notes.");
			return;
		}
		await saveEntity("career_applications", payload, currentRow);
	}

	async function savePartnerLogo(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.name || !payload.logo_url) {
			setMessage("Partner logos need name and logo_url.");
			return;
		}
		await saveEntity("partner_logos", payload, currentRow);
	}

	async function saveSiteStat(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.key || !payload.label) {
			setMessage("Site stats need key and label.");
			return;
		}
		await saveEntity("site_stats", payload, currentRow, "key");
	}

	async function saveSetting(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.key || payload.value == null) {
			setMessage("Settings need key and value.");
			return;
		}
		if (sessionUser?.id) payload.updated_by = sessionUser.id;
		await saveEntity("system_settings", payload, currentRow, "key");
	}

	if (!loading && (!sessionUser || !profile)) {
		return (
			<main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-[#0f172a]">
				<div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm text-center">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-50 border border-black/10 shadow-xs mb-4">
						<Image src="/assets/logo-icon.png" alt="Jewellz Realty" width={36} height={36} className="h-9 w-9 object-contain" />
					</div>
					<div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/45">Jewellz Realty Portal</div>
					<h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111111]">Sign In Required</h1>
					<p className="mt-2 text-xs leading-relaxed text-black/55">
						Your session has expired or authentication is required to access the executive workspace.
					</p>
					<button
						type="button"
						onClick={() => router.push("/login?next=/admin")}
						className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-black/85"
					>
						Go to Portal Login
					</button>
				</div>
			</main>
		);
	}

	if (role === "buyer") {
		return <main className="min-h-screen bg-white px-6 py-10 text-[#111111]"><div className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-zinc-50 p-8 text-sm text-black/60">Buyer accounts do not have CMS access.</div></main>;
	}

	return (
		<main className="portal-canvas min-h-screen bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(222,20,28,0.035),rgba(248,250,252,1))] text-[#111111] selection:bg-[#DE141C]/15">
			<div className={`grid min-h-screen w-full transition-[grid-template-columns] duration-200 ${showSecondarySidebar ? "lg:grid-cols-[56px_220px_1fr]" : "lg:grid-cols-[56px_0px_1fr]"}`}>
				<aside className="portal-sidebar hidden border-r py-3 shadow-[1px_0_3px_rgba(15,23,42,0.02)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-black/10 transition hover:ring-black/20">
							<Image src="/assets/logo-icon.png" alt="Jewellz Realty" width={32} height={32} className="h-8 w-8 object-contain" />
						</div>
						<div className="flex flex-col gap-2">
							{navGroups.map((group) => {
								const Icon = group.icon;
								const active = activePrimary === group.id;
								return (
									<button
										key={group.id}
										type="button"
										onClick={() => openPrimary(group)}
										className={`flex h-9 w-9 items-center justify-center rounded-lg transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${active ? "bg-[#111111] text-white shadow-2xs" : "text-zinc-500 hover:bg-zinc-100 hover:text-[#111111]"}`}
										title={group.label}
									>
										<Icon className="h-4 w-4" />
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<button type="button" onClick={() => void reloadWorkspace()} disabled={isRefreshingWorkspace} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-100 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50" title="Refresh">
							<RefreshCw className={`h-4 w-4 ${isRefreshingWorkspace ? "animate-spin" : ""}`} />
						</button>
						<button type="button" onClick={async () => { clearAnalyticsChatMessages(sessionUser?.id ?? null); adminWorkspaceSnapshot = null; await supabaseBrowser.auth.signOut(); window.location.href = "/"; }} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-red-50 hover:text-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" title="Sign out">
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</aside>

				<aside className={`portal-sidebar ${showSecondarySidebar ? "block" : "hidden lg:block lg:w-0 lg:overflow-hidden"} border-b transition-[width] duration-200 shadow-[1px_0_3px_rgba(15,23,42,0.02)] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r`}>
					<nav className="max-h-[calc(100vh-150px)] overflow-auto px-2 py-3">
						<div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{activeNavGroup?.label ?? "Dashboard"}</div>
						<div className="space-y-1">
							{activePrimary === "analytics" && analyticsOverviewItem && AnalyticsOverviewIcon ? (
								<div>
									<button
										type="button"
										onClick={() => openSection(analyticsOverviewItem.id)}
										className={`relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${currentSection === analyticsOverviewItem.id || isAnalyticsChildSection ? "bg-white text-[#111111] shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#DE141C]" : "text-zinc-600 hover:bg-white hover:text-[#111111]"}`}
									>
										<AnalyticsOverviewIcon className="h-4 w-4 shrink-0" />
										<span className="min-w-0 flex-1">
											<span className="block text-sm font-medium">{analyticsOverviewItem.label}</span>
											<span className="block truncate text-[11px] text-zinc-500">{isAnalyticsChildSection ? activeNavItem?.label : "Performance summary"}</span>
										</span>
									</button>
									<div className="border-l-2 border-transparent py-1 pl-8 pr-2">
										{analyticsChildItems.map((item, index) => {
											const active = currentSection === item.id;
											return (
												<button
													key={item.id}
													type="button"
													onClick={() => openSection(item.id)}
													className={`relative w-full rounded-lg px-2 py-1.5 pl-3 text-left text-xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${index ? "mt-1" : ""} ${active ? "bg-white font-medium text-[#111111] shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#DE141C]" : "text-zinc-500 hover:bg-white hover:text-[#111111]"}`}
												>
													{item.label}
												</button>
											);
										})}
									</div>
								</div>
							) : null}
							{(activePrimary === "analytics" ? analyticsStandaloneItems : activeSidebarItems).map((item) => {
								const ItemIcon = item.icon;
								const active = currentSection === item.id;
								return (
									<div key={item.id}>
										<button
											type="button"
											onClick={() => openSection(item.id)}
											className={`relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${active ? "bg-white text-[#111111] shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#DE141C]" : "text-zinc-600 hover:bg-white hover:text-[#111111]"}`}
										>
											<ItemIcon className="h-4 w-4 shrink-0" />
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-medium">{item.label}</span>
												{activePrimary === "analytics" ? null : (
													<span className={`block truncate text-[11px] ${active ? "text-zinc-500" : "text-zinc-400"}`}>{item.id === "properties" ? selectedCategoryLabel : item.hint}</span>
												)}
											</span>
										</button>
										{activePrimary === "listings" && item.id === "properties" ? (
											<div className="border-l-2 border-transparent py-1 pl-8 pr-2">
												<button
													type="button"
													onClick={() => openPropertyCategory("all")}
													className={`relative w-full rounded-lg px-2 py-1.5 pl-3 text-left text-xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${propertyCategoryFilter === "all" ? "bg-white font-medium text-[#111111] shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#DE141C]" : "text-zinc-500 hover:bg-white hover:text-[#111111]"}`}
												>
													All Categories
												</button>
												{propertySidebarCategoryOptions.map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() => openPropertyCategory(option.value)}
														className={`relative mt-1 w-full rounded-lg px-2 py-1.5 pl-3 text-left text-xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${propertyCategoryFilter === option.value ? "bg-white font-medium text-[#111111] shadow-xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#DE141C]" : "text-zinc-500 hover:bg-white hover:text-[#111111]"}`}
													>
														{option.label}
													</button>
												))}
											</div>
										) : null}
									</div>
								);
							})}
						</div>
					</nav>

					<div className="border-t border-black/10 px-3 py-3">
						{saving || message ? (
							<div className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-black/70 ring-1 ring-black/10 shadow-2xs">
								{saving ? (
									<div className="flex items-center gap-2 font-medium text-[#111111]">
										<span className="h-2 w-2 rounded-full bg-[#DE141C] animate-ping" />
										<span>Saving changes...</span>
									</div>
								) : null}
								{message ? <div className="text-black/60 truncate">{message}</div> : null}
							</div>
						) : (
							<div className="flex items-center justify-between px-1 text-[11px] text-black/40">
								<span className="flex items-center gap-1.5 font-medium">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
									System Ready
								</span>
								<span className="text-[10px] font-mono text-black/30">v1.2</span>
							</div>
						)}
						<div className="mt-3 flex gap-2 lg:hidden">
							<button type="button" onClick={() => void reloadWorkspace()} disabled={isRefreshingWorkspace} className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">Refresh</button>
							<button type="button" onClick={async () => { clearAnalyticsChatMessages(sessionUser?.id ?? null); adminWorkspaceSnapshot = null; await supabaseBrowser.auth.signOut(); window.location.href = "/"; }} className="flex-1 rounded-xl bg-[#111111] px-3 py-2 text-sm font-medium text-white">Sign out</button>
						</div>
					</div>
				</aside>

				<section className="flex min-w-0 flex-col bg-transparent">
					<header className="portal-header sticky top-0 z-[60] flex h-12 items-center gap-3 px-4">
						<button type="button" onClick={() => setShowSecondarySidebar((current) => !current)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-600 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20" title={showSecondarySidebar ? "Hide sidebar" : "Show sidebar"}>
							{showSecondarySidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
						</button>
						<div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-black/45 md:flex">
							<span>{activeNavGroup?.label ?? "Dashboard"}</span>
							<span>/</span>
							{isAnalyticsChildSection ? (
								<>
									<span className="truncate">Overview</span>
									<span>/</span>
								</>
							) : null}
							<strong className="truncate text-[#111111]">{activeNavItem?.label ?? "Overview"}</strong>
							{currentSection === "developerPortfolio" && selectedPortfolioDeveloperLabel ? (
								<>
									<span>/</span>
									<strong className="truncate text-[#111111]">{selectedPortfolioDeveloperLabel}</strong>
								</>
							) : null}
							{currentSection === "developerPortfolio" && selectedPortfolioPropertyLabel ? (
								<>
									<span>/</span>
									<strong className="truncate text-[#111111]">{selectedPortfolioPropertyLabel}</strong>
								</>
							) : null}
						</div>
						<div className="relative ml-auto hidden w-full max-w-xs md:block">
							<div className="flex h-8 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-sm text-zinc-600 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] focus-within:border-black/30 focus-within:ring-2 focus-within:ring-black/10">
								<Search className="h-4 w-4" />
								<input aria-label="Search..." value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} placeholder="Search..." className="w-full bg-transparent text-sm outline-none placeholder:text-black/35" />
							</div>
							{dashboardSearch.trim() ? (
								<div className="absolute right-0 top-10 z-30 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl">
									{dashboardSearchResults.length === 0 ? <div className="px-3 py-3 text-xs text-black/45">No CMS records found.</div> : null}
									{dashboardSearchResults.map((item) => (
										<button key={`${item.meta}-${item.label}`} type="button" onClick={() => { item.open(); setDashboardSearch(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100">
											<span className="font-medium text-[#111111]">{item.label}</span>
											<span className="ml-2 text-xs text-black/45">{item.meta}</span>
										</button>
									))}
								</div>
							) : null}
						</div>
						<div className="hidden items-center gap-2 md:flex">
							<AdminCalendarWidget
								selectedDate={selectedDateFilter}
								onSelectDate={setSelectedDateFilter}
								countsByDate={activityCountsByDate}
							/>
							{isAdmin ? (
								<button type="button" onClick={() => downloadCsv("jewellz-inquiries.csv", filteredInquiries, ["id", "buyer_name", "buyer_email", "status", "priority", "lead_score", "created_at"])} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#111111] px-3 text-xs font-medium text-white shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-black/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
									<Download className="h-3.5 w-3.5" />
									Export CSV
								</button>
							) : null}
						</div>
						<div className="relative ml-1 flex items-center gap-2 text-black/60">
							{isAdmin ? (
								<button
									type="button"
									onClick={() => setShowAnalyticsAssistant((current) => !current)}
									className={`rounded-lg border border-black/10 p-1.5 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${showAnalyticsAssistant ? "bg-[#111111] text-white" : "bg-white text-zinc-600 hover:bg-zinc-50 hover:text-[#111111]"}`}
									title={showAnalyticsAssistant ? "Close analytics assistant" : "Open analytics assistant"}
								>
									<MessageSquare className="h-4 w-4" />
								</button>
							) : null}
							<div className="relative">
								<button
									type="button"
									onClick={() => {
										setShowNotifications((current) => !current);
										setShowProfileMenu(false);
										setUnreadNotifCount(0);
									}}
									className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-[background-color,border-color,color] hover:bg-slate-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40"
									aria-label="Notifications"
									aria-expanded={showNotifications}
									title="Notifications & Agent Activity"
								>
									<Bell className="h-4 w-4" />
									{unreadNotifCount > 0 ? (
										<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DE141C] px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
											{unreadNotifCount > 9 ? "9+" : unreadNotifCount}
										</span>
									) : null}
								</button>
								{showNotifications ? (
									<>
										<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowNotifications(false)} />
									<div className="portal-popover absolute right-0 top-12 z-[70] w-80 p-4 text-sm sm:w-96">
											<div className="flex items-center justify-between border-b border-black/10 pb-3">
												<div>
											<div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">Notifications</div>
											<div className="text-xs text-slate-600">Live agent activity & pipeline updates</div>
												</div>
												{adminNotifications.length > 0 && (
													<button
														type="button"
														onClick={() => {
															setAdminNotifications([]);
															setUnreadNotifCount(0);
														}}
														className="text-[11px] font-semibold text-[#DE141C] hover:underline"
													>
														Clear all
													</button>
												)}
											</div>

											<div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
												{adminNotifications.length === 0 ? (
													<div className="py-6 text-center text-xs text-slate-600">
														No recent agent activity. Updates will appear here live when agents make progress.
													</div>
												) : (
													adminNotifications.map((n) => (
														<button
															key={n.id}
															type="button"
															onClick={() => handleOpenAdminNotification(n)}
															className="group block w-full rounded-xl border border-black/5 bg-zinc-50 p-2.5 text-left transition-[border-color,background-color,color] hover:border-[#DE141C]/30 hover:bg-red-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40"
														>
															<span className="flex items-center justify-between gap-2">
																<span className="text-xs font-bold text-[#111111] group-hover:text-[#DE141C]">{n.title}</span>
																<span className="shrink-0 text-[10px] text-slate-600">{formatRelativeTime(n.timestamp)}</span>
															</span>
															<span className="mt-0.5 block text-xs text-black/70">{n.message}</span>
															{n.propertyTitle ? <span className="mt-0.5 block truncate text-[11px] text-slate-600">Listing: {n.propertyTitle}</span> : null}
															{n.note ? <span className="mt-1.5 block rounded-lg border border-black/5 bg-white p-1.5 text-[11px] italic text-black/60">&ldquo;{n.note}&rdquo;</span> : null}
														</button>
													))
												)}
											</div>

											<div className="mt-3 border-t border-black/10 pt-2.5 text-[11px] text-black/50 space-y-1">
												<p>• {workspace.inquiries.filter((item) => item.status === "new").length} uncontacted leads awaiting review.</p>
												<p>• {workspace.properties.filter((item) => item.status === "draft").length} draft properties not yet public.</p>
											</div>
										</div>
									</>
								) : null}
							</div>
							<div className="relative">
								<button
									type="button"
									onClick={() => {
										setShowProfileMenu((current) => !current);
										setShowNotifications(false);
									}}
								className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-[background-color,border-color,color] hover:bg-slate-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40"
								aria-label="Profile menu"
								aria-expanded={showProfileMenu}
									title={asText(profile?.email ?? profile?.full_name)}
								>
									<UserCircle className="h-5 w-5" />
								</button>
								{showProfileMenu ? (
									<>
										<div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowProfileMenu(false)} />
									<div className="portal-popover absolute right-0 top-12 z-[70] w-64 p-4 text-sm">
											<div className="font-medium text-[#111111]">{profile?.full_name ?? "CMS User"}</div>
											<div className="mt-1 text-xs text-black/45">{profile?.email ?? sessionUser?.email ?? ""}</div>
											<div className="mt-2 rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">{role ?? "no role"}</div>
											<button type="button" onClick={async () => { clearAnalyticsChatMessages(sessionUser?.id ?? null); adminWorkspaceSnapshot = null; await supabaseBrowser.auth.signOut(); window.location.href = "/"; }} className="mt-3 w-full rounded-lg bg-[#111111] px-3 py-2 text-xs font-medium text-white shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-black/85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">Sign out</button>
										</div>
									</>
								) : null}
							</div>
						</div>
					</header>

					<div className="flex-1 overflow-auto bg-transparent px-3 py-4 sm:px-4 lg:px-5">
						<div className={`mx-auto flex max-w-7xl flex-col gap-3 transition-[padding] duration-200 ${assistantContentOffset}`}>
							{loading || !authChecked ? (
								<AdminContentSkeleton section={currentSection} />
							) : (
							<>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">
										Welcome back, {asText(profile?.full_name).split(" ")[0] || "Admin"}
									</h1>
								</div>
								<div className="flex items-center gap-2">
									<button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-zinc-600 shadow-2xs hover:bg-zinc-50">
										Daily
									</button>
									<button type="button" onClick={() => void reloadWorkspace()} disabled={isRefreshingWorkspace} className="inline-flex h-8 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50">
										<RefreshCw className={`h-3.5 w-3.5 ${isRefreshingWorkspace ? "animate-spin" : ""}`} />
										Refresh
									</button>
								</div>
							</div>

							{selectedDateFilter ? (
								<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DE141C]/25 bg-white p-3.5 shadow-sm text-xs text-[#111111]">
									<div className="flex items-center gap-2.5">
										<span className="flex h-2.5 w-2.5 rounded-full bg-[#DE141C] animate-pulse" />
										<span>
											Filtered by date: <strong>{new Date(`${selectedDateFilter}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</strong>
											<span className="ml-2 font-medium text-black/55">({filteredInquiries.length} inquiries · {filteredEngagementEvents.length} events · {filteredActivityLogs.length} audit logs)</span>
										</span>
									</div>
									<button
										type="button"
										onClick={() => setSelectedDateFilter(null)}
										className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-[#DE141C] transition hover:bg-red-50 hover:border-red-200"
									>
										Clear filter (Show All Time)
									</button>
								</div>
							) : null}

						{currentSection === "overview" ? (
							<>
								<div className="grid gap-3">
									<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
										<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); syncAdminUrl("/admin/inquiries"); }} className="portal-stat-card text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Needs attention</div>
											<div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#111111]">{urgentLeads.length}</div>
											<p className="mt-1 text-xs text-slate-600">High-intent or overdue leads.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); syncAdminUrl("/admin/inquiries"); }} className="portal-stat-card text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Unassigned leads</div>
											<div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#111111]">{unassignedLeads.length}</div>
											<p className="mt-1 text-xs text-slate-600">Assign these before follow-up slips.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("listings"); setActiveSection("properties"); syncAdminUrl("/admin/listings"); }} className="portal-stat-card text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Draft listings</div>
											<div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#111111]">{draftListings.length}</div>
											<p className="mt-1 text-xs text-slate-600">Listings not yet public.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); syncAdminUrl("/admin?section=analytics"); }} className="portal-stat-card text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Low inquiry listings</div>
											<div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-[#111111]">{lowPerformingListings.length}</div>
											<p className="mt-1 text-xs text-slate-600">Viewed listings below target rate.</p>
										</button>
									</div>

									<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Inquiry Trend</div>
												<p className="mt-1 text-xs text-black/45">Latest daily lead volume from the analytics view.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); syncAdminUrl("/admin?section=analytics"); }} className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">View report</button>
										</div>
										<div className="mt-3">
											<OverviewBars rows={overviewInquiryTrend} />
										</div>
									</div>
								</div>

								<div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
									<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Priority Leads</div>
												<p className="mt-1 text-xs text-black/45">Sorted by lead score and follow-up urgency.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); syncAdminUrl("/admin/inquiries"); }} className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">Open queue</button>
										</div>
										<div className="mt-4 space-y-2">
											{urgentLeads.length === 0 ? <p className="rounded-md bg-zinc-50 px-3 py-4 text-sm text-black/50">No urgent leads right now.</p> : null}
											{urgentLeads.map((lead) => (
												<button key={asText(lead.id)} type="button" onClick={() => openInquiryForEditing(asText(lead.id))} className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-left shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:border-black/20 hover:bg-zinc-50/70 hover:shadow-xs active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0">
															<div className="truncate text-sm font-semibold text-[#111111]">{lead.buyer_name ?? lead.buyer_email}</div>
															<div className="mt-1 truncate text-xs text-black/50">{lead.status ?? "new"} · {lead.buyer_email}</div>
														</div>
														<div className="flex shrink-0 flex-col items-end gap-1">
															<LeadScoreBadge score={toNullableNumber(lead.lead_score)} />
															<span className="text-[11px] text-black/40">{relativeAge(lead.created_at)}</span>
														</div>
													</div>
												</button>
											))}
										</div>
									</div>

									<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Pipeline Health</div>
												<p className="mt-1 text-xs text-black/45">Status distribution across visible leads.</p>
											</div>
											<div className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">{stats.closedCount} closed</div>
										</div>
										<div className="mt-4">
											<OverviewPipelineBars rows={overviewPipelineRows} />
										</div>
									</div>
								</div>

								<div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
									<div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xs">
										<div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Recent Inquiries</div>
												<p className="mt-1 text-xs text-black/45">Newest lead submissions entering the pipeline.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); syncAdminUrl("/admin/inquiries"); }} className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">See all</button>
										</div>
										<div className="overflow-x-auto">
											<table className="min-w-full text-left text-sm">
												<thead className="bg-zinc-50/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
													<tr>
														<th className="px-4 py-2 font-medium">Buyer</th>
														<th className="px-4 py-2 font-medium">Status</th>
														<th className="px-4 py-2 font-medium">Priority</th>
														<th className="px-4 py-2 font-medium">Age</th>
													</tr>
												</thead>
												<tbody>
													{recentOverviewInquiries.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-sm text-black/45">No inquiries yet.</td></tr> : null}
													{recentOverviewInquiries.map((inquiry) => (
													<tr key={asText(inquiry.id)} className="border-t border-black/5 transition-colors hover:bg-zinc-50">
															<td className="max-w-[220px] px-4 py-3">
															<button type="button" aria-label={`Open inquiry for ${inquiry.buyer_name ?? "unnamed buyer"}`} onClick={() => openInquiryForEditing(asText(inquiry.id))} className="block max-w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/50">
																<span className="block truncate font-medium text-[#111111]">{inquiry.buyer_name ?? "Unnamed buyer"}</span>
																<span className="block truncate text-xs text-black/45">{inquiry.buyer_email}</span>
																<span className="sr-only">Open inquiry</span>
															</button>
															</td>
															<td className="px-4 py-3 text-black/60">{inquiry.status ?? "new"}</td>
															<td className="px-4 py-3 text-black/60">{inquiry.priority ?? "standard"}</td>
															<td className="px-4 py-3 text-black/45">{relativeAge(inquiry.created_at)}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>

									<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs transition hover:shadow-sm">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Listing Performance</div>
												<p className="mt-1 text-xs text-black/45">Quick view of views and inquiry rate.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); syncAdminUrl("/admin?section=analytics"); }} className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 shadow-2xs transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-zinc-50 hover:text-[#111111] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20">Full chart</button>
										</div>
										<div className="mt-4">
											<OverviewListingChart rows={listingPreviewRows} />
										</div>
									</div>
								</div>
							</>
						) : null}

						{currentSection === "properties" ? (
							canEditCatalog ? (
								propertyCategoryFilter === "all" ? (
									<PropertyWizard
										rows={workspace.properties}
										selectedId={selectedPropertyId}
										fields={propertyEditorFields}
										defaultValues={DEFAULT_PROPERTY_VALUES}
										canEdit={canEditCatalog}
										rowLabel={labelForRow}
										rowMeta={(row) => `${row.city ?? ""} ${row.province ?? ""} • ${row.status ?? "draft"}`}
										onSelect={(row) => { setSelection((current) => ({ ...current, properties: row ? asText(row.id) : null })); clearStagedPhotos(); }}
										onCreateNew={() => { setSelection((current) => ({ ...current, properties: NEW_RECORD_ID })); clearStagedPhotos(); }}
										onDelete={(row) => deleteEntity("properties", row)}
										onSubmit={saveProperty}
										saveBlocked={!selectedProperty && stagedPhotos.some((photo) => photo.status === "uploading")}
										saveBlockedMessage="Wait for the selected photos to finish uploading before creating the listing."
										renderPreview={(payload, currentRow) => <PropertyPublicPreview payload={payload} currentRow={currentRow} imageUrls={selectedPropertyImageUrls} />}
										extra={
											<PropertyImagesManager
												propertyId={selectedProperty ? asText(selectedProperty.id) : null}
												canEdit={canEditCatalog}
												onRequestDelete={requestDestructiveAction}
												stagedPhotos={selectedProperty ? undefined : stagedPhotos}
												onAddStagedPhotos={selectedProperty ? undefined : addStagedPhotos}
												onRemoveStagedPhoto={selectedProperty ? undefined : removeStagedPhoto}
												onRetryStagedPhoto={selectedProperty ? undefined : uploadStagedPhoto}
												onChanged={async () => {
													await reloadWorkspace();
													await loadPropertyImages(selectedProperty ? asText(selectedProperty.id) : null);
												}}
											/>
										}
									/>
								) : (
									<SectionShell title={`${selectedCategoryLabel} Properties`} description={`Showing only listings categorized as ${selectedCategoryLabel}. Click any row to open it in Listings / Properties.`}>
										<div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-xs">
											<table className="w-full border-collapse text-sm">
												<thead>
													<tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-[0.08em] text-black/45">
														<th className="px-4 py-3 font-medium">Title</th>
														<th className="px-4 py-3 font-medium">City</th>
														<th className="px-4 py-3 font-medium">Price</th>
														<th className="px-4 py-3 font-medium">Status</th>
													</tr>
												</thead>
												<tbody>
													{visibleProperties.length === 0 ? (
														<tr><td colSpan={4} className="px-4 py-5 text-sm text-black/45">No properties found in this category.</td></tr>
													) : null}
													{visibleProperties.map((property) => (
														<tr
															key={asText(property.id)}
															role="button"
															tabIndex={0}
															title="Open this property in the editor"
															onClick={() => openPropertyForEditing(asText(property.id))}
															onKeyDown={(event) => {
																if (event.key === "Enter" || event.key === " ") {
																	event.preventDefault();
																	openPropertyForEditing(asText(property.id));
																}
															}}
															className="cursor-pointer border-b border-black/10 transition last:border-b-0 hover:bg-zinc-50 focus:bg-zinc-100 focus:outline-none"
														>
															<td className="px-4 py-3 font-medium text-[#111111]">{property.title}</td>
															<td className="px-4 py-3 text-black/60">{property.city ?? "n/a"}</td>
															<td className="px-4 py-3 text-black/60">{property.price == null ? "n/a" : `₱${Number(property.price).toLocaleString()}`}</td>
															<td className="px-4 py-3 text-black/60">{property.status ?? "draft"}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</SectionShell>
								)
							) : (
								<SectionShell title="Properties" description="Read-only property list for the current role.">
									<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
										{visibleProperties.map((row) => <div key={asText(row.id)} className="rounded-2xl border border-black/10 bg-zinc-50 p-4"><div className="font-medium text-[#111111]">{row.title}</div><div className="mt-1 text-sm text-black/55">{row.city ?? ""} {row.province ?? ""}</div></div>)}
									</div>
								</SectionShell>
							)
						) : null}

						{currentSection === "projects" && isAdmin ? (
							<EntityEditor title="Projects" description="Developer project portfolios. Choose the developer by company name; the CMS stores the ID automatically." rows={workspace.projects} selectedId={selectedProjectId} fields={projectEditorFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.location_city ?? ""} ${row.location_province ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, projects: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, projects: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("projects", row)} onSubmit={saveProject} />
						) : null}

						{currentSection === "agents" && isAdmin ? (
							<AgentsWorkspace
								rows={workspace.agents}
								selectedId={selectedAgentId}
								canEdit={isAdmin}
								rowMeta={agentRowMeta}
								emailForRow={(row: CmsRow) => (row.profile_id ? profileEmailById.get(asText(row.profile_id)) ?? "" : "")}
								metrics={<AgentMetricsSummary agentId={selectedAgentId} agentEmail={selectedAgentProfileEmail} agentPerformance={workspace.agentPerformance} />}
								onSelect={(row: CmsRow | null) => setSelection((current) => ({ ...current, agents: row ? asText(row.id) : null }))}
								onDelete={(row: CmsRow) => deleteEntity("agents", row)}
								onSubmit={saveAgent}
								onReload={reloadWorkspace}
							/>
						) : null}

						{currentSection === "developers" && isAdmin ? (
							<DeveloperPartnersWorkspace
								rows={workspace.developers}
								selectedId={selectedDeveloperId}
								canEdit={isAdmin}
								onSelect={(row: CmsRow | null) => setSelection((current) => ({ ...current, developers: row ? asText(row.id) : null }))}
								onCreateNew={() => setSelection((current) => ({ ...current, developers: NEW_RECORD_ID }))}
								onDelete={(row: CmsRow) => deleteEntity("developer_partners", row)}
								onSubmit={saveDeveloper}
								onReload={reloadWorkspace}
							/>
						) : null}

						{currentSection === "profiles" && isAdmin ? (
							<SectionShell title="Profiles & Buyers" description="Account overview with shortcuts into each buyer's inquiry history.">
								<div className="overflow-x-auto rounded-lg border border-black/10">
									<table className="min-w-full text-left text-sm">
										<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
											<tr>
												<th className="px-4 py-3">Name</th>
												<th className="px-4 py-3">Email</th>
												<th className="px-4 py-3">Role</th>
												<th className="px-4 py-3">Active</th>
												<th className="px-4 py-3">Inquiries</th>
											</tr>
										</thead>
										<tbody>
											{workspace.profiles.length === 0 ? <tr><td colSpan={5} className="px-4 py-5 text-black/45">No profiles found.</td></tr> : null}
											{workspace.profiles.map((row) => {
												const email = asText(row.email).toLowerCase();
												const matchingInquiries = workspace.inquiries.filter((inquiry) => asText(inquiry.buyer_email).toLowerCase() === email);
												return (
													<tr key={asText(row.id)} className="border-t border-black/10">
														<td className="px-4 py-3 font-medium text-[#111111]">{row.full_name ?? "Unnamed"}</td>
														<td className="px-4 py-3 text-black/60">{row.email ?? "—"}</td>
														<td className="px-4 py-3 text-black/60">{row.role ?? "buyer"}</td>
														<td className="px-4 py-3 text-black/60">{asText(row.is_active) === "false" ? "No" : "Yes"}</td>
														<td className="px-4 py-3 text-black/60">
															{matchingInquiries.length ? (
																<button type="button" onClick={() => openInquiryForEditing(asText(matchingInquiries[0].id))} className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100">
																	View {matchingInquiries.length}
																</button>
															) : (
																<span className="text-black/35">None</span>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</SectionShell>
						) : null}

						{currentSection === "inquiries" || currentSection === "pipeline" || currentSection === "timeline" ? (
							<InquiryWorkflowManager
								activeView={currentSection as "inquiries" | "pipeline" | "timeline"}
								inquiries={filteredInquiries}
								agents={workspace.agents}
								properties={workspace.properties}
								currentRole={role}
								currentUserId={sessionUser?.id ?? null}
								selectedId={selectedInquiryId}
								onSelect={(id) => setSelection((current) => ({ ...current, inquiries: id }))}
								onReload={reloadWorkspace}
								canEdit={canEditInquiries}
								canReassign={canReassignInquiries}
								onViewChange={(view) => {
									setActivePrimary("inquiries");
									setActiveSection(view);
									syncAdminUrl(`/admin/inquiries${view === "inquiries" ? "" : `?section=${view}`}`);
								}}
							/>
						) : null}

						{currentSection === "gallery" && isAdmin ? (
							<EntityEditor title="Gallery Items" description="Browse Gallery tiles for achievements, events, trainings, service, and general content." rows={workspace.galleryItems} selectedId={selection.galleryItems} fields={galleryFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.section ?? "general"} • ${row.sort_order ?? 0}`} onSelect={(row) => setSelection((current) => ({ ...current, galleryItems: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, galleryItems: null }))} onDelete={(row) => deleteEntity("gallery_items", row)} onSubmit={saveGalleryItem} extra={<GalleryImageManager galleryItem={selectedGalleryItem} canEdit={canEditContent} onChanged={reloadWorkspace} onRequestDelete={requestDestructiveAction} />} />
						) : null}

						{currentSection === "careerJobs" && isAdmin ? (
							<EntityEditor title="Career Cards" description="Editable job cards shown on the public Careers page. Use details for the flipped-card bullet list." rows={workspace.careerJobs} selectedId={selectedCareerJobId} fields={careerJobFields} defaultValues={{ badge: "Full-Time", sort_order: workspace.careerJobs.length, is_active: true }} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.badge ?? "Role"} • ${row.is_active ? "active" : "hidden"}`} onSelect={(row) => setSelection((current) => ({ ...current, careerJobs: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, careerJobs: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("career_jobs", row)} onSubmit={saveCareerJob} saveLabel="Save career card" />
						) : null}

						{currentSection === "careerApplications" && isAdmin ? (
							<EntityEditor title="Career Applications" description="Applications submitted from the public Careers page. Update status or admin notes here." rows={workspace.careerApplications} selectedId={selectedCareerApplicationId} fields={careerApplicationFields} canEdit={canEditContent} canCreate={false} rowLabel={(row) => asText(row.applicant_name || row.position_title || row.id)} rowMeta={(row) => `${row.position_title ?? "Applicant"} • ${row.status ?? "new"}`} onSelect={(row) => setSelection((current) => ({ ...current, careerApplications: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, careerApplications: null }))} onDelete={(row) => deleteEntity("career_applications", row)} onSubmit={saveCareerApplication} saveLabel="Save application" />
						) : null}

						{currentSection === "logos" && isAdmin ? (
							<EntityEditor title="Partner Logos" description="Homepage logo strip for developer partners." rows={workspace.partnerLogos} selectedId={selection.partnerLogos} fields={partnerLogoFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, partnerLogos: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, partnerLogos: null }))} onDelete={(row) => deleteEntity("partner_logos", row)} onSubmit={savePartnerLogo} />
						) : null}

						{currentSection === "stats" && isAdmin ? (
							<EntityEditor title="Site Stats" description="Key-value counters shown in the homepage stat strip." rows={workspace.siteStats} selectedId={selection.siteStats} idKey="key" fields={siteStatFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.value ?? 0}${row.suffix ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, siteStats: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, siteStats: null }))} onDelete={(row) => deleteEntity("site_stats", row, "key")} onSubmit={saveSiteStat} />
						) : null}

						{currentSection === "settings" && isAdmin ? (
							<SettingsWorkspace rows={workspace.settings} selectedId={selection.settings} canEdit={canEditSettings} onSelect={(row) => setSelection((current) => ({ ...current, settings: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, settings: null }))} onDelete={(row) => deleteEntity("system_settings", row, "key")} onSubmit={saveSetting} />
						) : null}

						{(currentSection === "analytics" || analyticsChildSections.has(currentSection) || currentSection === "traffic" || currentSection === "agentPerformance" || currentSection === "developerPortfolio") && isAdmin ? (
							<AnalyticsPanel activeReport={currentSection} isAdmin={isAdmin} properties={workspace.properties} inquiries={filteredInquiries} recommendations={workspace.recommendations} listingPerformance={workspace.listingPerformance} dailyInquiryVolume={workspace.dailyInquiryVolume} trafficSources={workspace.trafficSources} agentPerformance={workspace.agentPerformance} developerPortfolio={workspace.developerPortfolio} engagementEvents={filteredEngagementEvents} sessions={workspace.sessions} selectedPortfolioDeveloperId={selectedPortfolioDeveloperId} selectedPortfolioPropertyId={selectedPortfolioPropertyId} onSelectPortfolioDeveloper={setSelectedPortfolioDeveloperId} onSelectPortfolioProperty={setSelectedPortfolioPropertyId} selectedDateFilter={selectedDateFilter} />
						) : null}

						{currentSection === "activityLogs" && isAdmin ? (
							<SectionShell title="Activity Logs" description="Recent audit records from the activity_logs table.">
								<div className="overflow-x-auto rounded-lg border border-black/10">
									<table className="min-w-full text-left text-sm">
										<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
											<tr>
												<th className="px-4 py-3">When</th>
												<th className="px-4 py-3">Action</th>
												<th className="px-4 py-3">Table</th>
												<th className="px-4 py-3">Record</th>
											</tr>
										</thead>
										<tbody>
											{filteredActivityLogs.length === 0 ? <tr><td colSpan={4} className="px-4 py-5 text-black/45">No activity logs found.</td></tr> : null}
											{filteredActivityLogs.map((row, index) => (
												<tr key={asText(row.id ?? index)} className="border-t border-black/10">
													<td className="px-4 py-3 text-black/60">{asText(row.created_at ?? row.occurred_at) || "—"}</td>
													<td className="px-4 py-3 font-medium text-[#111111]">{row.action ?? row.event_type ?? "Activity"}</td>
													<td className="px-4 py-3 text-black/60">{row.table_name ?? row.entity_type ?? "—"}</td>
													<td className="px-4 py-3 text-black/60">{row.record_id ?? row.entity_id ?? "—"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</SectionShell>
						) : null}
							</>
							)}
					</div>
					</div>
					{isAdmin && showAnalyticsAssistant ? <AnalyticsChatSidebar onAction={handleAnalyticsChatAction} messages={analyticsChatMessages} onMessagesChange={setAnalyticsChatMessages} isThinking={analyticsChatIsThinking} setIsThinking={setAnalyticsChatIsThinking} /> : null}
				</section>
			</div>
			{destructiveAction ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Destructive Action</div>
						<h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#111111]">{destructiveAction.title}</h2>
						<p className="mt-2 text-sm leading-6 text-black/60">{destructiveAction.description}</p>
						<p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs leading-5 text-black/65">Please confirm you are sure. Enter your password to continue.</p>
						<label className="mt-4 block">
							<span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Password</span>
							<input
								type="password"
								value={destructivePassword}
								onChange={(event) => setDestructivePassword(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") void confirmDestructiveAction();
								}}
								className="mt-1 h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30"
								aria-label="Enter your CMS password"
								placeholder="Enter your CMS password"
								autoFocus
							/>
						</label>
						{destructiveMessage ? <p className="mt-3 text-sm text-black/55">{destructiveMessage}</p> : null}
						<div className="mt-5 flex flex-wrap justify-end gap-2">
							<button
								type="button"
								disabled={confirmingDestructiveAction}
								onClick={() => {
									setDestructiveAction(null);
									setDestructivePassword("");
									setDestructiveMessage("");
								}}
								className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={confirmingDestructiveAction}
								onClick={() => void confirmDestructiveAction()}
								className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20"
							>
								{confirmingDestructiveAction ? "Verifying..." : destructiveAction.confirmLabel ?? "Verify password and delete"}
							</button>
						</div>
					</div>
				</div>
			) : null}
			{/* Admin Live Agent Activity Toast */}
			{adminToast ? (
				<div className="portal-live-toast portal-motion">
					<div className="portal-live-toast-icon">
						<UserCheck className="h-5 w-5" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-2">
							<p className="text-[11px] font-bold uppercase tracking-wider text-[#DE141C]">
								{adminToast.title}
							</p>
							<button
								type="button"
								onClick={() => setAdminToast(null)}
								className="portal-icon-dismiss"
								aria-label="Dismiss notification"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
						<p role="status" aria-live="polite" className="mt-1 text-sm font-semibold leading-snug text-[#111111]">{adminToast.message}</p>
						{adminToast.propertyTitle && (
							<p className="mt-0.5 truncate text-xs text-black/55">Listing: <span className="font-medium text-black/75">{adminToast.propertyTitle}</span></p>
						)}
						{adminToast.note && (
							<p className="mt-1 text-xs italic text-black/65 bg-zinc-50 rounded-lg p-1.5 border border-black/5">
								&ldquo;{adminToast.note}&rdquo;
							</p>
						)}
						<div className="mt-3 flex items-center gap-2">
							<button
								type="button"
								onClick={() => handleOpenAdminNotification(adminToast)}
								className="portal-toast-primary"
							>
								View in Pipeline <ChevronRight className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setAdminToast(null)}
								className="portal-toast-secondary"
							>
								Dismiss
							</button>
						</div>
					</div>
				</div>
			) : null}
			{/* Property creation confirmation */}
			{createdListingToast ? (
				<div className="portal-action-toast portal-motion bottom-4 right-4 w-[min(92vw,400px)] border-emerald-300 sm:bottom-8 sm:right-8">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
						<CheckCircle2 className="h-5 w-5" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-2">
							<p role="status" aria-live="polite" className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
								Property created
							</p>
							<button
								type="button"
								onClick={() => setCreatedListingToast(null)}
								className="rounded p-0.5 text-black/40 transition hover:text-black"
								title="Dismiss"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
						<p className="mt-1 break-words text-sm font-semibold leading-snug text-[#111111]">
							{createdListingToast.title}
						</p>
						{createdListingToast.photoCount > 0 && (
							<p className="mt-0.5 text-xs text-black/55">
								{createdListingToast.photoCount} photo{createdListingToast.photoCount === 1 ? "" : "s"} attached.
							</p>
						)}
						<div
							className={`mt-2 rounded-lg border p-2 text-xs font-medium ${
								createdListingToast.status === "published"
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-amber-200 bg-amber-50 text-amber-800"
							}`}
						>
							{createdListingToast.status === "published"
								? "This listing is live on the public website."
								: `Saved as ${createdListingToast.status.replace(/_/g, " ")}. The public website only shows Published listings — open it and change Status to Published to make it visible.`}
						</div>
						<div className="mt-3 flex flex-wrap items-center gap-2">
							{createdListingToast.propertyId && (
								<button
									type="button"
									onClick={() => {
										const id = createdListingToast.propertyId;
										if (!id) return;
										setActivePrimary("listings");
										setActiveSection("properties");
										setPropertyCategoryFilter("all");
										setSelection((current) => ({ ...current, properties: id }));
										syncAdminUrl(`/admin/listings/${id}`);
										setCreatedListingToast(null);
									}}
									className="inline-flex items-center gap-1.5 rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black/80"
								>
									Open listing <ChevronRight className="h-3.5 w-3.5" />
								</button>
							)}
							{createdListingToast.status !== "published" && createdListingToast.propertyId && (
								<button
									type="button"
									onClick={async () => {
										const id = createdListingToast.propertyId;
										if (!id) return;
										setMessage("Publishing listing...");
										const { error } = await supabaseBrowser
											.from("properties")
											.update({ status: "published", published_at: new Date().toISOString() })
											.eq("id", id);
										if (error) {
											setMessage(`Could not publish listing: ${error.message}`);
											return;
										}
										await reloadWorkspace();
										setCreatedListingToast((current) =>
											current ? { ...current, status: "published" } : current,
										);
										setMessage("Listing published! It is now visible on the website.");
									}}
									className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
								>
									Publish now
								</button>
							)}
							{createdListingToast.status === "published" && createdListingToast.slug && (
								<a
									href={`/project-list/${encodeURIComponent(createdListingToast.slug)}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
								>
									View on website
								</a>
							)}
							<button
								type="button"
								onClick={() => setCreatedListingToast(null)}
								className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-black/5"
							>
								Dismiss
							</button>
						</div>
					</div>
				</div>
			) : null}
			{/* Save / error confirmation */}
			{actionToast ? (
				<div
					className={`portal-action-toast portal-motion bottom-4 left-4 w-[min(92vw,380px)] sm:bottom-8 sm:left-8 ${
						actionToast.tone === "success" ? "border-emerald-300" : "border-red-300"
					}`}
				>
					<div
						className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
							actionToast.tone === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
						}`}
					>
						{actionToast.tone === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-2">
							<p
								className={`text-[11px] font-bold uppercase tracking-wider ${
									actionToast.tone === "success" ? "text-emerald-700" : "text-red-700"
								}`}
							>
								{actionToast.title}
							</p>
							<button
								type="button"
								onClick={() => setActionToast(null)}
								className="rounded p-0.5 text-black/40 transition hover:text-black"
								title="Dismiss"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
						<p role={actionToast.tone === "error" ? "alert" : "status"} aria-live={actionToast.tone === "error" ? "assertive" : "polite"} className="mt-1 break-words text-sm font-semibold leading-snug text-[#111111]">
							{actionToast.message}
						</p>
						{actionToast.href ? (
							<div className="mt-3">
								<a
									href={actionToast.href}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
								>
									{actionToast.hrefLabel ?? "Open"} <ChevronRight className="h-3.5 w-3.5" />
								</a>
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</main>
	);
}
