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
  if (!propertyIds.length) return rows.map((row) => ({ ...row, property_title: "General inquiry" }));
  const { data: properties } = await supabaseServer.from("properties").select("id, title").in("id", propertyIds);
  const titles = new Map((properties ?? []).map((property) => [property.id, property.title]));
  return rows.map((row) => ({ ...row, property_title: titles.get(String(row.property_id ?? "")) ?? "General inquiry" }));
}

const APPOINTMENT_FIELDS = "id, inquiry_id, property_id, assigned_agent_id, buyer_name, appointment_type, scheduled_at, status, location";

export async function GET(request: Request) {
  const auth = await getAgent(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: assignedInquiries, error: inquiriesError } = await supabaseServer.from("inquiries").select("id").eq("assigned_agent_id", auth.agentId);
  if (inquiriesError) return NextResponse.json({ error: "Could not load your assigned inquiries." }, { status: 500 });
  const inquiryIds = (assignedInquiries ?? []).map((row) => row.id);
  const directResult = await supabaseServer.from("appointments").select(APPOINTMENT_FIELDS).eq("assigned_agent_id", auth.agentId).in("status", ["requested", "confirmed"]).order("scheduled_at", { ascending: true });
  if (directResult.error) return NextResponse.json({ error: "Could not load your appointments." }, { status: 500 });

  let inquiryResult: { data: Array<Record<string, unknown>> | null; error: { message: string } | null } = { data: [], error: null };
  if (inquiryIds.length) {
    inquiryResult = await supabaseServer.from("appointments").select(APPOINTMENT_FIELDS).in("inquiry_id", inquiryIds).in("status", ["requested", "confirmed"]).order("scheduled_at", { ascending: true });
  }
  if (inquiryResult.error) return NextResponse.json({ error: "Could not load appointments for your assigned inquiries." }, { status: 500 });

  const unique = new Map<string, Record<string, unknown>>();
  [...(directResult.data ?? []), ...(inquiryResult.data ?? [])].forEach((row) => unique.set(String(row.id), row as Record<string, unknown>));
  const appointments = await attachPropertyTitles([...unique.values()]);
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

  let isAssigned = appointment.assigned_agent_id === auth.agentId;
  if (!isAssigned && appointment.inquiry_id) {
    const { data: inquiry } = await supabaseServer.from("inquiries").select("id").eq("id", appointment.inquiry_id).eq("assigned_agent_id", auth.agentId).maybeSingle();
    isAssigned = Boolean(inquiry);
  }
  if (!isAssigned) return NextResponse.json({ error: "This appointment is not assigned to you." }, { status: 403 });
  if (appointment.status !== "requested") return NextResponse.json({ error: "Only requested appointments can be confirmed." }, { status: 409 });

  const { data: updated, error: updateError } = await supabaseServer.from("appointments").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", appointmentId).eq("status", "requested").select(APPOINTMENT_FIELDS).maybeSingle();
  if (updateError) return NextResponse.json({ error: "Could not confirm this appointment. Refresh and try again." }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "This appointment has already changed. Refresh your calendar." }, { status: 409 });
  const [withTitle] = await attachPropertyTitles([updated as Record<string, unknown>]);
  return NextResponse.json({ appointment: withTitle });
}
