import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getEmailCredentials, verifyGmailCredentials, sendBrandedEmail } from "@/lib/email-notifications";
import { getAiCredentials, verifyAiCredentials, type AiProvider } from "@/lib/ai/client";
import { invalidateSystemSettingsCache, loadAllSystemSettings } from "@/lib/system-settings";

async function requireAdmin(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return { error: "An active admin session is required.", status: 401 as const };
	const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
	if (authError || !authData.user) return { error: "Your admin session is invalid or expired.", status: 401 as const };
	const { data: profile, error } = await supabaseServer.from("profiles").select("role, is_active, email").eq("id", authData.user.id).maybeSingle();
	if (error) return { error: error.message, status: 500 as const };
	if (profile?.role !== "admin" || profile.is_active !== true) return { error: "Admin access is required.", status: 403 as const };
	return { userId: authData.user.id, adminEmail: profile.email ?? authData.user.email };
}

function maskSecret(secret?: string): string {
	if (!secret || secret.trim().length === 0) return "";
	const trimmed = secret.trim();
	if (trimmed.length <= 6) return "••••••••";
	return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-3)}`;
}

export async function GET(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

	// Force fresh load from DB
	const dbSettings = await loadAllSystemSettings(true);
	const emailCreds = await getEmailCredentials();
	const aiCreds = await getAiCredentials();

	return NextResponse.json({
		email: {
			gmailUser: emailCreds.gmailUser,
			gmailAppPasswordMasked: maskSecret(emailCreds.gmailAppPassword),
			hasAppPassword: Boolean(emailCreds.gmailAppPassword),
			emailFrom: emailCreds.emailFrom,
			resendApiKeyMasked: maskSecret(emailCreds.resendApiKey),
			hasResendKey: Boolean(emailCreds.resendApiKey),
			isDbConfigured: dbSettings.has("gmail_user") || dbSettings.has("gmail_app_password"),
		},
		ai: {
			primaryProvider: aiCreds.primaryProvider,
			groqKeyMasked: maskSecret(aiCreds.groqKey),
			hasGroqKey: Boolean(aiCreds.groqKey),
			groqModel: aiCreds.groqModel || "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b",
			openRouterKeyMasked: maskSecret(aiCreds.openRouterKey),
			hasOpenRouterKey: Boolean(aiCreds.openRouterKey),
			openRouterModel: aiCreds.openRouterModel || "openrouter/free",
			geminiKeyMasked: maskSecret(aiCreds.geminiKey),
			hasGeminiKey: Boolean(aiCreds.geminiKey),
			geminiModel: aiCreds.geminiModel || "gemini-1.5-flash",
			isDbConfigured: dbSettings.has("groq_api_key") || dbSettings.has("gemini_api_key") || dbSettings.has("openrouter_api_key"),
		},
	});
}

export async function POST(request: Request) {
	const auth = await requireAdmin(request);
	if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== "object") {
		return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
	}

	const action = typeof body.action === "string" ? body.action : "save";

	// 1. ACTION: Test Gmail SMTP Connection
	if (action === "test-gmail") {
		const customUser = typeof body.gmailUser === "string" ? body.gmailUser.trim() : undefined;
		const customPassword = typeof body.gmailAppPassword === "string" ? body.gmailAppPassword.trim() : undefined;

		const verifyResult = await verifyGmailCredentials(customUser, customPassword);
		if (!verifyResult.success) {
			return NextResponse.json({ success: false, error: verifyResult.error }, { status: 400 });
		}

		// If user requested a test email to be sent
		if (body.sendTestEmail === true && auth.adminEmail) {
			const sendResult = await sendBrandedEmail({
				to: auth.adminEmail,
				subject: "✅ J'WELLZ REALTY - Gmail Configuration Verified",
				heading: "Gmail Delivery Test Successful",
				details: [
					["Sender Account", customUser || "Configured Gmail account"],
					["Status", "Authenticated & Working"],
					["Timestamp", new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })],
				],
			});
			if (!sendResult) {
				return NextResponse.json({
					success: true,
					message: `${verifyResult.message} (Note: SMTP authenticated, but test email sending had an issue).`,
				});
			}
			return NextResponse.json({
				success: true,
				message: `${verifyResult.message} A test email was sent to ${auth.adminEmail}.`,
			});
		}

		return NextResponse.json({ success: true, message: verifyResult.message });
	}

	// 2. ACTION: Test AI Provider Connection
	if (action === "test-ai") {
		const provider = (body.provider as AiProvider) || "groq";
		let apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
		const model = typeof body.model === "string" ? body.model.trim() : undefined;

		if (!apiKey) {
			const creds = await getAiCredentials();
			apiKey = provider === "gemini" ? creds.geminiKey : provider === "openrouter" ? creds.openRouterKey : creds.groqKey;
		}

		if (!apiKey) {
			return NextResponse.json({ success: false, error: `No API key provided for ${provider.toUpperCase()}.` }, { status: 400 });
		}

		const result = await verifyAiCredentials(provider, apiKey, model);
		return NextResponse.json(result, { status: result.success ? 200 : 400 });
	}

	// 3. ACTION: Save Settings
	if (action === "save") {
		const settingsToUpdate = body.settings;
		if (!settingsToUpdate || typeof settingsToUpdate !== "object") {
			return NextResponse.json({ error: "Missing settings to save." }, { status: 400 });
		}

		const allowedKeys = [
			"gmail_user",
			"gmail_app_password",
			"email_from",
			"resend_api_key",
			"primary_ai_provider",
			"groq_api_key",
			"groq_model",
			"openrouter_api_key",
			"openrouter_model",
			"gemini_api_key",
			"gemini_model",
		];

		const rowsToUpsert: Array<{ key: string; value: string; updated_by: string; updated_at: string }> = [];
		const now = new Date().toISOString();

		for (const [k, v] of Object.entries(settingsToUpdate)) {
			const normalizedKey = k.toLowerCase().trim();
			if (!allowedKeys.includes(normalizedKey)) continue;

			// If value is null, undefined, or empty string, we can update or leave it
			if (typeof v === "string") {
				const val = normalizedKey === "gmail_app_password" ? v.replace(/\s/g, "") : v.trim();
				rowsToUpsert.push({
					key: normalizedKey,
					value: val,
					updated_by: auth.userId,
					updated_at: now,
				});
			}
		}

		if (rowsToUpsert.length > 0) {
			const { error } = await supabaseServer
				.from("system_settings")
				.upsert(rowsToUpsert, { onConflict: "key" });

			if (error) {
				return NextResponse.json({ error: error.message }, { status: 500 });
			}

			// Invalidate memory cache so changes take effect instantly
			invalidateSystemSettingsCache();

			// Audit log entry
			try {
				await supabaseServer.from("activity_logs").insert({
					user_id: auth.userId,
					action: "update",
					table_name: "system_settings",
					record_id: "integration_settings",
					changes: {
						updatedKeys: rowsToUpsert.map((r) => r.key),
					},
				});
			} catch {
				// Audit log is best-effort
			}
		}

		return NextResponse.json({
			success: true,
			message: "Settings saved successfully! Changes take effect immediately.",
			updatedKeys: rowsToUpsert.map((r) => r.key),
		});
	}

	return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
