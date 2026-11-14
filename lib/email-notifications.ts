import { supabaseServer } from "@/lib/supabase/server";
import nodemailer from "nodemailer";

const COMPANY = "J'WELLZ REALTY MARKETING AND DEVELOPMENT CORP.";
const TAGLINE = "Change the Dream Property";

type EmailMessage = { to: string; subject: string; heading: string; details: Array<[string, string | null | undefined]> };

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

export async function sendBrandedEmail(message: EmailMessage) {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM;
	if (!from) {
		console.warn("[email notification] not sent: EMAIL_FROM is not configured");
		return false;
	}
	const senderAddress = from.match(/<([^>]+)>/)?.[1]?.trim() ?? from.trim();
	if (/^[^\s@]+@gmail\.com$/i.test(senderAddress)) {
		const gmailUser = process.env.GMAIL_USER?.trim();
		const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
		if (!gmailUser || !gmailAppPassword) {
			console.warn("[email notification] Gmail sender selected but GMAIL_USER or GMAIL_APP_PASSWORD is missing");
			return false;
		}
		if (senderAddress.toLowerCase() !== gmailUser.toLowerCase()) {
			console.error("[email notification] EMAIL_FROM Gmail address must match GMAIL_USER");
			return false;
		}
		try {
			const transporter = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gmailUser, pass: gmailAppPassword } });
			await transporter.sendMail({ from, to: message.to, subject: message.subject, html: buildEmailHtml(message) });
			return true;
		} catch (error) {
			console.error("[email notification] Gmail SMTP delivery failed", error);
			return false;
		}
	}
	if (!apiKey) {
		console.warn("[email notification] not sent: configure Gmail credentials for a Gmail sender or RESEND_API_KEY for a verified Resend domain");
		return false;
	}
	const html = buildEmailHtml(message);
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
		body: JSON.stringify({ from, to: [message.to], subject: message.subject, html }),
	});
	if (!response.ok) {
		console.error("[email notification] provider rejected message", response.status, await response.text().catch(() => ""));
		return false;
	}
	return true;
}

function buildEmailHtml(message: Omit<EmailMessage, "to"> | EmailMessage) {
	const details = message.details.filter(([, value]) => value).map(([label, value]) => `<tr><th style="text-align:left;padding:9px;border-bottom:1px solid #eee">${escapeHtml(label)}</th><td style="padding:9px;border-bottom:1px solid #eee">${renderDetail(label, value)}</td></tr>`).join("");
	let logo = "";
	try {
		const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
		if (site.protocol === "https:") logo = `<img src="${escapeHtml(new URL("/assets/logo-icon.png", site).toString())}" alt="J'WELLZ REALTY" width="38" height="38" style="vertical-align:middle;margin-right:10px"/>`;
	} catch { /* The wordmark remains if no public site URL is configured. */ }
	return `<div style="font:15px Arial,sans-serif;color:#171717;max-width:640px;margin:auto"><div style="background:#b8101a;padding:22px;color:white">${logo}<strong>${COMPANY}</strong><div style="font-size:12px;margin-top:6px">${TAGLINE}</div></div><main style="padding:24px"><h1 style="font-size:22px">${escapeHtml(message.heading)}</h1><table style="border-collapse:collapse;width:100%">${details}</table></main></div>`;
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
