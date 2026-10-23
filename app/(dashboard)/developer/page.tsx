import type { Metadata } from "next";
import DeveloperDashboard from "@/components/developer/DeveloperDashboard";

export const metadata: Metadata = {
	title: "Developer Partner Hub | Jewellz Realty",
	description: "Manage your development projects, connected listings, buyer inquiries, and analytics.",
};

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DeveloperPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const rawSection = params?.section;
	const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;

	return <DeveloperDashboard initialSection={section} />;
}
