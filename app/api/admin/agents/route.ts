import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown) {
	return value === true || value === "true" || value === "on";
}

function authInviteErrorMessage(message: string) {
	if (/database error (saving|creating) (new )?user/i.test(message)) {
		return "Supabase could not create the auth user because the public.handle_new_user database trigger failed. Run supabase/fix-profiles-email-column.sql in the Supabase SQL Editor, then try again.";
	}

	return message;
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

	if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
		return configuredOrigin;
	}

	if (!isLocalOrigin(requestOrigin)) {
		return requestOrigin;
	}

	const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/+$/, "");
	if (vercelOrigin) {
		return vercelOrigin.startsWith("http") ? vercelOrigin : `https://${vercelOrigin}`;
	}

	return requestOrigin;
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

	const loginUrl = `${inviteBaseUrl(request)}/reset-password?next=${encodeURIComponent("/agent")}`;

	// Creates the login account and emails the agent a secure link to set their
	// own password (Supabase Auth sends this through your project's email system).
	const { data: created, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
		data: { name: fullName, role: "agent" },
		redirectTo: loginUrl,
	});

	if (inviteError) {
		return NextResponse.json({ error: authInviteErrorMessage(inviteError.message) }, { status: 422 });
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

export async function DELETE(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) {
		return NextResponse.json({ error: auth.error }, { status: auth.status });
	}

	const body = await request.json().catch(() => null);
	const agentId = text(body?.id);
	const profileIdFromBody = text(body?.profileId);

	if (!agentId && !profileIdFromBody) {
		return NextResponse.json({ error: "An agent id or profile id is required." }, { status: 400 });
	}

	let profileId = profileIdFromBody;

	if (!profileId && agentId) {
		const { data: agent, error: agentLookupError } = await supabaseServer
			.from("agents")
			.select("profile_id")
			.eq("id", agentId)
			.maybeSingle();

		if (agentLookupError) {
			return NextResponse.json({ error: agentLookupError.message }, { status: 422 });
		}

		profileId = text(agent?.profile_id);
	}

	if (profileId) {
		const { error: deleteUserError } = await supabaseServer.auth.admin.deleteUser(profileId);
		if (deleteUserError) {
			return NextResponse.json({ error: deleteUserError.message }, { status: 422 });
		}

		return NextResponse.json({ ok: true });
	}

	const { error: agentDeleteError } = await supabaseServer.from("agents").delete().eq("id", agentId);
	if (agentDeleteError) {
		return NextResponse.json({ error: agentDeleteError.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true });
}
