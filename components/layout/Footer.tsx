"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { PortalAuthModal, type PortalRole } from "@/components/auth/PortalAuthModal";

const socialLinks = [
	{
		label: "Facebook",
		href: "https://www.facebook.com/jewellzrealty",
		icon: <path d="M13 21v-8h2.7l.4-3H13V8.1c0-.9.3-1.5 1.6-1.5H16V4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V10H7v3h2.5v8H13z" />,
	},
	{
		label: "Instagram",
		href: "https://www.instagram.com/jewellzrealty",
		icon: <path d="M7.8 2h8.4A5.8 5.8 0 0122 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8A5.8 5.8 0 012 16.2V7.8A5.8 5.8 0 017.8 2zm0 2A3.8 3.8 0 004 7.8v8.4A3.8 3.8 0 007.8 20h8.4a3.8 3.8 0 003.8-3.8V7.8A3.8 3.8 0 0016.2 4H7.8zm9.6 1.3a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2zM12 7a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" />,
	},
	{
		label: "LinkedIn",
		href: "https://www.linkedin.com/company/jewellzrealty",
		icon: <path d="M6.94 5A2 2 0 113 5a2 2 0 013.94 0zM3.5 8.5h3.8V21H3.5V8.5zm6 0h3.64v1.7h.05c.5-.95 1.74-1.95 3.58-1.95 3.83 0 4.53 2.52 4.53 5.8V21h-3.8v-5.6c0-1.34-.02-3.06-1.86-3.06-1.86 0-2.14 1.45-2.14 2.96V21H9.5V8.5z" />,
	},
	{
		label: "YouTube",
		href: "https://www.youtube.com/@jewellzrealty",
		icon: <path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15V9l5.2 3-5.2 3z" />,
	},
];

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
						{socialLinks.map((social) => (
							<a
								key={social.label}
								href={social.href}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`Jewellz Realty on ${social.label}`}
								title={social.label}
								className="grid h-8 w-8 place-items-center rounded-sm border border-white/20 text-white/85 transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white sm:h-9 sm:w-9"
							>
								<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
									{social.icon}
								</svg>
							</a>
						))}
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
