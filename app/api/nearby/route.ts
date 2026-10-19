import { NextResponse } from "next/server";
import { saveNearbyPlaceGroups } from "@/lib/nearby-cache";
import { getNearbyPlaceGroups } from "@/lib/nearby-places";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const latitude = Number(searchParams.get("lat"));
	const longitude = Number(searchParams.get("lng"));
	const propertyType = searchParams.get("type") ?? undefined;
	const propertyId = searchParams.get("propertyId") ?? undefined;

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return NextResponse.json({ error: "lat and lng query parameters are required." }, { status: 400 });
	}

	const groups = await getNearbyPlaceGroups({ latitude, longitude, propertyType });

	// Persist to the property cache so the detail page loads instantly next time.
	if (propertyId && groups.some((group) => group.places.length > 0)) {
		await saveNearbyPlaceGroups(propertyId, groups);
	}

	return NextResponse.json({ groups });
}
