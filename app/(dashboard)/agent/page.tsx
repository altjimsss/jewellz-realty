import type { Metadata } from "next";
import AgentDashboard from "@/components/agent/AgentDashboard";

export const metadata: Metadata = {
	title: "Agent Portal | Jewellz Realty",
	description: "Manage your assigned property inquiries, buyer leads, and profile.",
};

export default function AgentPage() {
	return <AgentDashboard />;
}