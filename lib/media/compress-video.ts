const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

export const VIDEO_COMPRESS_THRESHOLD_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

function abortError() {
	const error = new Error("Video compression cancelled.");
	error.name = "AbortError";
	return error;
}

function buildCompressedFileName(originalName: string) {
	const baseName = originalName.replace(/\.[^.]+$/, "") || "video";
	return `${baseName}.mp4`;
}

export async function compressVideo(
	file: File,
	options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {},
): Promise<File> {
	if (file.size < VIDEO_COMPRESS_THRESHOLD_BYTES) return file;
	if (file.size > VIDEO_MAX_UPLOAD_BYTES) return file;
	if (options.signal?.aborted) throw abortError();

	const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
		import("@ffmpeg/ffmpeg"),
		import("@ffmpeg/util"),
	]);

	const ffmpeg = new FFmpeg();
	let aborted = false;

	const handleAbort = () => {
		aborted = true;
		ffmpeg.terminate();
	};
	options.signal?.addEventListener("abort", handleAbort, { once: true });

	try {
		await ffmpeg.load({
			coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
			wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
		});

		if (aborted) throw abortError();

		ffmpeg.on("progress", ({ progress }) => {
			if (!options.onProgress) return;
			if (!Number.isFinite(progress)) return;
			options.onProgress(Math.max(0, Math.min(99, Math.round(progress * 100))));
		});

		const inputName = "input-video";
		const outputName = "output-video.mp4";
		await ffmpeg.writeFile(inputName, await fetchFile(file));

		if (aborted) throw abortError();

		await ffmpeg.exec([
			"-i",
			inputName,
			"-vf",
			"scale=w='min(1280,iw)':h=-2",
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			"-crf",
			"28",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-movflags",
			"+faststart",
			outputName,
		]);

		if (aborted) throw abortError();

		const output = await ffmpeg.readFile(outputName);
		if (typeof output === "string") throw new Error("Video compression returned invalid data.");

		options.onProgress?.(100);
		return new File([new Blob([output as BlobPart], { type: "video/mp4" })], buildCompressedFileName(file.name), {
			type: "video/mp4",
			lastModified: Date.now(),
		});
	} finally {
		options.signal?.removeEventListener("abort", handleAbort);
		try {
			ffmpeg.terminate();
		} catch {
			// Already terminated.
		}
	}
}
