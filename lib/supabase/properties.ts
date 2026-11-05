import type { Property } from "@/types/property";
import { normalizeImageUrl } from "@/lib/image-url";
import { supabaseServer } from "./server";

type PropertyRow = {
	id: string;
	slug: string;
	title: string;
	category: string | null;
	property_subtype?: string | null;
	status: string | null;
	badge: string | null;
	address: string | null;
	city: string | null;
	province: string | null;
	latitude: number | string | null;
	longitude: number | string | null;
	bedrooms: number | null;
	bathrooms: number | null;
	floor_area_sqm: number | null;
	lot_area_sqm: number | null;
	floor_count: number | null;
	parking_slots: number | null;
	price: number | null;
	description: string | null;
	key_features: string[] | null;
	amenities: string[] | null;
	nearby_landmarks: string[] | null;
	cover_image_url: string | null;
	video_url: string | null;
	price_per_sqm: number | null;
	monthly_amortization: number | null;
	is_price_negotiable: boolean | null;
	property_images?: Array<{ storage_url: string | null; sort_order: number | null; is_cover: boolean | null }>;
	developer_partners?: { company_name: string | null } | Array<{ company_name: string | null }> | null;
};

export type HomepageFeaturedProperty = Property & {
	interestScore: number;
	interestSource: "analytics" | "fallback";
	engagement: {
		totalViews: number;
		uniqueViews: number;
		totalInquiries: number;
		totalInteractions: number;
		detailOpens: number;
		galleryInteractions: number;
		mapInteractions: number;
		avgDwellSeconds: number;
	};
};

export type PublicPropertyLocation = {
	province: string;
	municipality: string;
};

export type PublicPropertyAnalytics = {
	totalViews: number;
	detailOpens: number;
	totalInteractions: number;
	avgDwellSeconds: number;
};

type ListingPerformanceRow = {
	property_id: string | null;
	total_views?: number | string | null;
	unique_views?: number | string | null;
	total_inquiries?: number | string | null;
	total_interactions?: number | string | null;
	detail_opens?: number | string | null;
	gallery_interactions?: number | string | null;
	map_interactions?: number | string | null;
	avg_dwell_seconds?: number | string | null;
};

