import type { ReactNode, ComponentType } from "react";
import { Activity, ArrowUpRight, type LucideProps } from "lucide-react";

type ScorecardIcon = ComponentType<LucideProps>;

export function PortalScorecard({
	label,
	value,
	hint,
	Icon = Activity,
}: {
	label: string;
	value: ReactNode;
	hint: string;
	Icon?: ScorecardIcon;
}) {
	const isLong = String(value).length > 18;
	return (
		<div className="portal-stat-card flex h-full min-h-[132px] min-w-0 flex-col text-left">
			<div className="flex min-w-0 items-center gap-2">
				<span className="grid h-7 w-7 shrink-0 place-items-center bg-[#DE141C] text-white" aria-hidden="true">
					<Icon className="h-3.5 w-3.5" />
				</span>
				<div className="portal-stat-label min-w-0 flex-1 truncate">{label}</div>
				<ArrowUpRight className="h-4 w-4 shrink-0 text-black/55" aria-hidden="true" />
			</div>
			<div className={`portal-stat-value min-w-0 break-words ${isLong ? "text-base leading-5" : ""}`}>{value}</div>
			<div className="mt-auto min-w-0 pt-1">
				<p className="portal-stat-hint flex min-w-0 items-center gap-1.5 truncate">
					<span className="h-1.5 w-1.5 shrink-0 bg-[#DE141C]" aria-hidden="true" />
					{hint}
				</p>
			</div>
		</div>
	);
}
