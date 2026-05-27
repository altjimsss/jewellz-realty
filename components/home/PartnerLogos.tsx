import LogoLoop from "@/components/home/LogoLoop";

const developerLogos = [
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

export function PartnerLogos() {
	return (
		<section className="border-b py-10">
			<LogoLoop
				logos={developerLogos}
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