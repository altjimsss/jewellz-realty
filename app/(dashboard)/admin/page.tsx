import AdminCms from "@/components/cms/AdminCms";
import { primaryForSection, sectionFromParam, type CmsSearchParams } from "@/components/cms/routing";

export default async function Page({ searchParams }: { searchParams: CmsSearchParams }) {
	const params = await searchParams;
	const section = sectionFromParam(params.section, "overview");

	return <AdminCms initialPrimary={primaryForSection(section)} initialSection={section} />;
}
