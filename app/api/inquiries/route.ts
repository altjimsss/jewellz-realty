import { NextResponse } from "next/server";
import { computeLeadScore, priorityFromLeadScore } from "@/lib/lead-scoring";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const buyerName = text(body?.buyerName);
	const buyerEmail = text(body?.buyerEmail);
	const buyerPhone = text(body?.buyerPhone);
	const buyerMessage = text(body?.message || body?.buyerMessage || body?.subject);
	const propertyId = text(body?.propertyId);
	const source = text(body?.source) || "website";
	const requestedPriority = text(body?.priority);

	if (!buyerName || !buyerEmail) {
		return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
	}

	const analyticsCount = propertyId
		? await supabaseServer
				.from("analytics_events")
				.select("id", { count: "exact", head: true })
				.eq("property_id", propertyId)
				.in("event_type", ["property_view", "view", "page_view"])
		: { count: 0 };
	const leadScore = computeLeadScore({
		propertyViewCount: analyticsCount.count ?? 0,
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
		source,
		status: "new",
		priority: requestedPriority || priorityFromLeadScore(leadScore),
		lead_score: leadScore,
	};

	const { data, error } = await supabaseServer.from("inquiries").insert(payload).select("id").single();

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true, inquiryId: data?.id });
}
