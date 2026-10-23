import type { Metadata } from "next";
import AgentDashboard from "@/components/agent/AgentDashboard";

export const metadata: Metadata = {
	title: "Agent Portal | Jewellz Realty",
	description: "Manage your assigned property inquiries, buyer leads, and profile.",
};

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AgentPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const rawSection = params?.section;
	const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;

	return <AgentDashboard initialSection={section} />;
}
