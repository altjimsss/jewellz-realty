import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { supabaseServer } from "@/lib/supabase/server";
import { emailValidationMessage, phoneValidationMessage } from "@/lib/validation";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function missingColumn(error: { code?: string; message?: string } | null | undefined, column: string) {
	return Boolean(error && (error.code === "42703" || error.code === "PGRST204" || error.message?.includes(column)));
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

	if (month === undefined || rawHour < 1 || rawHour > 12 || ![0, 30].includes(minutes)) return null;

	const hour = (rawHour % 12) + (meridiem === "PM" ? 12 : 0);
	if (hour < 9 || hour > 16 || (hour === 16 && minutes !== 0)) return null;

	const targetDay = new Date(Date.UTC(year, month, day));
	if (
		targetDay.getUTCFullYear() !== year ||
		targetDay.getUTCMonth() !== month ||
		targetDay.getUTCDate() !== day
	) {
		return null;
	}

	// Booking slots use the property's timezone (Philippine Time), regardless of
	// the server's timezone, so the saved UTC instant is deterministic.
	const targetDayNumber = Date.UTC(year, month, day);
	const manilaNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
	const manilaTodayNumber = Date.UTC(manilaNow.getUTCFullYear(), manilaNow.getUTCMonth(), manilaNow.getUTCDate());
	if (targetDayNumber < manilaTodayNumber + 3 * 24 * 60 * 60 * 1000) return null;

	const hourText = String(hour).padStart(2, "0");
	const minuteText = String(minutes).padStart(2, "0");
	return new Date(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hourText}:${minuteText}:00+08:00`).toISOString();
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
	const buyerEmail = text(body?.buyerEmail).toLowerCase();
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
			{ error: "Choose a valid date at least 3 days ahead and an available time between 9:00 AM and 4:00 PM." },
			{ status: 400, headers: rateLimitHeaders(limiter) },
		);
	}

	let propertyId: string | null = null;
	let assignedAgentId: string | null = null;
	if (propertySlug) {
		const propertyResult = await supabaseServer.from("properties").select("id,assigned_agent_id").eq("slug", propertySlug).maybeSingle();
		if (propertyResult.error?.message.includes("assigned_agent_id")) {
			const fallbackPropertyResult = await supabaseServer.from("properties").select("id").eq("slug", propertySlug).maybeSingle();
			if (fallbackPropertyResult.error) {
				console.error("[appointments property lookup]", fallbackPropertyResult.error);
				return NextResponse.json({ error: "We couldn't verify this property's schedule. Please try again shortly." }, { status: 503, headers: rateLimitHeaders(limiter) });
			}
			propertyId = fallbackPropertyResult.data?.id ?? null;
		} else if (propertyResult.error) {
			console.error("[appointments property lookup]", propertyResult.error);
			return NextResponse.json({ error: "We couldn't verify this property's schedule. Please try again shortly." }, { status: 503, headers: rateLimitHeaders(limiter) });
		} else {
			propertyId = propertyResult.data?.id ?? null;
			assignedAgentId = propertyResult.data?.assigned_agent_id ?? null;
		}
	}
	const appointmentMessage = `Appointment request for ${propertyTitle || propertySlug || "property"} on ${text(body?.date)} at ${text(body?.time)}.`;
	const escapedEmail = buyerEmail.replace(/[\\%_]/g, "\\$&");

	// Reusing the same name, email, and property means the customer is changing
	// their existing active booking. Update it in place when the slot changes.
	let existingAppointmentsQuery = supabaseServer
		.from("appointments")
		.select("id,inquiry_id,buyer_name,buyer_email,scheduled_at,assigned_agent_id")
		.in("status", ["requested", "confirmed"])
		.ilike("buyer_email", escapedEmail);
	existingAppointmentsQuery = propertyId
		? existingAppointmentsQuery.eq("property_id", propertyId)
		: existingAppointmentsQuery.is("property_id", null);
	type ExistingAppointment = {
		id: string;
		inquiry_id: string | null;
		buyer_name: string;
		buyer_email: string;
		scheduled_at: string;
		assigned_agent_id?: string | null;
	};
	let existingAppointments: ExistingAppointment[] = [];
	let existingAppointmentsError: { code?: string; message?: string } | null = null;
	const existingAppointmentsResult = await existingAppointmentsQuery;
	if (missingColumn(existingAppointmentsResult.error, "assigned_agent_id")) {
		let legacyAppointmentsQuery = supabaseServer
			.from("appointments")
			.select("id,inquiry_id,buyer_name,buyer_email,scheduled_at")
			.in("status", ["requested", "confirmed"])
			.ilike("buyer_email", escapedEmail);
		legacyAppointmentsQuery = propertyId
			? legacyAppointmentsQuery.eq("property_id", propertyId)
			: legacyAppointmentsQuery.is("property_id", null);
		const legacyResult = await legacyAppointmentsQuery;
		existingAppointmentsError = legacyResult.error;
		existingAppointments = legacyResult.data ?? [];
	} else {
		existingAppointmentsError = existingAppointmentsResult.error;
		existingAppointments = existingAppointmentsResult.data ?? [];
	}
	if (existingAppointmentsError && existingAppointmentsError.code !== "42P01" && existingAppointmentsError.code !== "PGRST205") {
		console.error("[appointments existing booking lookup]", existingAppointmentsError);
		return NextResponse.json(
			{ error: "We couldn't verify your existing appointment. Please try again shortly." },
			{ status: 503, headers: rateLimitHeaders(limiter) },
		);
	}

	const sameCustomerBookings = (existingAppointments ?? []).filter((appointment) =>
		text(appointment.buyer_name).toLowerCase() === buyerName.toLowerCase(),
	);
	const existingBooking = sameCustomerBookings[0];
	let inquiryAssignedAgentId: string | null = null;
	if (existingBooking?.inquiry_id) {
		const inquiryAssignment = await supabaseServer
			.from("inquiries")
			.select("assigned_agent_id")
			.eq("id", existingBooking.inquiry_id)
			.maybeSingle();
		if (inquiryAssignment.error) {
			console.error("[appointments inquiry assignment lookup]", inquiryAssignment.error);
			return NextResponse.json(
				{ error: "We couldn't verify the assigned agent. Please try again shortly." },
				{ status: 503, headers: rateLimitHeaders(limiter) },
			);
		}
		inquiryAssignedAgentId = inquiryAssignment.data?.assigned_agent_id ?? null;
	}

	// A 30-minute booking cannot overlap another active appointment for the same
	// customer, even when it is for a different property.
	const { data: customerSchedule, error: customerScheduleError } = await supabaseServer
		.from("appointments")
		.select("id,scheduled_at")
		.in("status", ["requested", "confirmed"])
		.ilike("buyer_email", escapedEmail);
	if (customerScheduleError && customerScheduleError.code !== "42P01" && customerScheduleError.code !== "PGRST205") {
		console.error("[appointments customer schedule lookup]", customerScheduleError);
		return NextResponse.json(
			{ error: "We couldn't verify your appointment schedule. Please try again shortly." },
			{ status: 503, headers: rateLimitHeaders(limiter) },
		);
	}
	const bookingDurationMs = 30 * 60 * 1000;
	const customerOverlap = (customerSchedule ?? []).some((appointment) => {
		if (existingBooking && appointment.id === existingBooking.id) return false;
		const existingStart = new Date(appointment.scheduled_at).getTime();
		const requestedStart = new Date(scheduledAt).getTime();
		return existingStart < requestedStart + bookingDurationMs && requestedStart < existingStart + bookingDurationMs;
	});
	if (customerOverlap) {
		return NextResponse.json(
			{ error: "You already have another appointment that overlaps this time. Please choose a time at least 30 minutes apart.", code: "customer_schedule_conflict" },
			{ status: 409, headers: rateLimitHeaders(limiter) },
		);
	}
	if (assignedAgentId) {
		const [agentScheduleResult, inheritedPropertiesResult, assignedInquiriesResult] = await Promise.all([
			supabaseServer
				.from("appointments")
				.select("id,property_id,assigned_agent_id,scheduled_at")
				.eq("assigned_agent_id", assignedAgentId)
				.in("status", ["requested", "confirmed"]),
			supabaseServer.from("properties").select("id").eq("assigned_agent_id", assignedAgentId),
			supabaseServer.from("inquiries").select("id").eq("assigned_agent_id", assignedAgentId),
		]);
		const missingAppointmentsTable = agentScheduleResult.error?.code === "42P01" || agentScheduleResult.error?.code === "PGRST205";
		const missingAppointmentAgentColumn = missingColumn(agentScheduleResult.error, "assigned_agent_id");
		if (inheritedPropertiesResult.error || assignedInquiriesResult.error || (agentScheduleResult.error && !missingAppointmentsTable && !missingAppointmentAgentColumn)) {
			console.error("[appointments agent schedule lookup]", agentScheduleResult.error || inheritedPropertiesResult.error || assignedInquiriesResult.error);
			return NextResponse.json(
				{ error: "We couldn't verify the assigned agent's schedule. Please try again shortly." },
				{ status: 503, headers: rateLimitHeaders(limiter) },
			);
		}
		const inheritedPropertyIds = (inheritedPropertiesResult.data ?? []).map((property) => property.id);
		let inheritedAppointments: Array<{ id: string; scheduled_at: string }> = [];
		if (!missingAppointmentsTable && inheritedPropertyIds.length > 0) {
			let inheritedQuery = supabaseServer
				.from("appointments")
				.select("id,scheduled_at")
				.in("property_id", inheritedPropertyIds)
				.in("status", ["requested", "confirmed"]);
			if (!missingAppointmentAgentColumn) inheritedQuery = inheritedQuery.is("assigned_agent_id", null);
			const inheritedResult = await inheritedQuery;
			if (inheritedResult.error) {
				console.error("[appointments inherited agent schedule lookup]", inheritedResult.error);
				return NextResponse.json(
					{ error: "We couldn't verify the assigned agent's schedule. Please try again shortly." },
					{ status: 503, headers: rateLimitHeaders(limiter) },
				);
			}
			inheritedAppointments = inheritedResult.data ?? [];
		}
		let inquiryAppointments: Array<{ id: string; scheduled_at: string }> = [];
		const assignedInquiryIds = (assignedInquiriesResult.data ?? []).map((inquiry) => inquiry.id);
		if (!missingAppointmentsTable && assignedInquiryIds.length > 0) {
			const inquiryAppointmentResult = await supabaseServer
				.from("appointments")
				.select("id,scheduled_at")
				.in("inquiry_id", assignedInquiryIds)
				.in("status", ["requested", "confirmed"]);
			if (inquiryAppointmentResult.error) {
				console.error("[appointments inquiry agent schedule lookup]", inquiryAppointmentResult.error);
				return NextResponse.json(
					{ error: "We couldn't verify the assigned agent's schedule. Please try again shortly." },
					{ status: 503, headers: rateLimitHeaders(limiter) },
				);
			}
			inquiryAppointments = inquiryAppointmentResult.data ?? [];
		}
		const directAppointments = missingAppointmentAgentColumn ? [] : agentScheduleResult.data ?? [];
		const agentSchedule = [...directAppointments, ...inheritedAppointments, ...inquiryAppointments];
		const agentOverlap = agentSchedule.some((appointment) => {
			if (existingBooking && appointment.id === existingBooking.id) return false;
			const existingStart = new Date(appointment.scheduled_at).getTime();
			const requestedStart = new Date(scheduledAt).getTime();
			return existingStart < requestedStart + bookingDurationMs && requestedStart < existingStart + bookingDurationMs;
		});
		if (agentOverlap) {
			return NextResponse.json(
				{ error: "The assigned agent already has another appointment during this time. Please choose another slot.", code: "agent_schedule_conflict" },
				{ status: 409, headers: rateLimitHeaders(limiter) },
			);
		}
	}

	if (existingBooking) {
		if (new Date(existingBooking.scheduled_at).getTime() === new Date(scheduledAt).getTime()) {
			return NextResponse.json(
				{ error: "This appointment is already booked for that date and time.", code: "appointment_unchanged" },
				{ status: 409, headers: rateLimitHeaders(limiter) },
			);
		}
		if (existingBooking.assigned_agent_id || inquiryAssignedAgentId || assignedAgentId) {
			return NextResponse.json(
				{ error: "This appointment has an agent assigned. Please contact the agent to reschedule it.", code: "agent_assigned_reschedule" },
				{ status: 409, headers: rateLimitHeaders(limiter) },
			);
		}

		const conflictingBooking = sameCustomerBookings.find((appointment) =>
			appointment.id !== existingBooking.id &&
			new Date(appointment.scheduled_at).getTime() === new Date(scheduledAt).getTime(),
		);
		if (conflictingBooking) {
			return NextResponse.json(
				{ error: "You already have an active appointment for this property at that date and time.", code: "duplicate_appointment" },
				{ status: 409, headers: rateLimitHeaders(limiter) },
			);
		}

		const { data: rescheduled, error: rescheduleError } = await supabaseServer.rpc("reschedule_unassigned_appointment", {
			p_appointment_id: existingBooking.id,
			p_expected_scheduled_at: existingBooking.scheduled_at,
			p_buyer_name: buyerName,
			p_buyer_email: buyerEmail,
			p_buyer_phone: buyerPhone || null,
			p_scheduled_at: scheduledAt,
			p_location: propertyTitle || propertySlug || null,
			p_notes: text(body?.notes) || null,
			p_appointment_message: appointmentMessage,
		});
		if (rescheduleError) {
			console.error("[appointments reschedule error]", rescheduleError);
			const migrationMissing = rescheduleError.code === "PGRST202" || rescheduleError.message.includes("reschedule_unassigned_appointment");
			const conflictCode = rescheduleError.code === "23505" || rescheduleError.code === "23P01";
			const message = migrationMissing
				? "Appointment rescheduling is not enabled in the database yet. Apply the appointment safety migration, then try again."
				: rescheduleError.message.includes("Assigned agent")
				? "That agent already has another appointment during this time. Please choose another slot."
				: rescheduleError.message.includes("Customer already")
					? "You already have another appointment that overlaps this time. Choose a slot at least 30 minutes apart."
					: rescheduleError.message.includes("cannot be rescheduled")
						? "This appointment has an agent assigned or has changed. Contact the agent to reschedule it."
						: "We couldn't update your appointment. Please try again shortly.";
			return NextResponse.json(
				{ error: message, code: conflictCode ? "appointment_schedule_conflict" : "appointment_reschedule_failed" },
				{ status: conflictCode || rescheduleError.code === "42501" ? 409 : 503, headers: rateLimitHeaders(limiter) },
			);
		}

		return NextResponse.json({
			ok: true,
			rescheduled: true,
			appointmentId: rescheduled?.appointment_id,
			inquiryId: rescheduled?.inquiry_id,
		}, { headers: rateLimitHeaders(limiter) });
	}

	// Prevent the same customer from duplicating the same property appointment.
	// Different customers and different properties may use the same time slot.
	let conflictQuery = supabaseServer
		.from("appointments")
		.select("id,buyer_email")
		.eq("scheduled_at", scheduledAt)
		.in("status", ["requested", "confirmed"]);
	conflictQuery = propertyId
		? conflictQuery.eq("property_id", propertyId)
		: conflictQuery.is("property_id", null);
	const { data: conflicts, error: conflictError } = await conflictQuery;

	if (conflictError) {
		// If the table is unavailable, the insert below returns a setup message.
		// Other lookup failures must fail closed so the slot is not double-booked.
		if (conflictError.code === "42P01" || conflictError.code === "PGRST205") {
			console.error("[appointments conflict check] appointment table is missing", conflictError.message);
		} else {
			console.error("[appointments conflict check]", conflictError);
			return NextResponse.json(
				{ error: "We couldn't verify that time slot. Please try again shortly." },
				{ status: 503, headers: rateLimitHeaders(limiter) },
			);
		}
	} else if (conflicts?.some((appointment) => text(appointment.buyer_email).toLowerCase() === buyerEmail)) {
		return NextResponse.json(
			{ error: "You already have an active appointment request for this property at that time.", code: "duplicate_appointment" },
			{ status: 409, headers: rateLimitHeaders(limiter) },
		);
	}

	const { inquiry, error: inquiryError } = await insertInquiry({
		propertyId,
		buyerName,
		buyerEmail,
		buyerPhone,
		message: appointmentMessage,
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
		// The lead is created first so we can preserve its details for the appointment.
		// Roll it back if booking fails so the pipeline does not receive a false lead.
		const { error: cleanupError } = await supabaseServer.from("inquiries").delete().eq("id", inquiry.id);
		if (cleanupError) {
			console.error("[appointments POST inquiry rollback error]", cleanupError);
		}

		if (appointmentError.code === "23505" || appointmentError.code === "23P01") {
			const conflictMessage = appointmentError.message.includes("Customer already")
				? "You already have another appointment that overlaps this time. Choose a slot at least 30 minutes apart."
				: appointmentError.message.includes("Assigned agent")
					? "That agent already has another appointment during this time. Please choose another slot."
					: "You already have an active appointment request for this property at that time.";
			return NextResponse.json(
				{ error: conflictMessage, code: "appointment_schedule_conflict" },
				{ status: 409, headers: rateLimitHeaders(limiter) },
			);
		}

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
