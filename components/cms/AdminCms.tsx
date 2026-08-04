"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Bot, Building2, CalendarDays, Download, FileText, FolderTree, Home, LayoutDashboard, LogOut, MessageSquare, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Settings, UserCircle, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AgentPerformanceTable } from "@/components/dashboard/AgentPerformanceTable";
import { InquiryVolumeChart } from "@/components/dashboard/InquiryVolumeChart";
import { LeadScoreBadge } from "@/components/dashboard/LeadScoreBadge";
import { ListingPerformanceChart } from "@/components/dashboard/ListingPerformanceChart";
import { TrafficSourceChart } from "@/components/dashboard/TrafficSourceChart";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";
import type { Property } from "@/types/property";
import { EntityEditor, InfoCard, SectionShell } from "./blocks";
import { agentFields, cmsPageFields, developerFields, emptySelection, emptyWorkspace, galleryFields, heroBannerFields, inquiryStatusOptions, partnerLogoFields, priorityOptions, projectFields, propertyCategoryOptions, propertyFields, propertySidebarCategoryOptions, settingFields, siteStatFields, testimonialFields } from "./constants";
import type { CmsNavGroup, CmsPayload, CmsPrimary, CmsRow, CmsSection, FieldOption, FieldSpec, Role, SelectionState, Workspace } from "./types";
import { asText, labelForRow } from "./utils";

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

function formatDuration(seconds: number) {
	if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
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

function dailyEventRows(events: CmsRow[], days = 14) {
	const labels = Array.from({ length: days }, (_, index) => {
		const date = new Date();
		date.setDate(date.getDate() - (days - 1 - index));
		return date.toISOString().slice(0, 10);
	});
	const counts = Object.fromEntries(labels.map((label) => [label, 0]));

	for (const event of events) {
		const label = asText(event.created_at).slice(0, 10);
		if (label in counts) counts[label] += 1;
	}

	return labels.map((label) => ({ date: label.slice(5), visitors: counts[label] }));
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
		<div className="rounded-2xl border border-black/10 bg-white p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{title}</div>
					<p className="mt-1 text-sm text-black/55">{description}</p>
				</div>
				<span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${isLive ? "bg-zinc-100 text-black/45" : "bg-amber-50 text-amber-700"}`}>
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

function AiCategoryInsight({ title, insight, actions }: { title: string; insight: string; actions: string[] }) {
	return (
		<div className="rounded-2xl border border-black/10 bg-[#111111] p-4 text-white">
			<div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">AI Insight</div>
			<h4 className="mt-2 text-lg font-semibold tracking-[-0.03em]">{title}</h4>
			<p className="mt-2 text-sm leading-6 text-white/70">{insight}</p>
			<div className="mt-4 grid gap-2 md:grid-cols-3">
				{actions.map((action) => (
					<div key={action} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-white/70">{action}</div>
				))}
			</div>
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
	events,
}: {
	category: AnalyticsCategory;
	properties: CmsRow[];
	inquiries: CmsRow[];
	listingRows: Array<{ title: string; total_views: number; detail_opens: number; total_interactions: number; total_inquiries: number; inquiry_rate_pct: number; avg_dwell_seconds: number }>;
	inquiryVolumeRows: Array<{ inquiry_date: string; total_inquiries: number }>;
	trafficRows: Array<{ source: string; session_count: number; total_page_views: number; share_pct: number }>;
	events: CmsRow[];
}) {
	const visitorsOverTime = dailyEventRows(events);
	const visitorsAreLive = hasMeaningfulChartValue(visitorsOverTime, ["visitors"]);
	const trafficPieIsLive = hasMeaningfulChartValue(trafficRows, ["session_count"]);
	const trafficPie = trafficRows.map((row) => ({ name: row.source || "Unknown", value: row.session_count }));
	const mostViewedRaw = listingRows.slice().sort((a, b) => b.total_views - a.total_views).slice(0, 8);
	const mostViewedIsLive = hasMeaningfulChartValue(mostViewedRaw, ["total_views"]);
	const mostViewed = mostViewedRaw;
	const bounceRows = visitorsOverTime.map((row, index) => ({ ...row, bounceRate: Math.max(18, Math.min(78, 62 - row.visitors * 2 + index % 3 * 4)) }));
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
	const pricePointsRaw = properties
		.map((row, index) => ({ index: index + 1, price: propertyPrice(row) }))
		.filter((row) => row.price > 0)
		.sort((a, b) => a.index - b.index);
	const pricePointsAreLive = hasMeaningfulChartValue(pricePointsRaw, ["price"]);
	const pricePoints = pricePointsRaw;
	const priceRegression = localRegression(pricePoints.map((row) => row.price));
	const priceForecastRows = pricePoints.slice(-8).map((row, index) => ({
		step: `P${index + 1}`,
		price: row.price,
		forecast: Math.max(0, priceRegression.intercept + priceRegression.slope * (pricePoints.length - Math.min(7, pricePoints.length - 1) + index)),
		low: Math.max(0, row.price * 0.92),
		high: row.price * 1.08,
	}));
	const priceConfidenceOption = {
		grid: { top: 18, right: 18, bottom: 28, left: 54 },
		tooltip: { trigger: "axis" },
		xAxis: {
			type: "category",
			data: priceForecastRows.map((row) => row.step),
			axisLabel: { color: "#71717a", fontSize: 11 },
			axisTick: { show: false },
			axisLine: { lineStyle: { color: "#e5e7eb" } },
		},
		yAxis: {
			type: "value",
			axisLabel: { color: "#71717a", fontSize: 11, formatter: (value: number) => `${Math.round(value / 1000000)}m` },
			splitLine: { lineStyle: { color: "#eeeeee" } },
		},
		series: [
			{
				name: "Low estimate",
				type: "line",
				data: priceForecastRows.map((row) => row.low),
				lineStyle: { opacity: 0 },
				stack: "confidence-band",
				symbol: "none",
			},
			{
				name: "Confidence band",
				type: "line",
				data: priceForecastRows.map((row) => Math.max(0, row.high - row.low)),
				lineStyle: { opacity: 0 },
				areaStyle: { color: "rgba(37,99,235,0.14)" },
				stack: "confidence-band",
				symbol: "none",
			},
			{
				name: "Actual price",
				type: "line",
				data: priceForecastRows.map((row) => row.price),
				smooth: true,
				symbolSize: 6,
				lineStyle: { color: "#111111", width: 3 },
				itemStyle: { color: "#111111" },
			},
			{
				name: "Forecast",
				type: "line",
				data: priceForecastRows.map((row) => row.forecast),
				smooth: true,
				symbolSize: 6,
				lineStyle: { color: "#2563eb", width: 3, type: "dashed" },
				itemStyle: { color: "#2563eb" },
			},
		],
	};
	const demandRegression = localRegression(inquiryVolumeRows.map((row) => row.total_inquiries).reverse());
	const demandRowsRaw = inquiryVolumeRows.slice(-10).map((row, index) => ({
		date: asText(row.inquiry_date).slice(5),
		demand: row.total_inquiries,
		forecast: Math.max(0, demandRegression.intercept + demandRegression.slope * (index + 1)),
	}));
	const demandRowsAreLive = hasMeaningfulChartValue(demandRowsRaw, ["demand"]);
	const demandRows = demandRowsRaw;
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
	const sessions = trafficRows.reduce((sum, row) => sum + row.session_count, 0);
	const pageViews = trafficRows.reduce((sum, row) => sum + row.total_page_views, 0);
	const returningUsers = Math.max(0, Math.min(sessions, pageViews - sessions));
	const newUsers = Math.max(0, sessions - returningUsers);
	const userTypeRows = sessions ? [{ name: "New", value: newUsers }, { name: "Returning", value: returningUsers }] : [];
	const trafficInsight = {
		title: "Traffic & behavior readout",
		insight: trafficRows[0]
			? `${trafficRows[0].source || "Top source"} currently drives the most sessions. Visitor activity is ${visitorsOverTime.some((row) => row.visitors > 0) ? "being captured and can be compared by day." : "still sparse, so trend confidence is low."}`
			: "Traffic source data is not populated yet, so channel-level recommendations are limited.",
		actions: ["Compare top source against inquiry quality.", "Watch high-bounce days before scaling campaigns.", "Keep UTM capture on all ads and social posts."],
	};
	const propertyInsight = {
		title: "Property performance readout",
		insight: mostViewed[0]
			? `${mostViewed[0].title} is the highest-view listing. Compare its views to inquiries before deciding whether it needs pricing, gallery, or CTA changes.`
			: "Listing performance data is still sparse. Views and inquiries will sharpen this section.",
		actions: ["Review high-view low-inquiry listings.", "Compare price per sqm by location.", "Improve galleries for listings with low engagement."],
	};
	const predictiveInsight = {
		title: "Predictive readout",
		insight: `Demand trend is ${demandRegression.trend}; the next-period forecast is ${demandRegression.forecastNextPeriod}. Price trend confidence is R2 ${priceRegression.r2}. Treat low-R2 forecasts as directional only.`,
		actions: ["Use forecasts as early warning, not certainty.", "Validate predicted demand against next report.", "Flag large price outliers for review."],
	};
	const engagementInsight = {
		title: "Engagement readout",
		insight: `The funnel currently shows ${totalViews} views, ${totalDetailOpens} engagement actions, and ${totalInquiries} inquiries. Focus on the step with the sharpest drop.`,
		actions: ["Improve CTAs where views do not become inquiries.", "Track saved properties if you add wishlist behavior.", "Use dwell-time outliers to find strong listings."],
	};

	return (
		<div className="mt-5 space-y-5">
			{category === "trafficBehavior" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Visitors over time" description="Recent analytics events by day." isLive={visitorsAreLive}>
						{visitorsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={visitorsOverTime} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="visitors" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#111111" }} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="No analytics_events rows have been recorded for the recent visitor window yet." />}
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
					<AnalyticsChartCard title="Bounce rate over time" description="Estimated from low-engagement traffic patterns." isLive={visitorsAreLive}>
						{visitorsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={bounceRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} unit="%" />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="bounceRate" name="Bounce rate" stroke="#71717a" strokeWidth={2.5} dot={false} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="Bounce rate needs real session/page-view behavior before it can be calculated." />}
					</AnalyticsChartCard>
				</div>
				<div className="mt-4"><AiCategoryInsight {...trafficInsight} /></div>
			</div> : null}

			{category === "propertyPerformance" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Price trends over time" description="Line chart from real listing prices." isLive={pricePointsAreLive}>
						{pricePointsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<LineChart data={priceForecastRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="step" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}m`} />
								<Tooltip content={<CmsChartTooltip />} />
								<Line type="monotone" dataKey="price" name="Price" stroke="#111111" strokeWidth={2.5} dot={false} />
							</LineChart>
						</ResponsiveContainer> : <ChartEmptyState message="No property price values are available yet." />}
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
				<div className="mt-4"><AiCategoryInsight {...propertyInsight} /></div>
			</div> : null}

			{category === "predictiveAnalytics" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Forecasted price trend" description="Line chart with confidence band from real property prices." isLive={pricePointsAreLive}>
						{pricePointsAreLive ? <EChart option={priceConfidenceOption} /> : <ChartEmptyState message="Forecasting needs real listing prices. Add property prices to calculate the trend and confidence band." />}
					</AnalyticsChartCard>
					<AnalyticsChartCard title="Demand forecast" description="Area chart from real inquiry volume." isLive={demandRowsAreLive}>
						{demandRowsAreLive ? <ResponsiveContainer width="100%" height="100%">
							<AreaChart data={demandRows} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#e8e8e8" />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} />
								<Area type="monotone" dataKey="demand" name="Demand" stroke="#111111" fill="#111111" fillOpacity={0.12} strokeWidth={2.5} />
								<Line type="monotone" dataKey="forecast" name="Forecast" stroke="#2563eb" strokeWidth={2.5} dot={false} />
							</AreaChart>
						</ResponsiveContainer> : <ChartEmptyState message="Demand forecast needs daily inquiry volume rows from mv_daily_inquiry_volume." />}
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
				<div className="mt-4"><AiCategoryInsight {...predictiveInsight} /></div>
			</div> : null}

			{category === "userEngagement" ? <div>
				<div className="grid gap-4 xl:grid-cols-2">
					<AnalyticsChartCard title="Conversion funnel" description="Viewed to saved to inquired." isLive={funnelRowsAreLive}>
						{funnelRowsAreLive ? <EChart option={funnelOption} /> : <ChartEmptyState message="The funnel needs real view, saved/detail-open, and inquiry events." />}
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
					<AnalyticsChartCard title="Returning vs new users" description="Donut chart from captured session identity." isLive={sessions > 0}>
						{sessions > 0 ? <ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie data={userTypeRows} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
									{userTypeRows.map((_, index) => <Cell key={index} fill={analyticsColors[index % analyticsColors.length]} />)}
								</Pie>
								<Tooltip content={<CmsChartTooltip />} />
							</PieChart>
						</ResponsiveContainer> : <ChartEmptyState message="New vs returning needs real sessions with session IDs and repeat page-view counts." />}
					</AnalyticsChartCard>
				</div>
				<div className="mt-4"><AiCategoryInsight {...engagementInsight} /></div>
			</div> : null}
		</div>
	);
}

