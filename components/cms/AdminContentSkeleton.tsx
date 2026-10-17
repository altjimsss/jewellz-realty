export function AdminContentSkeleton() {
	return (
		<>
			<div className="fixed left-0 right-0 top-0 z-50 h-[2px] overflow-hidden bg-black/5">
				<div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-[#DE141C] to-transparent" />
			</div>

			<div className="space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-2">
						<div className="h-6 w-48 rounded-md bg-zinc-300/70 skeleton-shimmer" />
						<div className="h-3.5 w-72 rounded bg-zinc-200/70 skeleton-shimmer" />
					</div>
					<div className="flex gap-2">
						<div className="h-9 w-28 rounded-md border border-black/10 bg-white shadow-xs skeleton-shimmer" />
						<div className="h-9 w-32 rounded-md bg-[#111111]/70 shadow-xs skeleton-shimmer" />
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-3 rounded-xl border border-black/10 bg-white p-4 shadow-xs">
							<div className="flex items-center justify-between gap-3">
								<div className="h-3 w-20 rounded bg-zinc-200/70 skeleton-shimmer" />
								<div className="h-6 w-6 rounded-md bg-zinc-100 skeleton-shimmer" />
							</div>
							<div className="h-7 w-28 rounded-md bg-zinc-300/80 skeleton-shimmer" />
							<div className="flex items-center gap-2 border-t border-black/5 pt-2">
								<div className="h-2.5 w-16 rounded bg-emerald-100 skeleton-shimmer" />
								<div className="h-2.5 w-24 rounded bg-zinc-200/60 skeleton-shimmer" />
							</div>
						</div>
					))}
				</div>

				<div className="grid gap-4 lg:grid-cols-3">
					<div className="space-y-4 rounded-xl border border-black/10 bg-white p-5 shadow-xs lg:col-span-2">
						<div className="space-y-1.5 border-b border-black/5 pb-3">
							<div className="h-4 w-36 rounded bg-zinc-300/80 skeleton-shimmer" />
							<div className="h-3 w-48 rounded bg-zinc-200/60 skeleton-shimmer" />
						</div>
						<div className="h-40 rounded-md bg-zinc-100/70 skeleton-shimmer" />
					</div>
					<div className="space-y-3 rounded-xl border border-black/10 bg-white p-5 shadow-xs">
						<div className="space-y-1.5 border-b border-black/5 pb-3">
							<div className="h-4 w-28 rounded bg-zinc-300/80 skeleton-shimmer" />
							<div className="h-3 w-36 rounded bg-zinc-200/60 skeleton-shimmer" />
						</div>
						{[1, 2, 3, 4].map((row) => (
							<div key={row} className="flex items-center gap-3 rounded-lg border border-black/5 bg-zinc-50/70 p-3">
								<div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200/80 skeleton-shimmer" />
								<div className="min-w-0 flex-1 space-y-1.5">
									<div className="h-3 w-24 rounded bg-zinc-300/80 skeleton-shimmer" />
									<div className="h-2.5 w-32 rounded bg-zinc-200/60 skeleton-shimmer" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}

export default AdminContentSkeleton;
