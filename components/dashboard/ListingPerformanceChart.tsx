type ListingPerformanceRow = {
	property_id?: string;
	title?: string;
	total_views?: number;
	total_inquiries?: number;
	inquiry_rate_pct?: number;
};

export function ListingPerformanceChart({ rows = [] }: { rows?: ListingPerformanceRow[] }) {
	const maxViews = Math.max(1, ...rows.map((row) => row.total_views ?? 0));

	return (
		<div className="space-y-3 rounded-lg border border-black/10 bg-white p-4">
			{rows.length ? rows.map((row) => (
				<div key={row.property_id ?? row.title}>
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="truncate font-medium text-black">{row.title ?? "Untitled listing"}</span>
						<span className="shrink-0 text-black/50">{row.total_views ?? 0} views</span>
					</div>
					<div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
						<div className="h-full bg-[#DE141C]" style={{ width: `${((row.total_views ?? 0) / maxViews) * 100}%` }} />
					</div>
					<p className="mt-1 text-[11px] text-black/45">{row.total_inquiries ?? 0} inquiries, {row.inquiry_rate_pct ?? 0}% inquiry rate</p>
				</div>
			)) : <p className="text-sm text-black/45">No listing analytics yet.</p>}
		</div>
	);
}
