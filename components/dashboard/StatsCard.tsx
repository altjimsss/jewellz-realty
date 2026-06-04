type StatsCardProps = {
	label?: string;
	value?: string | number;
	helper?: string;
};

export function StatsCard({ label = "Metric", value = 0, helper }: StatsCardProps) {
	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{label}</p>
			<p className="mt-2 text-2xl font-semibold text-black">{value}</p>
			{helper ? <p className="mt-1 text-xs text-black/50">{helper}</p> : null}
		</div>
	);
}
