"use client";

import Image from "next/image";
import { useState } from "react";
import { normalizeImageUrl } from "@/lib/image-url";

/** Shows a partner logo, or a clean text badge when the stored link is broken. */
export function PartnerLogoMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
	const src = normalizeImageUrl(logoUrl);
	const [failed, setFailed] = useState(false);

	if (src && !failed) {
		return (
			<div className="flex h-12 w-40 shrink-0 items-center justify-center rounded-md border border-[#EAE7E3] bg-white px-3">
				<Image
					src={src}
					alt={name}
					width={128}
					height={32}
					unoptimized
					className="h-8 w-32 object-contain"
					onError={() => setFailed(true)}
				/>
			</div>
		);
	}

	return (
		<div className="flex h-12 w-40 shrink-0 items-center justify-center rounded-md border border-[#EAE7E3] bg-white px-3">
			<span className="max-w-full truncate text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#181A20]">
				{name}
			</span>
		</div>
	);
}
