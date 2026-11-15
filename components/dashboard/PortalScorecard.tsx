import type { ReactNode, ComponentType } from "react";
import { Activity, ArrowUpRight, type LucideProps } from "lucide-react";

type ScorecardIcon = ComponentType<LucideProps>;

export function PortalScorecard({
	label,
	value,
	hint,
	Icon = Activity,
	compact = false,
}: {
	label: string;
	value: ReactNode;
	hint: string;
	Icon?: ScorecardIcon;
	compact?: boolean;
}) {
	const isLong = String(value).length > 18;
	const valueSize = compact ? (isLong ? "text-base leading-5" : "text-xl leading-6 sm:text-2xl") : isLong ? "text-base leading-5" : "";
	return (
		<div className={`portal-stat-card flex h-full min-w-0 flex-col text-left ${compact ? "min-h-[98px] p-3 sm:min-h-[116px] sm:p-4" : "min-h-[132px]"}`}>
			<div className="flex min-w-0 items-center gap-2">
				<span className={`grid shrink-0 place-items-center bg-[#DE141C] text-white ${compact ? "h-6 w-6" : "h-7 w-7"}`} aria-hidden="true">
					<Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
				</span>
				<div className="portal-stat-label min-w-0 flex-1 truncate">{label}</div>
				{!compact ? <ArrowUpRight className="h-4 w-4 shrink-0 text-black/55" aria-hidden="true" /> : null}
			</div>
			<div className={`portal-stat-value min-w-0 break-words ${valueSize}`}>{value}</div>
			<div className="mt-auto min-w-0 pt-1">
				<p className="portal-stat-hint flex min-w-0 items-center gap-1.5 truncate">
					<span className="h-1.5 w-1.5 shrink-0 bg-[#DE141C]" aria-hidden="true" />
					{hint}
				</p>
			</div>
		</div>
	);
}
