const VISITOR_STORAGE_KEY = "jewellz.anonymous_visitor_id";
const LEGACY_VISITOR_STORAGE_KEY = "jewellz.session_id";
const SESSION_COOKIE_KEY = "jewellz_anon";
const VISIT_SESSION_STORAGE_KEY = "jewellz.visit_session_id";
const VISIT_LAST_ACTIVE_KEY = "jewellz.visit_last_active_at";
const SESSION_INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

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

export function getOrCreateVisitorId() {
	if (typeof window === "undefined") return createSessionId();

	const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
	if (existing) {
		writeCookieSessionId(existing);
		return existing;
	}

	const legacy = window.localStorage.getItem(LEGACY_VISITOR_STORAGE_KEY);
	if (legacy) {
		window.localStorage.setItem(VISITOR_STORAGE_KEY, legacy);
		writeCookieSessionId(legacy);
		return legacy;
	}

	const cookieSessionId = readCookieSessionId();
	if (cookieSessionId) {
		window.localStorage.setItem(VISITOR_STORAGE_KEY, cookieSessionId);
		return cookieSessionId;
	}

	const next = createSessionId();
	window.localStorage.setItem(VISITOR_STORAGE_KEY, next);
	writeCookieSessionId(next);
	return next;
}

export function getOrCreateSessionId() {
	if (typeof window === "undefined") return createSessionId();
	const now = Date.now();
	const lastActiveAt = Number(window.sessionStorage.getItem(VISIT_LAST_ACTIVE_KEY) || 0);
	let sessionId = window.sessionStorage.getItem(VISIT_SESSION_STORAGE_KEY);
	if (!sessionId || !lastActiveAt || now - lastActiveAt >= SESSION_INACTIVITY_LIMIT_MS) {
		sessionId = createSessionId();
		window.sessionStorage.setItem(VISIT_SESSION_STORAGE_KEY, sessionId);
	}
	window.sessionStorage.setItem(VISIT_LAST_ACTIVE_KEY, String(now));
	return sessionId;
}
