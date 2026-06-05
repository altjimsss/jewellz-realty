const SESSION_STORAGE_KEY = "jewellz.anonymous_visitor_id";
const LEGACY_SESSION_STORAGE_KEY = "jewellz.session_id";
const SESSION_COOKIE_KEY = "jewellz_anon";

function createSessionId() {
	if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
		return `jr-anon-${globalThis.crypto.randomUUID()}`;
	}

	return `jr-anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function readCookieSessionId() {
	if (typeof document === "undefined") return "";
	const cookie = document.cookie
		.split("; ")
		.find((item) => item.startsWith(`${SESSION_COOKIE_KEY}=`));
	return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
}

function writeCookieSessionId(value: string) {
	if (typeof document === "undefined") return;
	const maxAge = 60 * 60 * 24 * 180;
	document.cookie = `${SESSION_COOKIE_KEY}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function getOrCreateSessionId() {
	if (typeof window === "undefined") return createSessionId();

	const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
	if (existing) {
		writeCookieSessionId(existing);
		return existing;
	}

	const legacy = window.localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
	if (legacy) {
		window.localStorage.setItem(SESSION_STORAGE_KEY, legacy);
		writeCookieSessionId(legacy);
		return legacy;
	}

	const cookieSessionId = readCookieSessionId();
	if (cookieSessionId) {
		window.localStorage.setItem(SESSION_STORAGE_KEY, cookieSessionId);
		return cookieSessionId;
	}

	const next = createSessionId();
	window.localStorage.setItem(SESSION_STORAGE_KEY, next);
	writeCookieSessionId(next);
	return next;
}

export const getAnonymousVisitorId = getOrCreateSessionId;
