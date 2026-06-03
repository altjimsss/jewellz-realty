import { ProjectListPageClient } from "@/components/properties/ProjectListPageClient";
import { getPublishedProperties } from "@/lib/supabase/properties";

export const dynamic = "force-dynamic";

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function Page({ searchParams }: PageProps) {
	const resolvedSearchParams = await searchParams;
	const initialSearch = getSearchValue(resolvedSearchParams?.search);
	const properties = await getPublishedProperties();

	return <ProjectListPageClient key={initialSearch} properties={properties} initialSearch={initialSearch} />;
}
