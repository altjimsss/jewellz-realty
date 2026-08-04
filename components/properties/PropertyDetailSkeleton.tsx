function ShimmerBlock({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded-[10px] bg-black/[0.06] ${className}`}
			aria-hidden="true"
		/>
	);
}

export function PropertyDetailSkeleton() {
	return (
		<section
			className="mx-auto max-w-[1200px] px-4 py-4 md:py-6"
			role="status"
			aria-live="polite"
			aria-label="Loading property details"
		>
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
				{/* Main column */}
				<div className="space-y-6">
					{/* Gallery */}
					<div className="space-y-2">
						<ShimmerBlock className="h-[420px] w-full" />
						<div className="flex gap-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<ShimmerBlock key={i} className="h-16 w-20 shrink-0" />
							))}
						</div>
					</div>

					{/* Location row */}
					<div className="flex items-center gap-2">
						<ShimmerBlock className="h-6 w-6 rounded-full" />
						<ShimmerBlock className="h-5 w-28" />
						<ShimmerBlock className="h-4 w-40" />
					</div>

					{/* Recommendations row */}
					<div>
						<ShimmerBlock className="mb-4 h-6 w-48" />
						<div className="flex gap-3 overflow-hidden">
							{Array.from({ length: 3 }).map((_, i) => (
								<ShimmerBlock key={i} className="h-[220px] w-[300px] shrink-0" />
							))}
						</div>
					</div>
				</div>

				{/* Sidebar */}
				<aside className="space-y-4">
					<div className="rounded-[12px] bg-white p-4">
						<div className="flex items-start justify-between gap-3">
							<ShimmerBlock className="h-7 w-2/3" />
							<ShimmerBlock className="h-8 w-16 rounded-full" />
						</div>
						<ShimmerBlock className="mt-4 h-4 w-24" />
						<ShimmerBlock className="mt-2 h-9 w-40" />
						<ShimmerBlock className="mt-3 h-4 w-full" />
						<ShimmerBlock className="mt-2 h-4 w-5/6" />
						<ShimmerBlock className="mt-2 h-4 w-4/6" />

						<div className="mt-4 grid grid-cols-2 gap-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<ShimmerBlock key={i} className="h-10 w-full" />
							))}
						</div>
					</div>

					<ShimmerBlock className="h-12 w-full rounded-2xl" />
					<ShimmerBlock className="h-[520px] w-full rounded-2xl" />
				</aside>
			</div>
			<span className="sr-only">Loading property details…</span>
		</section>
	);
}
