import type { Metadata } from "next";
import HomePageClient from "@/components/pages/HomePageClient";
import { getHomepageFeaturedProperties } from "@/lib/supabase/properties";

export const metadata: Metadata = {
	title: "Jewellz Realty | Premium Properties in the Philippines",
	description: "Browse Jewellz Realty listings, featured properties, developer projects, and real estate services.",
};

function getNextManilaMidnight(now = new Date()) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Manila",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);

	const year = Number(parts.find((part) => part.type === "year")?.value);
	const month = Number(parts.find((part) => part.type === "month")?.value);
	const day = Number(parts.find((part) => part.type === "day")?.value);

	return new Date(Date.UTC(year, month - 1, day + 1, 16, 0, 0));
}

export default async function HomePage() {
	const [featuredProperties, refreshesAt] = await Promise.all([
		getHomepageFeaturedProperties(12),
		Promise.resolve(getNextManilaMidnight().toISOString()),
	]);

	return (
		<HomePageClient
			initialFeaturedProperties={featuredProperties}
			initialFeaturedRefreshesAt={refreshesAt}
		/>
	);
}
