type AgentPerformanceRow = {
	agent_id?: string;
	agent_name?: string;
	total_assigned?: number;
	conversions?: number;
	conversion_rate_pct?: number;
	avg_response_time_hours?: number | null;
};

export function AgentPerformanceTable({ rows = [] }: { rows?: AgentPerformanceRow[] }) {
	return (
		<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
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
