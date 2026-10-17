import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const folder = (formData.get("folder") as string) || "developer-logos";

		if (!file) {
			return NextResponse.json({ error: "No file provided." }, { status: 400 });
		}

		// Ensure allowed image formats
		const mimeType = file.type || "image/png";
		if (!mimeType.startsWith("image/")) {
			return NextResponse.json({ error: "File must be an image (PNG, SVG, JPG, WebP)." }, { status: 400 });
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
