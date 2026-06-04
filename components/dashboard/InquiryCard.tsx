import { LeadScoreBadge } from "@/components/dashboard/LeadScoreBadge";

type InquiryCardProps = {
	buyerName?: string | null;
	buyerEmail?: string | null;
	status?: string | null;
	priority?: string | null;
	leadScore?: number | null;
};

export function InquiryCard({ buyerName, buyerEmail, status, priority, leadScore }: InquiryCardProps) {
	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate font-semibold text-black">{buyerName || buyerEmail || "Unnamed lead"}</p>
					<p className="truncate text-sm text-black/50">{buyerEmail ?? "No email"}</p>
				</div>
				<LeadScoreBadge score={leadScore} />
			</div>
			<div className="mt-3 flex flex-wrap gap-2 text-xs text-black/55">
				<span className="rounded-full bg-zinc-100 px-2.5 py-1">{status ?? "new"}</span>
				<span className="rounded-full bg-zinc-100 px-2.5 py-1">{priority ?? "medium"}</span>
			</div>
		</div>
	);
}
