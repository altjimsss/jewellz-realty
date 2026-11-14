import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendBrandedEmail } from "@/lib/email-notifications";

export async function POST(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
	const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
	if (userError || !userData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
	const { data: profile } = await supabaseServer.from("profiles").select("role,is_active,full_name").eq("id", userData.user.id).maybeSingle();
	if (!profile?.is_active || !["admin", "agent"].includes(profile.role)) return NextResponse.json({ error: "Access denied." }, { status: 403 });
	const body = await request.json().catch(() => null) as { inquiryId?: string; previousStatus?: string; event?: string } | null;
	if (!body?.inquiryId) return NextResponse.json({ error: "Inquiry is required." }, { status: 400 });
	const { data: inquiry, error } = await supabaseServer.from("inquiries").select("id,buyer_name,buyer_email,buyer_phone,status,assigned_agent_id,property_id,properties(title)").eq("id", body.inquiryId).maybeSingle();
	if (error || !inquiry) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
	const { data: agent } = inquiry.assigned_agent_id ? await supabaseServer.from("agents").select("id,full_name,profile_id").eq("id", inquiry.assigned_agent_id).maybeSingle() : { data: null };
	if (profile.role === "agent" && agent?.profile_id !== userData.user.id) return NextResponse.json({ error: "This lead is not assigned to you." }, { status: 403 });
	const { data: agentProfile } = agent?.profile_id ? await supabaseServer.from("profiles").select("email").eq("id", agent.profile_id).maybeSingle() : { data: null };
	const email = typeof agentProfile?.email === "string" ? agentProfile.email : "";
	if (!email) return NextResponse.json({ ok: true, skipped: "agent email unavailable" });
	const property = Array.isArray(inquiry.properties) ? inquiry.properties[0]?.title : (inquiry.properties as { title?: string } | null)?.title;
	const status = String(inquiry.status ?? "");
	const oldStatus = body.previousStatus ?? "";
	const transition = oldStatus && status !== oldStatus ? `${oldStatus.replaceAll("_", " ")} → ${status.replaceAll("_", " ")}` : status.replaceAll("_", " ");
	const assignment = body.event === "assignment";
	const closedWon = status === "closed_won" && oldStatus !== "closed_won";
	const subject = assignment ? "New Customer Assigned – J'WELLZ REALTY" : closedWon ? "Deal Closed Won – Congratulations!" : "Pipeline Update – J'WELLZ REALTY";
	await sendBrandedEmail({ to: email, subject, heading: assignment ? "A customer has been assigned to you" : "Your customer pipeline was updated", details: [["Agent", agent?.full_name], ["Customer", inquiry.buyer_name], ["Email", inquiry.buyer_email], ["Contact number", inquiry.buyer_phone], ["Property", property], ["Previous status", oldStatus], ["Current status", status], ["Update", body.event ?? `Pipeline status: ${transition}`], ["Updated by", profile.full_name], ["Agent portal", `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/agent/inquiries?section=inquiries&inquiry=${encodeURIComponent(inquiry.id)}`]] }).catch((sendError) => console.error("[agent pipeline notification]", sendError));
	return NextResponse.json({ ok: true });
}
