"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

type PropertyAnalyticsTrackerProps = {
	propertyId: string;
};

export function PropertyAnalyticsTracker({ propertyId }: PropertyAnalyticsTrackerProps) {
	const { track } = useAnalytics();
	const startedAtRef = useRef(0);
	const sentRef = useRef(false);

	const sendDwellTime = useCallback(() => {
		if (sentRef.current || !startedAtRef.current) return;
		const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
		if (durationSeconds < 5) return;
		sentRef.current = true;
		track("property_dwell_time", { propertyId, durationSeconds });
	}, [propertyId, track]);

	useEffect(() => {
		startedAtRef.current = Date.now();
		sentRef.current = false;
		track("property_view", { propertyId });

		const handlePageHide = () => sendDwellTime();
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") sendDwellTime();
		};

		window.addEventListener("pagehide", handlePageHide);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			sendDwellTime();
			window.removeEventListener("pagehide", handlePageHide);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [propertyId, sendDwellTime, track]);

	return null;
}
