import { NextResponse } from "next/server";
import { ANALYTICS_REPORT_SCHEDULE_KEY, parseAnalyticsReportSchedule } from "@/lib/analytics-report-schedule";
import { supabaseServer } from "@/lib/supabase/server";

async function authorize(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return { error: "Admin sign-in required.", status: 401 as const };
	const { data: userData } = await supabaseServer.auth.getUser(token);
	if (!userData.user) return { error: "Your session is invalid or expired.", status: 401 as const };
	const { data: profile, error } = await supabaseServer.from("profiles").select("role,is_active").eq("id", userData.user.id).maybeSingle();
	if (error) return { error: error.message, status: 500 as const };
	if (profile?.role !== "admin" || !profile.is_active) return { error: "Admin access is required.", status: 403 as const };
	return { userId: userData.user.id };
}

export async function GET(request: Request) {
	const auth = await authorize(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
	const { data, error } = await supabaseServer.from("system_settings").select("value").eq("key", ANALYTICS_REPORT_SCHEDULE_KEY).maybeSingle();
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ schedule: parseAnalyticsReportSchedule(data?.value) });
}

export async function PUT(request: Request) {
	const auth = await authorize(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
	const body = await request.json().catch(() => null) as { schedule?: unknown } | null;
	if (!body?.schedule || typeof body.schedule !== "object") return NextResponse.json({ error: "Report schedule settings are required." }, { status: 400 });
	const schedule = parseAnalyticsReportSchedule(body.schedule);
	const { error } = await supabaseServer.from("system_settings").upsert({
		key: ANALYTICS_REPORT_SCHEDULE_KEY,
		value: JSON.stringify(schedule),
		description: "Admin schedule and content settings for automatic analytics reports",
		updated_at: new Date().toISOString(),
	}, { onConflict: "key" });
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ ok: true, schedule });
}
