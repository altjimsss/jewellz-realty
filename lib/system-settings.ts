import { supabaseServer } from "@/lib/supabase/server";

type SettingsCache = {
	values: Map<string, string>;
	expiresAt: number;
};

let cache: SettingsCache | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds cache for high performance

/**
 * Loads all system settings into memory with a 30s TTL.
 * Falls back gracefully to an empty map if database access fails.
 */
export async function loadAllSystemSettings(forceRefresh = false): Promise<Map<string, string>> {
	const now = Date.now();
	if (!forceRefresh && cache && cache.expiresAt > now) {
		return cache.values;
	}

	try {
		const { data, error } = await supabaseServer
			.from("system_settings")
			.select("key, value");

		if (error) {
			console.warn("[system_settings] could not read from database:", error.message);
			return cache?.values ?? new Map();
		}

		const map = new Map<string, string>();
		for (const row of data ?? []) {
			if (typeof row.key === "string" && typeof row.value === "string") {
				map.set(row.key.trim().toLowerCase(), row.value.trim());
			}
		}

		cache = {
			values: map,
			expiresAt: now + CACHE_TTL_MS,
		};

		return map;
	} catch (err) {
		console.warn("[system_settings] unexpected error reading settings:", err);
		return cache?.values ?? new Map();
	}
}

/**
 * Clears the server-side in-memory cache so updates take effect immediately.
 */
export function invalidateSystemSettingsCache() {
	cache = null;
}

/**
 * Gets a single setting value by key, checking system_settings first, then process.env.
 */
export async function getSettingValue(key: string, envFallbackKey?: string): Promise<string> {
	const settings = await loadAllSystemSettings();
	const normalizedKey = key.trim().toLowerCase();

	const dbValue = settings.get(normalizedKey);
	if (dbValue && dbValue.length > 0) {
		return dbValue;
	}

	if (envFallbackKey && process.env[envFallbackKey]) {
		return process.env[envFallbackKey]!.trim();
	}

	// Also check uppercase version in process.env by default
	const defaultEnvKey = key.toUpperCase().replace(/-/g, "_");
	if (process.env[defaultEnvKey]) {
		return process.env[defaultEnvKey]!.trim();
	}

	return "";
}

/**
 * Gets multiple setting values in one pass.
 */
export async function getSettingValues<K extends string>(
	spec: Record<K, { dbKey: string; envKey?: string; default?: string }>,
): Promise<Record<K, string>> {
	const settings = await loadAllSystemSettings();
	const result = {} as Record<K, string>;

	for (const [prop, config] of Object.entries(spec) as [K, { dbKey: string; envKey?: string; default?: string }][]) {
		const dbVal = settings.get(config.dbKey.toLowerCase().trim());
		if (dbVal && dbVal.length > 0) {
			result[prop] = dbVal;
			continue;
		}

		if (config.envKey && process.env[config.envKey]) {
			result[prop] = process.env[config.envKey]!.trim();
			continue;
		}

		const defaultEnv = config.dbKey.toUpperCase().replace(/-/g, "_");
		if (process.env[defaultEnv]) {
			result[prop] = process.env[defaultEnv]!.trim();
			continue;
		}

		result[prop] = config.default ?? "";
	}

	return result;
}
