"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";
import { normalizeImageUrl } from "@/lib/image-url";

type SafeImageProps = Omit<ImageProps, "src" | "onError"> & {
	src?: unknown;
	fallbackSrc?: unknown;
	/** Rendered instead of an image when both src and fallbackSrc are unusable. */
	fallbackContent?: ReactNode;
	onImageError?: () => void;
};

/**
 * next/image with two safety nets used across the public site and CMS:
 *  - pasted links are normalized (Drive/Dropbox/page links handled)
 *  - a failed image swaps to a local fallback instead of a broken icon
 */
export function SafeImage({
	src,
	fallbackSrc,
	fallbackContent = null,
	onImageError,
	alt,
	unoptimized = true,
	...props
}: SafeImageProps) {
	const normalized = normalizeImageUrl(src);
	const normalizedFallback = normalizeImageUrl(fallbackSrc);
	const [failedSource, setFailedSource] = useState<string | null>(null);

	const failed = normalized != null && failedSource === normalized;
	const displaySrc = failed ? normalizedFallback : normalized;

	if (!displaySrc) {
		return <>{fallbackContent}</>;
	}

	return (
		<Image
			{...props}
			src={displaySrc}
			alt={alt}
			unoptimized={unoptimized}
			onError={() => {
				if (normalized) setFailedSource(normalized);
				onImageError?.();
			}}
		/>
	);
}
