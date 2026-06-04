type LeadScoreBadgeProps = {
	score?: number | null;
};

export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
	const normalized = typeof score === "number" ? Math.max(0, Math.min(1, score)) : null;
	const label = normalized == null ? "Unscored" : `${Math.round(normalized * 100)}%`;
	const tone =
		normalized == null
			? "bg-zinc-100 text-zinc-600"
		: normalized >= 0.72
				? "bg-[#111111] text-white"
				: normalized >= 0.35
					? "bg-zinc-200 text-zinc-800"
					: "bg-zinc-100 text-zinc-600";

	return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}
