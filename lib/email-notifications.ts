import { supabaseServer } from "@/lib/supabase/server";
import { getSettingValues } from "@/lib/system-settings";
import { readFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

const COMPANY = "J'WELLZ REALTY MARKETING AND DEVELOPMENT CORP.";
const TAGLINE = "Change the Dream Property";
const EMAIL_BANNER_CID = "jwells-email-banner@jewellzrealty";

type EmailMessage = {
	to: string;
	subject: string;
	heading: string;
	details: Array<[string, string | null | undefined]>;
	action?: { label: string; url: string };
};

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function renderDetail(label: string, value: string | null | undefined) {
	if (!value) return "";
	if (label === "Agent portal" || label === "Resume") {
		try {
			const url = new URL(value);
			if (url.protocol === "https:") return `<a href="${escapeHtml(url.toString())}" style="color:#b8101a;font-weight:600">${label === "Resume" ? "Open resume" : "View in agent portal"}</a>`;
		} catch { /* Render malformed links as plain text. */ }
	}
	return escapeHtml(value);
}

/**
 * Resolves email credentials dynamically:
 * Checks system_settings first, then falls back to environment variables.
 */
export async function getEmailCredentials() {
	const credentials = await getSettingValues({
		gmailUser: { dbKey: "gmail_user", envKey: "GMAIL_USER" },
		gmailAppPassword: { dbKey: "gmail_app_password", envKey: "GMAIL_APP_PASSWORD" },
		emailFrom: { dbKey: "email_from", envKey: "EMAIL_FROM" },
		resendApiKey: { dbKey: "resend_api_key", envKey: "RESEND_API_KEY" },
	});

	let { gmailUser, gmailAppPassword, emailFrom, resendApiKey } = credentials;
	gmailAppPassword = gmailAppPassword ? gmailAppPassword.replace(/\s/g, "") : "";

	// If gmailUser is provided, ensure emailFrom is set up nicely
	if (gmailUser && (!emailFrom || !emailFrom.includes(gmailUser))) {
		emailFrom = `J'WELLZ REALTY <${gmailUser}>`;
	}

	return {
		gmailUser,
		gmailAppPassword,
		emailFrom,
		resendApiKey,
	};
}

/**
 * Tests Gmail SMTP connection using either provided or saved credentials.
 */
export async function verifyGmailCredentials(customUser?: string, customPassword?: string) {
	let user = customUser?.trim();
	let pass = customPassword ? customPassword.replace(/\s/g, "") : undefined;

	if (!user || !pass) {
		const creds = await getEmailCredentials();
		user = user || creds.gmailUser;
		pass = pass || creds.gmailAppPassword;
	}

	if (!user || !pass) {
		return { success: false, error: "Gmail address and 16-character App Password are required." };
	}

	try {
		const transporter = nodemailer.createTransport({
			host: "smtp.gmail.com",
			port: 465,
			secure: true,
			auth: { user, pass },
		});
		await transporter.verify();
		return { success: true, message: `Successfully connected to Gmail SMTP as ${user}. Credentials are valid!` };
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		return { success: false, error: errorMessage };
	}
}

export async function sendBrandedEmail(message: EmailMessage) {
	const { gmailUser, gmailAppPassword, emailFrom, resendApiKey } = await getEmailCredentials();

	const from = emailFrom;
	if (!from) {
		console.warn("[email notification] not sent: EMAIL_FROM / gmail_user is not configured");
		return false;
	}

	const senderAddress = from.match(/<([^>]+)>/)?.[1]?.trim() ?? from.trim();
	const isGmail = /^[^\s@]+@gmail\.com$/i.test(senderAddress) || Boolean(gmailUser);
	const bannerPath = path.join(process.cwd(), "public", "assets", "jwells-email-banner.jpg");
	const bannerBytes = await readFile(bannerPath).catch((error) => {
		console.warn("[email notification] banner image unavailable", error);
		return null;
	});
	const text = buildEmailText(message);

	if (isGmail) {
		if (!gmailUser || !gmailAppPassword) {
			console.warn("[email notification] Gmail sender selected but gmail_user or gmail_app_password is missing");
			return false;
		}

		// Ensure the From header uses the configured Gmail address
		const effectiveFrom = from.includes(gmailUser) ? from : `J'WELLZ REALTY <${gmailUser}>`;

		try {
			const transporter = nodemailer.createTransport({
				host: "smtp.gmail.com",
				port: 465,
				secure: true,
				auth: { user: gmailUser, pass: gmailAppPassword },
			});
			await transporter.sendMail({
				from: effectiveFrom,
				to: message.to,
				subject: message.subject,
				text,
				html: buildEmailHtml(message, Boolean(bannerBytes)),
				attachments: bannerBytes ? [{ filename: "jwells-email-banner.jpg", content: bannerBytes, contentType: "image/jpeg", cid: EMAIL_BANNER_CID }] : [],
			});
			return true;
		} catch (error) {
			console.error("[email notification] Gmail SMTP delivery failed", error);
			return false;
		}
	}

	if (!resendApiKey) {
		console.warn("[email notification] not sent: configure Gmail credentials for a Gmail sender or RESEND_API_KEY for a verified Resend domain");
		return false;
	}

	const html = buildEmailHtml(message, Boolean(bannerBytes));
	const bannerAttachment = bannerBytes ? { filename: "jwells-email-banner.jpg", content: bannerBytes.toString("base64"), content_type: "image/jpeg", content_id: EMAIL_BANNER_CID } : null;
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
		body: JSON.stringify({ from, to: [message.to], subject: message.subject, html, text, ...(bannerAttachment ? { attachments: [bannerAttachment] } : {}) }),
	});

	if (!response.ok) {
		console.error("[email notification] provider rejected message", response.status, await response.text().catch(() => ""));
		return false;
	}

	return true;
}

