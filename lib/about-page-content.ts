export const ABOUT_PAGE_CONTENT_KEY = "about_page_content";

export type AboutStat = { value: string; label: string };
export type AboutHighlight = { title: string; description: string };
export type AboutTeamMember = { name: string; role: string; imageUrl: string };

export type AboutPageContent = {
	eyebrow: string;
	subtitle: string;
	title: string;
	introduction: string;
	ctaLabel: string;
	ctaUrl: string;
	heroImageUrl: string;
	stats: AboutStat[];
	highlights: AboutHighlight[];
	teamHeading: string;
	teamDescription: string;
	teamMembers: AboutTeamMember[];
};

export const DEFAULT_ABOUT_PAGE_CONTENT: AboutPageContent = {
	eyebrow: "About Us",
	subtitle: "Redefining the way people discover property.",
	title: "Discover Jewellz Realty",
	introduction: "Jewellz Realty helps buyers and investors find the right property with less friction and more confidence. We combine curated listings, responsive support, and thoughtful presentation so every step feels clear and professional.",
	ctaLabel: "Contact Us",
	ctaUrl: "/contact",
	heroImageUrl: "/assets/housebanner1.webp",
	stats: [
		{ value: "5.6M+", label: "Downloads" },
		{ value: "3.2+", label: "Active Users" },
		{ value: "4.9", label: "Ratings" },
		{ value: "60+", label: "Team Members" },
	],
	highlights: [
		{ title: "Why Choose Jewellz Realty?", description: "We pair curated listings with clear guidance so buyers can move confidently from browsing to booking to closing." },
		{ title: "Our Vision", description: "To make property discovery feel simple, modern, and trustworthy for every Filipino family and investor." },
		{ title: "Our Team", description: "A hands-on group of agents, advisors, and support staff focused on quick responses and a better client experience." },
	],
	teamHeading: "Our Leadership",
	teamDescription: "The executives guiding the vision and direction of Jewellz Realty.",
	teamMembers: [
		{ name: "Tom Cruise", role: "Founder & Chairman", imageUrl: "/assets/broker.webp" },
		{ name: "Emma Watson", role: "Managing Director", imageUrl: "/assets/bannerprofessional.webp" },
		{ name: "Will Smith", role: "Product Designer", imageUrl: "/assets/bannerconsult.webp" },
	],
};

function textValue(value: unknown, fallback: string) {
	return typeof value === "string" ? value : fallback;
}

export function parseAboutPageContent(value: unknown): AboutPageContent {
	let parsed = value;
	if (typeof parsed === "string") {
		try {
			parsed = JSON.parse(parsed) as unknown;
		} catch {
			return DEFAULT_ABOUT_PAGE_CONTENT;
		}
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_ABOUT_PAGE_CONTENT;
	const content = parsed as Partial<AboutPageContent>;
	return {
		eyebrow: textValue(content.eyebrow, DEFAULT_ABOUT_PAGE_CONTENT.eyebrow),
		subtitle: textValue(content.subtitle, DEFAULT_ABOUT_PAGE_CONTENT.subtitle),
		title: textValue(content.title, DEFAULT_ABOUT_PAGE_CONTENT.title),
		introduction: textValue(content.introduction, DEFAULT_ABOUT_PAGE_CONTENT.introduction),
		ctaLabel: textValue(content.ctaLabel, DEFAULT_ABOUT_PAGE_CONTENT.ctaLabel),
		ctaUrl: textValue(content.ctaUrl, DEFAULT_ABOUT_PAGE_CONTENT.ctaUrl),
		heroImageUrl: textValue(content.heroImageUrl, DEFAULT_ABOUT_PAGE_CONTENT.heroImageUrl),
		stats: Array.isArray(content.stats) ? content.stats.filter((item) => item && typeof item === "object").map((item) => ({ value: textValue(item.value, ""), label: textValue(item.label, "") })) : DEFAULT_ABOUT_PAGE_CONTENT.stats,
		highlights: Array.isArray(content.highlights) ? content.highlights.filter((item) => item && typeof item === "object").map((item) => ({ title: textValue(item.title, ""), description: textValue(item.description, "") })) : DEFAULT_ABOUT_PAGE_CONTENT.highlights,
		teamHeading: textValue(content.teamHeading, DEFAULT_ABOUT_PAGE_CONTENT.teamHeading),
		teamDescription: textValue(content.teamDescription, DEFAULT_ABOUT_PAGE_CONTENT.teamDescription),
		teamMembers: Array.isArray(content.teamMembers) ? content.teamMembers.filter((item) => item && typeof item === "object").map((item) => ({ name: textValue(item.name, ""), role: textValue(item.role, ""), imageUrl: textValue(item.imageUrl, "") })) : DEFAULT_ABOUT_PAGE_CONTENT.teamMembers,
	};
}
