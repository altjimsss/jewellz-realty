import { Testimonial } from "@/components/ui/design-testimonial";

export function Testimonials() {
	return (
		<section className="border-y px-4 py-12 text-center sm:px-6 sm:py-16">
			<p className="text-sm font-bold text-gray-500">WHAT OUR CLIENTS SAY</p>
			<h2 className="text-3xl font-bold sm:text-4xl">TESTIMONIALS</h2>
			<div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
			<div className="mt-8">
				<Testimonial />
			</div>
		</section>
	);
}