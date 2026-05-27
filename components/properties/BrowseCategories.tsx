"use client";

import React from "react";

export type BrowseCategory = {
	label: string;
	icon: React.ReactNode;
};

const fallbackCategories: BrowseCategory[] = [
	{
		label: "Condo",
		icon: (
			<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
				<rect x="5" y="3.5" width="14" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
				<path
					d="M9 7h2M13 7h2M9 10h2M13 10h2M9 13h2M13 13h2M11 20v-3h2v3"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
				/>
			</svg>
		),
	},
	{
		label: "House",
		icon: (
			<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
				<path
					d="M3 11l9-7 9 7M6 9v11h12V9M10 20v-6h4v6"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		),
	},
	{
		label: "Lot",
		icon: (
			<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
				<rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
				<path d="M4 11h16M10 5v14" stroke="currentColor" strokeWidth="1.8" />
			</svg>
		),
	},
	{
		label: "Farm",
		icon: (
			<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
				<path
					d="M4 18h16M6 18V9l6-3 6 3v9M12 6V3"
					stroke="currentColor"
					strokeWidth="1.8"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path d="M9.5 13.5h5M9.5 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
			</svg>
		),
	},
	{
		label: "Memorial",
		icon: (
			<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
				<path d="M7 20h10M8 20V9a4 4 0 118 0v11M12 3v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
			</svg>
		),
	},
];

export type BrowseCategoriesProps = {
	categories?: BrowseCategory[];
	activeCat: string;
	setActiveCat: (label: string) => void;
};

export function BrowseCategories({ categories, activeCat, setActiveCat }: BrowseCategoriesProps) {
	const safeCategories = categories && categories.length ? categories : fallbackCategories;

	return (
		<section className="border-y px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
			<p className="text-center text-sm font-bold text-gray-500">FIND YOUR WAY EASIER</p>
			<h2 className="text-center text-3xl font-bold sm:text-4xl">BROWSE CATEGORIES</h2>
			<div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
			<div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 md:grid-cols-5">
				{safeCategories.map((c) => (
					<button
						key={c.label}
						onClick={() => setActiveCat(c.label)}
						className={`group flex h-24 flex-col items-center justify-center gap-1.5 rounded border transition-all duration-200 sm:h-36 sm:gap-2 ${
							c.label === "Memorial"
								? "col-span-2 mx-auto w-[48%] sm:col-span-1 sm:w-full"
								: ""
						} ${
							activeCat === c.label
								? "border-[#DE141C] bg-[#DE141C] text-white"
								: "border-black/10 bg-white text-black hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white"
						}`}
					>
						<span className="scale-90 sm:scale-100">{c.icon}</span>
						<span className="text-xs font-semibold sm:text-sm">{c.label}</span>
					</button>
				))}
			</div>
		</section>
	);
}

