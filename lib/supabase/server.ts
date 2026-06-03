import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServer() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error("Supabase server environment variables are missing.");
	}

	cachedClient ??= createClient(supabaseUrl, supabaseKey);
	return cachedClient;
}

export const supabaseServer = new Proxy({} as SupabaseClient, {
	get(_target, property, receiver) {
		return Reflect.get(getSupabaseServer(), property, receiver);
	},
});
