"use client";

import { useEffect, useRef, useState } from "react";

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

const LABEL_CLASS = "block text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40";
const INPUT_CLASS = "mt-1 h-6 w-full border-none bg-transparent text-[13px] font-medium text-[#161311] outline-none placeholder:text-black/25";
const padY = "py-[clamp(16px,1.8vw,24px)]";
const padX = "pl-[clamp(14px,1.6vw,24px)] pr-4";

function ChevronIcon({ className = "h-2.5 w-2.5 text-black/30" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
			<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
			<path d="M2.5 6.5l2.5 2.5L9.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

function SearchIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
			<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
			<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	);
}

type FilterSelectProps = {
	value: string;
	options: string[];
	placeholder: string;
	onChange: (next: string) => void;
	ariaLabel: string;
	compact?: boolean;
};

function FilterSelect({ value, options, placeholder, onChange, ariaLabel, compact = false }: FilterSelectProps) {
	const [open, setOpen] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const hasValue = value !== "";
	const triggerText = compact ? "text-[12px]" : "text-[13px]";

	useEffect(() => {
		if (!open) return;

		function handlePointerDown(event: MouseEvent) {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
		}

		document.addEventListener("mousedown", handlePointerDown);

		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, [open]);

	function moveHighlight(delta: number) {
		setHighlightIndex((index) => {
			const next = index + delta;
			if (next < 0) return options.length - 1;
			if (next >= options.length) return 0;
			return next;
		});
	}

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={ariaLabel}
				onClick={() => {
					if (!open) setHighlightIndex(Math.max(0, options.indexOf(value)));
					setOpen((current) => !current);
				}}
				onKeyDown={(event) => {
					if (event.key === "ArrowDown" || event.key === "ArrowUp") {
						event.preventDefault();
						if (!open) {
							setHighlightIndex(Math.max(0, options.indexOf(value)));
							setOpen(true);
							return;
						}
						moveHighlight(event.key === "ArrowDown" ? 1 : -1);
						return;
					}
					if (event.key === "Enter") {
						if (!open) return;
						event.preventDefault();
						onChange(options[highlightIndex] ?? value);
						setOpen(false);
						return;
					}
					if (event.key === "Escape") setOpen(false);
				}}
				className={`flex h-6 w-full items-center justify-between gap-2 text-left font-medium outline-none ${triggerText} transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#DE141C] ${
					hasValue ? "text-[#161311]" : "text-black/35"
				}`}
			>
				<span className="min-w-0 truncate">{hasValue ? value : placeholder}</span>
				<span className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
					<ChevronIcon />
				</span>
			</button>

			{open ? (
				<div
					role="listbox"
					aria-label={ariaLabel}
					className="absolute left-0 top-full z-50 mt-2.5 w-max min-w-full max-h-[248px] overflow-y-auto border border-black/[0.08] bg-white py-1.5 shadow-[0_2px_6px_rgba(20,16,12,0.05),0_18px_44px_-16px_rgba(20,16,12,0.22)]"
					style={{ animation: "jz-filter-pop 180ms cubic-bezier(0.22,1,0.36,1) both" }}
				>
					{options.map((opt, index) => {
						const selected = opt === value;
						const highlighted = index === highlightIndex;
						return (
							<button
								key={opt || "any"}
								type="button"
								role="option"
								aria-selected={selected}
								tabIndex={-1}
								onMouseEnter={() => setHighlightIndex(index)}
								onClick={() => {
									onChange(opt);
									setOpen(false);
								}}
								className={`flex w-full items-center gap-2 whitespace-nowrap px-3.5 py-2 text-left text-[12px] transition-colors duration-100 ${
									selected ? "font-semibold text-[#DE141C]" : "font-medium text-[#161311]"
								} ${highlighted && !selected ? "bg-black/[0.035]" : ""} ${highlighted && selected ? "bg-[#DE141C]/[0.06]" : ""}`}
							>
								<span className="flex h-2.5 w-2.5 shrink-0 items-center justify-center">
									{selected ? <CheckIcon /> : null}
								</span>
								<span className="min-w-0">{opt || placeholder}</span>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

export function PropertyFilters({ value, onChange, onSubmit }: PropertyFiltersProps) {
	const [showPhoneFilters, setShowPhoneFilters] = useState(false);
	const activePhoneFilterCount = [value.lookingFor, value.location, value.subLocation, value.priceMin, value.priceMax, value.status].filter(Boolean).length;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit?.();
			}}
			className="bg-transparent"
		>
			<style>{`
				@keyframes jz-filter-pop {
					from { opacity: 0; transform: translateY(-6px) scale(0.98); }
					to { opacity: 1; transform: translateY(0) scale(1); }
				}
			`}</style>

			<div className="hidden lg:flex lg:flex-wrap lg:items-stretch lg:gap-y-5">
				<div className={`min-w-[150px] flex-[1.35] ${padY} pr-4`}>
					<p className={LABEL_CLASS}>Search</p>
					<input
						value={value.keyword}
						onChange={(e) => onChange({ ...value, keyword: e.target.value })}
						aria-label="Enter Keywords"
						placeholder="Enter keywords"
						className={INPUT_CLASS}
						type="search"
					/>
				</div>

				<div className={`min-w-[128px] flex-1 border-l border-[#EAE4DE] ${padY} ${padX}`}>
					<p className={LABEL_CLASS}>Looking for</p>
					<div className="mt-1">
						<FilterSelect
							value={value.lookingFor}
							options={LOOKING_FOR_OPTIONS}
							placeholder="Any type"
							ariaLabel="Looking for"
							onChange={(next) => onChange({ ...value, lookingFor: next })}
						/>
					</div>
				</div>

				<div className={`min-w-[128px] flex-1 border-l border-[#EAE4DE] ${padY} ${padX}`}>
					<p className={LABEL_CLASS}>Location</p>
					<div className="mt-1">
						<FilterSelect
							value={value.location}
							options={LOCATION_OPTIONS}
							placeholder="Any province"
							ariaLabel="Location"
							onChange={(next) => onChange({ ...value, location: next })}
						/>
					</div>
				</div>

				<div className={`min-w-[128px] flex-1 border-l border-[#EAE4DE] ${padY} ${padX}`}>
					<p className={LABEL_CLASS}>Sub-location</p>
					<div className="mt-1">
						<FilterSelect
							value={value.subLocation}
							options={SUBLOCATION_OPTIONS}
							placeholder="Any area"
							ariaLabel="Sub-location"
							onChange={(next) => onChange({ ...value, subLocation: next })}
						/>
					</div>
				</div>

				<div className={`min-w-[168px] flex-[1.25] border-l border-[#EAE4DE] ${padY} ${padX}`}>
					<p className={LABEL_CLASS}>Price</p>
					<div className="mt-1 flex items-center gap-2">
						<input
							value={value.priceMin}
							onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
							aria-label="Min"
							placeholder="Min"
							inputMode="numeric"
							className="h-6 min-w-0 flex-1 border-none bg-transparent text-[13px] font-medium text-[#161311] outline-none placeholder:text-black/25"
						/>
						<span className="shrink-0 text-[12px] text-black/20">–</span>
						<input
							value={value.priceMax}
							onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
							aria-label="Max"
							placeholder="Max"
							inputMode="numeric"
							className="h-6 min-w-0 flex-1 border-none bg-transparent text-[13px] font-medium text-[#161311] outline-none placeholder:text-black/25"
						/>
					</div>
				</div>

				<div className={`min-w-[124px] flex-1 border-l border-[#EAE4DE] ${padY} ${padX}`}>
					<p className={LABEL_CLASS}>Status</p>
					<div className="mt-1">
						<FilterSelect
							value={value.status}
							options={STATUS_OPTIONS}
							placeholder="Any status"
							ariaLabel="Status"
							onChange={(next) => onChange({ ...value, status: next })}
						/>
					</div>
				</div>

				<button
					type="submit"
					className="self-stretch bg-[#DE141C] px-[clamp(22px,2.4vw,36px)] text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-[#B8101A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#DE141C]"
				>
					<span className="flex items-center gap-2">
						Search
						<SearchIcon />
					</span>
				</button>
			</div>

			<div className="hidden items-stretch sm:block lg:hidden">
				<div className="grid grid-cols-2 gap-px border border-[#EAE4DE] bg-[#EAE4DE]">
					<div className="bg-white p-4">
						<p className={LABEL_CLASS}>Search</p>
						<input
							value={value.keyword}
							onChange={(e) => onChange({ ...value, keyword: e.target.value })}
							aria-label="Enter Keywords"
							placeholder="Enter keywords"
							className="mt-1 h-6 w-full border-none bg-transparent text-[12px] font-medium text-[#161311] outline-none placeholder:text-black/25"
							type="search"
						/>
					</div>
					<div className="bg-white p-4">
						<p className={LABEL_CLASS}>Looking for</p>
						<div className="mt-1">
							<FilterSelect
								value={value.lookingFor}
								options={LOOKING_FOR_OPTIONS}
								placeholder="Any type"
								ariaLabel="Looking for"
								compact
								onChange={(next) => onChange({ ...value, lookingFor: next })}
							/>
						</div>
					</div>
					<div className="bg-white p-4">
						<p className={LABEL_CLASS}>Location</p>
						<div className="mt-1">
							<FilterSelect
								value={value.location}
								options={LOCATION_OPTIONS}
								placeholder="Any province"
								ariaLabel="Location"
								compact
								onChange={(next) => onChange({ ...value, location: next })}
							/>
						</div>
					</div>
					<div className="bg-white p-4">
						<p className={LABEL_CLASS}>Sub-location</p>
						<div className="mt-1">
							<FilterSelect
								value={value.subLocation}
								options={SUBLOCATION_OPTIONS}
								placeholder="Any area"
								ariaLabel="Sub-location"
								compact
								onChange={(next) => onChange({ ...value, subLocation: next })}
							/>
						</div>
					</div>
					<div className="bg-white p-4">
						<p className={LABEL_CLASS}>Price</p>
						<div className="mt-1 flex items-center gap-2">
							<input
								value={value.priceMin}
								onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
								aria-label="Min"
								placeholder="Min"
								inputMode="numeric"
								className="h-6 min-w-0 flex-1 border-none bg-transparent text-[12px] font-medium text-[#161311] outline-none placeholder:text-black/25"
							/>
							<span className="shrink-0 text-[12px] text-black/20">–</span>
							<input
								value={value.priceMax}
								onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
								aria-label="Max"
								placeholder="Max"
								inputMode="numeric"
								className="h-6 min-w-0 flex-1 border-none bg-transparent text-[12px] font-medium text-[#161311] outline-none placeholder:text-black/25"
							/>
						</div>
					</div>
					<div className="bg-white p-4">
						<p className={LABEL_CLASS}>Status</p>
						<div className="mt-1">
							<FilterSelect
								value={value.status}
								options={STATUS_OPTIONS}
								placeholder="Any status"
								ariaLabel="Status"
								compact
								onChange={(next) => onChange({ ...value, status: next })}
							/>
						</div>
					</div>
				</div>
				<button
					type="submit"
					className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#DE141C] text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-[#B8101A]"
				>
					Search
					<SearchIcon />
				</button>
			</div>

			<div className="py-[clamp(10px,1.4vw,14px)] sm:hidden">
				<div className="flex items-stretch gap-2">
					<div className="flex h-11 min-w-0 flex-1 items-center border border-[#EAE4DE] bg-white px-3">
						<input
							value={value.keyword}
							onChange={(e) => onChange({ ...value, keyword: e.target.value })}
							aria-label="Enter Keywords"
							placeholder="Search properties…"
							className="h-full w-full min-w-0 border-none bg-transparent text-[13px] font-medium text-[#161311] outline-none placeholder:text-black/25"
							type="search"
						/>
					</div>
					<button
						type="submit"
						aria-label="Search"
						className="grid h-11 w-11 shrink-0 place-items-center bg-[#DE141C] text-white transition-colors duration-200 hover:bg-[#B8101A]"
					>
						<SearchIcon className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={() => setShowPhoneFilters((current) => !current)}
						aria-expanded={showPhoneFilters}
						className="inline-flex h-11 shrink-0 items-center gap-1.5 border border-[#EAE4DE] bg-white px-3 text-[10px] font-semibold text-[#514C47] transition-colors hover:border-black/25"
					>
						<svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
							<path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
						</svg>
						Filters
						{activePhoneFilterCount > 0 ? <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DE141C] px-1 text-[9px] font-bold text-white">{activePhoneFilterCount}</span> : null}
						<span className={`transition-transform duration-200 ${showPhoneFilters ? "rotate-180" : ""}`}><ChevronIcon /></span>
					</button>
				</div>

				{showPhoneFilters ? (
					<div className="mt-2.5 grid grid-cols-2 gap-px border border-[#EAE4DE] bg-[#EAE4DE]">
						<div className="bg-white p-3">
							<p className={LABEL_CLASS}>Looking for</p>
							<div className="mt-1">
								<FilterSelect
									value={value.lookingFor}
									options={LOOKING_FOR_OPTIONS}
									placeholder="Any type"
									ariaLabel="Looking for"
									compact
									onChange={(next) => onChange({ ...value, lookingFor: next })}
								/>
							</div>
						</div>
						<div className="bg-white p-3">
							<p className={LABEL_CLASS}>Location</p>
							<div className="mt-1">
								<FilterSelect
									value={value.location}
									options={LOCATION_OPTIONS}
									placeholder="Any province"
									ariaLabel="Location"
									compact
									onChange={(next) => onChange({ ...value, location: next })}
								/>
							</div>
						</div>
						<div className="bg-white p-3">
							<p className={LABEL_CLASS}>Sub-location</p>
							<div className="mt-1">
								<FilterSelect
									value={value.subLocation}
									options={SUBLOCATION_OPTIONS}
									placeholder="Any area"
									ariaLabel="Sub-location"
									compact
									onChange={(next) => onChange({ ...value, subLocation: next })}
								/>
							</div>
						</div>
						<div className="bg-white p-3">
							<p className={LABEL_CLASS}>Status</p>
							<div className="mt-1">
								<FilterSelect
									value={value.status}
									options={STATUS_OPTIONS}
									placeholder="Any status"
									ariaLabel="Status"
									compact
									onChange={(next) => onChange({ ...value, status: next })}
								/>
							</div>
						</div>
						<div className="col-span-2 bg-white p-3">
							<p className={LABEL_CLASS}>Price</p>
							<div className="mt-1 flex items-center gap-2">
								<input
									value={value.priceMin}
									onChange={(e) => onChange({ ...value, priceMin: e.target.value })}
									aria-label="Min price"
									placeholder="Min"
									inputMode="numeric"
									className="h-6 min-w-0 flex-1 border-none bg-transparent text-[12px] font-medium text-[#161311] outline-none placeholder:text-black/25"
								/>
								<span className="shrink-0 text-[12px] text-black/20">–</span>
								<input
									value={value.priceMax}
									onChange={(e) => onChange({ ...value, priceMax: e.target.value })}
									aria-label="Max price"
									placeholder="Max"
									inputMode="numeric"
									className="h-6 min-w-0 flex-1 border-none bg-transparent text-[12px] font-medium text-[#161311] outline-none placeholder:text-black/25"
								/>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</form>
	);
}
