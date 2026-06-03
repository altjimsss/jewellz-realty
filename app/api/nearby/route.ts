import { NextResponse } from "next/server";
import { getNearbyPlaceGroups } from "@/lib/nearby-places";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const latitude = Number(searchParams.get("lat"));
	const longitude = Number(searchParams.get("lng"));
	const propertyType = searchParams.get("type") ?? undefined;

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return NextResponse.json({ error: "lat and lng query parameters are required." }, { status: 400 });
	}

	const groups = await getNearbyPlaceGroups({ latitude, longitude, propertyType });

	return NextResponse.json({ groups });
}
