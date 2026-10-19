import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * This endpoint previously used Overpass to bulk-warm the nearby places cache.
 * Nearby places are now discovered client-side by MapLibre GL JS
 * (queryRenderedFeatures on the Stadia Maps vector tiles) and saved
 * automatically via POST /api/nearby when a user first opens the map on a
 * property page.  No server-side bulk warming is needed anymore.
 */
export async function POST() {
	return NextResponse.json({
		message:
			"Nearby cache warming is now automatic. When a user opens the map on any property page, MapLibre queries POIs from the loaded vector tiles and saves them to the cache. No manual trigger is required.",
	});
}
