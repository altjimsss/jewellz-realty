import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
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
	const companyName = text(body?.companyName);
	const contactPhone = text(body?.contactPhone);
	const websiteUrl = text(body?.websiteUrl);
	const logoUrl = text(body?.logoUrl);
	const description = text(body?.description);
	const slug = text(body?.slug) || companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

	if (!email) {
		return NextResponse.json({ error: "A contact/login email address is required." }, { status: 400 });
	}

	if (!companyName) {
		return NextResponse.json({ error: "The company name is required." }, { status: 400 });
	}

	const origin = new URL(request.url).origin;
	const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? origin}/login?next=${encodeURIComponent("/developer")}`;

	// Creates the login account and emails the developer a secure link to set their own password
	const { data: created, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(email, {
		data: { name: companyName, role: "developer_partner" },
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
		full_name: companyName,
		role: "developer_partner",
		is_active: true,
	};

	const { error: profileError } = await supabaseServer.from("profiles").upsert(profilePayload, { onConflict: "id" });
	if (profileError) {
		return NextResponse.json({ error: profileError.message }, { status: 422 });
	}

	const { error: devError } = await supabaseServer.from("developer_partners").insert({
		profile_id: userId,
		company_name: companyName,
		slug: slug || null,
		contact_email: email,
		contact_phone: contactPhone || null,
		website_url: websiteUrl || null,
		logo_url: logoUrl || null,
		description: description || null,
		is_active: true,
	});

	if (devError) {
		return NextResponse.json({ error: devError.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true, userId, email });
}
