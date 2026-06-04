type TrafficSourceRow = {
	source?: string;
	session_count?: number;
	total_page_views?: number;
	share_pct?: number;
};

export function TrafficSourceChart({ rows = [] }: { rows?: TrafficSourceRow[] }) {
	return (
		<div className="space-y-3 rounded-lg border border-black/10 bg-white p-4">
			{rows.length ? rows.map((row) => (
				<div key={row.source ?? "direct"}>
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="font-medium capitalize text-black">{(row.source ?? "direct").replaceAll("_", " ")}</span>
						<span className="text-black/50">{row.share_pct ?? 0}%</span>
					</div>
					<div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
						<div className="h-full bg-black" style={{ width: `${Math.max(0, Math.min(100, row.share_pct ?? 0))}%` }} />
					</div>
					<p className="mt-1 text-[11px] text-black/45">{row.session_count ?? 0} sessions, {row.total_page_views ?? 0} page views</p>
				</div>
			)) : <p className="text-sm text-black/45">No traffic source data yet.</p>}
		</div>
	);
}
