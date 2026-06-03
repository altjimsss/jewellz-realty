import type { FieldOption, FieldSpec, SelectionState, Workspace } from "./types";

export const emptyWorkspace: Workspace = {
	properties: [],
	projects: [],
	developers: [],
	agents: [],
	inquiries: [],
	cmsPages: [],
	galleryItems: [],
	testimonials: [],
	heroBanners: [],
	partnerLogos: [],
	siteStats: [],
	settings: [],
	listingPerformance: [],
	dailyInquiryVolume: [],
	trafficSources: [],
	agentPerformance: [],
	developerPortfolio: [],
	recommendations: [],
};

export const emptySelection: SelectionState = {
	properties: null,
	projects: null,
	developers: null,
	agents: null,
	inquiries: null,
	cmsPages: null,
	galleryItems: null,
	testimonials: null,
	heroBanners: null,
	partnerLogos: null,
	siteStats: null,
	settings: null,
};

export const propertyCategoryOptions: FieldOption[] = [
	{ label: "Condo", value: "condo" },
	{ label: "House", value: "house" },
	{ label: "House and Lot", value: "house_and_lot" },
	{ label: "Townhouse", value: "townhouse" },
	{ label: "Lot", value: "lot" },
	{ label: "Farm", value: "farm" },
	{ label: "Memorial", value: "memorial" },
	{ label: "Commercial", value: "commercial" },
];

export const propertySidebarCategoryOptions: FieldOption[] = [
	{ label: "Condo", value: "condo" },
	{ label: "House", value: "house" },
	{ label: "Lot", value: "lot" },
	{ label: "Farm", value: "farm" },
	{ label: "Memorial", value: "memorial" },
];

export const listingStatusOptions: FieldOption[] = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Reserved", value: "reserved" },
	{ label: "Sold", value: "sold" },
	{ label: "Unpublished", value: "unpublished" },
];

export const listingBadgeOptions: FieldOption[] = [
	{ label: "None", value: "none" },
	{ label: "Featured", value: "featured" },
	{ label: "Promo", value: "promo" },
	{ label: "New", value: "new" },
	{ label: "Hot", value: "hot" },
];

export const inquiryStatusOptions: FieldOption[] = [
	{ label: "New", value: "new" },
	{ label: "Assigned", value: "assigned" },
	{ label: "Contacted", value: "contacted" },
	{ label: "Viewing Scheduled", value: "viewing_scheduled" },
	{ label: "Negotiating", value: "negotiating" },
	{ label: "Reserved", value: "reserved" },
	{ label: "Closed Won", value: "closed_won" },
	{ label: "Closed Lost", value: "closed_lost" },
];

export const priorityOptions: FieldOption[] = [
	{ label: "High", value: "high" },
	{ label: "Medium", value: "medium" },
	{ label: "Low", value: "low" },
];

export const trafficSourceOptions: FieldOption[] = [
	{ label: "Direct", value: "direct" },
	{ label: "Organic Search", value: "organic_search" },
	{ label: "Facebook", value: "social_media_facebook" },
	{ label: "Instagram", value: "social_media_instagram" },
	{ label: "Other Social", value: "social_media_other" },
	{ label: "Email", value: "email_campaign" },
	{ label: "Referral", value: "referral" },
	{ label: "Walk In", value: "walk_in" },
	{ label: "Phone", value: "phone" },
	{ label: "Other", value: "other" },
];

export const gallerySectionOptions: FieldOption[] = [
	{ label: "Achievements", value: "achievements" },
	{ label: "Events", value: "events" },
	{ label: "Trainings", value: "trainings" },
	{ label: "Service", value: "service" },
	{ label: "General", value: "general" },
];

