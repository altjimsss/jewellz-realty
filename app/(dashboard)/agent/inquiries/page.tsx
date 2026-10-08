import type { Metadata } from "next";
import AgentDashboard from "@/components/agent/AgentDashboard";

export const metadata: Metadata = {
	title: "Assigned Inquiries | Agent Portal | Jewellz Realty",
	description: "Buyer inquiries and lead pipeline for licensed agents.",
};

export default function AgentInquiriesPage() {
	return <AgentDashboard />;
}