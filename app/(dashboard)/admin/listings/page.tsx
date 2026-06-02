import AdminCms from "@/components/cms/AdminCms";
import { categoryFromParam, sectionFromParam, type CmsSearchParams } from "@/components/cms/routing";

export default async function Page({ searchParams }: { searchParams: CmsSearchParams }) {
	const params = await searchParams;
	const section = sectionFromParam(params.section, "properties");

	return <AdminCms initialPrimary="listings" initialSection={section === "projects" ? "projects" : "properties"} initialPropertyCategory={categoryFromParam(params.category)} />;
}
