const PROPERTY_PLACEHOLDER_IMAGES: Record<string, string> = {
	house: "/assets/placeholder-house.webp",
	condo: "/assets/placeholder-condo.webp",
	lot: "/assets/placeholder-lot.webp",
	farm: "/assets/placeholder-farm.webp",
	memorial: "/assets/placeholder-memorial.webp",
};

export function getPropertyPlaceholderImage(propertyType?: string | null) {
	const normalizedType = propertyType?.trim().toLowerCase() ?? "";
	if (["condo", "apartment", "studio"].some((type) => normalizedType.includes(type))) {
		return PROPERTY_PLACEHOLDER_IMAGES.condo;
	}
	if (["farm", "agricultural"].some((type) => normalizedType.includes(type))) {
		return PROPERTY_PLACEHOLDER_IMAGES.farm;
	}
	if (["memorial", "cemetery", "grave"].some((type) => normalizedType.includes(type))) {
		return PROPERTY_PLACEHOLDER_IMAGES.memorial;
	}
	if (["lot", "land", "parcel"].some((type) => normalizedType.includes(type))) {
		return PROPERTY_PLACEHOLDER_IMAGES.lot;
	}
	return PROPERTY_PLACEHOLDER_IMAGES.house;
}
