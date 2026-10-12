import { NextResponse } from "next/server";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const token = text(body?.token);
	const verification = await verifyRecaptchaToken(token, request);

	if (!verification.ok) {
		return NextResponse.json({ error: verification.error }, { status: 400 });
	}

	return NextResponse.json({ ok: true });
}
