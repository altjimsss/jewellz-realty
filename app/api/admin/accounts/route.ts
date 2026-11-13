import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function isLocalOrigin(origin: string) {
	try {
		const { hostname } = new URL(origin);
		return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
	} catch {
		return false;
	}
}

function inviteBaseUrl(request: Request) {
	const requestOrigin = new URL(request.url).origin;
	const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
	if (configuredOrigin && !isLocalOrigin(configuredOrigin)) return configuredOrigin;
	if (!isLocalOrigin(requestOrigin)) return requestOrigin;
	const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/+$/, "");
	if (vercelOrigin) return vercelOrigin.startsWith("http") ? vercelOrigin : `https://${vercelOrigin}`;
	throw new Error("Cannot send an invitation from localhost. Set NEXT_PUBLIC_SITE_URL to your production site URL.");
}

async function requireAdmin(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return { error: "An active admin session is required.", status: 401 as const };
	const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
	if (authError || !authData.user) return { error: "Your admin session is invalid or expired.", status: 401 as const };
	const { data: profile, error } = await supabaseServer.from("profiles").select("role, is_active").eq("id", authData.user.id).maybeSingle();
	if (error) return { error: error.message, status: 500 as const };
	if (profile?.role !== "admin" || profile.is_active !== true) return { error: "Admin access is required.", status: 403 as const };
	return { userId: authData.user.id };
}

export async function POST(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

	const body = await request.json().catch(() => null);
	const email = text(body?.email).toLowerCase();
	const fullName = text(body?.fullName);
	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
	}
	if (!fullName) return NextResponse.json({ error: "Enter the admin's name." }, { status: 400 });

	let redirectTo: string;
	try {
		redirectTo = `${inviteBaseUrl(request)}/reset-password?next=${encodeURIComponent("/admin")}`;
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the invitation link." }, { status: 500 });
	}

	const { data, error } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
		data: { name: fullName, role: "admin" },
		redirectTo,
	});
	if (error) return NextResponse.json({ error: error.message }, { status: 422 });
	const invitedUserId = data.user?.id;
	if (!invitedUserId) return NextResponse.json({ error: "Supabase did not return the invited account." }, { status: 500 });

	const { error: profileError } = await supabaseServer.from("profiles").upsert({
		id: invitedUserId,
		email,
		full_name: fullName,
		role: "admin",
		is_active: true,
	}, { onConflict: "id" });
	if (profileError) {
		await supabaseServer.auth.admin.deleteUser(invitedUserId);
		return NextResponse.json({ error: `The invitation was rolled back because the admin profile could not be saved: ${profileError.message}` }, { status: 422 });
	}
	return NextResponse.json({ ok: true, email });
}

export async function DELETE(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

	const body = await request.json().catch(() => null);
	const targetId = text(body?.id);
	if (!targetId) return NextResponse.json({ error: "Select an account to delete." }, { status: 400 });
	if (targetId === auth.userId) return NextResponse.json({ error: "You cannot delete your own signed-in admin account." }, { status: 400 });

	const { data: target, error: lookupError } = await supabaseServer.from("profiles").select("id, role, is_active").eq("id", targetId).maybeSingle();
	if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
	if (!target) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });

	if (target.role === "admin" && target.is_active === true) {
		const { count, error: countError } = await supabaseServer.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
		if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
		if ((count ?? 0) <= 1) return NextResponse.json({ error: "The last active admin account cannot be deleted." }, { status: 400 });
	}

	const { error } = await supabaseServer.auth.admin.deleteUser(targetId);
	if (error) return NextResponse.json({ error: error.message }, { status: 422 });
	return NextResponse.json({ ok: true });
}
