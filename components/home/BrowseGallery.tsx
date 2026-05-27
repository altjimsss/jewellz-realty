export function BrowseGallery() {
	return (
		<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-28">
			<p className="text-center text-sm font-bold text-gray-500">KNOW US BETTER</p>
			<h2 className="text-center text-3xl font-bold sm:text-4xl">BROWSE OUR GALLERY</h2>
			<div className="mx-auto mt-2 h-[3px] w-24 bg-[#DE141C]" />
			<div className="mt-8 grid grid-cols-3 gap-2">
				<div className="group relative h-[22rem] overflow-hidden sm:h-[26rem] lg:h-[30rem]">
					<div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=800&q=80')" }} />
					<div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
					<div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-5 sm:left-5 sm:gap-3">
						<span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
						<div className="min-w-0">
							<p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">ACHIEVEMENTS</p>
							<p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">SEE OUR MILESTONES</p>
						</div>
					</div>
				</div>
				<div className="col-span-2 space-y-2">
					<div className="group relative h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]">
						<div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80')" }} />
						<div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
						<div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-5 sm:gap-3">
							<span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
							<div className="min-w-0">
								<p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">EVENTS</p>
								<p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">MEMORABLE TIMES</p>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="group relative h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]">
							<div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&q=80')" }} />
							<div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
							<div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-4 sm:gap-3">
								<span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
								<div className="min-w-0">
									<p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">TRAININGS</p>
									<p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">ENHANCING OUR SKILLS</p>
								</div>
							</div>
						</div>
						<div className="group relative h-[10.75rem] overflow-hidden sm:h-[12.5rem] lg:h-[14.75rem]">
							<div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500&q=80')" }} />
							<div className="absolute inset-0 bg-gradient-to-t from-black to-transparent transition-colors duration-300 group-hover:from-[#DE141C]" />
							<div className="absolute bottom-3 left-3 flex items-stretch gap-2 text-white sm:bottom-4 sm:left-4 sm:gap-3">
								<span className="w-[3px] self-stretch bg-[#DE141C] transition-colors duration-300 group-hover:bg-white" />
								<div className="min-w-0">
									<p className="text-[11px] font-bold leading-[0.95] sm:text-4xl lg:text-5xl">SERVICE</p>
									<p className="mt-1 text-[7px] font-semibold uppercase leading-tight tracking-[0.04em] sm:text-xs lg:text-sm">FOR THE PEOPLE</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}