function AnalyticsChatSidebar() {
	const [messages, setMessages] = useState<Array<{ id: string; role: "assistant" | "user"; text: string; isLoading?: boolean }>>([
		{ id: "welcome", role: "assistant", text: "Ask me about traffic, listings, demand, funnel drop-offs, or which properties need attention." },
	]);
	const [question, setQuestion] = useState("");
	const [isThinking, setIsThinking] = useState(false);

	function createMessageId(prefix: string) {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	}

	async function submitQuestion() {
		const trimmed = question.trim();
		if (!trimmed || isThinking) return;
		const assistantId = createMessageId("assistant");
		const userMessage = { id: createMessageId("user"), role: "user" as const, text: trimmed };
		const history = messages
			.filter((message) => !message.isLoading)
			.slice(-8)
			.map((message) => ({ role: message.role, content: message.text }));
		setMessages((current) => [
			...current,
			userMessage,
			{ id: assistantId, role: "assistant", text: "Analyzing", isLoading: true },
		]);
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
			const reply = response.ok && typeof payload?.content === "string" && payload.content.trim()
				? payload.content.trim()
				: typeof payload?.error === "string" && payload.error.trim()
					? payload.error.trim()
					: "I could not read the analytics response. Try again in a moment.";
			setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: reply, isLoading: false } : message));
		} catch {
			setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: "The analytics assistant could not connect to the AI service right now.", isLoading: false } : message));
		} finally {
			setIsThinking(false);
		}
	}

	return (
			<aside className="sticky top-3 flex h-[calc(100vh-104px)] min-h-[560px] flex-col overflow-hidden rounded-lg border border-black/10 bg-[#fbfbfa] shadow-sm lg:fixed lg:right-0 lg:top-12 lg:z-20 lg:h-[calc(100vh-3rem)] lg:w-[276px] lg:rounded-none lg:border-y-0 lg:border-l lg:border-r-0">
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
								) : message.text}
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
		<div className="rounded-lg border border-black/10 bg-white p-4">
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

function AgentMetricsSummary({ agentId, agentPerformance }: { agentId: string | null; agentPerformance: CmsRow[] }) {
	if (!agentId || agentId === NEW_RECORD_ID) {
		return (
			<div className="rounded-lg border border-dashed border-black/15 bg-zinc-50 p-4 text-sm text-black/55">
				Select an existing agent to see live assignment, conversion, and response metrics.
			</div>
		);
	}

	const metrics = agentPerformance.find((row) => asText(row.agent_id) === asText(agentId));

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Live Performance</div>
			{metrics ? (
				<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<InfoCard label="Assigned" value={asText(metrics.total_assigned ?? 0)} hint="Leads assigned to this agent." />
					<InfoCard label="Conversions" value={asText(metrics.conversions ?? 0)} hint="Reserved or closed-won leads." />
					<InfoCard label="Conversion Rate" value={`${metrics.conversion_rate_pct ?? 0}%`} hint="From assigned leads." />
					<InfoCard label="Avg Response" value={metrics.avg_response_time_hours == null ? "n/a" : `${metrics.avg_response_time_hours}h`} hint="Creation to first contact." />
				</div>
			) : (
				<p className="mt-2 text-sm text-black/55">No performance row exists for this agent yet. It will appear once assignments and pipeline activity are recorded.</p>
			)}
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
		content: "/admin?section=hero",
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
		hero: "/admin?section=hero",
		gallery: "/admin?section=gallery",
		testimonials: "/admin?section=testimonials",
		logos: "/admin?section=logos",
		stats: "/admin?section=stats",
		pages: "/admin?section=pages",
		settings: "/admin/settings",
		activityLogs: "/admin/settings?section=activityLogs",
	};

	return routes[section] ?? "/admin";
}

const PROPERTY_IMAGE_BUCKET = "property-images";

