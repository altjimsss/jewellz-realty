import AdminCms from "@/components/cms/AdminCms";
import { sectionFromParam, type CmsSearchParams } from "@/components/cms/routing";

export default async function Page({ searchParams }: { searchParams: CmsSearchParams }) {
	const params = await searchParams;
	const section = sectionFromParam(params.section, "agents");

	return <AdminCms initialPrimary="people" initialSection={section === "developers" || section === "profiles" ? section : "agents"} />;
}
