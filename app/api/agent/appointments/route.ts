import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAgent(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Unauthorized", status: 401 as const };
  const { data: auth, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !auth.user) return { error: "Unauthorized", status: 401 as const };
  const { data: profile } = await supabaseServer.from("profiles").select("role, is_active").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_active || profile.role !== "agent") return { error: "Agent access is required.", status: 403 as const };
  const { data: agent, error } = await supabaseServer.from("agents").select("id").eq("profile_id", auth.user.id).maybeSingle();
  if (error) return { error: "Could not load agent profile.", status: 500 as const };
  if (!agent) return { error: "No agent profile is linked to this account.", status: 403 as const };
  return { agentId: agent.id };
}

async function attachPropertyTitles(rows: Array<Record<string, unknown>>) {
  const propertyIds = [...new Set(rows.map((row) => row.property_id).filter((id): id is string => typeof id === "string"))];
  if (!propertyIds.length) return rows.map((row) => ({ ...row, property_title: "General inquiry", appointment_type: "site_viewing" }));
  const { data: properties } = await supabaseServer.from("properties").select("id, title").in("id", propertyIds);
  const titles = new Map((properties ?? []).map((property) => [property.id, property.title]));
  return rows.map((row) => ({
    ...row,
    property_title: titles.get(String(row.property_id ?? "")) ?? "General inquiry",
    appointment_type: "site_viewing",
  }));
}

const APPOINTMENT_FIELDS = "id, inquiry_id, property_id, buyer_name, buyer_email, scheduled_at, status, location";

const APPOINTMENT_DURATION_MS = 30 * 60 * 1000;

async function hasScheduleConflict(agentId: string, buyerEmail: string, scheduledAt: string, excludeId?: string) {
  const start = Date.parse(scheduledAt);
  const windowStart = new Date(start - APPOINTMENT_DURATION_MS).toISOString();
  const windowEnd = new Date(start + APPOINTMENT_DURATION_MS).toISOString();
  const [agentResult, customerResult] = await Promise.all([
    supabaseServer.from("appointments").select("id")
      .eq("assigned_agent_id", agentId)
      .in("status", ["requested", "confirmed"])
      .gt("scheduled_at", windowStart)
      .lt("scheduled_at", windowEnd),
    supabaseServer.from("appointments").select("id")
      .ilike("buyer_email", buyerEmail.replace(/[\\%_]/g, "\\$&"))
      .in("status", ["requested", "confirmed"])
      .gt("scheduled_at", windowStart)
      .lt("scheduled_at", windowEnd),
  ]);

  if (agentResult.error || customerResult.error) {
    return { conflict: false, error: true };
  }
  const overlappingIds = new Set([...(agentResult.data ?? []), ...(customerResult.data ?? [])].map((row) => row.id));
  if (excludeId) overlappingIds.delete(excludeId);
  return { conflict: overlappingIds.size > 0, error: false };
}

export async function GET(request: Request) {
  const auth = await getAgent(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: assignedInquiries, error: inquiriesError } = await supabaseServer.from("inquiries").select("id").eq("assigned_agent_id", auth.agentId);
  if (inquiriesError) return NextResponse.json({ error: "Could not load your assigned inquiries." }, { status: 500 });
  const inquiryIds = (assignedInquiries ?? []).map((row) => row.id);
  if (!inquiryIds.length) return NextResponse.json({ appointments: [] });

  const { data: appointmentRows, error: appointmentsError } = await supabaseServer
    .from("appointments")
    .select(APPOINTMENT_FIELDS)
    .in("inquiry_id", inquiryIds)
    .in("status", ["requested", "confirmed"])
    .order("scheduled_at", { ascending: true });
  if (appointmentsError) {
    console.error("[agent appointments lookup]", appointmentsError);
    return NextResponse.json({ error: "Could not load appointments for your assigned inquiries." }, { status: 500 });
  }

  const appointments = await attachPropertyTitles((appointmentRows ?? []) as Array<Record<string, unknown>>);
  return NextResponse.json({ appointments });
}

