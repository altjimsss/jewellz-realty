"use client";

import { useState } from "react";
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

type Job = {
	title: string;
	badge: string;
	description: string;
	details: string[];
};

const jobs: Job[] = [
	{
		title: "Sales Senior Director",
		badge: "Full-Time",
		description:
			"We are seeking an experienced and dynamic Senior Sales Director to lead and drive our sales team to achieve exceptional results. The ideal candidate will have a proven track record in sales leadership, strategic planning, and building high-performing teams.",
		details: [
			"Client Relationship Management",
			"Performance Management",
			"Sales Strategy Development",
			"Team Leadership",
			"The type of employment—full-time, part-time, or independent contractor.",
		],
	},
	{
		title: "OJT (On the Job Training)",
		badge: "Student",
		description:
			"Our company is looking for enthusiastic and driven OJT students eager to gain hands-on experience in a professional setting. This is an excellent opportunity to enhance your skills, build your portfolio, and learn from industry professionals.",
		details: [
			"Assist in daily real estate operations",
			"Support marketing and social media efforts",
			"Learn property listing and documentation",
			"Shadow senior agents during property viewings",
			"School endorsement / OJT contract required",
		],
	},
];

type ModalState = { open: false } | { open: true; job: Job };

function ApplicationModal({ job, onClose }: { job: Job; onClose: () => void }) {
	const [form, setForm] = useState({
		name: "", email: "", phone: "", referral: "", subject: "", cv: "", message: "",
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const subject = encodeURIComponent(form.subject || `Application for ${job.title}`);
		const body = encodeURIComponent(
			[
				`Position: ${job.title}`,
				`Name: ${form.name}`,
				`Email: ${form.email}`,
				`Phone: ${form.phone}`,
				`Referral: ${form.referral}`,
				`CV/Resume: ${form.cv}`,
				"",
				form.message,
			].join("\n")
		);
		window.location.href = `mailto:jobs@jewellzrealty.ph?subject=${subject}&body=${body}`;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
			onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className="relative w-full max-w-[580px] rounded-2xl bg-white px-8 py-8 shadow-xl">
				{/* Close */}
				<button type="button"
					onClick={onClose}
					className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-zinc-100 hover:text-black"
					aria-label="Close modal"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
				</button>

				<h2 className="text-[20px] font-semibold text-[#111111]">Application Form</h2>
				<p className="mt-0.5 text-[12px] text-black/45">{job.title}</p>

				<form onSubmit={handleSubmit} className="mt-6">
					{/* Row 1 */}
					<div className="grid grid-cols-3 gap-2.5">
						{[
							{ key: "name", placeholder: "Your Name *", type: "text" },
							{ key: "email", placeholder: "Your Email *", type: "email" },
							{ key: "phone", placeholder: "Your Phone *", type: "tel" },
						].map(({ key, placeholder, type }) => (
							<input
								key={key}
								aria-label={placeholder}
								type={type}
								placeholder={placeholder}
								value={form[key as keyof typeof form]}
								onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
								className="h-10 rounded-md border border-black/5 bg-zinc-100 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
							/>
						))}
					</div>

					{/* Row 2 */}
					<div className="mt-2.5 grid grid-cols-3 gap-2.5">
						{[
							{ key: "referral", placeholder: "Referral (Optional)", type: "text" },
							{ key: "subject", placeholder: "Subject *", type: "text" },
							{ key: "cv", placeholder: "CV / Resume Link *", type: "url" },
						].map(({ key, placeholder, type }) => (
							<input
								key={key}
								aria-label={placeholder}
								type={type}
								placeholder={placeholder}
								value={form[key as keyof typeof form]}
								onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
								className="h-10 rounded-md border border-black/5 bg-zinc-100 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
							/>
						))}
					</div>

					{/* Message */}
					<textarea aria-label="Your Message"
						placeholder="Your Message"
						value={form.message}
						onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
						className="mt-2.5 min-h-[140px] w-full rounded-md border border-black/5 bg-zinc-100 px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors placeholder:text-black/35 focus:border-[#DE141C]/35 focus:bg-white"
					/>

					<div className="mt-5 flex justify-end">
						<button
							type="submit"
							className="inline-flex h-10 items-center gap-2 rounded-md bg-[#DE141C] px-7 text-[12.5px] font-medium text-white transition-colors hover:bg-[#c51018]"
						>
							Apply
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function JobCard({ job, onApply }: { job: Job; onApply: () => void }) {
	const [flipped, setFlipped] = useState(false);

	return (
		<div style={{ perspective: "1200px" }}>
			<div
				className="relative transition-transform duration-500"
				style={{
					transformStyle: "preserve-3d",
					transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
				}}
			>
				{/* Front */}
				<article
					className="rounded-2xl border border-black/10 bg-white px-6 py-6"
					style={{
						backfaceVisibility: "hidden",
						position: flipped ? "absolute" : "relative",
						inset: flipped ? "0" : "auto",
						visibility: flipped ? "hidden" : "visible",
					}}
				>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<h2 className="text-[1.35rem] font-semibold leading-tight text-[#111111]">{job.title}</h2>
							<span className="mt-2 inline-flex rounded-full bg-[#111111] px-3 py-[3px] text-[11px] font-semibold text-white">
								{job.badge}
							</span>
						</div>
						<div className="flex shrink-0 items-center gap-3">
							<button type="button"
								onClick={() => setFlipped(true)}
								className="text-[12px] font-medium text-black/55 underline-offset-2 transition-colors hover:text-[#DE141C]"
							>
								Details ↗
							</button>
							<button type="button"
								onClick={onApply}
								className="inline-flex h-8 items-center rounded-full bg-[#DE141C] px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#c51018]"
							>
								Apply Now
							</button>
						</div>
					</div>
					<p className="mt-4 text-[12.5px] leading-6 text-black/55">{job.description}</p>
				</article>

				{/* Back */}
				<article
					className="rounded-2xl border border-black/10 bg-white px-6 py-6"
					style={{
						backfaceVisibility: "hidden",
						transform: "rotateY(180deg)",
						position: flipped ? "relative" : "absolute",
						inset: flipped ? "auto" : "0",
						visibility: flipped ? "visible" : "hidden",
					}}
				>
					<div className="flex items-start justify-between">
						<div>
							<h2 className="text-[1.1rem] font-semibold leading-tight text-[#111111]">{job.title}</h2>
							<p className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.1em] text-[#DE141C]">Role Details</p>
						</div>
						<div className="flex shrink-0 items-center gap-3">
							<button type="button"
								onClick={() => setFlipped(false)}
								className="text-[12px] font-medium text-black/55 underline-offset-2 transition-colors hover:text-[#DE141C]"
							>
								← Return
							</button>
							<button type="button"
								onClick={onApply}
								className="inline-flex h-8 items-center rounded-full bg-[#DE141C] px-4 text-[11px] font-medium text-white transition-colors hover:bg-[#c51018]"
							>
								Apply Now
							</button>
						</div>
					</div>
					<ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3">
						{job.details.map((d) => (
							<li key={d} className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-black/65">
								<span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#DE141C]" />
								<span>{d}</span>
							</li>
						))}
					</ul>
				</article>
			</div>
		</div>
	);
}

export default function CareerPage() {
	const [modal, setModal] = useState<ModalState>({ open: false });

	return (
		<main className={`${poppins.className} min-h-screen bg-white text-[#111111]`}>
			<AnnouncementBar />
			<Navbar links={navLinks} fontClassName={poppins.className} />

			<section className="mx-auto w-full max-w-[1120px] px-6 py-14 lg:px-8">

				{/* Body */}
				<div className="grid items-start lg:grid-cols-[320px_1fr]">

					{/* Sidebar */}
					<aside className="border-b border-black/10 pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
						<SectionHeader title={"Career"} subtitle={"Start Your Journey with Jewellz Realty"} />

						<h2 className="mt-4 max-w-xl text-[clamp(2.05rem,3.7vw,3.2rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111111]">
							Build your career with us.
						</h2>
						<p className="mt-3 text-[12px] leading-[1.75] text-black/55">
							Join one of the country&apos;s leading real estate companies. Jewellz Realty believes in the value of every team member and the contributions they bring. We provide a competitive salary, growth opportunities, and a supportive work environment.
						</p>
						<p className="mt-3 text-[12px] leading-[1.75] text-black/55">
							Send your resume and cover letter to{" "}
							<a href="mailto:jobs@jewellzrealty.ph" className="text-[#DE141C] underline-offset-2 hover:underline">
								jobs@jewellzrealty.ph
							</a>
							. Only shortlisted applicants will be contacted.
						</p>
					</aside>

					{/* Job cards */}
					<div className="space-y-4 pt-10 lg:pl-12 lg:pt-0">
						{jobs.map((job) => (
							<JobCard
								key={job.title}
								job={job}
								onApply={() => setModal({ open: true, job })}
							/>
						))}
					</div>

				</div>
			</section>

			<Footer />

			{modal.open && (
				<ApplicationModal job={modal.job} onClose={() => setModal({ open: false })} />
			)}
		</main>
	);
}
