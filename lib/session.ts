const SESSION_STORAGE_KEY = "jewellz.session_id";

function createSessionId() {
	if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
		return globalThis.crypto.randomUUID();
	}

	return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateSessionId() {
	if (typeof window === "undefined") return createSessionId();

	const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
	if (existing) return existing;

	const next = createSessionId();
	window.localStorage.setItem(SESSION_STORAGE_KEY, next);
	return next;
}
