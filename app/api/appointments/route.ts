import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { supabaseServer } from "@/lib/supabase/server";
import { emailValidationMessage, phoneValidationMessage } from "@/lib/validation";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

const MONTH_INDEX: Record<string, number> = {
	jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
	jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseScheduledAt(dateText: string, timeText: string) {
	const dateMatch = dateText.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
	const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (!dateMatch || !timeMatch) return null;

	const month = MONTH_INDEX[dateMatch[1].slice(0, 3).toLowerCase()];
	const day = Number(dateMatch[2]);
	const year = Number(dateMatch[3]);
	const rawHour = Number(timeMatch[1]);
	const minutes = Number(timeMatch[2]);
	const meridiem = timeMatch[3].toUpperCase();

	if (month === undefined || rawHour < 1 || rawHour > 12 || minutes > 59) return null;

	const hour = (rawHour % 12) + (meridiem === "PM" ? 12 : 0);
	const parseLocal = new Date(year, month, day, hour, minutes, 0, 0);
	if (
		Number.isNaN(parseLocal.getTime()) ||
		parseLocal.getFullYear() !== year ||
		parseLocal.getMonth() !== month ||
		parseLocal.getDate() !== day ||
		parseLocal.getHours() !== hour
	) {
		return null;
	}

	return parseLocal.toISOString();
}

async function insertInquiry(payload: {
	propertyId: string | null;
	buyerName: string;
	buyerEmail: string;
	buyerPhone: string;
	message: string;
}) {
	const base = {
		property_id: payload.propertyId,
		buyer_name: payload.buyerName,
		buyer_email: payload.buyerEmail,
		buyer_phone: payload.buyerPhone || null,
		status: "new",
		priority: "high",
	};

	// Older deployments have `message` and no `source` column; newer ones use
	// `buyer_message` + `source`. Try each shape so a booking is not lost to a
	// schema mismatch.
	const variants: Array<Record<string, unknown>> = [
		{ ...base, buyer_message: payload.message, source: "direct" },
		{ ...base, buyer_message: payload.message },
		{ ...base, message: payload.message, source: "direct" },
		{ ...base, message: payload.message },
	];

	let lastError: { message?: string } | null = null;
	for (const variant of variants) {
		const result = await supabaseServer.from("inquiries").insert(variant).select("id").single();
		if (!result.error && result.data) return { inquiry: result.data, error: null };
		lastError = result.error;
	}

	return { inquiry: null, error: lastError };
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const limiter = checkRateLimit(`appointments:${clientKey(request)}:${text(body?.buyerEmail) || "anonymous"}`, { limit: 4, windowMs: 10 * 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many appointment requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const captcha = await verifyRecaptchaToken(text(body?.captchaToken), request);
	if (!captcha.ok) {
		return NextResponse.json({ error: captcha.error }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const buyerName = text(body?.buyerName);
	const buyerEmail = text(body?.buyerEmail);
	const buyerPhone = text(body?.buyerPhone);
	const propertySlug = text(body?.propertySlug);
	const propertyTitle = text(body?.propertyTitle);
	const scheduledAt = parseScheduledAt(text(body?.date), text(body?.time));

	if (!buyerName) {
		return NextResponse.json({ error: "Please enter your full name." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const emailError = emailValidationMessage(buyerEmail);
	if (emailError) {
		return NextResponse.json({ error: emailError, field: "buyerEmail" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const phoneError = phoneValidationMessage(buyerPhone);
	if (phoneError) {
		return NextResponse.json({ error: phoneError, field: "buyerPhone" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	if (!scheduledAt) {
		return NextResponse.json(
			{ error: "That date or time could not be read. Please pick a new slot and try again." },
			{ status: 400, headers: rateLimitHeaders(limiter) },
		);
	}

	// Prevent duplicate slots before creating an inquiry, so a rejected booking
	// never leaves an orphaned lead behind.
	const { data: conflicts, error: conflictError } = await supabaseServer
		.from("appointments")
		.select("id, buyer_email, scheduled_at, status")
		.eq("scheduled_at", scheduledAt)
		.in("status", ["requested", "confirmed"])
		.limit(1);

	if (conflictError) {
		// A missing appointments table is handled by the insert below with a
		// clearer message; do not block a booking because of a lookup error.
		if (conflictError.code !== "42P01" && conflictError.code !== "PGRST205") {
			console.error("[appointments conflict check]", conflictError);
		}
	} else if (conflicts && conflicts.length > 0) {
		return NextResponse.json(
			{ error: "That date and time is already booked. Please choose another time slot or another day.", code: "slot_taken" },
			{ status: 409, headers: rateLimitHeaders(limiter) },
		);
	}

	let propertyId: string | null = null;
	if (propertySlug) {
		const { data } = await supabaseServer.from("properties").select("id").eq("slug", propertySlug).maybeSingle();
		propertyId = data?.id ?? null;
	}

	const { inquiry, error: inquiryError } = await insertInquiry({
		propertyId,
		buyerName,
		buyerEmail,
		buyerPhone,
		message: `Appointment request for ${propertyTitle || propertySlug || "property"} on ${text(body?.date)} at ${text(body?.time)}.`,
	});

	if (inquiryError || !inquiry) {
		console.error("[appointments POST inquiry error]", inquiryError);
		return NextResponse.json(
			{ error: "We couldn't save your appointment request. Please try again, or contact us at inquiries@jewellzrealty.com." },
			{ status: 422, headers: rateLimitHeaders(limiter) },
		);
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
		console.error("[appointments POST appointment error]", appointmentError);
		return NextResponse.json(
			{
				error: appointmentError.code === "42P01" || appointmentError.code === "PGRST205"
					? "Appointment booking is not set up in the database yet. Please run supabase/cms-audit-additions.sql, then try again."
					: "Your request was received but we couldn't finalize the appointment. Please try again, or contact us at inquiries@jewellzrealty.com.",
				inquiryId: inquiry.id,
			},
			{ status: 422, headers: rateLimitHeaders(limiter) },
		);
	}

	return NextResponse.json({ ok: true, inquiryId: inquiry.id, appointmentId: appointment.id }, { headers: rateLimitHeaders(limiter) });
}