export function buildEmailText(message: Omit<EmailMessage, "to"> | EmailMessage) {
	const details = message.details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join("\n");
	const action = message.action ? `\n\n${message.action.label}: ${message.action.url}` : "";
	return `${COMPANY}\n${TAGLINE}\n\n${message.heading}\n\n${details}${action}\n\nAutomated notification from J'WELLZ REALTY.`;
}

export function buildEmailHtml(message: Omit<EmailMessage, "to"> | EmailMessage, includeBanner = false) {
	const details = message.details.filter(([, value]) => value).map(([label, value]) => `<tr><th style="text-align:left;padding:9px;border-bottom:1px solid #eee;vertical-align:top">${escapeHtml(label)}</th><td style="padding:9px;border-bottom:1px solid #eee;white-space:pre-line">${renderDetail(label, value)}</td></tr>`).join("");
	let action = "";
	if (message.action) {
		try {
			const url = new URL(message.action.url);
			if (url.protocol === "https:") action = `<p style="margin:24px 0 0"><a href="${escapeHtml(url.toString())}" style="display:inline-block;background:#b8101a;color:#fff;padding:13px 20px;border-radius:6px;text-decoration:none;font-weight:700">${escapeHtml(message.action.label)}</a></p>`;
		} catch { /* Ignore invalid action URLs. */ }
	}
	const banner = includeBanner ? `<img src="cid:${EMAIL_BANNER_CID}" alt="J'WELLZ Realty Marketing and Development Corporation" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0"/>` : "";
	const header = banner || `<div style="background:#b8101a;padding:22px;color:white"><strong>${COMPANY}</strong><div style="font-size:12px;margin-top:6px">${TAGLINE}</div></div>`;
	return `<div style="font:15px Arial,sans-serif;color:#171717;max-width:640px;margin:auto">${header}<main style="padding:24px"><h1 style="font-size:22px">${escapeHtml(message.heading)}</h1><table style="border-collapse:collapse;width:100%">${details}</table>${action}</main></div>`;
}

export async function sendActiveAdminNotification(message: Omit<EmailMessage, "to">) {
	const { data: admins, error } = await supabaseServer
		.from("profiles")
		.select("email")
		.eq("role", "admin")
		.eq("is_active", true);
	if (error) {
		console.error("[admin email notification] could not load active admin recipients", error.message);
		return false;
	}
	const recipients = [...new Set((admins ?? []).map((admin) => admin.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))))];
	if (recipients.length === 0) {
		console.warn("[admin email notification] no active admin profiles with valid email addresses");
		return false;
	}
	const results = await Promise.allSettled(recipients.map((to) => sendBrandedEmail({ ...message, to })));
	return results.some((result) => result.status === "fulfilled" && result.value);
}
