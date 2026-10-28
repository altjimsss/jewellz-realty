import { PortalSessionTimeout } from "@/components/auth/PortalSessionTimeout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<section className="min-h-screen bg-white text-[#111111]">
			<PortalSessionTimeout />
			{children}
		</section>
	);
}
