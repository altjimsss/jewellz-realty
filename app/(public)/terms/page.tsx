import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Terms & Conditions | Jewellz Realty",
	description: "Terms for using the Jewellz Realty website and property information.",
};

const sections = [
	{
		title: "Website information",
		body: "Property descriptions, prices, availability, images, maps, and other listing information are provided for general information and may change. Contact Jewellz Realty to confirm current details before making a decision.",
	},
	{
		title: "Inquiries and viewing requests",
		body: "Submitting an inquiry or appointment request sends a request to Jewellz Realty; it does not by itself create a sale, reservation, agency relationship, or confirmed appointment. A team member will contact you to confirm the next steps.",
	},
	{
		title: "Acceptable use",
		body: "Use the website lawfully and do not attempt to disrupt it, access accounts or data that are not yours, submit harmful code, or misuse contact forms, search, maps, or other services.",
	},
	{
		title: "Third-party services and links",
		body: "Some features depend on external services, including maps, hosting, authentication, and AI-assisted tools. Those services may have their own availability, terms, and privacy practices.",
	},
	{
		title: "Website content",
		body: "Unless otherwise stated, the site's text, design, branding, and original materials belong to Jewellz Realty or their respective rights holders. Do not copy or reuse them in a way that violates applicable rights.",
	},
	{
		title: "Contact",
		body: "Questions about these terms can be sent to inquiries@jewellzrealty.com.",
	},
];

export default function TermsPage() {
	return (
		<main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-12 sm:py-16">
			<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DE141C]">Jewellz Realty</p>
			<h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#181A20] sm:text-4xl">Terms &amp; Conditions</h1>
			<p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">These terms cover use of this website and its property information, inquiry forms, and digital features.</p>
			<div className="mt-9 divide-y divide-black/10 border-y border-black/10">
				{sections.map((section) => (
					<section key={section.title} className="py-5">
						<h2 className="text-base font-semibold text-[#181A20]">{section.title}</h2>
						<p className="mt-2 text-sm leading-6 text-black/65">{section.body}</p>
					</section>
				))}
			</div>
		</main>
	);
}
