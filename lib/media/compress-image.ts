const MAX_IMAGE_DIMENSION = 1600;
const MIN_SIZE_TO_COMPRESS = 350 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
	if (!file.type.startsWith("image/") || ["image/svg+xml", "image/gif"].includes(file.type.toLowerCase())) return file;
	if (typeof createImageBitmap === "undefined") return file;

	try {
		const bitmap = await createImageBitmap(file);
		try {
			const longestSide = Math.max(bitmap.width, bitmap.height);
			if (file.size <= MIN_SIZE_TO_COMPRESS && longestSide <= MAX_IMAGE_DIMENSION) return file;

			const scale = Math.min(1, MAX_IMAGE_DIMENSION / longestSide);
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(bitmap.width * scale));
			canvas.height = Math.max(1, Math.round(bitmap.height * scale));
			const context = canvas.getContext("2d");
			if (!context) return file;
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

			const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
			if (!compressed || compressed.size >= file.size) return file;

			const baseName = file.name.replace(/\.[^.]+$/, "") || "property-image";
			return new File([compressed], `${baseName}.webp`, { type: "image/webp", lastModified: file.lastModified });
		} finally {
			bitmap.close();
		}
	} catch {
		// Keep uploads working in browsers without a usable image decoder or canvas encoder.
		return file;
	}
}
