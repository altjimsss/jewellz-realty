type SkeletonVariant = "dashboard" | "collection" | "table" | "analytics";

const ANALYTICS_SECTIONS = [
	"analytics",
	"traffic",
	"trafficBehavior",
	"propertyPerformance",
	"predictiveAnalytics",
	"userEngagement",
	"agentPerformance",
	"developerPortfolio",
];

const TABLE_SECTIONS = ["inquiries", "pipeline", "timeline", "activityLogs"];

function variantFor(section?: string): SkeletonVariant {
	if (!section || section === "overview") return "dashboard";
	if (ANALYTICS_SECTIONS.includes(section)) return "analytics";
	if (TABLE_SECTIONS.includes(section)) return "table";
	return "collection";
}

export function AdminContentSkeleton({ section }: { section?: string }) {
	const variant = variantFor(section);

	return (
		<div className="skeleton-delayed">
			<div className="fixed left-0 right-0 top-0 z-50 h-[2px] overflow-hidden bg-black/5">
				<div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-[#DE141C] to-transparent" />
			</div>

			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="h-7 w-56 rounded-md bg-zinc-300/70 skeleton-shimmer" />
					<div className="flex items-center gap-2">
						<div className="h-8 w-20 rounded-md border border-black/10 bg-white skeleton-shimmer" />
						<div className="h-8 w-28 rounded-md border border-black/10 bg-white skeleton-shimmer" />
					</div>
				</div>

				{variant === "dashboard" ? <DashboardSkeleton /> : null}
				{variant === "collection" ? <CollectionSkeleton /> : null}
				{variant === "table" ? <TableSkeleton /> : null}
				{variant === "analytics" ? <AnalyticsSkeleton /> : null}
			</div>
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div className="grid gap-3">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="rounded-lg border border-black/10 bg-white p-4">
						<div className="h-3 w-24 rounded bg-zinc-200/70 skeleton-shimmer" />
						<div className="mt-3 h-8 w-16 rounded-md bg-zinc-300/80 skeleton-shimmer" />
						<div className="mt-2 h-3 w-32 rounded bg-zinc-200/60 skeleton-shimmer" />
					</div>
				))}
			</div>

			<div className="rounded-lg border border-black/10 bg-white p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1.5">
						<div className="h-4 w-32 rounded bg-zinc-300/80 skeleton-shimmer" />
						<div className="h-3 w-56 rounded bg-zinc-200/60 skeleton-shimmer" />
					</div>
					<div className="h-8 w-24 rounded-md border border-black/10 skeleton-shimmer" />
				</div>
				<div className="mt-3 h-56 rounded-md bg-zinc-100/70 skeleton-shimmer" />
			</div>

			<div className="grid gap-3 lg:grid-cols-2">
				{[1, 2].map((i) => (
					<div key={i} className="space-y-3 rounded-lg border border-black/10 bg-white p-4">
						<div className="h-4 w-40 rounded bg-zinc-300/80 skeleton-shimmer" />
						{[1, 2, 3].map((r) => (
							<div key={r} className="h-3 w-full rounded bg-zinc-200/60 skeleton-shimmer" />
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function CollectionSkeleton() {
	return (
		<section className="overflow-hidden rounded-lg border border-black/10 bg-white">
			<div className="border-b border-black/10 px-4 py-3">
				<div className="h-4 w-40 rounded bg-zinc-300/80 skeleton-shimmer" />
				<div className="mt-2 h-3 w-72 rounded bg-zinc-200/60 skeleton-shimmer" />
			</div>
			<div className="p-4">
				<div className="grid gap-4 xl:grid-cols-[260px_1fr]">
					<aside className="rounded-lg border border-black/10 bg-white p-3">
						<div className="flex items-center justify-between gap-2 px-1 pb-3">
							<div className="h-3 w-16 rounded bg-zinc-200/70 skeleton-shimmer" />
							<div className="h-7 w-12 rounded-md border border-black/10 skeleton-shimmer" />
						</div>
						<div className="mb-3 h-9 w-full rounded-md bg-zinc-100 skeleton-shimmer" />
						<div className="space-y-2">
							{[1, 2, 3, 4, 5, 6, 7].map((i) => (
								<div key={i} className="rounded-md border border-transparent px-3 py-2">
									<div className="h-3.5 w-3/4 rounded bg-zinc-200/70 skeleton-shimmer" />
									<div className="mt-1.5 h-3 w-1/2 rounded bg-zinc-200/50 skeleton-shimmer" />
								</div>
							))}
						</div>
					</aside>

					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
							<div className="space-y-1.5">
								<div className="h-3 w-16 rounded bg-zinc-200/70 skeleton-shimmer" />
								<div className="h-5 w-48 rounded bg-zinc-300/80 skeleton-shimmer" />
							</div>
							<div className="h-9 w-20 rounded-md border border-black/10 skeleton-shimmer" />
						</div>

						<div className="mt-4 grid gap-4 md:grid-cols-2">
							{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
								<div key={i} className={i % 4 === 0 ? "md:col-span-2" : ""}>
									<div className="h-3 w-20 rounded bg-zinc-200/70 skeleton-shimmer" />
									<div className="mt-1 h-9 w-full rounded-md border border-black/10 bg-white skeleton-shimmer" />
								</div>
							))}
						</div>

						<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
							<div className="h-3 w-40 rounded bg-zinc-200/60 skeleton-shimmer" />
							<div className="h-10 w-32 rounded-md bg-[#111111]/70 skeleton-shimmer" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function TableSkeleton() {
	const widths = ["22%", "34%", "20%", "24%"];
	return (
		<section className="overflow-hidden rounded-lg border border-black/10 bg-white">
			<div className="border-b border-black/10 px-4 py-3">
				<div className="h-4 w-40 rounded bg-zinc-300/80 skeleton-shimmer" />
				<div className="mt-2 h-3 w-64 rounded bg-zinc-200/60 skeleton-shimmer" />
			</div>
			<div className="p-4">
				<div className="overflow-hidden rounded-lg border border-black/10">
					<div className="flex items-center gap-4 border-b border-black/10 px-4 py-3">
						{widths.map((w, i) => (
							<div key={i} className="h-3 rounded bg-zinc-200/70 skeleton-shimmer" style={{ width: w }} />
						))}
					</div>
					{[1, 2, 3, 4, 5, 6].map((r) => (
						<div key={r} className="flex items-center gap-4 border-b border-black/5 px-4 py-3 last:border-b-0">
							{widths.map((w, i) => (
								<div key={i} className="h-3 rounded bg-zinc-200/50 skeleton-shimmer" style={{ width: w }} />
							))}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function AnalyticsSkeleton() {
	return (
		<div className="space-y-3">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<div key={i} className="rounded-lg border border-black/10 bg-white p-3.5">
						<div className="h-3 w-20 rounded bg-zinc-200/70 skeleton-shimmer" />
						<div className="mt-2 h-7 w-24 rounded-md bg-zinc-300/80 skeleton-shimmer" />
					</div>
				))}
			</div>

			<div className="grid gap-3 lg:grid-cols-2">
				{[1, 2].map((i) => (
					<div key={i} className="rounded-lg border border-black/10 bg-white p-4">
						<div className="h-4 w-40 rounded bg-zinc-300/80 skeleton-shimmer" />
						<div className="mt-3 h-64 rounded-md bg-zinc-100/70 skeleton-shimmer" />
					</div>
				))}
			</div>

			<div className="rounded-lg border border-black/10 bg-white p-4">
				<div className="h-4 w-48 rounded bg-zinc-300/80 skeleton-shimmer" />
				<div className="mt-3 space-y-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="h-9 w-full rounded-md bg-zinc-100/70 skeleton-shimmer" />
					))}
				</div>
			</div>
		</div>
	);
}

export default AdminContentSkeleton;
