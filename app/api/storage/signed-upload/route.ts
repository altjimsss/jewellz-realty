import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type BucketSpec = {
	public: boolean;
	fileSizeLimit: number;
	allowedMimeTypes: string[];
};

const UPLOAD_BUCKETS: Record<string, BucketSpec> = {
	"property-images": {
		public: true,
		fileSizeLimit: 10 * 1024 * 1024,
		allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
	},
	"property-videos": {
		public: true,
		fileSizeLimit: 300 * 1024 * 1024,
		allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg"],
	},
};

function sanitizeStoragePath(value: unknown) {
	if (typeof value !== "string") return null;
	const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
	if (!normalized || !/^[a-zA-Z0-9._/-]+$/.test(normalized)) return null;
	const segments = normalized.split("/");
	if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
	return normalized;
}

async function ensureBucket(bucket: string, spec: BucketSpec) {
	const { data: existing, error: getError } = await supabaseServer.storage.getBucket(bucket);

	if (getError || !existing) {
		const { error: createError } = await supabaseServer.storage.createBucket(bucket, {
			public: spec.public,
			fileSizeLimit: spec.fileSizeLimit,
			allowedMimeTypes: spec.allowedMimeTypes,
		});
		if (createError && !/already exists/i.test(createError.message)) {
			throw new Error(`Could not prepare the ${bucket} bucket: ${createError.message}`);
		}
		return;
	}

	const currentLimit = Number(existing.file_size_limit ?? 0);
	if (!currentLimit || currentLimit < spec.fileSizeLimit) {
		const { error: updateError } = await supabaseServer.storage.updateBucket(bucket, {
			public: spec.public,
			fileSizeLimit: spec.fileSizeLimit,
			allowedMimeTypes: spec.allowedMimeTypes,
		});
		if (updateError) {
			throw new Error(`Could not update the ${bucket} bucket: ${updateError.message}`);
		}
	}
}

export async function POST(request: Request) {
	try {
		const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
		if (!token) {
			return NextResponse.json({ error: "You must be signed in to upload files." }, { status: 401 });
		}

		const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
		const userId = userData?.user?.id ?? "";
		if (userError || !userId) {
			return NextResponse.json({ error: "Your session is invalid or has expired." }, { status: 401 });
		}

		const { data: profile } = await supabaseServer
			.from("profiles")
			.select("role, is_active")
			.eq("id", userId)
			.maybeSingle();

		if (!profile?.is_active || profile.role !== "admin") {
			return NextResponse.json({ error: "Admin access is required to upload files." }, { status: 403 });
		}

		const body = (await request.json()) as { bucket?: unknown; path?: unknown };
		const bucket = typeof body.bucket === "string" ? body.bucket : "";
		const spec = UPLOAD_BUCKETS[bucket];
		if (!spec) {
			return NextResponse.json({ error: "This upload destination is not allowed." }, { status: 400 });
		}

		const path = sanitizeStoragePath(body.path);
		if (!path) {
			return NextResponse.json({ error: "The upload path is invalid." }, { status: 400 });
		}

		await ensureBucket(bucket, spec);

		const { data: signed, error: signError } = await supabaseServer.storage
			.from(bucket)
			.createSignedUploadUrl(path, { upsert: true });

		if (signError || !signed) {
			return NextResponse.json(
				{ error: signError?.message ?? "Could not prepare the upload." },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			signedUrl: signed.signedUrl,
			token: signed.token,
			path: signed.path,
		});
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Could not prepare the upload.";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
