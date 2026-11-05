import { NextResponse } from "next/server";
import { getCachedNearbyPlaceGroups, saveNearbyPlaceGroups } from "@/lib/nearby-cache";
import { fetchNearbyPlacesFromMapTiles, type NearbyPlaceGroup } from "@/lib/nearby-places";

export const runtime = "nodejs";

/**
 * GET /api/nearby?propertyId=...&lat=...&lng=...&type=...
 * Returns nearby places for Education, Health, Food, and Culture.
 * Serves from Supabase cache if present; otherwise reads Stadia vector POI tiles and caches the result.
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const propertyId = searchParams.get("propertyId");
		const lat = Number(searchParams.get("lat"));
		const lng = Number(searchParams.get("lng"));
		const propertyType = searchParams.get("type") ?? undefined;

		if (propertyId) {
			const cached = await getCachedNearbyPlaceGroups(propertyId);
			if (cached) {
				return NextResponse.json({ groups: cached, source: "cache" });
			}
		}

		if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
			return NextResponse.json({ error: "Valid lat and lng query parameters are required." }, { status: 400 });
		}

		const groups = await fetchNearbyPlacesFromMapTiles(lat, lng, propertyType);

		if (propertyId && groups.some((g) => g.places.length > 0)) {
			saveNearbyPlaceGroups(propertyId, groups).catch(() => {});
		}

		return NextResponse.json({ groups, source: "stadia-vector-tiles" });
	} catch (error) {
		console.error("GET /api/nearby error:", error);
		const message = error instanceof Error ? error.message : "Failed to fetch nearby places.";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}

/**
 * POST /api/nearby
 * Saves nearby places to the Supabase cache.
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			propertyId?: string;
			groups?: NearbyPlaceGroup[];
		};

		const { propertyId, groups } = body;

		if (!propertyId || !Array.isArray(groups)) {
			return NextResponse.json({ error: "propertyId and groups are required." }, { status: 400 });
		}

		if (groups.some((g) => g.places.length > 0)) {
			await saveNearbyPlaceGroups(propertyId, groups);
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
	}
}
