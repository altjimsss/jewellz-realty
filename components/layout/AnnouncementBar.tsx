import Link from "next/link";

type AnnouncementBarProps = {
	href?: string;
	message?: string;
	ctaLabel?: string;
};

export function AnnouncementBar({
	href = "/#",
	message = "Premium but Affordable (deals) Properties on Sale.",
	ctaLabel = "BrowseNow",
}: AnnouncementBarProps) {
	return (
		<div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
			<p className="whitespace-nowrap">{message}</p>
			<Link className="underline" href={href}>
				{ctaLabel}
			</Link>
		</div>
	);
}