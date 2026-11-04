const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

export function isHeicImage(file: File) {
	return HEIC_MIME_TYPES.has(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name);
}

export async function convertHeicToJpeg(file: File): Promise<File> {
	if (!isHeicImage(file)) return file;

	try {
		const { default: convert } = await import("heic2any");
		const converted = await convert({ blob: file, toType: "image/jpeg", quality: 0.92 });
		const jpeg = Array.isArray(converted) ? converted[0] : converted;
		if (!jpeg) throw new Error("The HEIC image did not contain a convertible frame.");

		const name = file.name.replace(/\.hei[cf]$/i, "") || "property-photo";
		return new File([jpeg], `${name}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
	} catch {
		throw new Error("Could not convert this HEIC photo. Try saving it as a JPEG and upload it again.");
	}
}
