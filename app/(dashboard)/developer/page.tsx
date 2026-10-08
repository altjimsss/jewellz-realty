import type { Metadata } from "next";
import DeveloperDashboard from "@/components/developer/DeveloperDashboard";

export const metadata: Metadata = {
	title: "Developer Partner Hub | Jewellz Realty",
	description: "Manage your development projects, connected listings, buyer inquiries, and analytics.",
};

export default function DeveloperPage() {
	return <DeveloperDashboard />;
}
