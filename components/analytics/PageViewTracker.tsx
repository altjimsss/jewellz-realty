"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAnalytics } from "@/hooks/useAnalytics";

const PRIVATE_ROUTE = /^\/(admin|agent|developer|login|reset-password)(\/|$)/;

export function PageViewTracker() {
	const pathname = usePathname();
	const { track } = useAnalytics();

	useEffect(() => {
		if (!pathname || PRIVATE_ROUTE.test(pathname)) return;
		track("page_view", { immediate: true });
	}, [pathname, track]);

	return null;
}

export default PageViewTracker;