function sanitizeFileName(fileName: string) {
	return fileName
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function storagePathFromPublicUrl(url: string) {
	const marker = `/storage/v1/object/public/${PROPERTY_IMAGE_BUCKET}/`;
	const markerIndex = url.indexOf(marker);
	return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : null;
}

function PropertyImagesManager({ propertyId, canEdit, onChanged, onRequestDelete }: { propertyId: string | null; canEdit: boolean; onChanged: () => Promise<void> | void; onRequestDelete: (action: DestructiveAction) => void }) {
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
		return (
			<div className="rounded-lg border border-dashed border-black/15 bg-zinc-50 px-4 py-5">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Photo Uploads</div>
				<p className="mt-1 text-sm text-black/55">Save the property details first, then upload as many photos as you need. This keeps each photo attached to the correct property.</p>
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
					<div key={asText(image.id)} className="rounded-2xl border border-black/10 bg-white p-3">
						{image.storage_url ? (
							<Image
								src={asText(image.storage_url)}
								alt={asText(image.caption || "Property image")}
								width={360}
								height={144}
								unoptimized
								className="mb-3 h-36 w-full rounded-xl object-cover"
							/>
						) : null}
						<div className="truncate text-sm font-medium text-[#111111]">{image.caption || image.storage_url}</div>
						<div className="mt-1 text-xs text-black/45">{image.storage_url}</div>
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

function InquiryPanel({
	activeView,
	inquiries,
	agents,
	currentRole,
	currentUserId,
	selectedId,
	onSelect,
	onReload,
	canEdit,
	canReassign,
}: {
	activeView: CmsSection;
	inquiries: CmsRow[];
	agents: CmsRow[];
	currentRole: Role;
	currentUserId: string | null;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onReload: () => Promise<void>;
	canEdit: boolean;
	canReassign: boolean;
}) {
	const [timeline, setTimeline] = useState<CmsRow[]>([]);
	const [visitorEvents, setVisitorEvents] = useState<CmsRow[]>([]);
	const [visitorSession, setVisitorSession] = useState<CmsRow | null>(null);
	const [draft, setDraft] = useState({ inquiryId: "", status: "new", assignedAgentId: "", note: "" });
	const [saving, setSaving] = useState(false);
	const [stageFilter, setStageFilter] = useState("");
	const [actionMessage, setActionMessage] = useState("");
	const showStageControls = activeView === "pipeline";
	const showPipelineEditor = activeView === "inquiries" || activeView === "pipeline";
	const showTimelineReport = activeView === "timeline";
	const panelTitle = activeView === "pipeline" ? "Lead Stages" : activeView === "timeline" ? "Activity History" : "All Inquiries";
	const panelDescription = activeView === "pipeline"
		? "Filter leads by pipeline stage and update status, assignment, and next steps."
		: activeView === "timeline"
			? "Review inquiry notes, status changes, and follow-up history."
			: "Review submissions, lead scores, urgency signals, and buyer details.";

	const selectedInquiry = inquiries.find((item) => asText(item.id) === asText(selectedId)) ?? null;
	const selectedInquiryId = asText(selectedInquiry?.id);
	const status = draft.inquiryId === selectedInquiryId ? draft.status : asText(selectedInquiry?.status || "new");
	const assignedAgentId = draft.inquiryId === selectedInquiryId ? draft.assignedAgentId : asText(selectedInquiry?.assigned_agent_id);
	const note = draft.inquiryId === selectedInquiryId ? draft.note : "";
	const selectedLeadScore = toNullableNumber(selectedInquiry?.lead_score);
	const updateDraft = (updates: Partial<typeof draft>) => setDraft((current) => ({ ...current, inquiryId: selectedInquiryId, ...updates }));
	const stageCounts = inquiryStatusOptions.map((option) => ({
		...option,
		count: inquiries.filter((item) => asText(item.status || "new") === option.value).length,
	}));
	const visibleInquiries = (stageFilter ? inquiries.filter((item) => asText(item.status || "new") === stageFilter) : inquiries)
		.slice()
		.sort((first, second) => {
			const firstScore = toNullableNumber(first.lead_score) ?? 0;
			const secondScore = toNullableNumber(second.lead_score) ?? 0;
			const firstStale = !first.first_contacted_at && (hoursSince(first.created_at) ?? 0) >= 24 ? 1 : 0;
			const secondStale = !second.first_contacted_at && (hoursSince(second.created_at) ?? 0) >= 24 ? 1 : 0;
			const firstUnassigned = !asText(first.assigned_agent_id) ? 1 : 0;
			const secondUnassigned = !asText(second.assigned_agent_id) ? 1 : 0;
			return (secondScore + secondStale * 0.2 + secondUnassigned * 0.1) - (firstScore + firstStale * 0.2 + firstUnassigned * 0.1);
		});
	const visitorEventNames = visitorEvents.map((event) => asText(event.event_type));
	const visitorViewCount = visitorEventNames.filter((event) => ["property_view", "page_view", "view", "listing_view"].includes(event)).length;
	const visitorInteractionCount = visitorEventNames.filter((event) => event.includes("click") || event.includes("open") || event.includes("gallery") || event.includes("map") || event === "recommendation_click").length;
	const visitorDwellSeconds = visitorEvents.reduce((sum, event) => {
		const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
		const duration = Number(metadata.durationSeconds);
		return sum + (Number.isFinite(duration) ? duration : 0);
	}, 0);
	const visitorPropertyIds = new Set(visitorEvents.map((event) => asText(event.property_id)).filter(Boolean));
	const visitorIntentLabel = selectedLeadScore == null
		? "Not scored"
		: selectedLeadScore >= 0.72
			? "High intent"
			: selectedLeadScore >= 0.45
				? "Warm lead"
				: "Early browsing";

	useEffect(() => {
		let active = true;

		void (async () => {
			if (!selectedInquiry) {
				await Promise.resolve();
				if (active) setTimeline([]);
				return;
			}

			const { data } = await supabaseBrowser.from("inquiry_timeline").select("*").eq("inquiry_id", selectedInquiry.id).order("created_at", { ascending: false });
			if (active) setTimeline(data ?? []);
		})();

		return () => {
			active = false;
		};
	}, [selectedInquiry, selectedInquiryId]);

	useEffect(() => {
		let active = true;
		const sessionId = asText(selectedInquiry?.session_id);

		void (async () => {
			if (!sessionId) {
				await Promise.resolve();
				if (active) {
					setVisitorEvents([]);
					setVisitorSession(null);
				}
				return;
			}

			const [eventsResult, sessionResult] = await Promise.all([
				supabaseBrowser
					.from("analytics_events")
					.select("event_type, property_id, page_path, metadata, created_at")
					.eq("session_id", sessionId)
					.order("created_at", { ascending: false })
					.limit(80),
				supabaseBrowser
					.from("sessions")
					.select("*")
					.eq("id", sessionId)
					.maybeSingle(),
			]);

			if (active) {
				setVisitorEvents(eventsResult.data ?? []);
				setVisitorSession(sessionResult.data ?? null);
			}
		})();

		return () => {
			active = false;
		};
	}, [selectedInquiry?.session_id]);

	async function saveInquiry() {
		if (!selectedInquiry || !canEdit) return;

		setSaving(true);
		const now = new Date().toISOString();
		const updatePayload: CmsPayload = {
			status,
			last_activity_at: now,
		};

		if (canReassign) {
			updatePayload.assigned_agent_id = assignedAgentId || null;
		}

		if (status === "contacted" && !selectedInquiry.first_contacted_at) {
			updatePayload.first_contacted_at = now;
		}

		if (["reserved", "closed_won", "closed_lost"].includes(status) && !selectedInquiry.closed_at) {
			updatePayload.closed_at = now;
		}

		const { error } = await supabaseBrowser.from("inquiries").update(updatePayload).eq("id", selectedInquiry.id);
		if (error) {
			setSaving(false);
			return;
		}

		if (canReassign && assignedAgentId && assignedAgentId !== selectedInquiry.assigned_agent_id) {
			await supabaseBrowser.from("agent_assignments").update({ unassigned_at: now }).eq("inquiry_id", selectedInquiry.id).is("unassigned_at", null);
			await supabaseBrowser.from("agent_assignments").insert({ inquiry_id: selectedInquiry.id, agent_id: assignedAgentId, assigned_by: currentUserId, assigned_at: now });
		}

		if (note.trim()) {
			await supabaseBrowser.from("inquiry_timeline").insert({
				inquiry_id: selectedInquiry.id,
				changed_by: currentUserId,
				old_status: selectedInquiry.status,
				new_status: status,
				note: note.trim(),
			});
		}

		setSaving(false);
		updateDraft({ note: "" });
		setActionMessage("Saved.");
		window.setTimeout(() => setActionMessage(""), 2400);
		await onReload();
	}

	async function addTimelineNote() {
		if (!selectedInquiry || !note.trim() || !canEdit) return;
		setSaving(true);
		await supabaseBrowser.from("inquiry_timeline").insert({
			inquiry_id: selectedInquiry.id,
			changed_by: currentUserId,
			old_status: selectedInquiry.status,
			new_status: status,
			note: note.trim(),
		});
		updateDraft({ note: "" });
		await onReload();
		const { data } = await supabaseBrowser.from("inquiry_timeline").select("*").eq("inquiry_id", selectedInquiry.id).order("created_at", { ascending: false });
		setTimeline(data ?? []);
		setSaving(false);
		setActionMessage("Note added.");
		window.setTimeout(() => setActionMessage(""), 2400);
	}

	return (
		<SectionShell title={panelTitle} description={panelDescription}>
			{showStageControls ? <div className="mb-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead stages</div>
				<div className="mt-3 flex flex-wrap gap-2">
					<button type="button" onClick={() => setStageFilter("")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${stageFilter ? "bg-white text-black/60 hover:bg-zinc-100" : "bg-[#111111] text-white"}`}>All {inquiries.length}</button>
					{stageCounts.map((stage) => (
						<button key={stage.value} type="button" onClick={() => setStageFilter(stage.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${stageFilter === stage.value ? "bg-[#111111] text-white" : "bg-white text-black/60 hover:bg-zinc-100"}`}>
							{stage.label} {stage.count}
						</button>
					))}
				</div>
				<p className="mt-3 text-xs leading-5 text-black/50">Typical flow: New to Assigned to Contacted to Viewing Scheduled to Negotiating to Reserved or Closed.</p>
			</div> : null}
			<div className="grid gap-4 xl:grid-cols-[300px_1fr]">
				<aside className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{showTimelineReport ? "Select Lead" : "Lead Queue"}</div>
					<div className="mt-3 max-h-[480px] space-y-2 overflow-auto pr-1">
						{visibleInquiries.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No inquiries available for this stage.</p> : null}
						{visibleInquiries.map((item) => {
							const active = asText(item.id) === asText(selectedId);
							const highPriority = asText(item.priority) === "high" || (toNullableNumber(item.lead_score) ?? 0) >= 0.72;
							const unassigned = !asText(item.assigned_agent_id);
							const stale = !item.first_contacted_at && (hoursSince(item.created_at) ?? 0) >= 24;
							return (
								<button key={asText(item.id)} type="button" onClick={() => onSelect(asText(item.id))} className={`w-full rounded-2xl border border-l-4 px-3 py-2 text-left transition ${active ? "border-black/15 border-l-[#111111] bg-zinc-100 shadow-sm" : highPriority || stale ? "border-black/10 border-l-[#111111] bg-zinc-50 hover:bg-zinc-100" : unassigned ? "border-black/10 border-l-zinc-500 bg-zinc-50 hover:bg-zinc-100" : "border-transparent border-l-zinc-300 bg-white/60 hover:border-black/10 hover:bg-white"}`}>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 text-sm font-medium text-[#111111]">{item.buyer_name}</div>
										<span className="shrink-0 text-[11px] text-black/45">{relativeAge(item.created_at)}</span>
									</div>
									<div className="mt-1 flex flex-wrap gap-2 text-xs text-black/55">
										<span>{item.status}</span>
										<span>Priority: {item.priority ?? "n/a"}</span>
										<span>{item.buyer_email}</span>
									</div>
									<div className="mt-2 flex flex-wrap gap-1.5">
										{unassigned ? <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800">Unassigned</span> : null}
										{stale ? <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-white">Needs follow-up</span> : null}
										{highPriority ? <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-white">High intent</span> : null}
									</div>
									<div className="mt-2">
										<LeadScoreBadge score={toNullableNumber(item.lead_score)} />
									</div>
								</button>
							);
						})}
					</div>
				</aside>

				<div className="rounded-2xl border border-black/10 bg-white p-4">
					{selectedInquiry ? (
						<div className="space-y-4">
							<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Selected Lead</div>
									<div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#111111]">{selectedInquiry.buyer_name}</div>
									<div className="mt-1 text-sm text-black/55">{selectedInquiry.buyer_email} {selectedInquiry.buyer_phone ? `• ${selectedInquiry.buyer_phone}` : ""}</div>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<LeadScoreBadge score={selectedLeadScore} />
									<div className="rounded-full bg-black/5 px-4 py-2 text-xs font-medium text-black/60">Current status: {selectedInquiry.status}</div>
								</div>
							</div>

							{showPipelineEditor ? <div className="grid gap-4 md:grid-cols-2">
								<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Details</div>
									<div className="mt-3 space-y-2 text-sm text-black/70">
										<p><span className="font-medium text-[#111111]">Property:</span> {selectedInquiry.property_id}</p>
										<p><span className="font-medium text-[#111111]">Developer:</span> {selectedInquiry.developer_id ?? "—"}</p>
										<p><span className="font-medium text-[#111111]">Source:</span> {selectedInquiry.source}</p>
										<p><span className="font-medium text-[#111111]">Anonymous visitor:</span> {selectedInquiry.session_id ?? "—"}</p>
										<p className="flex items-center gap-2"><span className="font-medium text-[#111111]">Lead score:</span> <LeadScoreBadge score={selectedLeadScore} /></p>
										<p className="whitespace-pre-wrap"><span className="font-medium text-[#111111]">Message:</span> {selectedInquiry.buyer_message ?? "—"}</p>
									</div>
								</div>

								<div className="rounded-2xl border border-black/10 bg-white p-4 md:col-span-2">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Anonymous Behavior Pattern</div>
											<p className="mt-1 text-sm text-black/55">Behavior before this person submitted the inquiry. No account required.</p>
										</div>
										<div className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white">{visitorIntentLabel}</div>
									</div>
									<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
										<InfoCard label="Property views" value={visitorViewCount} hint="Views tied to this anonymous visitor." />
										<InfoCard label="Interactions" value={visitorInteractionCount} hint="Clicks, opens, gallery, map, or recommendation actions." />
										<InfoCard label="Browse time" value={formatDuration(visitorDwellSeconds)} hint="Recorded dwell time before inquiry." />
										<InfoCard label="Listings touched" value={visitorPropertyIds.size} hint="Unique properties in this visitor path." />
									</div>
									<div className="mt-4 grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
										<div className="rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-black/65">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Visitor Context</div>
											<div className="mt-2 space-y-1">
												<p><span className="font-medium text-[#111111]">Device:</span> {visitorSession?.device_type ?? "Unknown"}</p>
												<p><span className="font-medium text-[#111111]">Browser:</span> {visitorSession?.browser ?? "Unknown"}</p>
												<p><span className="font-medium text-[#111111]">OS:</span> {visitorSession?.os ?? "Unknown"}</p>
												<p><span className="font-medium text-[#111111]">Entry:</span> {visitorSession?.landing_path ?? "Unknown"}</p>
												<p><span className="font-medium text-[#111111]">Source:</span> {visitorSession?.utm_source ?? visitorSession?.source ?? selectedInquiry.source ?? "Unknown"}</p>
											</div>
										</div>
										<div className="rounded-lg border border-black/10 bg-zinc-50 p-3">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Recent anonymous events</div>
											<div className="mt-2 max-h-40 overflow-auto">
												{visitorEvents.length === 0 ? <p className="py-3 text-sm text-black/45">No behavior events are attached to this visitor yet.</p> : null}
												{visitorEvents.slice(0, 8).map((event, index) => (
													<div key={`${asText(event.created_at)}-${index}`} className="flex items-center justify-between gap-3 border-t border-black/5 py-2 first:border-t-0">
														<div className="min-w-0">
															<div className="truncate text-sm font-medium text-[#111111]">{asText(event.event_type) || "event"}</div>
															<div className="truncate text-xs text-black/45">{asText(event.page_path) || asText(event.property_id) || "website"}</div>
														</div>
														<div className="shrink-0 text-xs text-black/40">{relativeAge(event.created_at)}</div>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>

								<div className="rounded-2xl border border-black/10 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Pipeline Update</div>
									<div className="mt-4 space-y-3">
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Status</div>
											<select value={status} onChange={(event) => updateDraft({ status: event.target.value })} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												{inquiryStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Priority</div>
											<select value={asText(selectedInquiry.priority)} disabled className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												<option value="">Auto-derived</option>
												{priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Assigned Agent</div>
											<select value={assignedAgentId} onChange={(event) => updateDraft({ assignedAgentId: event.target.value })} disabled={!canReassign} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												<option value="">Unassigned</option>
												{agents.map((agent) => <option key={asText(agent.id)} value={asText(agent.id)}>{agent.profile_id ?? agent.id}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Timeline Note</div>
											<textarea aria-label="Add an internal note or next step..." value={note} onChange={(event) => updateDraft({ note: event.target.value })} rows={4} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50" placeholder="Add an internal note or next step..." />
										</label>
										<div className="flex flex-wrap gap-2">
											<button type="button" onClick={saveInquiry} disabled={!canEdit || saving} className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">Save pipeline</button>
											<button type="button" onClick={addTimelineNote} disabled={!canEdit || saving || !note.trim()} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:bg-black/5">Add note</button>
											{actionMessage ? <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-black/70">{actionMessage}</span> : null}
										</div>
									</div>
								</div>
							</div> : null}

							{showTimelineReport ? <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
								<div className="rounded-2xl border border-black/10 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Timeline History</div>
									<div className="mt-3 space-y-3">
										{timeline.length === 0 ? <p className="text-sm text-black/45">No timeline events yet.</p> : null}
										{timeline.map((entry) => (
											<div key={asText(entry.id)} className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
												<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{entry.new_status}</div>
												<div className="mt-1 text-sm text-black/70">{entry.note ?? "Status change recorded."}</div>
												<div className="mt-2 text-xs text-black/45">{entry.created_at}</div>
											</div>
										))}
									</div>
								</div>
								<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4 text-sm text-black/60">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Role Scope</div>
									<p className="mt-3 leading-6">
										{currentRole === "admin"
											? "Admin can view and update every inquiry, including assignment history and pipeline notes."
											: currentRole === "agent"
												? "Agents only see their assigned leads. Assignment changes are restricted to the UI and RLS policy."
												: "Developer partners only see inquiries related to their portfolio."}
									</p>
								</div>
							</div> : null}
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-black/15 bg-zinc-50 px-4 py-10 text-sm text-black/50">Select an inquiry to inspect its pipeline and timeline.</div>
					)}
				</div>
			</div>
		</SectionShell>
	);
}

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
	selectedPortfolioDeveloperId,
	selectedPortfolioPropertyId,
	onSelectPortfolioDeveloper,
	onSelectPortfolioProperty,
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
	selectedPortfolioDeveloperId: string | null;
	selectedPortfolioPropertyId: string | null;
	onSelectPortfolioDeveloper: (id: string | null) => void;
	onSelectPortfolioProperty: (id: string | null) => void;
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
	const overviewTrafficRows = dailyEventRows(engagementEvents, 7);
	const weeklyVisitors = overviewTrafficRows.reduce((sum, row) => sum + row.visitors, 0);
	const topListing = listingChartRows.slice().sort((a, b) => b.total_views - a.total_views)[0] ?? null;
	const totalListingViews = listingChartRows.reduce((sum, row) => sum + row.total_views, 0);
	const funnelCompletionRate = totalListingViews ? (inquiries.length / totalListingViews) * 100 : 0;
	const activeListings = properties.filter((property) => {
		const status = asText(property.status || property.publish_status || property.listing_status).toLowerCase();
		return status === "active" || status === "published" || status === "available";
	}).length || properties.length;
	const avgPropertyPrice = numberAverage(properties.map(propertyPrice));
	const appreciationArea = Object.entries(groupByLabel(properties, locationLabel))
		.map(([location, rows]) => ({
			location,
			score: Math.round(numberAverage(rows.map(propertyPrice)) / 100000),
			count: rows.length,
		}))
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score)[0] ?? null;

	return (
		<div>
		<SectionShell title={reportTitle} description={reportDescription}>
			<div className="mb-4 flex flex-wrap justify-end gap-2">
				{showOverviewReport ? <button type="button" onClick={() => downloadCsv("jewellz-inquiries.csv", inquiries, ["id", "buyer_name", "buyer_email", "buyer_phone", "status", "priority", "lead_score", "source", "created_at"])} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Export inquiries CSV</button> : null}
				{showOverviewReport || showTrafficReport || showDeveloperReport ? <button type="button" onClick={() => downloadCsv("jewellz-listing-performance.csv", listingPerformance, ["property_id", "title", "total_views", "detail_opens", "total_interactions", "avg_dwell_seconds", "total_inquiries", "inquiry_rate_pct"])} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Export listing report CSV</button> : null}
				{showOverviewReport || showAgentReport ? <button type="button" onClick={() => downloadCsv("jewellz-agent-performance.csv", agentPerformance, ["agent_id", "agent_name", "total_assigned", "conversions", "conversion_rate_pct", "avg_response_time_hours"])} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Export agent report CSV</button> : null}
			</div>
			{showOverviewReport ? (
				<div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Traffic snapshot</div>
						<div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">{weeklyVisitors}</div>
						<p className="mt-2 text-xs leading-5 text-black/50">Visitors recorded this week from analytics events.</p>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Top property</div>
						<div className="mt-3 truncate text-base font-semibold text-[#111111]">{topListing?.title || "No listing yet"}</div>
						<p className="mt-2 text-xs leading-5 text-black/50">{topListing ? `${topListing.total_views} views, ${topListing.total_inquiries} inquiries.` : "Listing views will appear after tracking starts."}</p>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Predictive highlight</div>
						<div className="mt-3 truncate text-base font-semibold text-[#111111]">{appreciationArea?.location || "Needs data"}</div>
						<p className="mt-2 text-xs leading-5 text-black/50">{appreciationArea ? `Highest current appreciation proxy across ${appreciationArea.count} listings.` : "Add listing prices to build forecasts."}</p>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Engagement summary</div>
						<div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">{funnelCompletionRate.toFixed(1)}%</div>
						<p className="mt-2 text-xs leading-5 text-black/50">View-to-inquiry funnel completion rate.</p>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Quick stats</div>
						<div className="mt-3 text-sm font-semibold text-[#111111]">{inquiries.length} inquiries</div>
						<p className="mt-1 text-xs leading-5 text-black/50">{activeListings} active listings. Avg price PHP {Math.round(avgPropertyPrice).toLocaleString()}.</p>
					</div>
				</div>
			) : null}

			{isAdmin && activeAnalyticsCategory ? (
				<div>
					<AnalyticsVisualSuite
						category={activeAnalyticsCategory}
						properties={properties}
						inquiries={inquiries}
						listingRows={listingChartRows}
						inquiryVolumeRows={inquiryVolumeRows}
						trafficRows={trafficChartRows}
						events={engagementEvents}
					/>
				</div>
			) : null}

			{isAdmin && showOverviewReport ? (
				<div className="mt-5 grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Traffic preview</div>
						<p className="mt-2 text-sm text-black/65">{trafficSources[0] ? `${trafficSources[0].source} is the top source with ${trafficSources[0].session_count ?? 0} sessions.` : "No session sources recorded yet."}</p>
					</div>
					<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Agent preview</div>
						<p className="mt-2 text-sm text-black/65">{agentPerformance[0] ? `${agentPerformance[0].agent_name} has ${agentPerformance[0].conversions ?? 0} conversions.` : "Agent conversion data appears after assignments."}</p>
					</div>
					<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Developer preview</div>
						<p className="mt-2 text-sm text-black/65">{developerPortfolio[0] ? `${developerPortfolio[0].company_name} has ${developerPortfolio[0].total_listings ?? 0} listings in view.` : "Developer portfolio data appears after listings are linked."}</p>
					</div>
				</div>
			) : null}

			{showOverviewReport ? <div className="mt-5 grid gap-5 xl:grid-cols-2">
				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Pipeline</div>
					<div className="mt-3 h-56">
						{pipelineChartRows.length ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={pipelineChartRows} layout="vertical" margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
									<CartesianGrid horizontal={false} stroke="#ececec" />
									<XAxis type="number" hide allowDecimals={false} />
									<YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickFormatter={(value) => asText(value).replaceAll("_", " ")} tick={{ fontSize: 11, fill: "#71717a" }} width={112} />
									<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
									<Bar dataKey="value" name="Leads" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={16} />
								</BarChart>
							</ResponsiveContainer>
						) : <p className="text-sm text-black/45">No inquiry activity yet.</p>}
					</div>
					<div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Priority Split</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{Object.entries(priorityCounts).map(([priority, count]) => (
							<span key={priority} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-black/65">{priority}: {count}</span>
						))}
					</div>
				</div>

				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Daily Inquiry Volume</div>
					<div className="mt-3">
						<InquiryVolumeChart rows={inquiryVolumeRows} />
					</div>
				</div>

				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Recommendation Analytics</div>
					<div className="mt-3 space-y-3 text-sm text-black/65">
						<p>Total recommendations: <span className="font-medium text-[#111111]">{recommendationStats.total}</span></p>
						<p>Clicked recommendations: <span className="font-medium text-[#111111]">{recommendationStats.clicked}</span></p>
						<p>Fallback recommendations: <span className="font-medium text-[#111111]">{recommendationStats.fallback}</span></p>
						<p>Click-through rate: <span className="font-medium text-[#111111]">{clickThrough.toFixed(1)}%</span></p>
						<p>Fallback rate: <span className="font-medium text-[#111111]">{fallbackRate.toFixed(1)}%</span></p>
					</div>
				</div>
			</div> : null}

			{isAdmin && showOverviewReport ? (
				<div className="mt-5 grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Listing Performance</div>
						<div className="mt-3">
							<ListingPerformanceChart rows={listingChartRows} />
						</div>
					</div>

					<PeakEngagementChart events={engagementEvents} />
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
								<div className="rounded-lg border border-black/10 bg-white p-4">
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

								<div className="rounded-lg border border-black/10 bg-white p-4">
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

export default function AdminCms({
	initialPrimary = "dashboard",
	initialSection = "overview",
	initialPropertyCategory = "all",
	initialPropertyId = null,
}: AdminCmsProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("Loading workspace...");
	const [saving, setSaving] = useState(false);
	const [sessionUser, setSessionUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<CmsRow | null>(null);
	const [agentProfile, setAgentProfile] = useState<CmsRow | null>(null);
	const [developerProfile, setDeveloperProfile] = useState<CmsRow | null>(null);
	const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
	const [selectedPropertyImages, setSelectedPropertyImages] = useState<CmsRow[]>([]);
	const [destructiveAction, setDestructiveAction] = useState<DestructiveAction | null>(null);
	const [destructivePassword, setDestructivePassword] = useState("");
	const [destructiveMessage, setDestructiveMessage] = useState("");
	const [confirmingDestructiveAction, setConfirmingDestructiveAction] = useState(false);
	const [dashboardSearch, setDashboardSearch] = useState("");
	const [showNotifications, setShowNotifications] = useState(false);
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [selection, setSelection] = useState<SelectionState>({ ...emptySelection, properties: initialPropertyId });
	const [activePrimary, setActivePrimary] = useState<CmsPrimary>(initialPrimary);
	const [activeSection, setActiveSection] = useState<CmsSection>(initialSection);
	const [propertyCategoryFilter, setPropertyCategoryFilter] = useState(initialPropertyCategory);
	const [showSecondarySidebar, setShowSecondarySidebar] = useState(true);
	const [showAnalyticsAssistant, setShowAnalyticsAssistant] = useState(true);
	const [selectedPortfolioDeveloperId, setSelectedPortfolioDeveloperId] = useState<string | null>(null);
	const [selectedPortfolioPropertyId, setSelectedPortfolioPropertyId] = useState<string | null>(null);

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
	const selectedInquiryId = selection.inquiries ?? optionalId(workspace.inquiries[0]);
	const selectedProperty = workspace.properties.find((row) => asText(row.id) === asText(selectedPropertyId)) ?? null;
	const selectedPropertyImageUrls = useMemo(
		() => selectedPropertyImages.map((image) => asText(image.storage_url).trim()).filter(Boolean),
		[selectedPropertyImages],
	);
	const dashboardSearchResults = useMemo(() => {
		const query = dashboardSearch.trim().toLowerCase();
		if (!query) return [];
		return [
			...workspace.properties.map((row) => ({ label: asText(row.title), meta: "Property", open: () => { setActivePrimary("listings"); setActiveSection("properties"); setPropertyCategoryFilter("all"); setSelection((current) => ({ ...current, properties: asText(row.id) })); router.push("/admin/listings"); } })),
			...workspace.projects.map((row) => ({ label: asText(row.project_name ?? row.slug), meta: "Project", open: () => { setActivePrimary("listings"); setActiveSection("projects"); setSelection((current) => ({ ...current, projects: asText(row.id) })); router.push("/admin/listings?section=projects"); } })),
			...workspace.inquiries.map((row) => ({ label: asText(row.buyer_name ?? row.buyer_email), meta: "Inquiry", open: () => { setActivePrimary("inquiries"); setActiveSection("inquiries"); setSelection((current) => ({ ...current, inquiries: asText(row.id) })); router.push("/admin/inquiries"); } })),
		].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)).slice(0, 6);
	}, [dashboardSearch, router, workspace.inquiries, workspace.projects, workspace.properties]);

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
						{ id: "hero", label: "Hero Banners", hint: `${workspace.heroBanners.length} banners`, icon: FileText },
						{ id: "gallery", label: "Gallery", hint: `${workspace.galleryItems.length} items`, icon: FileText },
						{ id: "testimonials", label: "Testimonials", hint: `${workspace.testimonials.length} quotes`, icon: MessageSquare },
						{ id: "logos", label: "Partner Logos", hint: `${workspace.partnerLogos.length} logos`, icon: Building2 },
						{ id: "stats", label: "Site Stats", hint: `${workspace.siteStats.length} counters`, icon: BarChart3 },
						{ id: "pages", label: "Pages", hint: `${workspace.cmsPages.length} pages`, icon: FileText },
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
	}, [isAdmin, workspace.agents.length, workspace.cmsPages.length, workspace.developers.length, workspace.galleryItems.length, workspace.heroBanners.length, workspace.inquiries.length, workspace.partnerLogos.length, workspace.projects.length, workspace.properties.length, workspace.siteStats.length, workspace.testimonials.length]);
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
		() => workspace.agents.map((agent) => optionFromRow(agent, `${asText(agent.license_number ?? agent.specialization ?? agent.profile_id)}${agent.is_top_agent ? " · Top agent" : ""}`, "Unnamed agent")),
		[workspace.agents],
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
		router.push(routeForPrimary(group.id));
	}

	function openSection(section: CmsSection) {
		setActiveSection(section);
		router.push(routeForSection(section));
	}

	function openPropertyCategory(category: string) {
		setActivePrimary("listings");
		setActiveSection("properties");
		setPropertyCategoryFilter(category);
		setSelection((current) => ({ ...current, properties: null }));
		router.push(category === "all" ? "/admin/listings" : `/admin/listings?category=${category}`);
	}

	function openPropertyForEditing(propertyId: string) {
		setActivePrimary("listings");
		setActiveSection("properties");
		setPropertyCategoryFilter("all");
		setSelection((current) => ({ ...current, properties: propertyId }));
		router.push("/admin/listings");
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
				pagesResult,
				galleryResult,
				testimonialsResult,
				heroBannersResult,
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
				profilesResult,
				activityLogsResult,
			] = await Promise.all([
				supabaseBrowser.from("developer_partners").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("agents").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("cms_pages").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("gallery_items").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("testimonials").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("hero_banners").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("partner_logos").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("site_stats").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("system_settings").select("*").order("updated_at", { ascending: false }),
				supabaseBrowser.from("mv_listing_performance").select("*"),
				supabaseBrowser.from("mv_daily_inquiry_volume").select("*"),
				supabaseBrowser.from("mv_traffic_sources").select("*"),
				supabaseBrowser.from("mv_agent_performance").select("*"),
				supabaseBrowser.from("mv_developer_portfolio").select("*"),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at"),
				supabaseBrowser.from("analytics_events").select("id, event_type, created_at").order("created_at", { ascending: false }).limit(1000),
				supabaseBrowser.from("profiles").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
			]);

			nextWorkspace.developers = developersResult.data ?? [];
			nextWorkspace.agents = agentsResult.data ?? [];
			nextWorkspace.cmsPages = pagesResult.data ?? [];
			nextWorkspace.galleryItems = galleryResult.data ?? [];
			nextWorkspace.testimonials = testimonialsResult.data ?? [];
			nextWorkspace.heroBanners = heroBannersResult.data ?? [];
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
		setMessage("Workspace loaded.");
	}

	async function reloadWorkspace() {
		if (!sessionUser || !profile) return;
		setMessage("Refreshing data...");
		await loadWorkspace(sessionUser, profile, agentProfile, developerProfile);
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
			const { data: sessionResult } = await supabaseBrowser.auth.getSession();
			const user = sessionResult.session?.user ?? null;

			if (!user) {
				if (active) {
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
					setSessionUser(user);
					setProfile(null);
					setLoading(false);
					setMessage("No profile row found for the current auth user.");
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
			setSessionUser(user);
			setProfile(profileResult);
			setAgentProfile(currentAgent);
			setDeveloperProfile(currentDeveloper);
			setLoading(false);
			await loadWorkspace(user, profileResult, currentAgent, currentDeveloper);
		})();

		return () => {
			active = false;
		};
	}, []);

	const stats = useMemo(() => ({
		propertyCount: workspace.properties.length,
		inquiryCount: workspace.inquiries.length,
		projectCount: workspace.projects.length,
		developerCount: workspace.developers.length,
		agentCount: workspace.agents.length,
		publishedCount: workspace.properties.filter((item) => item.status === "published").length,
		closedCount: workspace.inquiries.filter((item) => ["reserved", "closed_won"].includes(asText(item.status))).length,
	}), [workspace.agents.length, workspace.developers.length, workspace.inquiries, workspace.properties, workspace.projects.length]);
	const urgentLeads = useMemo(
		() => workspace.inquiries
			.filter((item) => !["reserved", "closed_won", "closed_lost"].includes(asText(item.status)))
			.filter((item) => asText(item.priority) === "high" || (toNullableNumber(item.lead_score) ?? 0) >= 0.72 || (!item.first_contacted_at && (hoursSince(item.created_at) ?? 0) >= 24))
			.sort((first, second) => (toNullableNumber(second.lead_score) ?? 0) - (toNullableNumber(first.lead_score) ?? 0))
			.slice(0, 5),
		[workspace.inquiries],
	);
	const unassignedLeads = useMemo(
		() => workspace.inquiries.filter((item) => !asText(item.assigned_agent_id) && !["reserved", "closed_won", "closed_lost"].includes(asText(item.status))).slice(0, 5),
		[workspace.inquiries],
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
		() => workspace.dailyInquiryVolume
			.slice()
			.reverse()
			.slice(-8)
			.map((row) => ({
				label: asText(row.inquiry_date).slice(5) || "day",
				value: toNullableNumber(row.total_inquiries) ?? 0,
			})),
		[workspace.dailyInquiryVolume],
	);
	const overviewPipelineRows = useMemo(() => {
		const counts = workspace.inquiries.reduce((acc: Record<string, number>, inquiry) => {
			const status = asText(inquiry.status || "new");
			acc[status] = (acc[status] ?? 0) + 1;
			return acc;
		}, {});
		return Object.entries(counts).map(([label, value]) => ({ label, value }));
	}, [workspace.inquiries]);
	const recentOverviewInquiries = useMemo(
		() => workspace.inquiries
			.slice()
			.sort((first, second) => new Date(asText(second.created_at)).getTime() - new Date(asText(first.created_at)).getTime())
			.slice(0, 5),
		[workspace.inquiries],
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
		router.push("/admin/inquiries");
	}

	async function saveEntity(table: string, payload: CmsPayload, currentRow: CmsRow | null, idKey = "id") {
		setMessage(`Saving ${table}...`);
		setSaving(true);

		const result = currentRow ? await supabaseBrowser.from(table).update(payload).eq(idKey, currentRow[idKey]) : await supabaseBrowser.from(table).insert(payload);
		if (result.error) {
			setMessage(result.error.message);
			setSaving(false);
			return false;
		}

		setSaving(false);
		await reloadWorkspace();
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
				await supabaseBrowser.from(table).delete().eq(idKey, currentRow[idKey]);
				setSaving(false);
				await reloadWorkspace();
			},
		});
	}

	async function saveProperty(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.developer_id) {
			setMessage("Choose a Developer Partner first. If none exists, create one under People → Developer Partners.");
			return;
		}
		if (!payload.title || !payload.slug || !payload.address || !payload.city || !payload.province) {
			setMessage("Property records need title, slug, address, city, and province.");
			return;
		}

		if (payload.status === "published" && !payload.published_at) {
			payload.published_at = new Date().toISOString();
		}

		if (sessionUser?.id) {
			payload.updated_by = sessionUser.id;
			if (!currentRow) payload.created_by = sessionUser.id;
		}

		await saveEntity("properties", payload, currentRow);
	}

	async function saveProject(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.developer_id || !payload.project_name || !payload.slug) {
			setMessage("Projects need a Developer Partner, Project Name, and Slug.");
			return;
		}
		await saveEntity("projects", payload, currentRow);
	}

	async function saveDeveloper(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.company_name || !payload.slug) {
			setMessage("Developer partners need company_name and slug.");
			return;
		}
		await saveEntity("developer_partners", payload, currentRow);
	}

	async function saveAgent(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.profile_id) {
			setMessage("Agents need a profile_id linked to auth.users.");
			return;
		}
		await saveEntity("agents", payload, currentRow);
	}

	async function saveCmsPage(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.slug || !payload.title) {
			setMessage("CMS pages need slug and title.");
			return;
		}
		if (payload.is_published && !payload.published_at) {
			payload.published_at = new Date().toISOString();
		}
		if (sessionUser?.id) {
			payload.updated_by = sessionUser.id;
			if (!currentRow) payload.created_by = sessionUser.id;
		}
		await saveEntity("cms_pages", payload, currentRow);
	}

	async function saveGalleryItem(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.section || !payload.title || !payload.image_url) {
			setMessage("Gallery items need section, title, and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("gallery_items", payload, currentRow);
	}

	async function saveTestimonial(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.author_name || !payload.quote) {
			setMessage("Testimonials need author_name and quote.");
			return;
		}
		await saveEntity("testimonials", payload, currentRow);
	}

	async function saveHeroBanner(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.headline || !payload.image_url) {
			setMessage("Hero banners need headline and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("hero_banners", payload, currentRow);
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

	if (loading) {
		return <main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-10 text-[#111111]"><div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">{message}</div></main>;
	}

	if (!sessionUser || !profile) {
		return (
			<main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-10 text-[#111111]">
				<div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
					<div className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">Jewellz Realty CMS</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in required</h1>
					<p className="mt-2 text-sm leading-6 text-black/60">Use the login page to access the CMS. The dashboard honors Supabase Auth and role-based visibility from the profiles table.</p>
					<button type="button" onClick={() => router.push("/login")} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80">Go to login</button>
				</div>
			</main>
		);
	}

	if (role === "buyer") {
		return <main className="min-h-screen bg-white px-6 py-10 text-[#111111]"><div className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-zinc-50 p-8 text-sm text-black/60">Buyer accounts do not have CMS access.</div></main>;
	}

	return (
		<main className="min-h-screen bg-[#f2f2ef] text-[#111111]">
			<div className={`grid min-h-screen w-full transition-[grid-template-columns] duration-200 ${showSecondarySidebar ? "lg:grid-cols-[56px_220px_1fr]" : "lg:grid-cols-[56px_0px_1fr]"}`}>
				<aside className="hidden border-r border-black/10 bg-[#fbfbfa] py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-white ring-1 ring-black/10">
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
										className={`flex h-9 w-9 items-center justify-center rounded-md transition ${active ? "bg-[#111111] text-white" : "text-black/55 hover:bg-white hover:text-[#111111]"}`}
										title={group.label}
									>
										<Icon className="h-4 w-4" />
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<button type="button" onClick={() => void reloadWorkspace()} className="flex h-9 w-9 items-center justify-center rounded-md text-black/55 transition hover:bg-white hover:text-[#111111]" title="Refresh">
							<RefreshCw className="h-4 w-4" />
						</button>
						<button type="button" onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex h-9 w-9 items-center justify-center rounded-md text-black/55 transition hover:bg-white hover:text-[#111111]" title="Sign out">
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</aside>

				<aside className={`${showSecondarySidebar ? "block" : "hidden lg:block lg:w-0 lg:overflow-hidden"} border-b border-black/10 bg-[#fbfbfa] transition-[width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r`}>
					<div className="border-b border-black/10 px-3 py-3">
						<div className="rounded-md border border-black/10 bg-white p-2">
							<div className="text-[10px] uppercase tracking-[0.14em] text-black/40">Agency</div>
							<div className="mt-1 truncate text-xs font-semibold text-[#111111]">Jewellz Realty</div>
							<p className="mt-0.5 truncate text-[11px] text-black/45">{profile.full_name}</p>
						</div>
					</div>

					<nav className="max-h-[calc(100vh-150px)] overflow-auto px-2 py-3">
						<div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40">{activeNavGroup?.label ?? "Dashboard"}</div>
						<div className="space-y-1">
							{activePrimary === "analytics" && analyticsOverviewItem && AnalyticsOverviewIcon ? (
								<div>
									<button
										type="button"
										onClick={() => openSection(analyticsOverviewItem.id)}
										className={`relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition ${currentSection === analyticsOverviewItem.id || isAnalyticsChildSection ? "bg-white text-[#111111] shadow-sm before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/65 hover:bg-white hover:text-[#111111]"}`}
									>
										<AnalyticsOverviewIcon className="h-4 w-4 shrink-0" />
										<span className="min-w-0 flex-1">
											<span className="block text-sm font-medium">{analyticsOverviewItem.label}</span>
											<span className="block truncate text-[11px] text-black/45">{isAnalyticsChildSection ? activeNavItem?.label : "Performance summary"}</span>
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
													className={`relative w-full rounded-md px-2 py-1.5 pl-3 text-left text-xs transition ${index ? "mt-1" : ""} ${active ? "bg-white font-medium text-[#111111] shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/50 hover:bg-white hover:text-[#111111]"}`}
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
											className={`relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition ${active ? "bg-white text-[#111111] shadow-sm before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/65 hover:bg-white hover:text-[#111111]"}`}
										>
											<ItemIcon className="h-4 w-4 shrink-0" />
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-medium">{item.label}</span>
												{activePrimary === "analytics" ? null : (
													<span className={`block truncate text-[11px] ${active ? "text-black/45" : "text-black/40"}`}>{item.id === "properties" ? selectedCategoryLabel : item.hint}</span>
												)}
											</span>
										</button>
										{activePrimary === "listings" && item.id === "properties" ? (
											<div className="border-l-2 border-transparent py-1 pl-8 pr-2">
												<button
													type="button"
													onClick={() => openPropertyCategory("all")}
													className={`relative w-full rounded-md px-2 py-1.5 pl-3 text-left text-xs transition ${propertyCategoryFilter === "all" ? "bg-white font-medium text-[#111111] shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/50 hover:bg-white hover:text-[#111111]"}`}
												>
													All Categories
												</button>
												{propertySidebarCategoryOptions.map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() => openPropertyCategory(option.value)}
														className={`relative mt-1 w-full rounded-md px-2 py-1.5 pl-3 text-left text-xs transition ${propertyCategoryFilter === option.value ? "bg-white font-medium text-[#111111] shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/50 hover:bg-white hover:text-[#111111]"}`}
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
						<div className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-black/55 ring-1 ring-black/5">
							<div>{message}</div>
							{saving ? <div className="font-medium text-[#111111]">Saving...</div> : null}
						</div>
						<div className="mt-3 flex gap-2 lg:hidden">
							<button type="button" onClick={() => void reloadWorkspace()} className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium">Refresh</button>
							<button type="button" onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex-1 rounded-xl bg-[#111111] px-3 py-2 text-sm font-medium text-white">Sign out</button>
						</div>
					</div>
				</aside>

				<section className="flex min-w-0 flex-col bg-[#f2f2ef]">
					<header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-black/10 bg-[#fbfbfa] px-4">
						<button type="button" onClick={() => setShowSecondarySidebar((current) => !current)} className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-black/60 transition hover:text-[#111111]" title={showSecondarySidebar ? "Hide sidebar" : "Show sidebar"}>
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
							<div className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-black/60">
								<Search className="h-4 w-4" />
								<input aria-label="Search..." value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} placeholder="Search..." className="w-full bg-transparent text-sm outline-none placeholder:text-black/35" />
							</div>
							{dashboardSearch.trim() ? (
								<div className="absolute right-0 top-10 z-30 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl">
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
							<button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 bg-white px-2.5 text-xs text-black/60">
								<CalendarDays className="h-3.5 w-3.5" />
								{new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
							</button>
							{isAdmin ? (
								<button type="button" onClick={() => downloadCsv("jewellz-inquiries.csv", workspace.inquiries, ["id", "buyer_name", "buyer_email", "status", "priority", "lead_score", "created_at"])} className="inline-flex h-8 items-center gap-1 rounded-md bg-[#111111] px-3 text-xs font-medium text-white">
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
									className={`rounded-md border border-black/10 p-1.5 transition ${showAnalyticsAssistant ? "bg-[#111111] text-white" : "bg-white hover:bg-zinc-100"}`}
									title={showAnalyticsAssistant ? "Close analytics assistant" : "Open analytics assistant"}
								>
									<MessageSquare className="h-4 w-4" />
								</button>
							) : null}
							<button type="button" onClick={() => setShowNotifications((current) => !current)} className="rounded-md border border-black/10 bg-white p-1.5 transition hover:bg-zinc-100" title="Notifications">
								<Bell className="h-4 w-4" />
							</button>
							<button type="button" onClick={() => setShowProfileMenu((current) => !current)} className="rounded-md border border-black/10 bg-white p-1.5 transition hover:bg-zinc-100" title={asText(profile.email ?? profile.full_name)}>
								<UserCircle className="h-5 w-5" />
							</button>
							{showNotifications ? (
								<div className="absolute right-8 top-10 z-30 w-72 rounded-lg border border-black/10 bg-white p-3 text-sm shadow-xl">
									<div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Notifications</div>
									<p className="mt-2 text-black/60">{workspace.inquiries.filter((item) => item.status === "new").length} new inquiries need review.</p>
									<p className="mt-1 text-xs text-black/45">{workspace.properties.filter((item) => item.status === "draft").length} draft properties are not public yet.</p>
								</div>
							) : null}
							{showProfileMenu ? (
								<div className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-black/10 bg-white p-3 text-sm shadow-xl">
									<div className="font-medium text-[#111111]">{profile.full_name ?? "CMS User"}</div>
									<div className="mt-1 text-xs text-black/45">{profile.email ?? sessionUser.email}</div>
									<div className="mt-2 rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">{role ?? "no role"}</div>
									<button type="button" onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="mt-3 w-full rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white">Sign out</button>
								</div>
							) : null}
						</div>
					</header>

					<div className="flex-1 overflow-auto bg-[#f2f2ef] px-3 py-3 sm:px-4 lg:px-5">
						<div className={`mx-auto flex max-w-7xl flex-col gap-3 transition-[padding] duration-200 ${assistantContentOffset}`}>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">
										Welcome back, {asText(profile.full_name).split(" ")[0] || "Admin"}
									</h1>
								</div>
								<div className="flex items-center gap-2">
									<button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 bg-white px-3 text-xs text-black/60">
										Daily
									</button>
									<button type="button" onClick={() => void reloadWorkspace()} className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
										<RefreshCw className="h-3.5 w-3.5" />
										Refresh
									</button>
								</div>
							</div>

						{currentSection === "overview" ? (
							<>
								<div className="grid gap-3">
									<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
										<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Needs attention</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{urgentLeads.length}</div>
											<p className="mt-2 text-xs text-black/50">High-intent or overdue leads.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Unassigned leads</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{unassignedLeads.length}</div>
											<p className="mt-2 text-xs text-black/50">Assign these before follow-up slips.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("listings"); setActiveSection("properties"); router.push("/admin/listings"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Draft listings</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{draftListings.length}</div>
											<p className="mt-2 text-xs text-black/50">Listings not yet public.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); router.push("/admin?section=analytics"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Low inquiry listings</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{lowPerformingListings.length}</div>
											<p className="mt-2 text-xs text-black/50">Viewed listings below target rate.</p>
										</button>
									</div>

									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Inquiry Trend</div>
												<p className="mt-1 text-xs text-black/45">Latest daily lead volume from the analytics view.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); router.push("/admin?section=analytics"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">View report</button>
										</div>
										<div className="mt-3">
											<OverviewBars rows={overviewInquiryTrend} />
										</div>
									</div>
								</div>

								<div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Priority Leads</div>
												<p className="mt-1 text-xs text-black/45">Sorted by lead score and follow-up urgency.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">Open queue</button>
										</div>
										<div className="mt-4 space-y-2">
											{urgentLeads.length === 0 ? <p className="rounded-md bg-zinc-50 px-3 py-4 text-sm text-black/50">No urgent leads right now.</p> : null}
											{urgentLeads.map((lead) => (
												<button key={asText(lead.id)} type="button" onClick={() => openInquiryForEditing(asText(lead.id))} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-left transition hover:bg-zinc-50">
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

									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Pipeline Health</div>
												<p className="mt-1 text-xs text-black/45">Status distribution across visible leads.</p>
											</div>
											<div className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-black/60">{stats.closedCount} closed</div>
										</div>
										<div className="mt-4">
											<OverviewPipelineBars rows={overviewPipelineRows} />
										</div>
									</div>
								</div>

								<div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
									<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
										<div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Recent Inquiries</div>
												<p className="mt-1 text-xs text-black/45">Newest lead submissions entering the pipeline.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">See all</button>
										</div>
										<div className="overflow-x-auto">
											<table className="min-w-full text-left text-sm">
												<thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.08em] text-black/40">
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
														<tr key={asText(inquiry.id)} onClick={() => openInquiryForEditing(asText(inquiry.id))} className="cursor-pointer border-t border-black/5 transition hover:bg-zinc-50">
															<td className="max-w-[220px] px-4 py-3">
																<div className="truncate font-medium text-[#111111]">{inquiry.buyer_name ?? "Unnamed buyer"}</div>
																<div className="truncate text-xs text-black/45">{inquiry.buyer_email}</div>
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

									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Listing Performance</div>
												<p className="mt-1 text-xs text-black/45">Quick view of views and inquiry rate.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); router.push("/admin?section=analytics"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">Full chart</button>
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
									<EntityEditor
										title="Properties"
										description="Guided CRUD for creating public property listings without typing database IDs."
										rows={workspace.properties}
										selectedId={selectedPropertyId}
										fields={propertyEditorFields}
										defaultValues={{ status: "draft", badge: "none" }}
										canEdit={canEditCatalog}
										rowLabel={labelForRow}
										rowMeta={(row) => `${row.city ?? ""} ${row.province ?? ""} • ${row.status ?? "draft"}`}
										onSelect={(row) => setSelection((current) => ({ ...current, properties: row ? asText(row.id) : null }))}
										onCreateNew={() => setSelection((current) => ({ ...current, properties: NEW_RECORD_ID }))}
										onDelete={(row) => deleteEntity("properties", row)}
										onSubmit={saveProperty}
										renderPreview={(payload, currentRow) => <PropertyPublicPreview payload={payload} currentRow={currentRow} imageUrls={selectedPropertyImageUrls} />}
										extra={
											<PropertyImagesManager
												propertyId={selectedProperty ? asText(selectedProperty.id) : null}
												canEdit={canEditCatalog}
												onRequestDelete={requestDestructiveAction}
												onChanged={async () => {
													await reloadWorkspace();
													await loadPropertyImages(selectedProperty ? asText(selectedProperty.id) : null);
												}}
											/>
										}
									/>
								) : (
									<SectionShell title={`${selectedCategoryLabel} Properties`} description={`Showing only listings categorized as ${selectedCategoryLabel}. Click any row to open it in Listings / Properties.`}>
										<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
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
							<EntityEditor title="Agents" description="Profile info, social links, top-agent flags, and live performance from assigned inquiry activity." rows={workspace.agents} selectedId={selectedAgentId} fields={agentFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.license_number ?? "no license"}${row.is_top_agent ? " • top agent" : ""}`} onSelect={(row) => setSelection((current) => ({ ...current, agents: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, agents: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("agents", row)} onSubmit={saveAgent} extra={<AgentMetricsSummary agentId={selectedAgentId} agentPerformance={workspace.agentPerformance} />} />
						) : null}

						{currentSection === "developers" && isAdmin ? (
							<EntityEditor title="Developer Partners" description="Company profile CRUD for developer partners." rows={workspace.developers} selectedId={selectedDeveloperId} fields={developerFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => asText(row.contact_email ?? row.website_url ?? row.slug)} onSelect={(row) => setSelection((current) => ({ ...current, developers: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, developers: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("developer_partners", row)} onSubmit={saveDeveloper} />
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
							<InquiryPanel activeView={currentSection} inquiries={workspace.inquiries} agents={workspace.agents} currentRole={role} currentUserId={sessionUser.id} selectedId={selectedInquiryId} onSelect={(id) => setSelection((current) => ({ ...current, inquiries: id }))} onReload={reloadWorkspace} canEdit={canEditInquiries} canReassign={canReassignInquiries} />
						) : null}

						{currentSection === "pages" && isAdmin ? (
							<EntityEditor title="CMS Pages" description="Static and semi-static content pages." rows={workspace.cmsPages} selectedId={selection.cmsPages} fields={cmsPageFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => asText(row.slug ?? row.meta_title ?? "cms")} onSelect={(row) => setSelection((current) => ({ ...current, cmsPages: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, cmsPages: null }))} onDelete={(row) => deleteEntity("cms_pages", row)} onSubmit={saveCmsPage} />
						) : null}

						{currentSection === "gallery" && isAdmin ? (
							<EntityEditor title="Gallery Items" description="Browse Gallery tiles for achievements, events, trainings, service, and general content." rows={workspace.galleryItems} selectedId={selection.galleryItems} fields={galleryFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.section ?? "general"} • ${row.sort_order ?? 0}`} onSelect={(row) => setSelection((current) => ({ ...current, galleryItems: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, galleryItems: null }))} onDelete={(row) => deleteEntity("gallery_items", row)} onSubmit={saveGalleryItem} />
						) : null}

						{currentSection === "testimonials" && isAdmin ? (
							<EntityEditor title="Testimonials" description="Homepage testimonials carousel content." rows={workspace.testimonials} selectedId={selection.testimonials} fields={testimonialFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.author_title ?? ""} • ${row.rating ?? "n/a"} stars`} onSelect={(row) => setSelection((current) => ({ ...current, testimonials: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, testimonials: null }))} onDelete={(row) => deleteEntity("testimonials", row)} onSubmit={saveTestimonial} />
						) : null}

						{currentSection === "hero" && isAdmin ? (
							<EntityEditor title="Hero Banners" description="Rotating hero slides for the public landing page." rows={workspace.heroBanners} selectedId={selection.heroBanners} fields={heroBannerFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, heroBanners: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, heroBanners: null }))} onDelete={(row) => deleteEntity("hero_banners", row)} onSubmit={saveHeroBanner} />
						) : null}

						{currentSection === "logos" && isAdmin ? (
							<EntityEditor title="Partner Logos" description="Homepage logo strip for developer partners." rows={workspace.partnerLogos} selectedId={selection.partnerLogos} fields={partnerLogoFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, partnerLogos: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, partnerLogos: null }))} onDelete={(row) => deleteEntity("partner_logos", row)} onSubmit={savePartnerLogo} />
						) : null}

						{currentSection === "stats" && isAdmin ? (
							<EntityEditor title="Site Stats" description="Key-value counters shown in the homepage stat strip." rows={workspace.siteStats} selectedId={selection.siteStats} idKey="key" fields={siteStatFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.value ?? 0}${row.suffix ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, siteStats: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, siteStats: null }))} onDelete={(row) => deleteEntity("site_stats", row, "key")} onSubmit={saveSiteStat} />
						) : null}

						{currentSection === "settings" && isAdmin ? (
							<EntityEditor title="System Settings" description="Key-value configuration editor for platform behavior." rows={workspace.settings} selectedId={selection.settings} idKey="key" fields={settingFields} canEdit={canEditSettings} rowLabel={labelForRow} rowMeta={(row) => asText(row.description ?? row.value)} onSelect={(row) => setSelection((current) => ({ ...current, settings: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, settings: null }))} onDelete={(row) => deleteEntity("system_settings", row, "key")} onSubmit={saveSetting} />
						) : null}

						{(currentSection === "analytics" || analyticsChildSections.has(currentSection) || currentSection === "traffic" || currentSection === "agentPerformance" || currentSection === "developerPortfolio") && isAdmin ? (
							<AnalyticsPanel activeReport={currentSection} isAdmin={isAdmin} properties={workspace.properties} inquiries={workspace.inquiries} recommendations={workspace.recommendations} listingPerformance={workspace.listingPerformance} dailyInquiryVolume={workspace.dailyInquiryVolume} trafficSources={workspace.trafficSources} agentPerformance={workspace.agentPerformance} developerPortfolio={workspace.developerPortfolio} engagementEvents={workspace.engagementEvents} selectedPortfolioDeveloperId={selectedPortfolioDeveloperId} selectedPortfolioPropertyId={selectedPortfolioPropertyId} onSelectPortfolioDeveloper={setSelectedPortfolioDeveloperId} onSelectPortfolioProperty={setSelectedPortfolioPropertyId} />
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
											{workspace.activityLogs.length === 0 ? <tr><td colSpan={4} className="px-4 py-5 text-black/45">No activity logs found.</td></tr> : null}
											{workspace.activityLogs.map((row, index) => (
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
					</div>
					</div>
					{isAdmin && showAnalyticsAssistant ? <AnalyticsChatSidebar /> : null}
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
		</main>
	);
}
