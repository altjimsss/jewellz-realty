import { supabaseBrowser } from "./client";

export type UploadProgressEvent = {
	loaded: number;
	total: number;
	percent: number;
};

export type UploadWithProgressOptions = {
	bucket: string;
	path: string;
	file: Blob;
	contentType?: string;
	upsert?: boolean;
	signal?: AbortSignal;
	onProgress?: (event: UploadProgressEvent) => void;
};

export class UploadCancelledError extends Error {
	constructor() {
		super("Upload cancelled.");
		this.name = "UploadCancelledError";
	}
}

function uploadCancelledError() {
	return new UploadCancelledError();
}

export async function uploadFileWithProgress({
	bucket,
	path,
	file,
	contentType,
	upsert = true,
	signal,
	onProgress,
}: UploadWithProgressOptions): Promise<{ publicUrl: string; path: string }> {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
	const supabaseAnonKey =
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
		"";

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error("Supabase environment variables are missing.");
	}

	if (signal?.aborted) throw uploadCancelledError();

	const session = (await supabaseBrowser.auth.getSession()).data.session;
	if (signal?.aborted) throw uploadCancelledError();

	const encodedPath = path
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		let settled = false;

		function finish(action: () => void) {
			if (settled) return;
			settled = true;
			signal?.removeEventListener("abort", handleAbort);
			action();
		}

		function handleAbort() {
			xhr.abort();
		}

		xhr.open("POST", `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`);
		xhr.setRequestHeader("apikey", supabaseAnonKey);
		xhr.setRequestHeader("Authorization", `Bearer ${session?.access_token ?? supabaseAnonKey}`);
		if (upsert) xhr.setRequestHeader("x-upsert", "true");
		xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");

		xhr.upload.addEventListener("progress", (event) => {
			if (!event.lengthComputable || !onProgress) return;
			onProgress({
				loaded: event.loaded,
				total: event.total,
				percent: event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0,
			});
		});

		xhr.addEventListener("load", () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				const { data } = supabaseBrowser.storage.from(bucket).getPublicUrl(path);
				finish(() => resolve({ publicUrl: data.publicUrl, path }));
				return;
			}

			let message = xhr.responseText || `Upload failed (${xhr.status}).`;
			try {
				const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
				message = parsed.message || parsed.error || message;
			} catch {
				// Keep the raw response text.
			}
			finish(() => reject(new Error(message)));
		});

		xhr.addEventListener("error", () => finish(() => reject(new Error("Network error during upload."))));
		xhr.addEventListener("timeout", () => finish(() => reject(new Error("Upload timed out."))));
		xhr.addEventListener("abort", () => finish(() => reject(uploadCancelledError())));

		signal?.addEventListener("abort", handleAbort, { once: true });
		xhr.send(file);
	});
}
