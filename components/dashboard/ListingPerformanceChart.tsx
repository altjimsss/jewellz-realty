"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ListingPerformanceRow = {
	property_id?: string;
	title?: string;
	total_views?: number;
	detail_opens?: number;
	total_interactions?: number;
	avg_dwell_seconds?: number;
	total_inquiries?: number;
	inquiry_rate_pct?: number;
};

export function ListingPerformanceChart({ rows = [] }: { rows?: ListingPerformanceRow[] }) {
	const chartRows = rows.slice(0, 10).map((row) => ({
		name: compactLabel(row.title ?? "Untitled", 10),
		fullName: row.title ?? "Untitled",
		views: row.total_views ?? 0,
		opens: row.detail_opens ?? 0,
		interactions: row.total_interactions ?? row.detail_opens ?? 0,
		dwellSeconds: Math.round(row.avg_dwell_seconds ?? 0),
		inquiries: row.total_inquiries ?? 0,
		rate: row.inquiry_rate_pct ?? 0,
	}));
	const activityTickInterval = chartRows.length > 7 ? 1 : 0;
	const rateTickInterval = chartRows.length > 5 ? 2 : 0;

	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			{chartRows.length ? (
				<div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
					<div>
						<div className="mb-3 flex items-center justify-between gap-3">
							<div>
								<div className="text-sm font-semibold text-[#111111]">Listing Activity</div>
								<p className="text-xs text-black/45">Views, detail opens, and inquiries by property.</p>
							</div>
						</div>
						<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartRows} margin={{ top: 8, right: 8, left: -18, bottom: 18 }} barGap={6}>
								<CartesianGrid vertical={false} stroke="#ececec" />
								<XAxis dataKey="name" interval={activityTickInterval} minTickGap={18} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} height={44} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<Tooltip content={<NeutralTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Legend verticalAlign="bottom" height={34} content={<NeutralLegend />} />
								<Bar dataKey="views" name="Views" fill="#111111" radius={[7, 7, 0, 0]} maxBarSize={28} />
								<Bar dataKey="interactions" name="Interactions" fill="#9ca3af" radius={[7, 7, 0, 0]} maxBarSize={28} />
								<Bar dataKey="inquiries" name="Inquiries" fill="#d4d4d8" radius={[7, 7, 0, 0]} maxBarSize={28} />
							</BarChart>
						</ResponsiveContainer>
						</div>
					</div>
					<div>
						<div className="mb-3">
							<div className="text-sm font-semibold text-[#111111]">Inquiry Rate</div>
							<p className="text-xs text-black/45">Conversion percentage per listing.</p>
						</div>
						<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={chartRows} margin={{ top: 8, right: 12, left: -18, bottom: 24 }}>
								<CartesianGrid vertical={false} stroke="#ececec" />
								<XAxis dataKey="name" interval={rateTickInterval} minTickGap={20} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} height={42} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<Tooltip content={<NeutralTooltip />} cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }} />
								<Line type="monotone" dataKey="rate" name="Inquiry rate %" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#ffffff", stroke: "#111111", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#111111", stroke: "#ffffff", strokeWidth: 2 }} />
							</LineChart>
						</ResponsiveContainer>
						</div>
					</div>
				</div>
			) : <p className="text-sm text-black/45">No listing analytics yet.</p>}
		</div>
	);
}

function compactLabel(value: string, maxLength = 12) {
	return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function NeutralLegend({ payload }: { payload?: Array<{ value?: string; color?: string }> }) {
	if (!payload?.length) return null;
	return (
		<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3 text-xs text-black/55">
			{payload.map((item) => (
				<div key={item.value} className="inline-flex items-center gap-2 whitespace-nowrap">
					<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
					<span>{item.value}</span>
				</div>
			))}
		</div>
	);
}

function NeutralTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: { fullName?: string; dwellSeconds?: number } }>; label?: string }) {
	if (!active || !payload?.length) return null;
	const title = payload[0]?.payload?.fullName ?? label;
	const dwellSeconds = payload[0]?.payload?.dwellSeconds ?? 0;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 max-w-56 font-semibold text-[#111111]">{title}</div>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center justify-between gap-4 text-black/60">
					<span className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
						{item.name}
					</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
			<div className="mt-1 flex items-center justify-between gap-4 border-t border-black/10 pt-1 text-black/60">
				<span>Avg. browse time</span>
				<span className="font-medium text-[#111111]">{dwellSeconds}s</span>
			</div>
		</div>
	);
}
