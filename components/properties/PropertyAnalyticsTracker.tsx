"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";

type PropertyAnalyticsTrackerProps = {
	propertyId: string;
};

export function PropertyAnalyticsTracker({ propertyId }: PropertyAnalyticsTrackerProps) {
	const { track } = useAnalytics();

	useEffect(() => {
		track("property_view", { propertyId });
	}, [propertyId, track]);

	return null;
}
