"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AgentPerformanceRow = {
	agent_id?: string;
	agent_name?: string;
	total_assigned?: number;
	conversions?: number;
	conversion_rate_pct?: number;
	avg_response_time_hours?: number | null;
};

export function AgentPerformanceTable({ rows = [] }: { rows?: AgentPerformanceRow[] }) {
	const chartRows = rows.slice(0, 8).map((row) => ({
		name: compactLabel(row.agent_name ?? "Agent"),
		assigned: row.total_assigned ?? 0,
		conversions: row.conversions ?? 0,
		rate: row.conversion_rate_pct ?? 0,
	}));

	return (
		<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
			{chartRows.length ? (
				<div className="border-b border-black/10 p-4">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<div className="text-sm font-semibold text-[#111111]">Agent Workload</div>
							<p className="text-xs text-black/45">Assigned leads compared with conversions.</p>
						</div>
					</div>
					<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartRows} margin={{ top: 8, right: 8, left: -18, bottom: 24 }} barGap={6}>
								<CartesianGrid vertical={false} stroke="#ececec" />
								<XAxis dataKey="name" interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} height={42} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
								<Tooltip content={<NeutralTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Bar dataKey="assigned" name="Assigned leads" fill="#111111" radius={[7, 7, 0, 0]} maxBarSize={30} />
								<Bar dataKey="conversions" name="Conversions" fill="#a1a1aa" radius={[7, 7, 0, 0]} maxBarSize={30} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			) : null}
			<table className="w-full text-left text-sm">
				<thead className="bg-zinc-50 text-xs uppercase tracking-[0.08em] text-black/45">
					<tr>
						<th className="px-4 py-3">Agent</th>
						<th className="px-4 py-3">Assigned</th>
						<th className="px-4 py-3">Conversions</th>
						<th className="px-4 py-3">Rate</th>
						<th className="px-4 py-3">Avg response</th>
					</tr>
				</thead>
				<tbody>
					{rows.length ? rows.map((row) => (
						<tr key={row.agent_id ?? row.agent_name} className="border-t border-black/5">
							<td className="px-4 py-3 font-medium text-black">{row.agent_name ?? "Unassigned"}</td>
							<td className="px-4 py-3 text-black/65">{row.total_assigned ?? 0}</td>
							<td className="px-4 py-3 text-black/65">{row.conversions ?? 0}</td>
							<td className="px-4 py-3 text-black/65">{row.conversion_rate_pct ?? 0}%</td>
							<td className="px-4 py-3 text-black/65">{row.avg_response_time_hours == null ? "n/a" : `${row.avg_response_time_hours}h`}</td>
						</tr>
					)) : (
						<tr>
							<td className="px-4 py-6 text-sm text-black/45" colSpan={5}>No agent performance data yet.</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function compactLabel(value: string) {
	return value.length > 14 ? `${value.slice(0, 12)}...` : value;
}

function NeutralTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string }) {
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
