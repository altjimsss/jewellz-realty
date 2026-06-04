"use client";

import { useCallback } from "react";
import { trackEvent } from "@/lib/analytics";

export function useAnalytics() {
	const track = useCallback((event: string, payload?: Record<string, unknown>) => {
		void trackEvent(event, payload);
	}, []);

	return { track };
}
