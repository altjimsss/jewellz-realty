import type { Property } from "@/types/property";
import { supabaseServer } from "./server";

type PropertyRow = {
	id: string;
	slug: string;
	title: string;
	category: string | null;
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
	developer_partners?: { company_name: string | null } | null;
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

function mapPropertyRow(row: PropertyRow): Property {
	const latitude = toNumber(row.latitude);
	const longitude = toNumber(row.longitude);
	const lotArea = toNumber(row.lot_area_sqm);
	const floorArea = toNumber(row.floor_area_sqm);
	const floorCount = toNumber(row.floor_count);
	const parkingSlots = toNumber(row.parking_slots);
	const location = [row.city, row.province].filter(Boolean).join(", ") || row.address || undefined;
	const image = row.cover_image_url || undefined;
	const imageRows = Array.isArray(row.property_images) ? row.property_images : [];
	const images = imageRows
		.slice()
		.sort((first, second) => Number(Boolean(second.is_cover)) - Number(Boolean(first.is_cover)) || (first.sort_order ?? 0) - (second.sort_order ?? 0))
		.map((item) => item.storage_url)
		.filter((item): item is string => Boolean(item));
	const allImages = [...new Set([...(image ? [image] : []), ...images])];
	const displayArea = floorArea ?? lotArea;

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
		type: titleCase(row.category),
		category: row.status === "published" ? "For Sale" : titleCase(row.status),
		featured: row.badge === "featured",
		amenities: row.amenities ?? undefined,
		keyFeatures: row.key_features ?? undefined,
		videoUrl: row.video_url ?? undefined,
		pricePerSqm: toNumber(row.price_per_sqm),
		monthlyAmortization: toNumber(row.monthly_amortization),
		isPriceNegotiable: Boolean(row.is_price_negotiable),
		developerName: row.developer_partners?.company_name ?? undefined,
		specs: [
			{ label: "Beds", value: String(row.bedrooms ?? 0) },
			{ label: "Baths", value: String(row.bathrooms ?? 0) },
			{ label: lotArea && !floorArea ? "Lot Area" : "Area", value: `${displayArea ?? 0} sqm` },
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
