const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(?:$|[?#])/i;
const NON_IMAGE_EXTENSION = /\.(html?|php|pdf|docx?|xlsx?|pptx?|csv|zip)(?:$|[?#])/i;
const IMAGE_HOST =
	/(?:^|\.)(?:images\.unsplash\.com|supabase\.co|googleusercontent\.com|ggpht\.com|cloudinary\.com|imgur\.com|githubusercontent\.com|twimg\.com|pinimg\.com|fbcdn\.net|cloudfront\.net|amazonaws\.com|staticflickr\.com)$/i;

function googleDriveFileId(url: string) {
	const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
	if (fileMatch) return fileMatch[1];
	const openMatch = url.match(/drive\.google\.com\/open\?(?:[^#]*&)?id=([^&#]+)/i);
	if (openMatch) return openMatch[1];
	const ucMatch = url.match(/drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&#]+)/i);
	if (ucMatch) return ucMatch[1];
	return null;
}

/**
 * Accepts the kind of links people actually paste into the CMS (Google Drive
 * share links, Dropbox previews, extensionless CDN URLs) and returns a URL the
 * browser can render directly as an image. Returns null for empty values and
 * links that clearly point at a page or document instead of an image.
 */
export function normalizeImageUrl(value: unknown): string | null {
	if (typeof value !== "string") return null;
	let raw = value.trim();
	if (!raw) return null;

	if (raw.startsWith("data:image/") || raw.startsWith("blob:")) return raw;
	if (raw.startsWith("//")) raw = `https:${raw}`;

	if (raw.startsWith("/")) {
		return NON_IMAGE_EXTENSION.test(raw) ? null : raw;
	}

	const driveId = googleDriveFileId(raw);
	if (driveId) {
		return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveId)}`;
	}

	if (/dropbox\.com/i.test(raw)) {
		try {
			const url = new URL(raw);
			url.searchParams.set("raw", "1");
			url.searchParams.delete("dl");
			return url.toString();
		} catch {
			return null;
		}
	}

	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return null;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") return null;

	const pathname = url.pathname.toLowerCase();
	if (NON_IMAGE_EXTENSION.test(pathname)) return null;
	if (IMAGE_EXTENSION.test(pathname) || IMAGE_HOST.test(url.hostname)) return url.toString();

	// Extensionless CDN/image paths are common; allow them through so the image
	// element can try. Page-like URLs (no path, or a single slug) are rejected.
	const segments = url.pathname.split("/").filter(Boolean);
	if (segments.length >= 2) return url.toString();
	return null;
}

export function fallbackImageUrl(...candidates: unknown[]): string {
	for (const candidate of candidates) {
		const normalized = normalizeImageUrl(candidate);
		if (normalized) return normalized;
	}
	return "/assets/housebanner1.png";
}
