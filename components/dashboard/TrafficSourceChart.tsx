"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type TrafficSourceRow = {
	source?: string;
	session_count?: number;
	total_page_views?: number;
	share_pct?: number;
};

export function TrafficSourceChart({ rows = [] }: { rows?: TrafficSourceRow[] }) {
	const colors = ["#111111", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7"];
	const chartRows = rows.map((row) => ({
		name: (row.source ?? "direct").replaceAll("_", " "),
		value: row.session_count ?? 0,
		pageViews: row.total_page_views ?? 0,
		share: row.share_pct ?? 0,
	}));

	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			{chartRows.length ? (
				<div className="grid gap-4 md:grid-cols-[1fr_220px]">
					<div>
						<div className="mb-3">
							<div className="text-sm font-semibold text-[#111111]">Traffic Sources</div>
							<p className="text-xs text-black/45">Session share by acquisition source.</p>
						</div>
						<div className="h-72">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie data={chartRows} dataKey="value" nameKey="name" outerRadius={96} innerRadius={62} paddingAngle={3} cornerRadius={8}>
									{chartRows.map((row, index) => <Cell key={row.name} fill={colors[index % colors.length]} />)}
								</Pie>
								<Tooltip content={<NeutralTooltip />} />
								<Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#52525b" }} />
							</PieChart>
						</ResponsiveContainer>
						</div>
					</div>
					<div className="space-y-2">
						{chartRows.map((row, index) => (
							<div key={row.name} className="rounded-md border border-black/5 bg-zinc-50 px-3 py-2 text-sm">
								<div className="flex items-center justify-between gap-2">
									<div className="flex min-w-0 items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
										<span className="truncate font-medium capitalize text-[#111111]">{row.name}</span>
									</div>
									<span className="text-xs font-semibold text-black/45">{row.share}%</span>
								</div>
								<p className="mt-1 text-xs text-black/50">{row.value} sessions, {row.pageViews} views</p>
							</div>
						))}
					</div>
				</div>
			) : <p className="text-sm text-black/45">No traffic source data yet.</p>}
		</div>
	);
}

function NeutralTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; payload?: TrafficSourceRow & { pageViews?: number; share?: number } }> }) {
	if (!active || !payload?.length) return null;
	const item = payload[0];
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 font-semibold capitalize text-[#111111]">{item.name}</div>
			<div className="text-black/60">Sessions: <span className="font-medium text-[#111111]">{item.value}</span></div>
			<div className="text-black/60">Views: <span className="font-medium text-[#111111]">{item.payload?.pageViews ?? 0}</span></div>
			<div className="text-black/60">Share: <span className="font-medium text-[#111111]">{item.payload?.share ?? 0}%</span></div>
		</div>
	);
}