export const propertyFields: FieldSpec[] = [
	{ name: "project_id", label: "Project ID", type: "text", placeholder: "UUID from projects" },
	{ name: "developer_id", label: "Developer ID", type: "text", placeholder: "UUID from developer_partners" },
	{ name: "assigned_agent_id", label: "Assigned Agent ID", type: "text", placeholder: "UUID from agents" },
	{ name: "title", label: "Title", type: "text", placeholder: "Palm Village Unit 12" },
	{ name: "slug", label: "Slug", type: "text", placeholder: "palm-village-unit-12" },
	{ name: "category", label: "Category", type: "select", options: propertyCategoryOptions },
	{ name: "status", label: "Status", type: "select", options: listingStatusOptions },
	{ name: "badge", label: "Badge", type: "select", options: listingBadgeOptions },
	{ name: "address", label: "Address", type: "text" },
	{ name: "city", label: "City", type: "text" },
	{ name: "province", label: "Province", type: "text" },
	{ name: "region", label: "Region", type: "text" },
	{ name: "zip_code", label: "Zip Code", type: "text" },
	{ name: "latitude", label: "Latitude", type: "number", placeholder: "13.7563" },
	{ name: "longitude", label: "Longitude", type: "number", placeholder: "121.0583" },
	{ name: "google_maps_url", label: "Google Maps URL", type: "url" },
	{ name: "bedrooms", label: "Bedrooms", type: "number" },
	{ name: "bathrooms", label: "Bathrooms", type: "number" },
	{ name: "floor_area_sqm", label: "Floor Area (sqm)", type: "number" },
	{ name: "lot_area_sqm", label: "Lot Area (sqm)", type: "number" },
	{ name: "floor_count", label: "Floor Count", type: "number" },
	{ name: "unit_number", label: "Unit Number", type: "text" },
	{ name: "parking_slots", label: "Parking Slots", type: "number" },
	{ name: "price", label: "Price", type: "number" },
	{ name: "price_per_sqm", label: "Price per sqm", type: "number" },
	{ name: "is_price_negotiable", label: "Price Negotiable", type: "checkbox", help: "Enable if the listed price can still be negotiated." },
	{ name: "monthly_amortization", label: "Monthly Amortization", type: "number" },
	{ name: "description", label: "Description", type: "textarea", rows: 5 },
	{ name: "key_features", label: "Key Features", type: "array", rows: 4, help: "One feature per line, or comma-separated." },
	{ name: "amenities", label: "Amenities", type: "array", rows: 4, help: "One amenity per line, or comma-separated." },
	{ name: "nearby_landmarks", label: "Nearby Landmarks", type: "array", rows: 4 },
	{ name: "cover_image_url", label: "Cover Image URL", type: "url" },
	{ name: "video_url", label: "Video URL", type: "url" },
	{ name: "published_at", label: "Published At", type: "datetime-local" },
];

export const projectFields: FieldSpec[] = [
	{ name: "developer_id", label: "Developer ID", type: "text" },
	{ name: "project_name", label: "Project Name", type: "text" },
	{ name: "slug", label: "Slug", type: "text" },
	{ name: "tagline", label: "Tagline", type: "text" },
	{ name: "description", label: "Description", type: "textarea", rows: 5 },
	{ name: "location_city", label: "City", type: "text" },
	{ name: "location_province", label: "Province", type: "text" },
	{ name: "region", label: "Region", type: "text" },
	{ name: "latitude", label: "Latitude", type: "number" },
	{ name: "longitude", label: "Longitude", type: "number" },
	{ name: "cover_image_url", label: "Cover Image URL", type: "url" },
	{ name: "brochure_url", label: "Brochure URL", type: "url" },
	{ name: "is_active", label: "Active", type: "checkbox", help: "Show this project in the portfolio." },
];

export const developerFields: FieldSpec[] = [
	{ name: "profile_id", label: "Profile ID", type: "text" },
	{ name: "company_name", label: "Company Name", type: "text" },
	{ name: "slug", label: "Slug", type: "text" },
	{ name: "logo_url", label: "Logo URL", type: "url" },
	{ name: "website_url", label: "Website URL", type: "url" },
	{ name: "description", label: "Description", type: "textarea", rows: 5 },
	{ name: "contact_email", label: "Contact Email", type: "email" },
	{ name: "contact_phone", label: "Contact Phone", type: "text" },
	{ name: "is_active", label: "Active", type: "checkbox" },
];