function titleCase(value: string | null | undefined) {
	if (!value) return undefined;
	return value
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function toNumber(value: number | string | null | undefined) {
	if (value == null || value === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function metric(value: number | string | null | undefined) {
	return toNumber(value) ?? 0;
}

const HOUSE_SUBTYPES = new Set(["house_and_lot", "single_attached", "single_detached", "duplex", "townhouse"]);

function getPropertyType(category: string | null, propertySubtype?: string | null) {
	const normalizedCategory = category?.toLowerCase() ?? "";
	const isLegacyHouseSubtype = HOUSE_SUBTYPES.has(normalizedCategory);
	const subtype = propertySubtype || (isLegacyHouseSubtype ? normalizedCategory : undefined);
	return {
		type: normalizedCategory === "house" || isLegacyHouseSubtype ? "House" : titleCase(category),
		subtype: subtype ? titleCase(subtype) : undefined,
	};
}

function mapPropertyRow(row: PropertyRow): Property {
	const latitude = toNumber(row.latitude);
	const longitude = toNumber(row.longitude);
	const lotArea = toNumber(row.lot_area_sqm);
	const floorArea = toNumber(row.floor_area_sqm);
	const floorCount = toNumber(row.floor_count);
	const parkingSlots = toNumber(row.parking_slots);
	const location = [row.city, row.province].filter(Boolean).join(", ") || row.address || undefined;
	const image = normalizeImageUrl(row.cover_image_url) ?? undefined;
	const imageRows = Array.isArray(row.property_images) ? row.property_images : [];
	const images = imageRows
		.slice()
		.sort((first, second) => Number(Boolean(second.is_cover)) - Number(Boolean(first.is_cover)) || (first.sort_order ?? 0) - (second.sort_order ?? 0))
		.map((item) => normalizeImageUrl(item.storage_url))
		.filter((item): item is string => Boolean(item));
	const allImages = [...new Set([...(image ? [image] : []), ...images])];
	const displayArea = floorArea ?? lotArea;
	const propertyType = getPropertyType(row.category, row.property_subtype);

	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		price: toNumber(row.price) ?? 0,
		description: row.description ?? undefined,
		location,
		coordinates: latitude != null && longitude != null ? [latitude, longitude] : undefined,
		image: allImages[0],
		images: allImages.length ? allImages : undefined,
		beds: row.bedrooms ?? undefined,
		baths: row.bathrooms ?? undefined,
		areaSqm: displayArea,
		lotAreaSqm: lotArea,
		type: propertyType.type,
		subtype: propertyType.subtype,
		category: row.status === "published" ? "For Sale" : titleCase(row.status),
		featured: row.badge === "featured",
		amenities: row.amenities ?? undefined,
		keyFeatures: row.key_features ?? undefined,
		videoUrl: row.video_url ?? undefined,
		pricePerSqm: toNumber(row.price_per_sqm),
		monthlyAmortization: toNumber(row.monthly_amortization),
		isPriceNegotiable: Boolean(row.is_price_negotiable),
		developerName: (Array.isArray(row.developer_partners) ? row.developer_partners[0]?.company_name : row.developer_partners?.company_name) ?? undefined,
		specs: [
			{ label: "Beds", value: String(row.bedrooms ?? 0) },
			{ label: "Baths", value: String(row.bathrooms ?? 0) },
			floorArea != null ? { label: "Floor Area", value: `${floorArea} sqm` } : null,
			lotArea != null ? { label: "Lot Area", value: `${lotArea} sqm` } : null,
			floorCount ? { label: "Levels", value: String(floorCount) } : null,
			parkingSlots != null ? { label: "Garage", value: String(parkingSlots) } : null,
		].filter((item): item is { label: string; value: string } => Boolean(item)),
	};
}

export async function getPublishedProperties() {
	const { data, error } = await supabaseServer
		.from("properties")
		.select("*, property_images(storage_url, sort_order, is_cover), developer_partners(company_name)")
		.eq("status", "published")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Failed to load published properties", error.message);
		return [];
	}

	return (data ?? []).map((row) => mapPropertyRow(row as PropertyRow));
}

/** Lightweight full published catalog used to prepare property-chat comparisons. */
export async function getComparablePublishedProperties(): Promise<Property[]> {
	const { data, error } = await supabaseServer
		.from("properties")
		.select("id,slug,title,category,property_subtype,status,city,province,bedrooms,bathrooms,floor_area_sqm,lot_area_sqm,price,description")
		.eq("status", "published")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Failed to load property-chat comparison candidates", error.message);
		return [];
	}

	return (data ?? []).map((row) => {
		const location = [row.city, row.province].filter(Boolean).join(", ") || undefined;
		const floorArea = toNumber(row.floor_area_sqm);
		const lotArea = toNumber(row.lot_area_sqm);
		return {
			id: row.id,
			slug: row.slug,
			title: row.title,
			price: toNumber(row.price) ?? 0,
			description: row.description ?? undefined,
			location,
			...getPropertyType(row.category, row.property_subtype),
			beds: row.bedrooms ?? undefined,
			baths: row.bathrooms ?? undefined,
			areaSqm: floorArea ?? lotArea,
			lotAreaSqm: lotArea,
		} satisfies Property;
	});
}

/** Fetch only the fields used by public listing cards and client-side search. */
export async function getPublishedPropertiesForList() {
	const { data, error } = await supabaseServer
		.from("properties")
		.select("id,slug,title,category,property_subtype,status,badge,address,city,province,latitude,longitude,bedrooms,bathrooms,floor_area_sqm,lot_area_sqm,floor_count,parking_slots,price,description,key_features,amenities,nearby_landmarks,cover_image_url,price_per_sqm,monthly_amortization,is_price_negotiable")
		.eq("status", "published")
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Failed to load published listing cards", error.message);
		return [];
	}

	return (data ?? []).map((row) => mapPropertyRow(row as unknown as PropertyRow));
}

