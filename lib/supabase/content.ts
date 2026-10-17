import { supabaseServer } from "./server";

export type PublicHeroBanner = {
	headline: string;
	subheadline?: string;
	ctaLabel?: string;
	ctaUrl?: string;
	imageUrl: string;
};

export type PublicSiteStat = {
	key: string;
	label: string;
	value: number;
	suffix?: string;
};

export type PublicPartnerLogo = {
	name: string;
	logoUrl?: string;
	websiteUrl?: string;
};

export type PublicTestimonial = {
	authorName: string;
	authorTitle?: string;
	avatarUrl?: string;
	quote: string;
	rating?: number;
};

export type PublicAgent = {
	name: string;
	top: boolean;
	photoUrl?: string;
	licenseNumber?: string;
	specialization?: string;
	facebookUrl?: string;
	instagramUrl?: string;
	email?: string;
	phone?: string;
};

export type PublicGalleryItem = {
	section: string;
	title: string;
	description?: string;
	imageUrl: string;
	linkUrl?: string;
	sortOrder?: number;
};

export type PublicCareerJob = {
	id: string;
	title: string;
	badge: string;
	description: string;
	details: string[];
	sortOrder?: number;
};

function asNumber(value: unknown) {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getPublicHomeContent() {
	const [heroResult, statsResult, logosResult, testimonialsResult, agentsResult, agentProfilesResult, developerPartnersResult] = await Promise.all([
		supabaseServer.from("hero_banners").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
		supabaseServer.from("site_stats").select("*").order("sort_order", { ascending: true }),
		supabaseServer.from("partner_logos").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
		supabaseServer.from("testimonials").select("*").eq("is_published", true).order("sort_order", { ascending: true }),
		supabaseServer.from("agents").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
		supabaseServer.from("profiles").select("id, email"),
		supabaseServer.from("developer_partners").select("*").eq("is_active", true),
	]);

	const agentEmails = new Map<string, string>();
	for (const profile of agentProfilesResult.data ?? []) {
		if (profile?.id && profile.email) agentEmails.set(String(profile.id), String(profile.email));
	}

	// Show every active developer partner that has a logo. A login account is OPTIONAL:
	// display-only partners are curated by the admin, and partners with an account can
	// self-manage their own logo via the developer dashboard. Either way they appear here.
	const devPartnersWithLogo = (developerPartnersResult.data ?? []).filter(
		(dp) => dp.is_active !== false && Boolean(dp.logo_url)
	);

	const devPartnerLogos: PublicPartnerLogo[] = devPartnersWithLogo.map((dp) => ({
		name: String(dp.company_name ?? "Developer Partner"),
		logoUrl: dp.logo_url ? String(dp.logo_url) : undefined,
		websiteUrl: dp.website_url ? String(dp.website_url) : undefined,
	}));

	const seenCompanyNames = new Set(devPartnerLogos.map((d) => d.name.toLowerCase().trim()));
	const staticPartnerLogos: PublicPartnerLogo[] = (logosResult.data ?? [])
		.map((row): PublicPartnerLogo => ({
			name: String(row.name ?? ""),
			logoUrl: row.logo_url ? String(row.logo_url) : undefined,
			websiteUrl: row.website_url ? String(row.website_url) : undefined,
		}))
		.filter((item) => item.name && !seenCompanyNames.has(item.name.toLowerCase().trim()));

	const marqueeLogos = [...devPartnerLogos, ...staticPartnerLogos];

	return {
		heroBanners: (heroResult.data ?? []).map((row): PublicHeroBanner => ({
			headline: String(row.headline ?? ""),
			subheadline: row.subheadline ? String(row.subheadline) : undefined,
			ctaLabel: row.cta_label ? String(row.cta_label) : undefined,
			ctaUrl: row.cta_url ? String(row.cta_url) : undefined,
			imageUrl: String(row.image_url ?? ""),
		})).filter((item) => item.headline && item.imageUrl),
		siteStats: (statsResult.data ?? []).map((row): PublicSiteStat => ({
			key: String(row.key ?? row.label ?? ""),
			label: String(row.label ?? ""),
			value: asNumber(row.value),
			suffix: row.suffix ? String(row.suffix) : undefined,
		})).filter((item) => item.key && item.label),
		partnerLogos: marqueeLogos,
		testimonials: (testimonialsResult.data ?? []).map((row): PublicTestimonial => ({
			authorName: String(row.author_name ?? ""),
			authorTitle: row.author_title ? String(row.author_title) : undefined,
			avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
			quote: String(row.quote ?? ""),
			rating: row.rating == null ? undefined : asNumber(row.rating),
		})).filter((item) => item.authorName && item.quote),
		agents: (agentsResult.data ?? []).map((row): PublicAgent => ({
			name: String(row.full_name ?? row.profile_id ?? "Jewellz Agent"),
			top: Boolean(row.is_top_agent),
			photoUrl: row.photo_url ? String(row.photo_url) : undefined,
			licenseNumber: row.license_number ? String(row.license_number) : undefined,
			specialization: row.specialization ? String(row.specialization) : undefined,
			facebookUrl: row.facebook_url ? String(row.facebook_url) : undefined,
			instagramUrl: row.instagram_url ? String(row.instagram_url) : undefined,
			email: row.profile_id ? agentEmails.get(String(row.profile_id)) : undefined,
		})),
	};
}

export async function getPublicGalleryItems() {
	const { data, error } = await supabaseServer
		.from("gallery_items")
		.select("*")
		.eq("is_published", true)
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("Failed to load gallery items", error.message);
		return [];
	}

	return (data ?? []).map((row): PublicGalleryItem => ({
		section: String(row.section ?? "General"),
		title: String(row.title ?? ""),
		description: row.description ? String(row.description) : undefined,
		imageUrl: String(row.image_url ?? ""),
		linkUrl: row.link_url ? String(row.link_url) : undefined,
		sortOrder: row.sort_order == null ? undefined : asNumber(row.sort_order),
	})).filter((item) => item.title && item.imageUrl);
}

function asStringArray(value: unknown) {
	if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
	if (typeof value === "string") {
		return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
	}
	return [];
}

export async function getPublicCareerJobs() {
	const { data, error } = await supabaseServer
		.from("career_jobs")
		.select("*")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("Failed to load career jobs", error.message);
		return [];
	}

	return (data ?? []).map((row): PublicCareerJob => ({
		id: String(row.id ?? row.title ?? ""),
		title: String(row.title ?? ""),
		badge: String(row.badge ?? "Full-Time"),
		description: String(row.description ?? ""),
		details: asStringArray(row.details),
		sortOrder: row.sort_order == null ? undefined : asNumber(row.sort_order),
	})).filter((item) => item.id && item.title && item.description);
}
