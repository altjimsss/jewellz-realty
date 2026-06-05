import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function parseScheduledAt(dateText: string, timeText: string) {
	const date = new Date(`${dateText} ${timeText}`);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const limiter = checkRateLimit(`appointments:${clientKey(request)}:${text(body?.buyerEmail) || "anonymous"}`, { limit: 4, windowMs: 10 * 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many appointment requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const buyerName = text(body?.buyerName);
	const buyerEmail = text(body?.buyerEmail);
	const buyerPhone = text(body?.buyerPhone);
	const propertySlug = text(body?.propertySlug);
	const propertyTitle = text(body?.propertyTitle);
	const scheduledAt = parseScheduledAt(text(body?.date), text(body?.time));

	if (!buyerName || !buyerEmail || !scheduledAt) {
		return NextResponse.json({ error: "Name, email, date, and time are required." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	let propertyId: string | null = null;
	if (propertySlug) {
		const { data } = await supabaseServer.from("properties").select("id").eq("slug", propertySlug).maybeSingle();
		propertyId = data?.id ?? null;
	}

	const { data: inquiry, error: inquiryError } = await supabaseServer
		.from("inquiries")
		.insert({
			property_id: propertyId,
			buyer_name: buyerName,
			buyer_email: buyerEmail,
			buyer_phone: buyerPhone || null,
			buyer_message: `Appointment request for ${propertyTitle || propertySlug || "property"} on ${text(body?.date)} at ${text(body?.time)}.`,
			source: "appointment",
			status: "new",
			priority: "high",
		})
		.select("id")
		.single();

	if (inquiryError) {
		return NextResponse.json({ error: inquiryError.message }, { status: 422, headers: rateLimitHeaders(limiter) });
	}

	const { data: appointment, error: appointmentError } = await supabaseServer
		.from("appointments")
		.insert({
			inquiry_id: inquiry.id,
			property_id: propertyId,
			buyer_name: buyerName,
			buyer_email: buyerEmail,
			buyer_phone: buyerPhone || null,
			scheduled_at: scheduledAt,
			location: propertyTitle || propertySlug || null,
			notes: text(body?.notes) || null,
		})
		.select("id")
		.single();

	if (appointmentError) {
		return NextResponse.json({ error: appointmentError.message, inquiryId: inquiry.id }, { status: 422, headers: rateLimitHeaders(limiter) });
	}

	return NextResponse.json({ ok: true, inquiryId: inquiry.id, appointmentId: appointment.id }, { headers: rateLimitHeaders(limiter) });
}