export async function getPublishedPropertyLocations(): Promise<PublicPropertyLocation[]> {
	const { data, error } = await supabaseServer
		.from("properties")
		.select("city,province")
		.eq("status", "published")
		.not("city", "is", null)
		.not("province", "is", null)
		.limit(5000);

	if (error) {
		console.error("Failed to load published property locations", error.message);
		return [];
	}

	const locations = new Map<string, PublicPropertyLocation>();
	for (const row of data ?? []) {
		const province = String(row.province ?? "").trim();
		const municipality = String(row.city ?? "").trim();
		if (!province || !municipality) continue;
		const key = `${province.toLocaleLowerCase()}|${municipality.toLocaleLowerCase()}`;
		if (!locations.has(key)) locations.set(key, { province, municipality });
	}

	return [...locations.values()].sort((first, second) =>
		first.province.localeCompare(second.province) || first.municipality.localeCompare(second.municipality),
	);
}

function scoreListing(row: ListingPerformanceRow) {
	const totalViews = metric(row.total_views);
	const uniqueViews = metric(row.unique_views);
	const totalInquiries = metric(row.total_inquiries);
	const totalInteractions = metric(row.total_interactions);
	const detailOpens = metric(row.detail_opens);
	const galleryInteractions = metric(row.gallery_interactions);
	const mapInteractions = metric(row.map_interactions);
	const avgDwellSeconds = metric(row.avg_dwell_seconds);

	return {
		score:
			totalViews +
			uniqueViews * 2 +
			totalInteractions * 3 +
			detailOpens * 4 +
			galleryInteractions * 3 +
			mapInteractions * 2 +
			totalInquiries * 12 +
			Math.min(avgDwellSeconds, 300) / 15,
		engagement: {
			totalViews,
			uniqueViews,
			totalInquiries,
			totalInteractions,
			detailOpens,
			galleryInteractions,
			mapInteractions,
			avgDwellSeconds,
		},
	};
}

export async function getHomepageFeaturedProperties(limit = 12): Promise<HomepageFeaturedProperty[]> {
	const [publishedProperties, performanceResult] = await Promise.all([
		supabaseServer
			.from("properties")
			.select("id,slug,title,category,status,badge,address,city,province,latitude,longitude,bedrooms,bathrooms,floor_area_sqm,lot_area_sqm,floor_count,parking_slots,price,description,key_features,amenities,nearby_landmarks,cover_image_url,video_url,price_per_sqm,monthly_amortization,is_price_negotiable,property_images(storage_url,sort_order,is_cover),developer_partners(company_name)")
			.eq("status", "published")
			.eq("badge", "featured")
			.order("created_at", { ascending: false }),
		supabaseServer
			.from("mv_listing_performance")
			.select("property_id,total_views,total_inquiries,total_interactions,detail_opens,avg_dwell_seconds")
			.limit(250),
	]);
	if (publishedProperties.error) {
		console.error("Failed to load featured homepage properties", publishedProperties.error.message);
		return [];
	}
	const properties = (publishedProperties.data ?? []).map((row) => mapPropertyRow(row as PropertyRow));

	const performanceByProperty = new Map<string, ReturnType<typeof scoreListing>>();
	if (performanceResult.error) {
		console.error("Failed to load listing performance for homepage picks", performanceResult.error.message);
	} else {
		for (const row of (performanceResult.data ?? []) as ListingPerformanceRow[]) {
			if (!row.property_id) continue;
			const scored = scoreListing(row);
			if (scored.score > 0) {
				performanceByProperty.set(row.property_id, scored);
			}
		}
	}

	const analyticsRanked: HomepageFeaturedProperty[] = properties
		.reduce<HomepageFeaturedProperty[]>((ranked, property) => {
			const scored = performanceByProperty.get(property.id);
			if (scored) {
				ranked.push({
						...property,
						interestScore: scored.score,
						interestSource: "analytics",
						engagement: scored.engagement,
					});
			}
			return ranked;
		}, [])
		.sort((first, second) => second.interestScore - first.interestScore || first.title.localeCompare(second.title));

	const picked = new Map<string, HomepageFeaturedProperty>();
	for (const property of analyticsRanked) {
		if (picked.size >= limit) break;
		picked.set(property.id, property);
	}

	const fallbackProperties = properties
		.filter((property) => !picked.has(property.id))
		.sort((first, second) => Number(Boolean(second.featured)) - Number(Boolean(first.featured)) || first.title.localeCompare(second.title));

	for (const property of fallbackProperties) {
		if (picked.size >= limit) break;
		picked.set(property.id, {
			...property,
			interestScore: 0,
			interestSource: "fallback",
			engagement: {
				totalViews: 0,
				uniqueViews: 0,
				totalInquiries: 0,
				totalInteractions: 0,
				detailOpens: 0,
				galleryInteractions: 0,
				mapInteractions: 0,
				avgDwellSeconds: 0,
			},
		});
	}

	return Array.from(picked.values());
}

