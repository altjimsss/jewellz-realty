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
				? "bg-emerald-50 text-emerald-700"
				: normalized >= 0.35
					? "bg-amber-50 text-amber-700"
					: "bg-zinc-100 text-zinc-600";

	return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}
