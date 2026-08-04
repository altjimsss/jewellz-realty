function ShimmerBlock({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded-[10px] bg-black/[0.06] ${className}`}
			aria-hidden="true"
		/>
	);
}

function PropertyCardSkeleton() {
	return (
		<div className="overflow-hidden bg-white shadow-sm">
			<ShimmerBlock className="h-44 w-full rounded-none" />
			<div className="flex flex-col bg-[#F4F4F4] p-3.5">
				<ShimmerBlock className="h-4 w-3/4" />
				<ShimmerBlock className="mt-2 h-3 w-1/2" />
				<div className="mt-3 flex items-center justify-between gap-2 border-t border-black/8 pt-3">
					<div className="flex items-center gap-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<ShimmerBlock key={i} className="h-3.5 w-8" />
						))}
					</div>
					<ShimmerBlock className="h-8 w-20" />
				</div>
			</div>
		</div>
	);
}

export function ProjectListSkeleton() {
	return (
		<section
			className="mx-auto max-w-[1200px] px-4"
			role="status"
			aria-live="polite"
			aria-label="Loading properties"
		>
			{/* Filters bar */}
			<div className="mt-6 overflow-hidden rounded-[14px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
				<div className="flex w-full flex-wrap items-end gap-x-3 gap-y-3 px-4 py-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="min-w-[132px] flex-1">
							<ShimmerBlock className="h-3 w-16" />
							<ShimmerBlock className="mt-2 h-9 w-full rounded-[8px]" />
						</div>
					))}
					<ShimmerBlock className="h-9 w-24 rounded-[8px]" />
				</div>
			</div>

			{/* Heading + tabs */}
			<div className="mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div>
					<ShimmerBlock className="h-6 w-32" />
					<ShimmerBlock className="mt-2 h-3.5 w-24" />
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<ShimmerBlock key={i} className="h-9 w-16 rounded-sm" />
					))}
				</div>
			</div>

			{/* Card grid */}
			<div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<PropertyCardSkeleton key={i} />
				))}
			</div>

			<span className="sr-only">Loading properties…</span>
		</section>
	);
}
