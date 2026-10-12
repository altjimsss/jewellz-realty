import { ProjectListPageClient } from "@/components/properties/ProjectListPageClient";
import { getPublishedProperties } from "@/lib/supabase/properties";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
	title: "Project List | Jewellz Realty",
	description: "Explore published condos, houses, lots, farms, memorial properties, and developer projects from Jewellz Realty.",
};

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function Page({ searchParams }: PageProps) {
	const resolvedSearchParams = await searchParams;
	const initialFilters = {
		keyword: getSearchValue(resolvedSearchParams?.search),
		lookingFor: getSearchValue(resolvedSearchParams?.lookingFor),
		location: getSearchValue(resolvedSearchParams?.location),
		subLocation: getSearchValue(resolvedSearchParams?.subLocation),
		priceMin: getSearchValue(resolvedSearchParams?.priceMin),
		priceMax: getSearchValue(resolvedSearchParams?.priceMax),
		status: getSearchValue(resolvedSearchParams?.status),
		beds: getSearchValue(resolvedSearchParams?.beds),
		baths: getSearchValue(resolvedSearchParams?.baths),
		category: getSearchValue(resolvedSearchParams?.category),
	};
	const properties = await getPublishedProperties();

	return <ProjectListPageClient key={JSON.stringify(initialFilters)} properties={properties} initialFilters={initialFilters} />;
}
