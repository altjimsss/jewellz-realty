"use client";

import { useState } from "react";

export type PropertyFiltersState = {
	keyword: string;
	lookingFor: string;
	location: string;
	subLocation: string;
	priceMin: string;
	priceMax: string;
	status: string;
	beds: string;
	baths: string;
};

type PropertyFiltersProps = {
	value: PropertyFiltersState;
	onChange: (next: PropertyFiltersState) => void;
	onSubmit?: () => void;
};

const LOOKING_FOR_OPTIONS = ["", "Condo", "House", "Lot", "Farm", "Memorial"];
const LOCATION_OPTIONS = ["", "Batangas", "Cavite", "Laguna", "Metro Manila", "Tagaytay", "Nuvali"];
const SUBLOCATION_OPTIONS = ["", "Lipa", "Nuvali", "Tagaytay", "Alabang"];
const STATUS_OPTIONS = ["", "For Sale", "Pre-Selling", "Ready for Occupancy"];

function ChevronIcon() {
	return (
		<svg viewBox="0 0 24 24" className="h-3 w-3 flex-shrink-0 text-[#bbb]" fill="none" aria-hidden="true">
			<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function PropertyFilters({ value, onChange, onSubmit }: PropertyFiltersProps) {
	const [showPhoneFilters, setShowPhoneFilters] = useState(false);
	const activePhoneFilterCount = [value.lookingFor, value.priceMin, value.priceMax, value.status].filter(Boolean).length;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit?.();
			}}
			className="overflow-hidden rounded-[14px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)]"
		>
			<div className="hidden lg:block">
				<div className="flex w-full flex-wrap items-end gap-x-3 gap-y-3 px-4 py-3">
					<div className="min-w-[180px] flex-[1.4]">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black">Search</p>
						<div className="mt-0.5 flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<input
								value={value.keyword}
								onChange={(e) => onChange({ ...value, keyword: e.target.value })}
								aria-label="Enter Keywords"
								placeholder="Enter Keywords"
								className="h-full w-full border-none bg-transparent text-[11px] text-black outline-none placeholder:text-[#bbb]"
								type="search"
							/>
						</div>
					</div>

					<div className="min-w-[132px] flex-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black">Looking For</p>
						<div className="relative mt-0.5 flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<select
								value={value.lookingFor}
								onChange={(e) => onChange({ ...value, lookingFor: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent pr-8 text-[11px] font-normal outline-none ${value.lookingFor ? "text-black" : "text-[#aaa]"}`}
							>
								{LOOKING_FOR_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Category"}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
								<ChevronIcon />
							</div>
						</div>
					</div>

					<div className="min-w-[132px] flex-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black">Location</p>
						<div className="relative mt-0.5 flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<select
								value={value.location}
								onChange={(e) => onChange({ ...value, location: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent pr-8 text-[11px] font-normal outline-none ${value.location ? "text-black" : "text-[#aaa]"}`}
							>
								{LOCATION_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Location"}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
								<ChevronIcon />
							</div>
						</div>
					</div>

					<div className="min-w-[140px] flex-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black">Sub-Location</p>
						<div className="relative mt-0.5 flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<select
								value={value.subLocation}
								onChange={(e) => onChange({ ...value, subLocation: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent pr-8 text-[11px] font-normal outline-none ${value.subLocation ? "text-black" : "text-[#aaa]"}`}
							>
								{SUBLOCATION_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Sub-Location"}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
								<ChevronIcon />
							</div>
						</div>
					</div>

					<div className="min-w-[200px] flex-[1.2]">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black">Price</p>
						<div className="mt-0.5 flex h-9 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<input
								value={value.priceMin}
								onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
								aria-label="Min"
								placeholder="Min"
								inputMode="numeric"
								className="min-w-0 flex-1 border-none bg-transparent text-[11px] text-black outline-none placeholder:text-[#bbb]"
							/>
							<span className="shrink-0 text-[11px] text-[#bbb]">-</span>
							<input
								value={value.priceMax}
								onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
								aria-label="Max"
								placeholder="Max"
								inputMode="numeric"
								className="min-w-0 flex-1 border-none bg-transparent text-[11px] text-black outline-none placeholder:text-[#bbb]"
							/>
						</div>
					</div>

					<div className="min-w-[132px] flex-1">
						<p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black">Status</p>
						<div className="relative mt-0.5 flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<select
								value={value.status}
								onChange={(e) => onChange({ ...value, status: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent pr-8 text-[11px] font-normal outline-none ${value.status ? "text-black" : "text-[#aaa]"}`}
							>
								{STATUS_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Status"}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
								<ChevronIcon />
							</div>
						</div>
					</div>

					<button type="submit" className="ml-auto self-center inline-flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[#e63232] px-4 py-2 text-[11px] font-semibold text-white transition hover:-translate-y-px hover:bg-[#c92020]">
						<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
							<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
						Search
					</button>
				</div>
			</div>

			<div className="hidden px-4 py-4 sm:block lg:hidden">
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">Search</p>
						<div className="flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<input
								value={value.keyword}
								onChange={(e) => onChange({ ...value, keyword: e.target.value })}
								aria-label="Enter Keywords"
								placeholder="Enter Keywords"
								className="h-full w-full border-none bg-transparent text-[11px] outline-none placeholder:text-black/35"
								type="search"
							/>
						</div>
					</div>
					<div>
						<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">Looking For</p>
						<div className="flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<select
								value={value.lookingFor}
								onChange={(e) => onChange({ ...value, lookingFor: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent text-[11px] outline-none ${value.lookingFor ? "text-black" : "text-[#aaa]"}`}
							>
								{LOOKING_FOR_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Category"}
									</option>
								))}
							</select>
						</div>
					</div>
					<div>
						<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">Price</p>
						<div className="flex h-9 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<input
								value={value.priceMin}
								onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
								aria-label="Min"
								placeholder="Min"
								inputMode="numeric"
								className="min-w-0 flex-1 border-none bg-transparent text-[11px] outline-none placeholder:text-black/35"
							/>
							<span className="shrink-0 text-[11px] text-black/35">-</span>
							<input
								value={value.priceMax}
								onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
								aria-label="Max"
								placeholder="Max"
								inputMode="numeric"
								className="min-w-0 flex-1 border-none bg-transparent text-[11px] outline-none placeholder:text-black/35"
							/>
						</div>
					</div>
					<div>
						<p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black">Status</p>
						<div className="flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
							<select
								value={value.status}
								onChange={(e) => onChange({ ...value, status: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent text-[11px] outline-none ${value.status ? "text-black" : "text-[#aaa]"}`}
							>
								{STATUS_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Status"}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
				<button type="submit" className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[8px] bg-[#e63232] text-[11px] font-semibold text-white">
					<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
						<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
						<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
					</svg>
					Search
				</button>
			</div>

			<div className="px-3 py-3 sm:hidden">
				<div className="flex items-center gap-2">
					<div className="flex h-10 min-w-0 flex-1 items-center rounded-[8px] border border-black/10 bg-white px-3 shadow-sm">
						<input
							value={value.keyword}
							onChange={(e) => onChange({ ...value, keyword: e.target.value })}
							aria-label="Enter Keywords"
							placeholder="Search properties…"
							className="h-full w-full min-w-0 border-none bg-transparent text-[13px] outline-none placeholder:text-black/35"
							type="search"
						/>
					</div>
					<button type="submit" aria-label="Search" className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#e63232] text-white transition hover:bg-[#c92020]">
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
							<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
					</button>
				</div>

				<button
					type="button"
					onClick={() => setShowPhoneFilters((current) => !current)}
					aria-expanded={showPhoneFilters}
					className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3 text-[11px] font-semibold text-black/70 transition-colors"
				>
					<svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden="true">
						<path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
					</svg>
					Filters
					{activePhoneFilterCount > 0 ? (
						<span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DE141C] px-1 text-[9px] font-bold text-white">
							{activePhoneFilterCount}
						</span>
					) : null}
					<svg viewBox="0 0 24 24" className={`h-3 w-3 text-[#bbb] transition-transform ${showPhoneFilters ? "rotate-180" : ""}`} fill="none" aria-hidden="true">
						<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>

				{showPhoneFilters ? (
					<div className="mt-2 grid grid-cols-2 gap-2">
						<div className="relative flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-2.5 shadow-sm">
							<select
								value={value.lookingFor}
								onChange={(e) => onChange({ ...value, lookingFor: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent outline-none text-[12px] ${value.lookingFor ? "text-black" : "text-[#aaa]"}`}
							>
								{LOOKING_FOR_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Category"}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
								<ChevronIcon />
							</div>
						</div>
						<div className="relative flex h-9 items-center rounded-[8px] border border-black/10 bg-white px-2.5 shadow-sm">
							<select
								value={value.status}
								onChange={(e) => onChange({ ...value, status: e.target.value })}
								className={`h-full w-full appearance-none border-none bg-transparent outline-none text-[12px] ${value.status ? "text-black" : "text-[#aaa]"}`}
							>
								{STATUS_OPTIONS.map((opt) => (
									<option key={opt || "any"} value={opt}>
										{opt || "Status"}
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
								<ChevronIcon />
							</div>
						</div>
						<div className="col-span-2 flex h-9 items-center gap-2 rounded-[8px] border border-black/10 bg-white px-2.5 shadow-sm">
							<input
								value={value.priceMin}
								onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
								aria-label="Min"
								placeholder="Min price"
								inputMode="numeric"
								className="min-w-0 flex-1 border-none bg-transparent text-[12px] outline-none placeholder:text-black/35"
							/>
							<span className="shrink-0 text-[11px] text-black/35">-</span>
							<input
								value={value.priceMax}
								onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
								aria-label="Max"
								placeholder="Max price"
								inputMode="numeric"
								className="min-w-0 flex-1 border-none bg-transparent text-[12px] outline-none placeholder:text-black/35"
							/>
						</div>
					</div>
				) : null}
			</div>
		</form>
	);
}
