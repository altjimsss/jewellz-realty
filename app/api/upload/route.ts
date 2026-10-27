import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
	try {
		// Require an authenticated admin or developer partner. The service-role server
		// client has no cookie session, so auth must arrive as a bearer token.
		const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
		if (!token) {
			return NextResponse.json({ error: "You must be signed in to upload images." }, { status: 401 });
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

		const role = profile?.role;
		if (!profile?.is_active || (role !== "admin" && role !== "developer_partner")) {
			return NextResponse.json({ error: "Admin or developer partner access is required." }, { status: 403 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const folder = (formData.get("folder") as string) || "developer-logos";

		if (!file) {
			return NextResponse.json({ error: "No file provided." }, { status: 400 });
		}

		// Ensure allowed image or video formats
		const mimeType = file.type || "application/octet-stream";
		const isImage = mimeType.startsWith("image/");
		const isVideo = mimeType.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg|avi)$/i.test(file.name);
		if (!isImage && !isVideo) {
			return NextResponse.json({ error: "File must be an image (PNG, SVG, JPG, WebP) or video (MP4, WebM, MOV)." }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
		const filePath = `${folder}/${Date.now()}-${cleanName}`;

		const { error: uploadError } = await supabaseServer.storage
			.from("property-images")
			.upload(filePath, buffer, {
				contentType: mimeType,
				upsert: true,
			});

		if (uploadError) {
			return NextResponse.json({ error: uploadError.message }, { status: 500 });
		}

		const { data: publicUrlData } = supabaseServer.storage
			.from("property-images")
			.getPublicUrl(filePath);

		return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Failed to upload image.";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
