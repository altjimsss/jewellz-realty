"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Global listener that intercepts password recovery flows.
 * If a user clicks a reset password email link and Supabase redirects
 * them to any page (such as / or /login) with recovery credentials,
 * this listener redirects them directly to /reset-password so they can set a new password.
 */
export function AuthRecoveryListener() {
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (pathname === "/reset-password") return;

		// Check if the current URL hash or query string indicates password recovery
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			const search = window.location.search;
			if (hash.includes("type=recovery") || search.includes("type=recovery")) {
				router.replace(`/reset-password${search}${hash}`);
				return;
			}
		}

		// Listen for Supabase PASSWORD_RECOVERY auth event
		const {
			data: { subscription },
		} = supabaseBrowser.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY") {
				router.replace("/reset-password");
			}
		});

		return () => subscription.unsubscribe();
	}, [pathname, router]);

	return null;
}
