function ShimmerBlock({ className = "" }: { className?: string }) {
	return <div className={`skeleton-shimmer ${className}`} aria-hidden="true" />;
}

/**
 * Structural replica of PropertyDetailContent — same grid, same sizes, same
 * element order — so the skeleton hand-off has no layout shift. Wrapped in
 * `skeleton-delayed` so instant (cached) navigations never flash a skeleton.
 */
export function PropertyDetailSkeleton() {
	return (
		<section
			className="mx-auto max-w-[1200px] px-4 py-4 md:py-6"
			role="status"
			aria-live="polite"
			aria-label="Loading property details"
		>
			<div className="skeleton-delayed">
				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
					{/* Main column */}
					<div className="space-y-6">
						{/* Gallery: 2 stacked thumbs + main image */}
						<div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)]">
							<div className="grid h-80 grid-rows-2 gap-3 lg:h-96">
								<ShimmerBlock className="h-full w-full" />
								<ShimmerBlock className="h-full w-full" />
							</div>
							<ShimmerBlock className="h-80 w-full lg:h-96" />
						</div>

						{/* Location row: pin + heading + location + Open map pill */}
						<div className="flex flex-wrap items-center gap-2">
							<ShimmerBlock className="h-6 w-6 rounded-full" />
							<ShimmerBlock className="h-7 w-28" />
							<span className="text-black/30" aria-hidden="true">•</span>
							<ShimmerBlock className="h-4 w-44" />
							<span className="text-black/30" aria-hidden="true">•</span>
							<ShimmerBlock className="h-7 w-28 rounded-full" />
						</div>

						{/* What's nearby (rendered by PropertyLocationMap) */}
						<div className="w-full pl-6">
							<ShimmerBlock className="mb-3 h-4 w-40" />
							<div className="flex flex-wrap gap-2">
								<ShimmerBlock className="h-10 w-32 rounded-lg" />
								<ShimmerBlock className="h-10 w-28 rounded-lg" />
								<ShimmerBlock className="h-10 w-24 rounded-lg" />
								<ShimmerBlock className="h-10 w-28 rounded-lg" />
							</div>
							<div className="mt-3 rounded-[12px] border border-black/10">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={i}
										className={`flex items-center justify-between gap-4 px-4 py-3 ${i > 0 ? "border-t border-black/8" : ""}`}
									>
										<ShimmerBlock className="h-3.5 w-40" />
										<div className="flex items-center gap-1.5">
											<ShimmerBlock className="h-2 w-2 rounded-full" />
											<ShimmerBlock className="h-3 w-10" />
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Recommendations: heading + 3 property cards */}
						<div>
							<div className="mb-4 flex items-center gap-2">
								<ShimmerBlock className="h-6 w-6" />
								<ShimmerBlock className="h-6 w-48" />
							</div>
							<div className="-mx-1 flex gap-3 overflow-hidden px-1 py-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="w-[300px] shrink-0 overflow-hidden bg-white shadow-sm">
										<ShimmerBlock className="h-44 w-full" />
										<div className="flex flex-col bg-[#F4F4F4] p-3.5">
											<ShimmerBlock className="h-4 w-[88%]" />
											<ShimmerBlock className="mt-1.5 h-3 w-[55%]" />
											<div className="mt-3 flex items-center justify-between gap-2 border-t border-black/8 pt-3">
												<div className="flex items-center gap-3">
													<ShimmerBlock className="h-3.5 w-10" />
													<ShimmerBlock className="h-3.5 w-10" />
													<ShimmerBlock className="h-3.5 w-12" />
												</div>
												<ShimmerBlock className="h-8 w-24" />
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* Sidebar */}
					<aside className="space-y-4">
						<div className="rounded-[12px] bg-white p-4">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<ShimmerBlock className="h-7 w-3/4" />
									<ShimmerBlock className="mt-2 h-5 w-24 rounded-full" />
								</div>
								<ShimmerBlock className="h-8 w-16 shrink-0 rounded-full" />
							</div>

							<ShimmerBlock className="mt-4 h-4 w-16" />
							<ShimmerBlock className="mt-2 h-8 w-44" />
							<div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
								<ShimmerBlock className="h-3 w-40" />
								<ShimmerBlock className="h-3 w-20" />
								<ShimmerBlock className="h-3 w-24" />
							</div>

							<div className="mt-4 space-y-2">
								<ShimmerBlock className="h-3.5 w-full" />
								<ShimmerBlock className="h-3.5 w-[92%]" />
								<ShimmerBlock className="h-3.5 w-[84%]" />
								<ShimmerBlock className="h-3.5 w-[64%]" />
							</div>

							<hr className="my-4 border-black/10" />

							<div className="grid grid-cols-2 gap-x-3 gap-y-2">
								{Array.from({ length: 6 }).map((_, i) => (
									<div key={i} className="flex items-center gap-2 py-1">
										<ShimmerBlock className="h-8 w-8 shrink-0 rounded-[6px]" />
										<div className="min-w-0 flex-1">
											<ShimmerBlock className="h-2.5 w-14" />
											<ShimmerBlock className="mt-1 h-3 w-16" />
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Book an Appointment button */}
						<ShimmerBlock className="h-11 w-full rounded-2xl" />

						{/* Chat assistant widget */}
						<div className="h-[520px] max-h-[70vh] overflow-hidden rounded-2xl border border-black/10 bg-white">
							<div className="border-b border-black/10 bg-[#f4f4f4] px-3 py-2.5">
								<div className="flex items-center gap-2.5">
									<ShimmerBlock className="h-9 w-9 shrink-0 rounded-lg" />
									<div className="min-w-0">
										<ShimmerBlock className="h-3.5 w-20" />
										<ShimmerBlock className="mt-1 h-2.5 w-36" />
									</div>
								</div>
							</div>
							<div className="p-3">
								<div className="flex items-end gap-2">
									<ShimmerBlock className="h-7 w-7 shrink-0 rounded-full" />
									<ShimmerBlock className="h-16 w-[72%] rounded-[14px]" />
								</div>
							</div>
						</div>

						{/* Inquire card (collapsed) */}
						<div className="rounded-[12px] border border-black/10 bg-white p-4 shadow-sm">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<ShimmerBlock className="h-5 w-5 shrink-0" />
									<div className="min-w-0">
										<ShimmerBlock className="h-3.5 w-24" />
										<ShimmerBlock className="mt-1 h-2.5 w-48" />
									</div>
								</div>
								<ShimmerBlock className="h-4 w-4 shrink-0" />
							</div>
						</div>

						<div className="flex justify-end">
							<ShimmerBlock className="h-3 w-64" />
						</div>
					</aside>
				</div>
			</div>
			<span className="sr-only">Loading property details…</span>
		</section>
	);
}
