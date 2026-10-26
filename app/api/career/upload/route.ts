import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
	const limiter = checkRateLimit(`career-upload:${clientKey(request)}`, { limit: 6, windowMs: 10 * 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many upload attempts. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return NextResponse.json({ error: "Please choose a PDF file to upload." }, { status: 400, headers: rateLimitHeaders(limiter) });
		}

		const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
		if (!isPdf) {
			return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400, headers: rateLimitHeaders(limiter) });
		}

		if (file.size <= 0) {
			return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400, headers: rateLimitHeaders(limiter) });
		}

		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json({ error: "The PDF must be 5 MB or smaller." }, { status: 400, headers: rateLimitHeaders(limiter) });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_") || "resume.pdf";
		const filePath = `career-resumes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

		const { error: uploadError } = await supabaseServer.storage
			.from("property-images")
			.upload(filePath, buffer, {
				contentType: "application/pdf",
				upsert: false,
			});

		if (uploadError) {
			console.error("[career upload error]", uploadError);
			return NextResponse.json({ error: "We couldn't store your CV. Please try again." }, { status: 500, headers: rateLimitHeaders(limiter) });
		}

		const { data: publicUrlData } = supabaseServer.storage
			.from("property-images")
			.getPublicUrl(filePath);

		if (!publicUrlData?.publicUrl) {
			return NextResponse.json({ error: "The CV was uploaded but no download link was created. Please try again." }, { status: 500, headers: rateLimitHeaders(limiter) });
		}

		return NextResponse.json({ ok: true, url: publicUrlData.publicUrl }, { headers: rateLimitHeaders(limiter) });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to upload the PDF.";
		return NextResponse.json({ error: message }, { status: 500, headers: rateLimitHeaders(limiter) });
	}
}
