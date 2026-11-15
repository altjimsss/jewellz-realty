import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });

	const { data: authData } = await supabaseServer.auth.getUser(token);
	if (!authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
	const { data: admin } = await supabaseServer.from("profiles").select("role,is_active").eq("id", authData.user.id).maybeSingle();
	if (admin?.role !== "admin" || !admin.is_active) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return NextResponse.json({ error: "Direct password updates are unavailable: configure SUPABASE_SERVICE_ROLE_KEY in the deployment environment." }, { status: 503 });
	}

	const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
	const email = body?.email?.trim().toLowerCase() ?? "";
	const password = body?.password ?? "";
	if (!email || password.length < 8) {
		return NextResponse.json({ error: "A valid agent email and a password of at least 8 characters are required." }, { status: 400 });
	}

	const { data: target, error: targetError } = await supabaseServer.from("profiles").select("id").eq("email", email).eq("role", "agent").eq("is_active", true).maybeSingle();
	if (targetError || !target) return NextResponse.json({ error: "No active agent login account matches that email." }, { status: 404 });

	const { error } = await supabaseServer.auth.admin.updateUserById(target.id, { password });
	if (error) return NextResponse.json({ error: error.message }, { status: 422 });
	return NextResponse.json({ ok: true });
}
