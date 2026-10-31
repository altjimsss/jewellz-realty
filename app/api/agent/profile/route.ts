import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return null;
	const { data, error } = await supabaseServer.auth.getUser(token);
	if (error || !data.user) return null;
	return data.user;
}

export async function GET(request: Request) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const [agentRes, profileRes] = await Promise.all([
		supabaseServer.from("agents").select("*").eq("profile_id", user.id).maybeSingle(),
		supabaseServer.from("profiles").select("*").eq("id", user.id).maybeSingle(),
	]);

	return NextResponse.json({
		agent: agentRes.data,
		profile: profileRes.data,
	});
}

export async function PUT(request: Request) {
	const user = await getAuthenticatedUser(request);
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Verify profile is agent or admin and active
	const { data: profile } = await supabaseServer
		.from("profiles")
		.select("role, is_active, full_name, email")
		.eq("id", user.id)
		.maybeSingle();

	if (!profile?.is_active || (profile.role !== "agent" && profile.role !== "admin")) {
		return NextResponse.json({ error: "Access denied." }, { status: 403 });
	}

	const body = await request.json().catch(() => ({}));
	const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
	const photoUrl = typeof body.photo_url === "string" ? body.photo_url.trim() : (body.photo_url === null ? null : undefined);
	const licenseNumber = typeof body.license_number === "string" ? body.license_number.trim() : (body.license_number === null ? null : undefined);
	const specialization = typeof body.specialization === "string" ? body.specialization.trim() : (body.specialization === null ? null : undefined);
	const bio = typeof body.bio === "string" ? body.bio.trim() : (body.bio === null ? null : undefined);
	const phone = typeof body.phone === "string" ? body.phone.trim() : (body.phone === null ? null : undefined);
	const facebookUrl = typeof body.facebook_url === "string" ? body.facebook_url.trim() : (body.facebook_url === null ? null : undefined);
	const instagramUrl = typeof body.instagram_url === "string" ? body.instagram_url.trim() : (body.instagram_url === null ? null : undefined);
	const twitterUrl = typeof body.twitter_url === "string" ? body.twitter_url.trim() : (body.twitter_url === null ? null : undefined);
	const linkedinUrl = typeof body.linkedin_url === "string" ? body.linkedin_url.trim() : (body.linkedin_url === null ? null : undefined);

	// Check if agent row exists
	const { data: existingAgent } = await supabaseServer
		.from("agents")
		.select("id")
		.eq("profile_id", user.id)
		.maybeSingle();

	const agentPayload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	if (fullName) agentPayload.full_name = fullName;
	if (photoUrl !== undefined) agentPayload.photo_url = photoUrl || null;
	if (licenseNumber !== undefined) agentPayload.license_number = licenseNumber || null;
	if (specialization !== undefined) agentPayload.specialization = specialization || null;
	if (bio !== undefined) agentPayload.bio = bio || null;
	if (phone !== undefined) agentPayload.phone = phone || null;
	if (facebookUrl !== undefined) agentPayload.facebook_url = facebookUrl || null;
	if (instagramUrl !== undefined) agentPayload.instagram_url = instagramUrl || null;
	if (twitterUrl !== undefined) agentPayload.twitter_url = twitterUrl || null;
	if (linkedinUrl !== undefined) agentPayload.linkedin_url = linkedinUrl || null;

	let agentResult;
	if (existingAgent?.id) {
		agentResult = await supabaseServer
			.from("agents")
			.update(agentPayload)
			.eq("id", existingAgent.id)
			.select()
			.single();
	} else {
		agentResult = await supabaseServer
			.from("agents")
			.insert({
				profile_id: user.id,
				full_name: fullName || profile.full_name || "Agent",
				photo_url: photoUrl || null,
				license_number: licenseNumber || null,
				specialization: specialization || null,
				bio: bio || null,
				phone: phone || null,
				facebook_url: facebookUrl || null,
				instagram_url: instagramUrl || null,
				twitter_url: twitterUrl || null,
				linkedin_url: linkedinUrl || null,
				is_active: true,
			})
			.select()
			.single();
	}

	if (agentResult.error) {
		return NextResponse.json({ error: agentResult.error.message }, { status: 500 });
	}

	// Also update profiles table so avatar_url and full_name stay in sync
	const profileUpdates: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	if (fullName) profileUpdates.full_name = fullName;
	if (photoUrl !== undefined) profileUpdates.avatar_url = photoUrl || null;
	if (phone !== undefined) profileUpdates.phone = phone || null;

	await supabaseServer
		.from("profiles")
		.update(profileUpdates)
		.eq("id", user.id);

	return NextResponse.json({ ok: true, agent: agentResult.data });
}

