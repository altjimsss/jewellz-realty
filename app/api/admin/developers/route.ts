import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function booleanValue(value: unknown) {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") return value === "true" || value === "1" || value === "on";
	return false;
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

	// Prefer explicitly configured production URL.
	if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
		return configuredOrigin;
	}

	// Fall back to the origin of the incoming request (works in production deployments).
	if (!isLocalOrigin(requestOrigin)) {
		return requestOrigin;
	}

	// Fall back to the Vercel production URL env var (set automatically by Vercel).
	const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/+$/, "");
	if (vercelOrigin) {
		return vercelOrigin.startsWith("http") ? vercelOrigin : `https://${vercelOrigin}`;
	}

	// Refuse to embed a localhost URL in an invitation email — it would be unreachable
	// for the invited user. Set NEXT_PUBLIC_SITE_URL to your production domain to fix this.
	throw new Error(
		"Cannot send invitation email: no production site URL is configured. " +
		"Set NEXT_PUBLIC_SITE_URL to your production domain (e.g. https://jewellz-realty.vercel.app)."
	);
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
	const developerId = text(body?.developerId || body?.id);
	const email = text(body?.email).toLowerCase();
	const contactEmail = text(body?.contactEmail || body?.contact_email).toLowerCase() || email;
	const companyName = text(body?.companyName || body?.company_name);
	const contactPhone = text(body?.contactPhone || body?.contact_phone);
	const websiteUrl = text(body?.websiteUrl || body?.website_url);
	const logoUrl = text(body?.logoUrl || body?.logo_url);
	const description = text(body?.description);
	const slug = text(body?.slug) || companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
	const sendInvite = booleanValue(body?.sendInvite) || booleanValue(body?.createAccount) || booleanValue(body?.invite);
	const isActive = body?.isActive !== undefined ? booleanValue(body.isActive) : body?.is_active !== undefined ? booleanValue(body.is_active) : true;

	// 1. Existing developer partner being linked or invited to have an account
	if (developerId) {
		const { data: existingDev, error: fetchErr } = await supabaseServer
			.from("developer_partners")
			.select("*")
			.eq("id", developerId)
			.maybeSingle();

		if (fetchErr || !existingDev) {
			return NextResponse.json({ error: "Developer partner not found." }, { status: 404 });
		}

		const targetEmail = email || contactEmail || text(existingDev.contact_email).toLowerCase();
		if (!targetEmail) {
			return NextResponse.json({ error: "An email address is required to create a login account." }, { status: 400 });
		}

		const targetCompanyName = companyName || text(existingDev.company_name);

		let loginUrl: string;
		try {
			loginUrl = `${inviteBaseUrl(request)}/reset-password?next=${encodeURIComponent("/developer")}`;
		} catch (e) {
			const msg = e instanceof Error ? e.message : "No production site URL is configured.";
			return NextResponse.json({ error: msg }, { status: 500 });
		}

		let userId = "";
		const { data: created, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(targetEmail, {
			data: { name: targetCompanyName, role: "developer_partner" },
			redirectTo: loginUrl,
		});

		if (inviteError) {
			if (/already been registered|already exists/i.test(inviteError.message)) {
				const { data: existingProfile } = await supabaseServer
					.from("profiles")
					.select("id")
					.eq("email", targetEmail)
					.maybeSingle();

				if (existingProfile?.id) {
					userId = existingProfile.id;
				} else {
					return NextResponse.json({ error: authInviteErrorMessage(inviteError.message) }, { status: 422 });
				}
			} else {
				return NextResponse.json({ error: authInviteErrorMessage(inviteError.message) }, { status: 422 });
			}
		} else {
			userId = created?.user?.id ?? "";
		}

		if (!userId) {
			return NextResponse.json({ error: "Failed to obtain auth user ID for developer partner." }, { status: 500 });
		}

		// Ensure profile is set
		await supabaseServer.from("profiles").upsert({
			id: userId,
			email: targetEmail,
			full_name: targetCompanyName,
			role: "developer_partner",
			is_active: true,
		}, { onConflict: "id" });

		// Update developer record with profile_id
		const updatePayload: Record<string, unknown> = {
			profile_id: userId,
			contact_email: targetEmail,
			is_active: true,
		};
		if (logoUrl) updatePayload.logo_url = logoUrl;
		if (websiteUrl) updatePayload.website_url = websiteUrl;
		if (contactPhone) updatePayload.contact_phone = contactPhone;
		if (description) updatePayload.description = description;

		const { error: devUpdateError } = await supabaseServer
			.from("developer_partners")
			.update(updatePayload)
			.eq("id", developerId);

		if (devUpdateError) {
			return NextResponse.json({ error: devUpdateError.message }, { status: 422 });
		}

		return NextResponse.json({ ok: true, userId, email: targetEmail, developerId });
	}

	// 2. New developer registration.
	if (!companyName) {
		return NextResponse.json({ error: "The company name is required." }, { status: 400 });
	}

	// 2a. Display-only / standard partner creation (no immediate login account invite requested).
	if (!sendInvite) {
		const { data: inserted, error: devError } = await supabaseServer.from("developer_partners").insert({
			profile_id: null,
			company_name: companyName,
			slug: slug || null,
			contact_email: contactEmail || null,
			contact_phone: contactPhone || null,
			website_url: websiteUrl || null,
			logo_url: logoUrl || null,
			description: description || null,
			is_active: isActive,
		}).select().maybeSingle();

		if (devError) {
			return NextResponse.json({ error: devError.message }, { status: 422 });
		}

		return NextResponse.json({ ok: true, developer: inserted });
	}

	// 2b. Email invite explicitly requested ⇒ create the login account and email a secure password-setup link.
	const inviteEmail = email || contactEmail;
	if (!inviteEmail) {
		return NextResponse.json({ error: "An email address is required to invite a login account." }, { status: 400 });
	}

	let loginUrl: string;
	try {
		loginUrl = `${inviteBaseUrl(request)}/reset-password?next=${encodeURIComponent("/developer")}`;
	} catch (e) {
		const msg = e instanceof Error ? e.message : "No production site URL is configured.";
		return NextResponse.json({ error: msg }, { status: 500 });
	}

	// Creates the login account and emails the developer a secure link to set their own password
	const { data: created, error: inviteError } = await supabaseServer.auth.admin.inviteUserByEmail(inviteEmail, {
		data: { name: companyName, role: "developer_partner" },
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
		email: inviteEmail,
		full_name: companyName,
		role: "developer_partner",
		is_active: true,
	};

	const { error: profileError } = await supabaseServer.from("profiles").upsert(profilePayload, { onConflict: "id" });
	if (profileError) {
		return NextResponse.json({ error: profileError.message }, { status: 422 });
	}

	const { data: insertedWithProfile, error: devError } = await supabaseServer.from("developer_partners").insert({
		profile_id: userId,
		company_name: companyName,
		slug: slug || null,
		contact_email: inviteEmail,
		contact_phone: contactPhone || null,
		website_url: websiteUrl || null,
		logo_url: logoUrl || null,
		description: description || null,
		is_active: isActive,
	}).select().maybeSingle();

	if (devError) {
		return NextResponse.json({ error: devError.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true, userId, email: inviteEmail, developer: insertedWithProfile });
}


export async function PATCH(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) {
		return NextResponse.json({ error: auth.error }, { status: auth.status });
	}

	const body = await request.json().catch(() => null);
	const id = text(body?.id);

	if (!id) {
		return NextResponse.json({ error: "Developer partner ID is required." }, { status: 400 });
	}

	const updatePayload: Record<string, unknown> = {};
	if (body?.companyName !== undefined || body?.company_name !== undefined) updatePayload.company_name = text(body.companyName || body.company_name);
	if (body?.slug !== undefined) updatePayload.slug = text(body.slug);
	if (body?.logoUrl !== undefined || body?.logo_url !== undefined) updatePayload.logo_url = text(body.logoUrl || body.logo_url) || null;
	if (body?.websiteUrl !== undefined || body?.website_url !== undefined) updatePayload.website_url = text(body.websiteUrl || body.website_url) || null;
	if (body?.contactEmail !== undefined || body?.contact_email !== undefined) updatePayload.contact_email = text(body.contactEmail || body.contact_email).toLowerCase() || null;
	if (body?.contactPhone !== undefined || body?.contact_phone !== undefined) updatePayload.contact_phone = text(body.contactPhone || body.contact_phone) || null;
	if (body?.description !== undefined) updatePayload.description = text(body.description) || null;
	if (body?.isActive !== undefined || body?.is_active !== undefined) updatePayload.is_active = booleanValue(body.isActive ?? body.is_active);

	const { error } = await supabaseServer
		.from("developer_partners")
		.update(updatePayload)
		.eq("id", id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) {
		return NextResponse.json({ error: auth.error }, { status: auth.status });
	}

	const body = await request.json().catch(() => null);
	const id = text(body?.id);

	if (!id) {
		return NextResponse.json({ error: "Developer partner ID is required." }, { status: 400 });
	}

	const { error } = await supabaseServer.from("developer_partners").delete().eq("id", id);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 422 });
	}

	return NextResponse.json({ ok: true });
}
