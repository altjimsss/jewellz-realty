import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
	const { data: authData } = await supabaseServer.auth.getUser(token);
	if (!authData.user) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
	const { data: admin } = await supabaseServer.from("profiles").select("role,is_active").eq("id", authData.user.id).maybeSingle();
	if (admin?.role !== "admin" || !admin.is_active) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
	const body = await request.json().catch(() => null) as { email?: string; role?: string } | null;
	const email = body?.email?.trim().toLowerCase() ?? "";
	const role = body?.role;
	if (!email || !["agent", "developer"].includes(role ?? "")) return NextResponse.json({ error: "A valid account role and email are required." }, { status: 400 });
	const { data: target, error } = await supabaseServer.from("profiles").select("id").eq("email", email).eq("role", role).eq("is_active", true).maybeSingle();
	if (error || !target) return NextResponse.json({ error: `No active ${role} login account matches that email.` }, { status: 404 });
	const resetUrl = new URL("/reset-password", request.url);
	resetUrl.searchParams.set("next", role === "agent" ? "/agent" : "/developer");
	const { error: resetError } = await supabaseServer.auth.resetPasswordForEmail(email, {
		redirectTo: resetUrl.toString(),
	});
	if (resetError) return NextResponse.json({ error: resetError.message }, { status: 422 });
	return NextResponse.json({ ok: true });
}
