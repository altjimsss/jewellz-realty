import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Policy | Jewellz Realty",
	description: "How Jewellz Realty uses information submitted through this website.",
};

const sections = [
	{
		title: "Information you provide",
		body: "When you contact us, request a viewing, apply for a role, or ask about a property, we may receive the details you submit, such as your name, email address, phone number, message, appointment preferences, and application materials.",
	},
	{
		title: "Website activity",
		body: "The site records basic browsing and property interaction events to understand which pages and listings are useful. This may include the page visited, approximate device and browser details, referral or campaign information, an anonymous visitor identifier used to recognize returning browsers, and a separate time-bounded visit identifier. Essential browser storage is also used for sign-in sessions and site functionality.",
	},
	{
		title: "How we use information",
		body: "We use submitted information to respond to inquiries, arrange property viewings, process career applications, operate and secure the website, and improve our property search and services.",
	},
	{
		title: "Service providers",
		body: "The website relies on hosted infrastructure and service providers to operate, including authentication, database, file storage, maps, and optional AI-assisted search or property chat. Information needed to provide a feature may be processed by those providers under their own terms and privacy notices.",
	},
	{
		title: "Sharing and retention",
		body: "Inquiry and appointment details are available to the Jewellz Realty personnel who handle those requests. We retain information for as long as needed to respond, operate the service, meet business obligations, and protect the website. We do not sell personal information.",
	},
	{
		title: "Your choices and requests",
		body: "You can choose not to submit information, though we may then be unable to respond to a request. To ask about, correct, or request deletion of information you submitted, contact inquiries@jewellzrealty.com. We may need to retain records where required for legitimate business or legal reasons.",
	},
];

export default function PrivacyPage() {
	return (
		<main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-12 sm:py-16">
			<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DE141C]">Jewellz Realty</p>
			<h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#181A20] sm:text-4xl">Privacy Policy</h1>
			<p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">This notice explains what information this website handles and why. It applies when you browse the site or contact Jewellz Realty through it.</p>
			<div className="mt-9 divide-y divide-black/10 border-y border-black/10">
				{sections.map((section) => (
					<section key={section.title} className="py-5">
						<h2 className="text-base font-semibold text-[#181A20]">{section.title}</h2>
						<p className="mt-2 text-sm leading-6 text-black/65">{section.body}</p>
					</section>
				))}
			</div>
			<p className="mt-5 text-xs leading-5 text-black/45">Questions about this notice? Email <a className="font-medium text-[#B8101A] underline underline-offset-2" href="mailto:inquiries@jewellzrealty.com">inquiries@jewellzrealty.com</a>.</p>
		</main>
	);
}
