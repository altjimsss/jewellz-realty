import AdminCms from "@/components/cms/AdminCms";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	return <AdminCms initialPrimary="listings" initialSection="properties" initialPropertyId={id} />;
}
