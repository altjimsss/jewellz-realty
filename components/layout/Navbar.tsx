"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = {
	label: string;
	href: string;
};

type NavbarProps = {
	links: NavLink[];
	fontClassName?: string;
};

export function Navbar({ links, fontClassName = "" }: NavbarProps) {
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<nav className="sticky inset-x-0 top-0 z-[5000] border-b border-black/10 bg-white px-4 py-3 md:px-6 lg:px-12">
			<div className="mx-auto flex max-w-[1200px] items-center">
				<div className="hidden min-w-[170px] items-center md:flex">
					<Image
						src="/assets/jewellz-logo.png"
						alt="Jewellz Realty Logo"
						width={220}
						height={56}
						priority
						className="h-14 w-[220px] shrink-0 object-contain"
					/>
				</div>
				<div className="flex w-full items-center gap-2 md:hidden">
					<Image
						src="/assets/jewellz-logo.png"
						alt="Jewellz Realty Logo"
						width={180}
						height={40}
						priority
						className="-ml-4 h-10 w-[140px] shrink-0 object-contain sm:w-[180px]"
					/>
					<label className="relative block min-w-0 flex-1">
						<input
							type="search"
							placeholder="What are you looking for?"
							className="h-9 w-full rounded-sm border border-black/10 bg-white pl-4 pr-9 text-xs text-black placeholder:text-black/40 outline-none"
						/>
						<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
							<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
					</label>
					<button
						type="button"
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
						onClick={() => setMobileMenuOpen((v) => !v)}
						className={`grid h-10 w-10 place-items-center rounded-md text-black transition-colors duration-200 ${
							mobileMenuOpen ? "bg-black/5" : ""
						}`}
					>
						<span className="relative block h-7 w-7">
							<svg
								viewBox="0 0 24 24"
								className={`absolute inset-0 h-7 w-7 transform-gpu transition-all duration-200 ease-out ${
									mobileMenuOpen ? "rotate-45 opacity-0" : "rotate-0 opacity-100"
								}`}
								fill="none"
								aria-hidden="true"
							>
								<path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
							</svg>
							<svg
								viewBox="0 0 24 24"
								className={`absolute inset-0 h-7 w-7 transform-gpu transition-all duration-200 ease-out ${
									mobileMenuOpen ? "rotate-0 opacity-100" : "-rotate-45 opacity-0"
								}`}
								fill="none"
								aria-hidden="true"
							>
								<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
							</svg>
						</span>
					</button>
				</div>
				<div className={`ml-28 hidden items-center gap-8 text-sm md:flex ${fontClassName}`}>
					{links.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={`group relative pb-2 font-medium transition-colors duration-200 ${
									isActive ? "text-black" : "text-black/70 hover:text-black"
								}`}
								aria-current={isActive ? "page" : undefined}
							>
								{link.label}
								<span
									className={`absolute bottom-0 left-0 h-[2px] rounded-full bg-[#DE141C] transition-all duration-200 ${
										isActive ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-60"
									}`}
								/>
							</Link>
						);
					})}
				</div>
				<div className="ml-auto hidden md:block">
					<label className="relative block">
						<input
							type="search"
							placeholder="What are you looking for?"
							className="h-9 w-[280px] rounded-sm border border-black/10 bg-white pl-4 pr-9 text-xs text-black placeholder:text-black/40 outline-none lg:w-[320px]"
						/>
						<svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60" fill="none" aria-hidden="true">
							<circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
							<path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
						</svg>
					</label>
				</div>
			</div>
			<div
				className={`absolute left-0 right-0 top-full z-[5010] transform-gpu md:hidden transition-all duration-200 ${
					mobileMenuOpen
						? "pointer-events-auto translate-y-0 opacity-100 ease-out"
						: "pointer-events-none -translate-y-3 opacity-0 ease-in"
				}`}
			>
				<div className="relative mx-4 mt-2 overflow-hidden rounded-[20px] border border-black/10 bg-white/95 shadow-lg backdrop-blur-md">
					<div className="flex flex-col p-1.5">
						{links.map((link) => {
							const isActive = pathname === link.href;
							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setMobileMenuOpen(false)}
									className={`rounded-lg px-2.5 py-3 text-sm font-medium transition-colors duration-150 hover:bg-[#DE141C]/10 hover:text-[#DE141C] ${
										mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
									} ${isActive ? "text-[#DE141C]" : "text-black/80"}`}
								>
									{link.label}
								</Link>
							);
						})}
					</div>
				</div>
			</div>
		</nav>
	);
}