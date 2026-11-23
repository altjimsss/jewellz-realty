import { NextResponse } from "next/server";
import { computeLeadScore, priorityFromLeadScore } from "@/lib/lead-scoring";
import { getLeadBehaviorSignals } from "@/lib/lead-scoring-behavior";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { supabaseServer } from "@/lib/supabase/server";
import { emailValidationMessage, phoneValidationMessage } from "@/lib/validation";
import { sendActiveAdminNotification } from "@/lib/email-notifications";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function databaseSource(value: string) {
	const normalized = value.toLowerCase();
	if (normalized.includes("facebook")) return "social_media_facebook";
	if (normalized.includes("instagram")) return "social_media_instagram";
	if (normalized.includes("email")) return "email_campaign";
	if (normalized.includes("phone")) return "phone";
	if (normalized.includes("walk")) return "walk_in";
	if (normalized.includes("referral")) return "referral";
	if (normalized.includes("organic") || normalized.includes("search")) return "organic_search";
	if (normalized.includes("direct")) return "direct";
	return "other";
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const sessionId = text(body?.sessionId);
	const limiter = checkRateLimit(`inquiries:${clientKey(request)}:${sessionId || "anonymous"}`, { limit: 6, windowMs: 10 * 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many inquiry submissions. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const captcha = await verifyRecaptchaToken(text(body?.captchaToken), request);
	if (!captcha.ok) {
		return NextResponse.json({ error: captcha.error }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const buyerName = text(body?.buyerName);
	const buyerEmail = text(body?.buyerEmail);
	const buyerPhone = text(body?.buyerPhone);
	const buyerMessage = text(body?.message || body?.buyerMessage || body?.subject);
	const propertyId = text(body?.propertyId);
	const source = text(body?.source) || "website";
	const requestedPriority = text(body?.priority);

	if (!buyerName) {
		return NextResponse.json({ error: "Name is required." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const emailError = emailValidationMessage(buyerEmail);
	if (emailError) {
		return NextResponse.json({ error: emailError, field: "buyerEmail" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const phoneError = phoneValidationMessage(buyerPhone, false);
	if (phoneError) {
		return NextResponse.json({ error: phoneError, field: "buyerPhone" }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	const behaviorSignals = await getLeadBehaviorSignals(propertyId, sessionId);
	const leadScore = computeLeadScore({
		...behaviorSignals,
		hasPhone: Boolean(buyerPhone),
		hasMessage: Boolean(buyerMessage),
		hasSubject: Boolean(text(body?.subject)),
		source,
		priority: requestedPriority,
	});
	const payload = {
		property_id: propertyId || null,
		buyer_name: buyerName,
		buyer_email: buyerEmail,
		buyer_phone: buyerPhone || null,
		buyer_message: buyerMessage || null,
		session_id: sessionId || null,
		source: databaseSource(source),
		status: "new",
		priority: requestedPriority || priorityFromLeadScore(leadScore),
		lead_score: leadScore,
	};

	let insertResult = await supabaseServer.from("inquiries").insert(payload).select("id").single();

	if (insertResult.error && /buyer_message|column .*message/i.test(insertResult.error.message)) {
		console.error("[inquiries POST error]", insertResult.error);
		// Support databases that use `message` instead of `buyer_message`, while
		// preserving the score so fallback inserts are never silently unscored.
		const fallbackPayload: Record<string, unknown> = {
			property_id: propertyId || null,
			buyer_name: buyerName,
			buyer_email: buyerEmail,
			buyer_phone: buyerPhone || null,
			session_id: sessionId || null,
			source: databaseSource(source),
			status: "new",
			priority: requestedPriority || priorityFromLeadScore(leadScore),
			lead_score: leadScore,
		};
		if (insertResult.error.message.includes("buyer_message")) {
			fallbackPayload.message = buyerMessage || null;
		} else {
			fallbackPayload.buyer_message = buyerMessage || null;
		}
		const secondTry = await supabaseServer.from("inquiries").insert(fallbackPayload).select("id").single();
		insertResult = secondTry;
	}

	if (insertResult.error) {
		return NextResponse.json({ error: insertResult.error.message }, { status: 422, headers: rateLimitHeaders(limiter) });
	}
	const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
	void sendActiveAdminNotification({
		subject: "New Customer Inquiry – J'WELLZ REALTY",
		heading: "A new customer inquiry was received",
		details: [["Customer", buyerName], ["Email", buyerEmail], ["Contact number", buyerPhone], ["Message", buyerMessage], ["Inquiry ID", insertResult.data?.id]],
		action: { label: "Open admin portal", url: `${siteOrigin}/admin/inquiries` },
	}).catch((notificationError) => console.error("[inquiry notification]", notificationError));

	return NextResponse.json({ ok: true, inquiryId: insertResult.data?.id }, { headers: rateLimitHeaders(limiter) });
}
