import { Poppins } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { PropertyBanner } from "@/components/layout/PropertyBanner";
import { Footer } from "@/components/layout/Footer";
import { ProjectListSkeleton } from "@/components/properties/ProjectListSkeleton";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"] });

const navLinks = [
	{ label: "Home", href: "/" },
	{ label: "Project List", href: "/project-list" },
	{ label: "Gallery", href: "/gallery" },
	{ label: "About us", href: "/about-us" },
	{ label: "Contact", href: "/contact" },
	{ label: "Career", href: "/career" },
];

export default function Loading() {
	return (
		<main className={`${poppins.className} bg-white text-[#181A20]`}>
			<AnnouncementBar />

			<Navbar links={navLinks} fontClassName={poppins.className} />

			<PropertyBanner />

			<ProjectListSkeleton />

			<Footer />
		</main>
	);
}
