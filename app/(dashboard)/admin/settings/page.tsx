import AdminCms from "@/components/cms/AdminCms";
import { sectionFromParam, type CmsSearchParams } from "@/components/cms/routing";

export default async function Page({ searchParams }: { searchParams: CmsSearchParams }) {
	const params = await searchParams;
	const section = sectionFromParam(params.section, "settings");

	return <AdminCms initialPrimary="settings" initialSection={section === "activityLogs" ? "activityLogs" : "settings"} />;
}
