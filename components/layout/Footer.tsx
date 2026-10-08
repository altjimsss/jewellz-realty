"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { PortalAuthModal, type PortalRole } from "@/components/auth/PortalAuthModal";

export function Footer() {
	const [modalOpen, setModalOpen] = useState(false);
	const [initialRole, setInitialRole] = useState<PortalRole>("agent");

	function handleOpenPortal(e: MouseEvent<HTMLAnchorElement>, role: PortalRole) {
		// Prevent full page navigation on normal click so the modal appears in-place
		e.preventDefault();
		setInitialRole(role);
		setModalOpen(true);
	}

	return (
		<footer className="bg-[#0F0F10] px-4 py-10 text-white sm:px-6 lg:px-28">
			<div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
				<div className="col-span-2 text-center md:col-span-1 md:text-left">
					<h3 className="text-2xl font-bold sm:text-3xl">Jewellz Realty</h3>
					<p className="mt-2 max-w-sm text-center text-xs leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6 md:text-left">
						Your trusted real estate partner for buying, selling, and investing in premium but affordable properties.
					</p>
					<div className="mt-3 flex items-center justify-center gap-2 sm:mt-5 md:justify-start">
						<span className="h-2 w-2 rounded-full bg-[#DE141C]" />
						<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 sm:text-xs">Licensed Brokerage Team</p>
					</div>
				</div>

				<div>
					<h4 className="text-xs font-bold uppercase tracking-[0.08em] text-white/90 sm:text-sm">Quick Links</h4>
					<ul className="mt-2 space-y-1.5 text-xs text-white/70 sm:mt-4 sm:space-y-2 sm:text-sm">
						<li><Link href="/" className="transition-colors hover:text-[#DE141C]">Home</Link></li>
						<li><Link href="/project-list" className="transition-colors hover:text-[#DE141C]">Project List</Link></li>
						<li><Link href="/gallery" className="transition-colors hover:text-[#DE141C]">Gallery</Link></li>
						<li><Link href="/about-us" className="transition-colors hover:text-[#DE141C]">About Us</Link></li>
						<li><Link href="/career" className="transition-colors hover:text-[#DE141C]">Careers</Link></li>
						<li><Link href="/contact" className="transition-colors hover:text-[#DE141C]">Contact</Link></li>
					</ul>
				</div>

				<div>
					<h4 className="text-xs font-bold uppercase tracking-[0.08em] text-white/90 sm:text-sm">Contact</h4>
					<ul className="mt-2 space-y-1.5 text-xs text-white/70 sm:mt-4 sm:space-y-2 sm:text-sm">
						<li>Batangas, Philippines</li>
						<li>+63 917 123 4567</li>
						<li>inquiries@jewellzrealty.com</li>
						<li>Mon - Sat, 9:00 AM - 6:00 PM</li>
					</ul>
				</div>

				<div className="col-span-2 text-center md:col-span-1 md:text-left">
					<h4 className="text-xs font-bold uppercase tracking-[0.08em] text-white/90 sm:text-sm">Follow Us</h4>
					<div className="mt-2 flex items-center justify-center gap-2 sm:mt-4 md:justify-start">
						<span className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 sm:h-9 sm:w-9">f</span>
						<span className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 sm:h-9 sm:w-9">ig</span>
						<span className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 sm:h-9 sm:w-9">in</span>
						<span className="grid h-8 w-8 place-items-center border border-white/20 text-[11px] text-white/85 sm:h-9 sm:w-9">yt</span>
					</div>
					<p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-white/65 sm:mt-4 sm:text-sm md:mx-0">Stay updated with listings, open houses, and real estate tips.</p>
				</div>
			</div>

			{/* Sub-Footer & Portal Access Bar */}
			<div className="mt-8 border-t border-white/10 pt-6">
				{/* Partner & Associate Quick Access Bar */}
				<div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs backdrop-blur-sm sm:flex-row">
					<div className="flex items-center gap-2 text-white/50">
						<span className="h-1.5 w-1.5 rounded-full bg-[#DE141C]" />
						<span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Partner & Team Access</span>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
						<Link
							href="/login?next=/agent"
							onClick={(e) => handleOpenPortal(e, "agent")}
							className="inline-flex items-center gap-1.5 font-medium text-white/80 transition-colors hover:text-[#DE141C]"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-70">
								<path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
							</svg>
							Agent Portal
						</Link>
						<span className="text-white/20">•</span>
						<Link
							href="/login?next=/developer"
							onClick={(e) => handleOpenPortal(e, "developer")}
							className="inline-flex items-center gap-1.5 font-medium text-white/80 transition-colors hover:text-[#DE141C]"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-70">
								<path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
							</svg>
							Developer Hub
						</Link>
						<span className="text-white/20">•</span>
						<Link
							href="/login?next=/admin"
							onClick={(e) => handleOpenPortal(e, "admin")}
							className="inline-flex items-center gap-1.5 font-medium text-white/50 transition-colors hover:text-white"
							title="Brokerage Staff & Admin Login"
						>
							<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-70">
								<path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
							</svg>
							Admin CMS
						</Link>
					</div>
				</div>

				{/* Copyright & Legal */}
				<div className="flex flex-col gap-2 text-center text-[11px] text-white/55 sm:gap-3 sm:text-xs md:flex-row md:items-center md:justify-between md:text-left">
					<p>© {new Date().getFullYear()} Jewellz Realty. All rights reserved. Licensed Real Estate Brokerage.</p>
					<div className="flex items-center justify-center gap-4 text-white/50 md:justify-start">
						<span>Privacy Policy</span>
						<span className="text-white/20">•</span>
						<span>Terms & Conditions</span>
					</div>
				</div>
			</div>

			{/* In-Place Portal Authentication Modal */}
			<PortalAuthModal
				isOpen={modalOpen}
				onClose={() => setModalOpen(false)}
				initialRole={initialRole}
			/>
		</footer>
	);
}
