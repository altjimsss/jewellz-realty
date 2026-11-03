import { Testimonial } from "@/components/ui/design-testimonial";

export function Testimonials() {
	return (
		<section className="border-y border-[#EAE7E3] px-4 py-12 text-center sm:px-6 sm:py-16">
			<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">WHAT OUR CLIENTS SAY</p>
			<h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-[#1C1B19] sm:text-3xl">Testimonials</h2>
			<div className="mx-auto mt-3 h-[2px] w-10 bg-[#DE141C]" />
			<div className="mt-8">
				<Testimonial />
			</div>
		</section>
	);
}