export const agentFields: FieldSpec[] = [
	{ name: "profile_id", label: "Profile ID", type: "text" },
	{ name: "license_number", label: "License Number", type: "text" },
	{ name: "specialization", label: "Specialization", type: "text" },
	{ name: "bio", label: "Bio", type: "textarea", rows: 5 },
	{ name: "photo_url", label: "Photo URL", type: "url" },
	{ name: "facebook_url", label: "Facebook URL", type: "url" },
	{ name: "instagram_url", label: "Instagram URL", type: "url" },
	{ name: "twitter_url", label: "Twitter URL", type: "url" },
	{ name: "linkedin_url", label: "LinkedIn URL", type: "url" },
	{ name: "is_top_agent", label: "Top Agent", type: "checkbox" },
];

export const cmsPageFields: FieldSpec[] = [
	{ name: "slug", label: "Slug", type: "text" },
	{ name: "title", label: "Title", type: "text" },
	{ name: "content_html", label: "Content HTML", type: "textarea", rows: 10, help: "Paste raw HTML or simple text content." },
	{ name: "meta_title", label: "Meta Title", type: "text" },
	{ name: "meta_description", label: "Meta Description", type: "textarea", rows: 3 },
	{ name: "is_published", label: "Published", type: "checkbox" },
	{ name: "published_at", label: "Published At", type: "datetime-local" },
];

export const galleryFields: FieldSpec[] = [
	{ name: "section", label: "Section", type: "select", options: gallerySectionOptions },
	{ name: "title", label: "Title", type: "text" },
	{ name: "description", label: "Description", type: "textarea", rows: 4 },
	{ name: "image_url", label: "Image URL", type: "url" },
	{ name: "link_url", label: "Link URL", type: "url" },
	{ name: "sort_order", label: "Sort Order", type: "number" },
	{ name: "is_published", label: "Published", type: "checkbox" },
];

export const testimonialFields: FieldSpec[] = [
	{ name: "author_name", label: "Author Name", type: "text" },
	{ name: "author_title", label: "Author Title", type: "text" },
	{ name: "avatar_url", label: "Avatar URL", type: "url" },
	{ name: "quote", label: "Quote", type: "textarea", rows: 5 },
	{ name: "rating", label: "Rating", type: "number" },
	{ name: "is_published", label: "Published", type: "checkbox" },
	{ name: "sort_order", label: "Sort Order", type: "number" },
];

export const heroBannerFields: FieldSpec[] = [
	{ name: "headline", label: "Headline", type: "text" },
	{ name: "subheadline", label: "Subheadline", type: "textarea", rows: 3 },
	{ name: "cta_label", label: "CTA Label", type: "text" },
	{ name: "cta_url", label: "CTA URL", type: "url" },
	{ name: "image_url", label: "Image URL", type: "url" },
	{ name: "linked_property", label: "Linked Property ID", type: "text" },
	{ name: "sort_order", label: "Sort Order", type: "number" },
	{ name: "is_active", label: "Active", type: "checkbox" },
];

export const partnerLogoFields: FieldSpec[] = [
	{ name: "name", label: "Name", type: "text" },
	{ name: "logo_url", label: "Logo URL", type: "url" },
	{ name: "website_url", label: "Website URL", type: "url" },
	{ name: "sort_order", label: "Sort Order", type: "number" },
	{ name: "is_active", label: "Active", type: "checkbox" },
];

export const siteStatFields: FieldSpec[] = [
	{ name: "key", label: "Key", type: "text" },
	{ name: "label", label: "Label", type: "text" },
	{ name: "value", label: "Value", type: "number" },
	{ name: "suffix", label: "Suffix", type: "text" },
	{ name: "sort_order", label: "Sort Order", type: "number" },
];

export const settingFields: FieldSpec[] = [
	{ name: "key", label: "Key", type: "text" },
	{ name: "value", label: "Value", type: "text" },
	{ name: "description", label: "Description", type: "textarea", rows: 3 },
];
