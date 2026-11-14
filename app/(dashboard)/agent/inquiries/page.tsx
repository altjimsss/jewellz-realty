import type { Metadata } from "next";
import AgentDashboard from "@/components/agent/AgentDashboard";

export const metadata: Metadata = {
	title: "Assigned Inquiries | Agent Portal | J'WELLZ REALTY",
	description: "Buyer inquiries and lead pipeline for licensed agents.",
};

type PageProps = {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AgentInquiriesPage({ searchParams }: PageProps) {
	const params = await searchParams;
	const rawSection = params?.section;
	const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;
	const rawInquiryId = params?.inquiry;
	const inquiryId = Array.isArray(rawInquiryId) ? rawInquiryId[0] : rawInquiryId;

	return <AgentDashboard initialSection={section} initialInquiryId={inquiryId} />;
}
