import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";
import { emailValidationMessage, phoneValidationMessage } from "@/lib/validation";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const email = text(body?.email);
	const limiter = checkRateLimit(`career:${clientKey(request)}:${email || "anonymous"}`, { limit: 4, windowMs: 10 * 60_000 });

	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many application submissions. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const payload = {
		job_id: text(body?.jobId) || null,
		position_title: text(body?.positionTitle),
		applicant_name: text(body?.name),
		applicant_email: email,
		applicant_phone: text(body?.phone) || null,
		referral: text(body?.referral) || null,
		subject: text(body?.subject) || null,
		resume_url: text(body?.cv) || null,
		message: text(body?.message) || null,
		status: "new",
	};

	if (!payload.position_title || !payload.applicant_name) {
		return NextResponse.json({ error: "Position and name are required." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const emailError = emailValidationMessage(payload.applicant_email);
	if (emailError) {
		return NextResponse.json({ error: emailError, field: "email" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const phoneError = phoneValidationMessage(payload.applicant_phone);
	if (phoneError) {
		return NextResponse.json({ error: phoneError, field: "phone" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	if (!payload.resume_url) {
		return NextResponse.json({ error: "Please upload your CV / resume as a PDF before applying.", field: "cv" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	if (
		!payload.resume_url.startsWith("https://") ||
		!/\.pdf(?:$|[?#])/i.test(payload.resume_url)
	) {
		return NextResponse.json({ error: "The uploaded CV must be a PDF file. Please upload it again.", field: "cv" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const { data, error } = await supabaseServer.from("career_applications").insert(payload).select("id").single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 422, headers: rateLimitHeaders(limiter) });
	}

	return NextResponse.json({ ok: true, applicationId: data?.id }, { headers: rateLimitHeaders(limiter) });
}
