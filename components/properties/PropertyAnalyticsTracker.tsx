"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getOrCreateSessionId } from "@/lib/session";

type PropertyAnalyticsTrackerProps = {
	propertyId: string;
};

export function PropertyAnalyticsTracker({ propertyId }: PropertyAnalyticsTrackerProps) {
	const { track } = useAnalytics();
	const activeSinceRef = useRef(0);
	const activeMillisecondsRef = useRef(0);
	const sentRef = useRef(false);
	const sessionIdRef = useRef("");

	const pauseActiveTime = useCallback(() => {
		if (!activeSinceRef.current) return;
		activeMillisecondsRef.current += Date.now() - activeSinceRef.current;
		activeSinceRef.current = 0;
	}, []);

	const sendDwellTime = useCallback(() => {
		if (sentRef.current) return;
		pauseActiveTime();
		const durationSeconds = Math.round(activeMillisecondsRef.current / 1000);
		if (durationSeconds < 5) return;
		sentRef.current = true;
		track("property_dwell_time", { propertyId, durationSeconds, sessionId: sessionIdRef.current });
		activeMillisecondsRef.current = 0;
	}, [pauseActiveTime, propertyId, track]);

	useEffect(() => {
		activeMillisecondsRef.current = 0;
		activeSinceRef.current = document.visibilityState === "visible" ? Date.now() : 0;
		sentRef.current = false;
		sessionIdRef.current = getOrCreateSessionId();
		track("property_view", { propertyId });

		const resumeTracking = (forcePageView = false) => {
			const nextSessionId = getOrCreateSessionId();
			const sessionChanged = nextSessionId !== sessionIdRef.current;
			if (sessionChanged || forcePageView) {
				sendDwellTime();
				sessionIdRef.current = nextSessionId;
				activeMillisecondsRef.current = 0;
				sentRef.current = false;
				track("page_view", { immediate: true, sessionId: nextSessionId });
				track("property_view", { propertyId, sessionId: nextSessionId });
			} else if (sentRef.current) {
				activeMillisecondsRef.current = 0;
				sentRef.current = false;
			}
			if (!activeSinceRef.current) activeSinceRef.current = Date.now();
		};

		const handlePageHide = () => {
			pauseActiveTime();
			sendDwellTime();
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") pauseActiveTime();
			else resumeTracking();
		};
		const handlePageShow = (event: PageTransitionEvent) => {
			if (!event.persisted) return;
			if (document.visibilityState === "visible") resumeTracking(true);
		};
		const sessionTouchTimer = window.setInterval(() => {
			if (document.visibilityState === "visible") getOrCreateSessionId();
		}, 5 * 60 * 1000);

		window.addEventListener("pagehide", handlePageHide);
		window.addEventListener("pageshow", handlePageShow);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			sendDwellTime();
			window.clearInterval(sessionTouchTimer);
			window.removeEventListener("pagehide", handlePageHide);
			window.removeEventListener("pageshow", handlePageShow);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [pauseActiveTime, propertyId, sendDwellTime, track]);

	return null;
}
