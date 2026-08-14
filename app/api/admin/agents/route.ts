import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown) {
	return value === true || value === "true" || value === "on";
}

async function requireAdmin(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	let userId = "";

	if (token) {
		const { data } = await supabaseServer.auth.getUser(token);
		userId = data.user?.id ?? "";
	}

	if (!userId) {
		const { data } = await supabaseServer.auth.getUser();
		userId = data.user?.id ?? "";
	}

	if (!userId) {
		return { error: "Invalid or expired admin session.", status: 401 as const };
	}

	const { data: profile, error } = await supabaseServer
		.from("profiles")
		.select("role, is_active")
		.eq("id", userId)
		.maybeSingle();

	if (error) {
		return { error: error.message, status: 500 as const };
	}

	if (!profile?.is_active || profile.role !== "admin") {
		return { error: "Admin access is required.", status: 403 as const };
	}

	return { userId };
}

export async function POST(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) {
		return NextResponse.json({ error: auth.error }, { status: auth.status });
	}

	const body = await request.json().catch(() => null);
	const email = text(body?.email).toLowerCase();
	const fullName = text(body?.fullName);
	const licenseNumber = text(body?.licenseNumber);
	const specialization = text(body?.specialization);
	const photoUrl = text(body?.photoUrl);
	const facebookUrl = text(body?.facebookUrl);
	const instagramUrl = text(body?.instagramUrl);
	const twitterUrl = text(body?.twitterUrl);
	const linkedinUrl = text(body?.linkedinUrl);
	const isTopAgent = booleanValue(body?.isTopAgent);

	if (!email) {
		return NextResponse.json({ error: "An email address is required." }, { status: 400 });
	}

	if (!fullName) {
		return NextResponse.json({ error: "The agent's full name is required." }, { status: 400 });
	}

	const origin = new URL(request.url).origin;
	const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? origin}/login?next=${encodeURIComponent("/agent")}`;

	// Creates the login account and emails the agent a secure link to set their
	// own password (Supabase Auth sends this through your project's email system).
	const { data: created, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
		data: { name: fullName, role: "agent" },
		redirectTo: loginUrl,
	});

	if (inviteError) {
		return NextResponse.json({ error: inviteError.message }, { status: 422 });
	}

	const userId = created?.user?.id;
	if (!userId) {
		return NextResponse.json({ error: "Supabase did not return the created user." }, { status: 500 });
	}

	const profilePayload: Record<string, unknown> = {
		id: userId,
		email,
		full_name: fullName,
		role: "agent",
		is_active: true,
	};

	const { error: profileError } = await supabaseServer.from("profiles").upsert(profilePayload, { onConflict: "id" });
	if (profileError) {
		return NextResponse.json({ error: profileError.message }, { status: 422 });
	}

	const { error: agentError } = await supabaseServer.from("agents").insert({
		profile_id: userId,
		full_name: fullName,
		license_number: licenseNumber || null,
		specialization: specialization || null,
		photo_url: photoUrl || null,
		facebook_url: facebookUrl || null,
		instagram_url: instagramUrl || null,
		twitter_url: twitterUrl || null,
		linkedin_url: linkedinUrl || null,
		is_top_agent: isTopAgent,
	});

	if (agentError) {
		return NextResponse.json({ error: agentError.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true, userId, email });
}