export async function getPublishedPropertyBySlug(slug: string) {
	const { data, error } = await supabaseServer
		.from("properties")
		.select("*, property_images(storage_url, sort_order, is_cover), developer_partners(company_name)")
		.eq("slug", slug)
		.eq("status", "published")
		.maybeSingle();

	if (error) {
		console.error("Failed to load property", error.message);
		return null;
	}

	return data ? mapPropertyRow(data as PropertyRow) : null;
}

/** Read only coarse, per-listing engagement metrics for the public chatbot. */
export async function getPublicPropertyAnalytics(propertyId: string): Promise<PublicPropertyAnalytics | null> {
	const { data, error } = await supabaseServer
		.from("mv_listing_performance")
		.select("property_id,total_views,detail_opens,total_interactions,avg_dwell_seconds")
		.eq("property_id", propertyId)
		.maybeSingle();

	if (error || !data || data.property_id !== propertyId) {
		if (error) console.error("Failed to load public property engagement summary", error.message);
		return null;
	}

	const safeMetric = (value: unknown, max = Number.MAX_SAFE_INTEGER) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? Math.min(max, Math.max(0, parsed)) : 0;
	};

	return {
		totalViews: safeMetric(data.total_views),
		detailOpens: safeMetric(data.detail_opens),
		totalInteractions: safeMetric(data.total_interactions),
		avgDwellSeconds: safeMetric(data.avg_dwell_seconds, 3600),
	};
}

function toDbCategory(category: string | null | undefined) {
	if (!category) return undefined;
	return category.trim().toLowerCase();
}

/**
 * Fetches a small set of related published listings without scanning the whole
 * table. Prefers same-category matches, then tops up with any recent listings
 * when a category filter comes up short.
 */
export async function getRelatedProperties(
	propertyId: string,
	options: { category?: string; limit?: number } = {},
) {
	const { category, limit = 3 } = options;

	let query = supabaseServer
		.from("properties")
		.select("*, property_images(storage_url, sort_order, is_cover), developer_partners(company_name)")
		.eq("status", "published")
		.neq("id", propertyId)
		.order("created_at", { ascending: false })
		.limit(limit);

	// Categories are stored as raw lowercase values ("condo", "house", ...) while
	// property.type is title-cased ("Condo"), so normalize before filtering.
	const dbCategory = toDbCategory(category);
	if (dbCategory) {
		query = query.eq("category", dbCategory);
	}

	const { data, error } = await query;

	if (error) {
		console.error("Failed to load related properties", error.message);
		return [];
	}

	// If a category filter returned too few results, top up with any published listings.
	if (dbCategory && data && data.length < limit) {
		const { data: extra, error: extraError } = await supabaseServer
			.from("properties")
			.select("*, property_images(storage_url, sort_order, is_cover), developer_partners(company_name)")
			.eq("status", "published")
			.neq("id", propertyId)
			.order("created_at", { ascending: false })
			.limit(limit - data.length);

		if (!extraError && extra) {
			const seen = new Set(data.map((row) => row.id));
			data.push(...extra.filter((row) => !seen.has(row.id)));
		}
	}

	return (data ?? []).map((row) => mapPropertyRow(row as PropertyRow));
}
