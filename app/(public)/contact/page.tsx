"use client";

import { FormEvent, useState } from "react";
import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import SectionHeader from "@/components/layout/SectionHeader";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const navLinks = [
	{ label: "Home", href: "/" },
	{ label: "Project List", href: "/project-list" },
	{ label: "Gallery", href: "/gallery" },
	{ label: "About us", href: "/about-us" },
	{ label: "Contact", href: "/contact" },
	{ label: "Career", href: "/career" },
];

export default function ContactPage() {
	const [formState, setFormState] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const subject = encodeURIComponent(formState.subject || `Jewellz Realty inquiry from ${formState.name || "website visitor"}`);
		const body = encodeURIComponent(
			[`Name: ${formState.name}`, `Email: ${formState.email}`, `Phone: ${formState.phone}`, "", formState.message].join("\n")
		);

		window.location.href = `mailto:inquiries@jewellzrealty.com?subject=${subject}&body=${body}`;
	}

	return (
		<main className={`${poppins.className} min-h-screen bg-white text-[#111111]`}>
			<AnnouncementBar />
			<Navbar links={navLinks} fontClassName={poppins.className} />

			<section className="mx-auto w-full max-w-[1120px] px-6 py-14 lg:px-8">

				<div className="grid items-start lg:grid-cols-[320px_1fr]">

					{/* Sidebar */}
					<aside className="border-b border-black/10 pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
						{/* Section header */}
						<SectionHeader title={"Contact Us"} subtitle={"Redefining the way people discover property."} />

						<h1 className="mt-4 max-w-xl text-[clamp(2.05rem,3.7vw,3.2rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111111]">
							Let us Connect
						</h1>
						<p className="mt-3 text-[12px] leading-[1.75] text-black/55">
							Reach out for property viewings, buying guidance, or investment questions. We usually respond within one business day.
						</p>

						{/* Contact info chips */}
						<div className="mt-7 flex flex-col gap-3">
							{/* Phone */}
							<div className="flex items-start gap-3 rounded-lg border border-black/5 bg-zinc-50 px-4 py-3">
								<svg className="mt-0.5 h-4 w-4 shrink-0 text-[#DE141C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
									<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
								</svg>
								<div className="flex flex-col gap-0.5">
									<span className="text-[12px] font-semibold text-[#111111]">Call To Us</span>
									<span className="text-[11.5px] leading-[1.6] text-black/55">Available 24/7, 7 days a week</span>
									<span className="text-[11.5px] leading-[1.6] text-black/55">+8801611112222</span>
								</div>
							</div>

							{/* Email */}
							<div className="flex items-start gap-3 rounded-lg border border-black/5 bg-zinc-50 px-4 py-3">
								<svg className="mt-0.5 h-4 w-4 shrink-0 text-[#DE141C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
									<rect width="20" height="16" x="2" y="4" rx="2"/>
									<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
								</svg>
								<div className="flex flex-col gap-0.5">
									<span className="text-[12px] font-semibold text-[#111111]">Write To Us</span>
									<span className="text-[11.5px] leading-[1.6] text-black/55">customer@exclusive.com</span>
									<span className="text-[11.5px] leading-[1.6] text-black/55">support@exclusive.com</span>
								</div>
							</div>
						</div>
					</aside>

					{/* Form */}
					<form className="pt-10 lg:pl-12 lg:pt-0" onSubmit={handleSubmit}>
						<div className="grid gap-2.5 sm:grid-cols-3">
							<input
								value={formState.name}
								onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
								type="text"
								placeholder="Your Name *"
								className="h-10 rounded-md border border-black/5 bg-zinc-100 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
							/>
							<input
								value={formState.email}
								onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
								type="email"
								placeholder="Your Email *"
								className="h-10 rounded-md border border-black/5 bg-zinc-100 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
							/>
							<input
								value={formState.phone}
								onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
								type="tel"
								placeholder="Your Phone *"
								className="h-10 rounded-md border border-black/5 bg-zinc-100 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
							/>
						</div>

						<input
							value={formState.subject}
							onChange={(e) => setFormState((s) => ({ ...s, subject: e.target.value }))}
							type="text"
							placeholder="Subject"
							className="mt-2.5 h-10 w-full rounded-md border border-black/5 bg-zinc-100 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
						/>

						<textarea
							value={formState.message}
							onChange={(e) => setFormState((s) => ({ ...s, message: e.target.value }))}
							placeholder="Your Message"
							className="mt-2.5 min-h-[148px] w-full rounded-md border border-black/5 bg-zinc-100 px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
						/>

						<div className="mt-5 flex justify-end">
							<button
								type="submit"
								className="inline-flex h-10 items-center gap-2 rounded-md bg-[#DE141C] px-6 text-[12.5px] font-medium text-white transition-colors hover:bg-[#c51018]"
							>
								Send Message
								<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M5 12h14M12 5l7 7-7 7"/>
								</svg>
							</button>
						</div>
					</form>

				</div>
			</section>

			<Footer />
		</main>
	);
}