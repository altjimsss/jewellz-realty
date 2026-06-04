type InquiryVolumeRow = {
	inquiry_date?: string;
	total_inquiries?: number;
};

export function InquiryVolumeChart({ rows = [] }: { rows?: InquiryVolumeRow[] }) {
	const maxValue = Math.max(1, ...rows.map((row) => row.total_inquiries ?? 0));

	return (
		<div className="flex h-48 items-end gap-2 rounded-lg border border-black/10 bg-white p-4">
			{rows.length ? rows.slice(0, 14).map((row) => (
				<div key={row.inquiry_date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
					<div className="w-full rounded-t bg-[#DE141C]" style={{ height: `${Math.max(8, ((row.total_inquiries ?? 0) / maxValue) * 140)}px` }} />
					<span className="w-full truncate text-center text-[10px] text-black/45">{row.inquiry_date ?? ""}</span>
				</div>
			)) : <p className="self-center text-sm text-black/45">No inquiry volume data yet.</p>}
		</div>
	);
}
