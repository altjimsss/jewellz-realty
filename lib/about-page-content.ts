export const ABOUT_PAGE_CONTENT_KEY = "about_page_content";

export type AboutStat = { value: string; label: string };
export type AboutHighlight = { title: string; description: string };
export type AboutTeamMember = { name: string; role: string; imageUrl: string; twitterUrl: string; instagramUrl: string; linkedinUrl: string };

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
	eyebrow: "J'WELLZ REALTY MARKETING AND DEVELOPMENT CORP.",
	subtitle: "Change the Dream Property",
	title: "Discover J'WELLZ REALTY",
	introduction: "J'WELLZ REALTY MARKETING AND DEVELOPMENT CORP. helps buyers and investors explore property opportunities with clear information, curated listings, and responsive support throughout their search.",
	ctaLabel: "Contact Us",
	ctaUrl: "/contact",
	heroImageUrl: "/assets/housebanner1.webp",
	stats: [],
	highlights: [
		{ title: "Why Choose J'WELLZ REALTY?", description: "We pair property listings with clear guidance so buyers can move confidently from browsing to booking and beyond." },
		{ title: "Our Vision", description: "To make property discovery feel simple, modern, and trustworthy for every Filipino family and investor." },
		{ title: "Our Team", description: "A hands-on group of agents, advisors, and support staff focused on quick responses and a better client experience." },
	],
	teamHeading: "",
	teamDescription: "",
	teamMembers: [],
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
		teamMembers: Array.isArray(content.teamMembers) ? content.teamMembers.filter((item) => item && typeof item === "object").map((item) => ({
			name: textValue(item.name, ""),
			role: textValue(item.role, ""),
			imageUrl: textValue(item.imageUrl, ""),
			twitterUrl: textValue(item.twitterUrl, ""),
			instagramUrl: textValue(item.instagramUrl, ""),
			linkedinUrl: textValue(item.linkedinUrl, ""),
		})) : DEFAULT_ABOUT_PAGE_CONTENT.teamMembers,
	};
}
