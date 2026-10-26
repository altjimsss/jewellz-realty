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
			<Image
				src={src}
				alt={name}
				width={140}
				height={36}
				unoptimized
				className="h-9 max-w-[140px] object-contain"
				onError={() => setFailed(true)}
			/>
		);
	}

	return (
		<span className="rounded border border-black/10 bg-white px-4 py-2 text-base font-semibold text-[#181A20]">
			{name}
		</span>
	);
}
