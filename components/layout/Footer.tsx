import Link from "next/link";

export function Footer() {
	return (
		<footer className="bg-[#0F0F10] px-4 py-10 text-white sm:px-6 lg:px-28">
			<div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
				<div className="col-span-2 text-center md:col-span-1 md:text-left">
					<h3 className="text-2xl font-bold sm:text-3xl">Jewellz Realty</h3>
					<p className="mt-2 max-w-sm text-center text-xs leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6">
						Your trusted real estate partner for buying, selling, and investing in premium but affordable properties.
					</p>
					<div className="mt-3 flex items-center justify-center gap-2 sm:mt-5">
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

			<div className="mt-6 flex flex-col gap-2 border-t border-white/15 pt-4 text-center text-[11px] text-white/55 sm:mt-10 sm:gap-3 sm:pt-5 sm:text-xs md:flex-row md:items-center md:justify-between md:text-left">
				<p>Copyright Jewellz Realty 2026. All rights reserved. We use anonymous browsing signals to improve property recommendations and lead follow-up.</p>
				<div className="flex items-center justify-center gap-4 md:justify-start">
					<span>Privacy Policy</span>
					<span>Terms & Conditions</span>
				</div>
			</div>
		</footer>
	);
}
