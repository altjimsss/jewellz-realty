"use client";

export type PropertyFiltersState = {
	keyword: string;
	lookingFor: string;
	location: string;
	priceMin: string;
	priceMax: string;
};

type PropertyFiltersProps = {
	value: PropertyFiltersState;
	onChange: (next: PropertyFiltersState) => void;
	onSubmit?: () => void;
};

const LOOKING_FOR_OPTIONS = ["", "House", "Apartment", "Condo", "Townhouse", "Lot", "Commercial"];

const LOCATION_OPTIONS = ["", "Batangas", "Cavite", "Laguna", "Metro Manila", "Tagaytay", "Nuvali"];

export function PropertyFilters({ value, onChange, onSubmit }: PropertyFiltersProps) {
	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit?.();
			}}
			className="overflow-hidden rounded-sm bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.35)]"
		>
			<div className="grid grid-cols-12">
				<div className="col-span-3 border-r border-black/10 px-4 py-3">
					<p className="text-[10px] font-semibold text-black/60">Search</p>
					<input
						value={value.keyword}
						onChange={(e) => onChange({ ...value, keyword: e.target.value })}
						placeholder="Enter Keywords"
						className="mt-1 h-10 w-full rounded-sm border border-black/10 bg-white px-3 text-xs text-black placeholder:text-black/40 outline-none focus:border-[#DE141C]"
						type="search"
					/>
				</div>

				<div className="col-span-2 border-r border-black/10 px-4 py-3">
					<p className="text-[10px] font-semibold text-black/60">Looking For</p>
					<div className="relative mt-1">
						<select
							value={value.lookingFor}
							onChange={(e) => onChange({ ...value, lookingFor: e.target.value })}
							className="h-10 w-full appearance-none rounded-sm border border-black/10 bg-white px-3 pr-7 text-xs text-black outline-none focus:border-[#DE141C]"
						>
							{LOOKING_FOR_OPTIONS.map((opt) => (
								<option key={opt || "any"} value={opt}>
									{opt || "Type"}
								</option>
							))}
						</select>
						<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
							<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</div>
				</div>

				<div className="col-span-3 border-r border-black/10 px-4 py-3">
					<p className="text-[10px] font-semibold text-black/60">Location</p>
					<div className="relative mt-1">
						<select
							value={value.location}
							onChange={(e) => onChange({ ...value, location: e.target.value })}
							className="h-10 w-full appearance-none rounded-sm border border-black/10 bg-white px-3 pr-7 text-xs text-black outline-none focus:border-[#DE141C]"
						>
							{LOCATION_OPTIONS.map((opt) => (
								<option key={opt || "any"} value={opt}>
									{opt || "Location"}
								</option>
							))}
						</select>
						<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
							<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</div>
				</div>

				<div className="col-span-3 border-r border-black/10 px-4 py-3">
					<p className="text-[10px] font-semibold text-black/60">Price</p>
					<div className="mt-1 grid grid-cols-2 gap-2">
						<input
							value={value.priceMin}
							onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
							placeholder="Min"
							inputMode="numeric"
							className="h-10 w-full rounded-sm border border-black/10 bg-white px-3 text-xs text-black placeholder:text-black/40 outline-none focus:border-[#DE141C]"
						/>
						<input
							value={value.priceMax}
							onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
							placeholder="Max"
							inputMode="numeric"
							className="h-10 w-full rounded-sm border border-black/10 bg-white px-3 text-xs text-black placeholder:text-black/40 outline-none focus:border-[#DE141C]"
						/>
					</div>
				</div>

				<div className="col-span-1 flex items-center justify-center bg-[#DE141C] px-3">
					<button
						type="submit"
						className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#DE141C] text-xs font-semibold text-white"
					>
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
							<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
						Search
					</button>
				</div>
			</div>
		</form>
	);
}