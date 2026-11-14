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
	if (!apiKey || !from) {
		console.warn("[email notification] not sent: RESEND_API_KEY or EMAIL_FROM is not configured");
		return false;
	}
	const details = message.details.filter(([, value]) => value).map(([label, value]) => `<tr><th style="text-align:left;padding:9px;border-bottom:1px solid #eee">${escapeHtml(label)}</th><td style="padding:9px;border-bottom:1px solid #eee">${renderDetail(label, value)}</td></tr>`).join("");
	let logo = "";
	try {
		const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
		if (site.protocol === "https:") logo = `<img src="${escapeHtml(new URL("/assets/logo-icon.png", site).toString())}" alt="J'WELLZ REALTY" width="38" height="38" style="vertical-align:middle;margin-right:10px"/>`;
	} catch { /* The wordmark remains if no public site URL is configured. */ }
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
		body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: `<div style="font:15px Arial,sans-serif;color:#171717;max-width:640px;margin:auto"><div style="background:#b8101a;padding:22px;color:white">${logo}<strong>${COMPANY}</strong><div style="font-size:12px;margin-top:6px">${TAGLINE}</div></div><main style="padding:24px"><h1 style="font-size:22px">${escapeHtml(message.heading)}</h1><table style="border-collapse:collapse;width:100%">${details}</table></main></div>` }),
	});
	if (!response.ok) {
		console.error("[email notification] provider rejected message", response.status, await response.text().catch(() => ""));
		return false;
	}
	return true;
}

export function adminNotificationEmail() {
	return process.env.ADMIN_NOTIFICATION_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
}
