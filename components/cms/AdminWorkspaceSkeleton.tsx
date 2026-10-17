import Image from "next/image";
import {
	BarChart3,
	Building2,
	FolderTree,
	Inbox,
	LayoutDashboard,
	LogOut,
	PanelLeftClose,
	RefreshCw,
	Search,
	Users,
} from "lucide-react";

export function AdminWorkspaceSkeleton() {
	return (
		<main className="min-h-screen bg-[#f2f2ef] text-[#111111] overflow-hidden select-none">
			{/* Top ambient glowing sync line */}
			<div className="fixed top-0 left-0 right-0 z-50 h-[2px] overflow-hidden bg-black/5">
				<div className="h-full w-full bg-gradient-to-r from-transparent via-[#DE141C] to-transparent animate-[shimmer_1.4s_infinite]" />
			</div>

			<div className="grid min-h-screen w-full lg:grid-cols-[56px_220px_1fr]">
				{/* 1. Primary Left Icon Rail */}
				<aside className="hidden border-r border-black/10 bg-[#fbfbfa] py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-white ring-1 ring-black/10 shadow-xs">
							<Image
								src="/assets/logo-icon.png"
								alt="Jewellz Realty"
								width={32}
								height={32}
								className="h-8 w-8 object-contain animate-pulse"
								priority
							/>
						</div>
						<div className="flex flex-col gap-2">
							<div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#111111] text-white">
								<LayoutDashboard className="h-4 w-4" />
							</div>
							<div className="flex h-9 w-9 items-center justify-center rounded-md text-black/35">
								<FolderTree className="h-4 w-4" />
							</div>
							<div className="flex h-9 w-9 items-center justify-center rounded-md text-black/35">
								<Inbox className="h-4 w-4" />
							</div>
							<div className="flex h-9 w-9 items-center justify-center rounded-md text-black/35">
								<Users className="h-4 w-4" />
							</div>
							<div className="flex h-9 w-9 items-center justify-center rounded-md text-black/35">
								<BarChart3 className="h-4 w-4" />
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<div className="flex h-9 w-9 items-center justify-center rounded-md text-black/25">
							<RefreshCw className="h-4 w-4 animate-spin" />
						</div>
						<div className="flex h-9 w-9 items-center justify-center rounded-md text-black/20">
							<LogOut className="h-4 w-4" />
						</div>
					</div>
				</aside>

				{/* 2. Secondary Sidebar */}
				<aside className="hidden border-r border-black/10 bg-[#fbfbfa] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between">
					<div>
						{/* Agency Banner */}
						<div className="border-b border-black/10 px-3 py-3">
							<div className="rounded-md border border-black/10 bg-white p-2.5 shadow-xs">
								<div className="text-[10px] uppercase tracking-[0.14em] text-black/40">Agency</div>
								<div className="mt-1 text-xs font-semibold text-[#111111]">Jewellz Realty CMS</div>
								<div className="mt-1.5 h-2.5 w-24 rounded-full bg-zinc-200/80 skeleton-shimmer" />
							</div>
						</div>

						{/* Nav Item Skeletons */}
						<nav className="px-2 py-3 space-y-1">
							<div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40">
								Dashboard
							</div>

							<div className="relative flex items-center gap-2.5 rounded-md bg-white px-3 py-2 text-left shadow-xs border border-black/5">
								<div className="h-4 w-4 rounded bg-zinc-200/80 skeleton-shimmer shrink-0" />
								<div className="h-3 w-24 rounded bg-zinc-200/80 skeleton-shimmer" />
							</div>

							<div className="flex items-center gap-2.5 px-3 py-2">
								<div className="h-4 w-4 rounded bg-zinc-200/50 skeleton-shimmer shrink-0" />
								<div className="h-3 w-28 rounded bg-zinc-200/50 skeleton-shimmer" />
							</div>

							<div className="flex items-center gap-2.5 px-3 py-2">
								<div className="h-4 w-4 rounded bg-zinc-200/50 skeleton-shimmer shrink-0" />
								<div className="h-3 w-20 rounded bg-zinc-200/50 skeleton-shimmer" />
							</div>

							<div className="flex items-center gap-2.5 px-3 py-2">
								<div className="h-4 w-4 rounded bg-zinc-200/50 skeleton-shimmer shrink-0" />
								<div className="h-3 w-32 rounded bg-zinc-200/50 skeleton-shimmer" />
							</div>

							<div className="flex items-center gap-2.5 px-3 py-2">
								<div className="h-4 w-4 rounded bg-zinc-200/50 skeleton-shimmer shrink-0" />
								<div className="h-3 w-24 rounded bg-zinc-200/50 skeleton-shimmer" />
							</div>
						</nav>
					</div>

					{/* Bottom Status Indicator */}
					<div className="border-t border-black/10 px-3 py-3">
						<div className="flex items-center gap-2.5 rounded-lg border border-black/5 bg-white px-3 py-2 shadow-2xs">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DE141C] opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-[#DE141C]" />
							</span>
							<span className="text-[11px] font-medium text-black/60">
								Syncing workspace...
							</span>
						</div>
					</div>
				</aside>

				{/* 3. Main Workspace Area */}
				<section className="flex min-w-0 flex-col bg-[#f2f2ef]">
					{/* Header Bar */}
					<header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-black/10 bg-[#fbfbfa] px-4">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-black/40">
								<PanelLeftClose className="h-4 w-4" />
							</div>
							<div className="flex items-center gap-2 text-xs text-black/40">
								<span>Dashboard</span>
								<span>/</span>
								<div className="h-3 w-16 rounded bg-zinc-200/80 skeleton-shimmer" />
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="hidden sm:flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-1.5 w-64 shadow-2xs">
								<Search className="h-3.5 w-3.5 text-black/35" />
								<span className="text-xs text-black/35">Search workspace...</span>
								<span className="ml-auto rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-black/40">
									⌘K
								</span>
							</div>

							<div className="h-8 w-8 rounded-full border border-black/10 bg-zinc-200/70 skeleton-shimmer" />
						</div>
					</header>

					{/* Main Dashboard Canvas Skeleton */}
					<div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl">
						{/* Welcome Banner Shimmer */}
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div className="space-y-2">
								<div className="h-6 w-48 rounded-md bg-zinc-300/70 skeleton-shimmer" />
								<div className="h-3.5 w-72 rounded bg-zinc-200/70 skeleton-shimmer" />
							</div>
							<div className="flex gap-2">
								<div className="h-9 w-28 rounded-md bg-white border border-black/10 shadow-2xs skeleton-shimmer" />
								<div className="h-9 w-32 rounded-md bg-[#111111]/80 shadow-2xs skeleton-shimmer" />
							</div>
						</div>

						{/* 4 Metric Cards */}
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="rounded-xl border border-black/10 bg-white p-4 shadow-xs space-y-3"
								>
									<div className="flex items-center justify-between">
										<div className="h-3 w-20 rounded bg-zinc-200/70 skeleton-shimmer" />
										<div className="h-6 w-6 rounded-md bg-zinc-100 skeleton-shimmer" />
									</div>
									<div className="h-7 w-28 rounded-md bg-zinc-300/80 skeleton-shimmer" />
									<div className="flex items-center gap-2 pt-1 border-t border-black/5">
										<div className="h-2.5 w-16 rounded bg-emerald-100 skeleton-shimmer" />
										<div className="h-2.5 w-24 rounded bg-zinc-200/60 skeleton-shimmer" />
									</div>
								</div>
							))}
						</div>

						{/* Main Content Split: Chart (2/3) + Pipeline (1/3) */}
						<div className="grid gap-6 lg:grid-cols-3">
							{/* Large Chart Container */}
							<div className="lg:col-span-2 rounded-xl border border-black/10 bg-white p-5 shadow-xs space-y-4">
								<div className="flex items-center justify-between border-b border-black/5 pb-3">
									<div className="space-y-1.5">
										<div className="h-4 w-36 rounded bg-zinc-300/80 skeleton-shimmer" />
										<div className="h-3 w-48 rounded bg-zinc-200/60 skeleton-shimmer" />
									</div>
									<div className="flex gap-2">
										<div className="h-7 w-16 rounded bg-zinc-100 skeleton-shimmer" />
										<div className="h-7 w-16 rounded bg-zinc-100 skeleton-shimmer" />
									</div>
								</div>

								{/* Chart Visual Skeleton */}
								<div className="h-64 flex items-end justify-between gap-3 pt-6 px-2">
									{[40, 65, 30, 85, 55, 70, 45, 90, 60, 75, 50, 95].map((h, idx) => (
										<div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
											<div
												className="w-full rounded-t-sm bg-zinc-200/70 skeleton-shimmer transition-all duration-500"
												style={{ height: `${h}%` }}
											/>
											<div className="h-2 w-6 rounded bg-zinc-200/40" />
										</div>
									))}
								</div>
							</div>

							{/* Right Pipeline Stream */}
							<div className="rounded-xl border border-black/10 bg-white p-5 shadow-xs space-y-4">
								<div className="flex items-center justify-between border-b border-black/5 pb-3">
									<div className="space-y-1.5">
										<div className="h-4 w-28 rounded bg-zinc-300/80 skeleton-shimmer" />
										<div className="h-3 w-36 rounded bg-zinc-200/60 skeleton-shimmer" />
									</div>
									<div className="h-5 w-12 rounded bg-zinc-100 skeleton-shimmer" />
								</div>

								{/* Pipeline List Rows */}
								<div className="space-y-3 pt-1">
									{[1, 2, 3, 4, 5].map((row) => (
										<div
											key={row}
											className="flex items-center justify-between rounded-lg border border-black/5 bg-zinc-50/70 p-3"
										>
											<div className="flex items-center gap-3">
												<div className="h-8 w-8 rounded-full bg-zinc-200/80 skeleton-shimmer shrink-0" />
												<div className="space-y-1.5">
													<div className="h-3 w-24 rounded bg-zinc-300/80 skeleton-shimmer" />
													<div className="h-2.5 w-32 rounded bg-zinc-200/60 skeleton-shimmer" />
												</div>
											</div>
											<div className="h-6 w-16 rounded-full bg-zinc-200/70 skeleton-shimmer" />
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}

export default AdminWorkspaceSkeleton;
