"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
	const chartRows = rows
		.slice()
		.sort((first, second) => (second.total_views ?? 0) - (first.total_views ?? 0))
		.slice(0, 6)
		.map((row) => ({
		name: compactLabel(row.title ?? "Untitled", 15),
		fullName: row.title ?? "Untitled",
		views: row.total_views ?? 0,
		interactions: row.total_interactions ?? row.detail_opens ?? 0,
		dwellSeconds: Math.round(row.avg_dwell_seconds ?? 0),
		inquiries: row.total_inquiries ?? 0,
		rate: row.inquiry_rate_pct ?? 0,
		}));
	const rateRows = chartRows.slice().sort((first, second) => second.rate - first.rate || second.views - first.views);
	const hasInquiryConversions = rateRows.some((row) => row.rate > 0);

	return (
		<div>
			{chartRows.length ? (
				<div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
					<div>
						<div className="mb-2 flex items-center justify-between gap-3">
							<div>
								<div className="text-sm font-semibold text-[#111111]">Listing Activity</div>
								<p className="text-xs text-black/45">Views, detail opens, and inquiries by property.</p>
							</div>
						</div>
						<div className="h-52">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }} barGap={2} barCategoryGap="24%">
									<CartesianGrid horizontal={false} stroke="#f0f0f1" />
									<XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} allowDecimals={false} />
									<YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
									<Tooltip content={<NeutralTooltip />} cursor={{ fill: "rgba(0,0,0,0.035)" }} />
									<Legend verticalAlign="bottom" height={24} content={<NeutralLegend />} />
									<Bar dataKey="views" name="Views" fill="#DE141C" radius={[0, 4, 4, 0]} maxBarSize={10} />
									<Bar dataKey="interactions" name="Interactions" fill="#737373" radius={[0, 4, 4, 0]} maxBarSize={10} />
									<Bar dataKey="inquiries" name="Inquiries" fill="#252525" radius={[0, 4, 4, 0]} maxBarSize={10} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
					<div>
						<div className="mb-2">
							<div className="text-sm font-semibold text-[#111111]">Inquiry Rate</div>
							<p className="text-xs text-black/45">Conversion percentage per listing.</p>
						</div>
						<div className="h-52">
							{hasInquiryConversions ? (
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={rateRows} layout="vertical" margin={{ top: 6, right: 10, left: 0, bottom: 4 }} barCategoryGap="26%">
										<CartesianGrid horizontal={false} stroke="#f0f0f1" />
										<XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={(value) => `${value}%`} />
										<YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
										<Tooltip content={<NeutralTooltip />} cursor={{ fill: "rgba(0,0,0,0.035)" }} />
										<Bar dataKey="rate" name="Inquiry rate %" fill="#252525" radius={[0, 4, 4, 0]} maxBarSize={16} />
									</BarChart>
								</ResponsiveContainer>
							) : (
								<div className="flex h-full flex-col items-center justify-center border-t border-black/[0.06] text-center">
									<span className="text-sm font-medium text-black/55">No inquiry conversions yet</span>
									<span className="mt-1 text-xs text-black/35">Rates will appear when listings receive inquiries.</span>
								</div>
							)}
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
