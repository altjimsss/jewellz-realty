export const FOOTER_CONTENT_KEY = "footer_content";

export type FooterLink = { label: string; href: string };
export type FooterContent = {
	companyName: string;
	tagline: string;
	description: string;
	credential: string;
	quickLinksHeading: string;
	quickLinks: FooterLink[];
	contactHeading: string;
	address: string;
	phone: string;
	email: string;
	socialHeading: string;
	socialCaption: string;
	socialLinks: FooterLink[];
	accessHeading: string;
	copyright: string;
	legalLinks: FooterLink[];
};

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
	companyName: "J'WELLZ REALTY",
	tagline: "Marketing and development corporation",
	description: "Your trusted real estate partner for buying, selling, and investing in premium but affordable properties.",
	credential: "Licensed Brokerage Team",
	quickLinksHeading: "Quick Links",
	quickLinks: [
		{ label: "Home", href: "/" },
		{ label: "Project List", href: "/project-list" },
		{ label: "Gallery", href: "/gallery" },
		{ label: "About Us", href: "/about-us" },
		{ label: "Careers", href: "/career" },
		{ label: "Contact", href: "/contact" },
	],
	contactHeading: "Contact",
	address: "Block 16 Lot 1 Maple St. Olivares Homes, Barangay Milagrosa, Calamba, Laguna",
	phone: "639618738236",
	email: "recruitment@jewellzrealty.ph",
	socialHeading: "Follow Us",
	socialCaption: "Stay updated with listings, open houses, and real estate tips.",
	socialLinks: [
		{ label: "Facebook", href: "https://www.facebook.com/Jewellzrealtyph" },
		{ label: "Instagram", href: "https://www.instagram.com/jewellzrealty" },
		{ label: "LinkedIn", href: "https://www.linkedin.com/company/jewellzrealty" },
		{ label: "YouTube", href: "https://www.youtube.com/@jewellzrealty" },
	],
	accessHeading: "Partner & Team Access",
	copyright: "All rights reserved.",
	legalLinks: [
		{ label: "Privacy Policy", href: "/privacy" },
		{ label: "Terms & Conditions", href: "/terms" },
	],
};

function text(value: unknown, fallback: string) {
	return typeof value === "string" ? value : fallback;
}

function links(value: unknown, fallback: FooterLink[]): FooterLink[] {
	if (!Array.isArray(value)) return fallback;
	return value.filter((item) => item && typeof item === "object").map((item, index) => {
		const link = item as Partial<FooterLink>;
		return {
			label: text(link.label, ""),
			href: text(link.href, ""),
		};
	}).filter((link) => link.label.trim() && link.href.trim()).slice(0, 12);
}

export function parseFooterContent(value: unknown): FooterContent {
	let parsed = value;
	if (typeof parsed === "string") {
		try { parsed = JSON.parse(parsed) as unknown; } catch { return DEFAULT_FOOTER_CONTENT; }
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_FOOTER_CONTENT;
	const content = parsed as Partial<FooterContent>;
	return {
		companyName: text(content.companyName, DEFAULT_FOOTER_CONTENT.companyName),
		tagline: text(content.tagline, DEFAULT_FOOTER_CONTENT.tagline),
		description: text(content.description, DEFAULT_FOOTER_CONTENT.description),
		credential: text(content.credential, DEFAULT_FOOTER_CONTENT.credential),
		quickLinksHeading: text(content.quickLinksHeading, DEFAULT_FOOTER_CONTENT.quickLinksHeading),
		quickLinks: links(content.quickLinks, DEFAULT_FOOTER_CONTENT.quickLinks),
		contactHeading: text(content.contactHeading, DEFAULT_FOOTER_CONTENT.contactHeading),
		address: text(content.address, DEFAULT_FOOTER_CONTENT.address),
		phone: text(content.phone, DEFAULT_FOOTER_CONTENT.phone),
		email: text(content.email, DEFAULT_FOOTER_CONTENT.email),
		socialHeading: text(content.socialHeading, DEFAULT_FOOTER_CONTENT.socialHeading),
		socialCaption: text(content.socialCaption, DEFAULT_FOOTER_CONTENT.socialCaption),
		socialLinks: links(content.socialLinks, DEFAULT_FOOTER_CONTENT.socialLinks),
		accessHeading: text(content.accessHeading, DEFAULT_FOOTER_CONTENT.accessHeading),
		copyright: text(content.copyright, DEFAULT_FOOTER_CONTENT.copyright),
		legalLinks: links(content.legalLinks, DEFAULT_FOOTER_CONTENT.legalLinks),
	};
}
