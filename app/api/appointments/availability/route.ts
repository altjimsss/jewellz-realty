import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";

const TIME_SLOTS = [
	"9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
	"12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
	"3:00 PM", "3:30 PM", "4:00 PM",
];
const SLOT_DURATION_MS = 30 * 60 * 1000;

function slotInstant(date: string, slot: string) {
	const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
	if (!match) return NaN;
	const rawHour = Number(match[1]);
	const hour = (rawHour % 12) + (match[3] === "PM" ? 12 : 0);
	return new Date(`${date}T${String(hour).padStart(2, "0")}:${match[2]}:00+08:00`).getTime();
}

export async function GET(request: Request) {
	const limiter = checkRateLimit(`appointment-availability:${clientKey(request)}`, { limit: 60, windowMs: 60_000 });
	if (!limiter.allowed) {
		return NextResponse.json({ error: "Too many availability checks. Please try again shortly." }, { status: 429, headers: rateLimitHeaders(limiter) });
	}

	const url = new URL(request.url);
	const propertySlug = (url.searchParams.get("propertySlug") || "").trim();
	const date = (url.searchParams.get("date") || "").trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return NextResponse.json({ error: "Choose a valid appointment date." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}
	const [year, month, day] = date.split("-").map(Number);
	const parsedDay = new Date(Date.UTC(year, month - 1, day));
	if (parsedDay.getUTCFullYear() !== year || parsedDay.getUTCMonth() !== month - 1 || parsedDay.getUTCDate() !== day) {
		return NextResponse.json({ error: "Choose a valid appointment date." }, { status: 400, headers: rateLimitHeaders(limiter) });
	}

	let propertyId: string | null = null;
	let assignedAgentId: string | null = null;
	if (propertySlug) {
		const result = await supabaseServer.from("properties").select("id,assigned_agent_id").eq("slug", propertySlug).maybeSingle();
		if (result.error?.message.includes("assigned_agent_id")) {
			const legacyResult = await supabaseServer.from("properties").select("id").eq("slug", propertySlug).maybeSingle();
			if (legacyResult.error) {
				return NextResponse.json({ error: "Availability could not be checked." }, { status: 503, headers: rateLimitHeaders(limiter) });
			}
			propertyId = legacyResult.data?.id ?? null;
		} else if (result.error) {
			return NextResponse.json({ error: "Availability could not be checked." }, { status: 503, headers: rateLimitHeaders(limiter) });
		} else {
			propertyId = result.data?.id ?? null;
			assignedAgentId = result.data?.assigned_agent_id ?? null;
		}
	}

	if (!propertyId || !assignedAgentId) {
		return NextResponse.json({ availableTimes: TIME_SLOTS }, { headers: rateLimitHeaders(limiter) });
	}

	const [assignedAgentResult, inheritedPropertyResult, assignedInquiriesResult] = await Promise.all([
		supabaseServer
			.from("appointments")
			.select("id,property_id,assigned_agent_id,scheduled_at")
			.eq("assigned_agent_id", assignedAgentId)
			.in("status", ["requested", "confirmed"]),
		supabaseServer
			.from("properties")
			.select("id")
			.eq("assigned_agent_id", assignedAgentId),
		supabaseServer.from("inquiries").select("id").eq("assigned_agent_id", assignedAgentId),
	]);

	if (assignedAgentResult.error || inheritedPropertyResult.error || assignedInquiriesResult.error) {
		const missingTable = [assignedAgentResult.error, inheritedPropertyResult.error, assignedInquiriesResult.error]
			.some((error) => error?.code === "42P01" || error?.code === "PGRST205");
		if (!missingTable) {
			console.error("[appointment availability lookup]", assignedAgentResult.error || inheritedPropertyResult.error);
			return NextResponse.json({ error: "Availability could not be checked." }, { status: 503, headers: rateLimitHeaders(limiter) });
		}
		return NextResponse.json({ availableTimes: TIME_SLOTS }, { headers: rateLimitHeaders(limiter) });
	}

	const inheritedPropertyIds = (inheritedPropertyResult.data ?? []).map((property) => property.id);
	let inheritedAppointments: Array<{ id: string; property_id: string | null; assigned_agent_id: string | null; scheduled_at: string }> = [];
	if (inheritedPropertyIds.length > 0) {
		const result = await supabaseServer
			.from("appointments")
			.select("id,property_id,assigned_agent_id,scheduled_at")
			.in("property_id", inheritedPropertyIds)
			.is("assigned_agent_id", null)
			.in("status", ["requested", "confirmed"]);
		if (result.error) {
			console.error("[appointment inherited schedule lookup]", result.error);
			return NextResponse.json({ error: "Availability could not be checked." }, { status: 503, headers: rateLimitHeaders(limiter) });
		}
		inheritedAppointments = result.data ?? [];
	}
	let inquiryAppointments: Array<{ id: string; property_id: string | null; assigned_agent_id: string | null; scheduled_at: string }> = [];
	const assignedInquiryIds = (assignedInquiriesResult.data ?? []).map((inquiry) => inquiry.id);
	if (assignedInquiryIds.length > 0) {
		const result = await supabaseServer
			.from("appointments")
			.select("id,property_id,assigned_agent_id,scheduled_at")
			.in("inquiry_id", assignedInquiryIds)
			.in("status", ["requested", "confirmed"]);
		if (result.error) {
			console.error("[appointment inquiry assignment schedule lookup]", result.error);
			return NextResponse.json({ error: "Availability could not be checked." }, { status: 503, headers: rateLimitHeaders(limiter) });
		}
		inquiryAppointments = result.data ?? [];
	}

	const schedule = [...(assignedAgentResult.data ?? []), ...inheritedAppointments, ...inquiryAppointments];
	const availableTimes = TIME_SLOTS.filter((slot) => {
		const requestedStart = slotInstant(date, slot);
		return !schedule.some((appointment) => {
			const existingStart = new Date(appointment.scheduled_at).getTime();
			return existingStart < requestedStart + SLOT_DURATION_MS && requestedStart < existingStart + SLOT_DURATION_MS;
		});
	});

	return NextResponse.json({ availableTimes }, { headers: rateLimitHeaders(limiter) });
}
