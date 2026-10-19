import { NextResponse } from "next/server";
import { saveNearbyPlaceGroups } from "@/lib/nearby-cache";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";

export const runtime = "nodejs";

/**
 * POST /api/nearby
 * Saves nearby places discovered client-side (via MapLibre queryRenderedFeatures)
 * to the Supabase cache so future page loads are instant.
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
