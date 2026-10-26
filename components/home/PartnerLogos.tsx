"use client";

import { useEffect, useState, type ReactNode } from "react";
import LogoLoop from "@/components/home/LogoLoop";
import { PartnerLogoMark } from "@/components/home/PartnerLogoMark";

type PartnerLogoItem = {
	title: string;
	href?: string;
	node: ReactNode;
};

const defaultDeveloperLogos: PartnerLogoItem[] = [
	{
		title: "ECHOMES",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">ECHOMES</span>,
	},
	{
		title: "DMCI",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">DMCI</span>,
	},
	{
		title: "AXEIA",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">AXEIA</span>,
	},
	{
		title: "OVIALAND",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">OVIALAND</span>,
	},
	{
		title: "AboitizLand",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">AboitizLand</span>,
	},
	{
		title: "PHIRST",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">PHIRST</span>,
	},
	{
		title: "NEXTA",
		node: <span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">NEXTA</span>,
	},
];

type PartnerLogosProps = {
	logos?: PartnerLogoItem[];
};

export function PartnerLogos({ logos }: PartnerLogosProps) {
	const [liveLogos, setLiveLogos] = useState<PartnerLogoItem[] | null>(null);
	const activeLogos = logos && logos.length > 0 ? logos : (liveLogos ?? defaultDeveloperLogos);

	useEffect(() => {
		if (logos && logos.length > 0) return;

		let isMounted = true;
		async function fetchLivePartnerLogos() {
			try {
				const res = await fetch("/api/content/home", { cache: "no-store" });
				if (!res.ok) return;
				const data = await res.json();
				if (isMounted && Array.isArray(data?.partnerLogos) && data.partnerLogos.length > 0) {
					const mapped: PartnerLogoItem[] = data.partnerLogos.map((item: { name: string; logoUrl?: string; websiteUrl?: string }) => ({
						title: item.name,
						href: item.websiteUrl,
					node: <PartnerLogoMark name={item.name} logoUrl={item.logoUrl} />,
					}));
					setLiveLogos(mapped);
				}
			} catch {
				// Keep current logos on error
			}
		}

		fetchLivePartnerLogos();

		return () => {
			isMounted = false;
		};
	}, [logos]);

	return (
		<section className="border-b py-10">
			<LogoLoop
				logos={activeLogos}
				speed={80}
				direction="left"
				logoHeight={36}
				gap={20}
				hoverSpeed={0}
				scaleOnHover
				fadeOut
				fadeOutColor="#ffffff"
				ariaLabel="Developer partners"
			/>
		</section>
	);
}

export default PartnerLogos;