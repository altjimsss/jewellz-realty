"use client";

import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export const AGENT_CHART_PALETTE = ["#111111", "#DE141C", "#71717a", "#a1a1aa", "#52525b", "#059669", "#4f46e5", "#d97706"];

export type AgentChartRow = { label: string; value: number; color?: string };

type TooltipPayloadItem = { name?: string; value?: number | string; color?: string };

function AgentChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string | number }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			{label != null && label !== "" ? <div className="mb-1 font-semibold text-[#111111]">{label}</div> : null}
			{payload.map((item) => (
				<div key={`${item.name}-${item.color}`} className="flex items-center justify-between gap-4 text-black/60">
					<span className="flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full" style={{ background: item.color ?? "#111111" }} />
						{item.name}
					</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
		</div>
	);
}

export function AgentTrendChart({ rows, name = "Leads", color = "#111111" }: { rows: AgentChartRow[]; name?: string; color?: string }) {
	return (
		<div className="h-56">
			{rows.length ? (
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={rows} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
						<defs>
							<linearGradient id={`agent-trend-${name}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={color} stopOpacity={0.18} />
								<stop offset="100%" stopColor={color} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} stroke="#ececec" />
						<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
						<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
						<Tooltip content={<AgentChartTooltip />} cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }} />
						<Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2.5} fill={`url(#agent-trend-${name})`} dot={{ r: 3, fill: "#ffffff", stroke: color, strokeWidth: 2 }} activeDot={{ r: 5, fill: color, stroke: "#ffffff", strokeWidth: 2 }} />
					</AreaChart>
				</ResponsiveContainer>
			) : (
				<p className="flex h-full items-center text-sm text-black/45">No trend data yet.</p>
			)}
		</div>
	);
}

export function AgentBarChart({ rows, name = "Value", horizontal = false, color = "#111111" }: { rows: AgentChartRow[]; name?: string; horizontal?: boolean; color?: string }) {
	if (!rows.length) {
		return <p className="flex h-44 items-center text-sm text-black/45">No data yet.</p>;
	}
	return (
		<div className={horizontal ? "h-44" : "h-56"}>
			<ResponsiveContainer width="100%" height="100%">
				{horizontal ? (
					<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
						<CartesianGrid horizontal={false} stroke="#ececec" />
						<XAxis type="number" hide allowDecimals={false} />
						<YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} width={104} tickFormatter={(value) => String(value).replaceAll("_", " ")} />
						<Tooltip content={<AgentChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
						<Bar dataKey="value" name={name} fill={color} radius={[0, 6, 6, 0]} maxBarSize={16} />
					</BarChart>
				) : (
					<BarChart data={rows} margin={{ top: 8, right: 8, left: -22, bottom: 18 }}>
						<CartesianGrid vertical={false} stroke="#ececec" />
						<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
						<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
						<Tooltip content={<AgentChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
						<Bar dataKey="value" name={name} radius={[6, 6, 0, 0]} maxBarSize={36}>
							{rows.map((row, index) => (
								<Cell key={row.label} fill={row.color ?? (index === 0 ? color : "#d4d4d8")} />
							))}
						</Bar>
					</BarChart>
				)}
			</ResponsiveContainer>
		</div>
	);
}

export function AgentDonut({
	rows,
	centerLabel,
	centerValue,
	emptyLabel = "Nothing to show yet",
	emptyHint = "This chart fills up as activity comes in.",
}: {
	rows: AgentChartRow[];
	centerLabel?: string;
	centerValue?: string | number;
	emptyLabel?: string;
	emptyHint?: string;
}) {
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	const data = rows.filter((row) => row.value > 0);

	if (!data.length) {
		return (
			<div className="flex h-48 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/10 bg-zinc-50 px-6 text-center">
				<p className="text-xs font-semibold text-black/50">{emptyLabel}</p>
				<p className="text-[11px] text-black/35">{emptyHint}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
			<div className="relative h-44 w-44 shrink-0 self-center">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
							{data.map((row, index) => (
								<Cell key={row.label} fill={row.color ?? AGENT_CHART_PALETTE[index % AGENT_CHART_PALETTE.length]} />
							))}
						</Pie>
						<Tooltip content={<AgentChartTooltip />} />
					</PieChart>
				</ResponsiveContainer>
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-2xl font-semibold tracking-[-0.04em] text-[#111111]">{centerValue ?? total}</span>
					{centerLabel ? <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">{centerLabel}</span> : null}
				</div>
			</div>
			<div className="min-w-0 flex-1 space-y-1.5">
				{data.map((row, index) => {
					const percent = total ? Math.round((row.value / total) * 100) : 0;
					return (
						<div key={row.label} className="flex items-center justify-between gap-3 text-xs">
							<span className="flex min-w-0 items-center gap-2 text-black/65">
								<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color ?? AGENT_CHART_PALETTE[index % AGENT_CHART_PALETTE.length] }} />
								<span className="truncate capitalize">{row.label.replaceAll("_", " ")}</span>
							</span>
							<span className="shrink-0 font-medium text-[#111111]">
								{row.value} <span className="text-black/40">· {percent}%</span>
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function AgentFunnel({ rows }: { rows: AgentChartRow[] }) {
	const max = Math.max(1, ...rows.map((row) => row.value));
	if (!rows.length) {
		return <p className="flex h-44 items-center text-sm text-black/45">No funnel data yet.</p>;
	}
	return (
		<div className="space-y-3">
			{rows.map((row, index) => (
				<div key={row.label}>
					<div className="mb-1 flex items-center justify-between text-xs">
						<span className="font-medium capitalize text-black/65">{row.label.replaceAll("_", " ")}</span>
						<span className="font-semibold text-[#111111]">{row.value}</span>
					</div>
					<div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
						<div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, (row.value / max) * 100)}%`, background: row.color ?? AGENT_CHART_PALETTE[index % AGENT_CHART_PALETTE.length] }} />
					</div>
				</div>
			))}
		</div>
	);
}