export async function PATCH(request: Request) {
  const auth = await getAgent(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({})) as { appointmentId?: unknown };
  const appointmentId = typeof body.appointmentId === "string" ? body.appointmentId.trim() : "";
  if (!appointmentId) return NextResponse.json({ error: "Appointment is required." }, { status: 400 });

  const { data: appointment, error: appointmentError } = await supabaseServer.from("appointments").select(APPOINTMENT_FIELDS).eq("id", appointmentId).maybeSingle();
  if (appointmentError) return NextResponse.json({ error: "Could not load appointment." }, { status: 500 });
  if (!appointment) return NextResponse.json({ error: "Appointment not found." }, { status: 404 });

  let isAssigned = false;
  if (appointment.inquiry_id) {
    const { data: inquiry } = await supabaseServer.from("inquiries").select("id").eq("id", appointment.inquiry_id).eq("assigned_agent_id", auth.agentId).maybeSingle();
    isAssigned = Boolean(inquiry);
  }
  if (!isAssigned && appointment.property_id) {
    const { data: property } = await supabaseServer.from("properties").select("id").eq("id", appointment.property_id).eq("assigned_agent_id", auth.agentId).maybeSingle();
    isAssigned = Boolean(property);
  }
  if (!isAssigned) return NextResponse.json({ error: "This appointment is not assigned to you." }, { status: 403 });
  if (appointment.status !== "requested") return NextResponse.json({ error: "Only requested appointments can be confirmed." }, { status: 409 });

  const conflictCheck = await hasScheduleConflict(auth.agentId, String(appointment.buyer_email ?? ""), String(appointment.scheduled_at), appointment.id);
  if (conflictCheck.error) return NextResponse.json({ error: "Could not verify the agent and customer calendars. Refresh and try again." }, { status: 500 });
  if (conflictCheck.conflict) return NextResponse.json({ error: "This time overlaps another active appointment for you or the customer. Choose a time at least 30 minutes apart." }, { status: 409 });

  const { data: updated, error: updateError } = await supabaseServer.from("appointments").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", appointmentId).eq("status", "requested").select(APPOINTMENT_FIELDS).maybeSingle();
  if (updateError) return NextResponse.json({ error: "Could not confirm this appointment. Refresh and try again." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "This appointment has already changed. Refresh your calendar." }, { status: 409 });
  const [withTitle] = await attachPropertyTitles([updated as Record<string, unknown>]);
  return NextResponse.json({ appointment: withTitle });
}

export async function POST(request: Request) {
  const auth = await getAgent(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({})) as {
    inquiryId?: unknown;
    scheduledAt?: unknown;
    location?: unknown;
    notes?: unknown;
  };
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId.trim() : "";
  const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const time = Date.parse(scheduledAt);

  if (!inquiryId) return NextResponse.json({ error: "Choose one of your assigned customer inquiries." }, { status: 400 });
  if (!scheduledAt || !Number.isFinite(time) || time <= Date.now()) return NextResponse.json({ error: "Choose a future date and time." }, { status: 400 });
  if (!location) return NextResponse.json({ error: "Add the viewing location or call/meeting details." }, { status: 400 });
  if (location.length > 500 || notes.length > 2000) return NextResponse.json({ error: "Meeting details are too long." }, { status: 400 });

  const { data: inquiry, error: inquiryError } = await supabaseServer
    .from("inquiries")
    .select("id, property_id, buyer_name, buyer_email, buyer_phone")
    .eq("id", inquiryId)
    .eq("assigned_agent_id", auth.agentId)
    .maybeSingle();
  if (inquiryError) return NextResponse.json({ error: "Could not verify the selected inquiry." }, { status: 500 });
  if (!inquiry) return NextResponse.json({ error: "That inquiry is not assigned to you." }, { status: 403 });

  const conflictCheck = await hasScheduleConflict(auth.agentId, String(inquiry.buyer_email ?? ""), new Date(time).toISOString());
  if (conflictCheck.error) return NextResponse.json({ error: "Could not verify the agent and customer calendars. Refresh and try again." }, { status: 500 });
  if (conflictCheck.conflict) return NextResponse.json({ error: "This time overlaps another active appointment for you or the customer. Choose a time at least 30 minutes apart." }, { status: 409 });

  const { data: appointment, error: insertError } = await supabaseServer
    .from("appointments")
    .insert({
      inquiry_id: inquiry.id,
      property_id: inquiry.property_id,
      assigned_agent_id: auth.agentId,
      buyer_name: inquiry.buyer_name,
      buyer_email: inquiry.buyer_email,
      buyer_phone: inquiry.buyer_phone,
      scheduled_at: new Date(time).toISOString(),
      status: "confirmed",
      location,
      notes: notes || null,
    })
    .select("id, inquiry_id, property_id, buyer_name, scheduled_at, status, location")
    .single();

  if (insertError || !appointment) {
    console.error("[agent appointment create]", insertError);
    const conflict = insertError?.code === "23505" || insertError?.code === "23P01";
    return NextResponse.json({ error: conflict ? "That appointment time conflicts with another booking. Choose a different time." : "Could not save the appointment. Refresh and try again." }, { status: conflict ? 409 : 500 });
  }

  const [withTitle] = await attachPropertyTitles([{ ...appointment, appointment_type: "site_viewing" } as Record<string, unknown>]);
  return NextResponse.json({ appointment: withTitle }, { status: 201 });
}
