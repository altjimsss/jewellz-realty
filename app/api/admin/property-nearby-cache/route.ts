import { NextResponse } from "next/server";
import { getNearbyPlaceGroups } from "@/lib/nearby-places";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

type PropertyNearbyRow = {
	id: string;
	title: string | null;
	category: string | null;
	latitude: number | string | null;
	longitude: number | string | null;
};

function isAuthorized(request: Request) {
	const secret = process.env.EMBEDDING_ADMIN_SECRET;

	if (!secret) {
		return process.env.NODE_ENV !== "production";
	}

	const url = new URL(request.url);
	return request.headers.get("x-admin-secret") === secret || url.searchParams.get("secret") === secret;
}

function toNumber(value: number | string | null | undefined) {
	if (value == null || value === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

async function getLimit(request: Request) {
	try {
		const body: unknown = await request.clone().json();
		if (typeof body === "object" && body !== null && "limit" in body) {
			const limit = Number((body as { limit: unknown }).limit);
			if (Number.isFinite(limit)) return Math.max(1, Math.min(30, Math.floor(limit)));
		}
	} catch {
		// Body is optional.
	}

	const urlLimit = Number(new URL(request.url).searchParams.get("limit") ?? 1);
	return Number.isFinite(urlLimit) ? Math.max(1, Math.min(5, Math.floor(urlLimit))) : 1;
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to update nearby cache." }, { status: 500 });
	}

	const limit = await getLimit(request);
	const force = new URL(request.url).searchParams.get("force") === "true";
	const cachedResult = force
		? { data: [] }
		: await supabaseServer.from("property_nearby_places").select("property_id");
	const cachedPropertyIds = new Set((cachedResult.data ?? []).map((row: { property_id: string }) => row.property_id));
	const { data, error } = await supabaseServer
		.from("properties")
		.select("id, title, category, latitude, longitude")
		.not("latitude", "is", null)
		.not("longitude", "is", null)
		.order("updated_at", { ascending: false })
		.limit(100);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const rows = ((data ?? []) as PropertyNearbyRow[]).filter((row) => !cachedPropertyIds.has(row.id)).slice(0, limit);
	const results: Array<{ id: string; title: string | null; status: "updated" | "failed" | "skipped"; places?: number; error?: string }> = [];

	for (const row of rows) {
		const latitude = toNumber(row.latitude);
		const longitude = toNumber(row.longitude);

		if (latitude == null || longitude == null) {
			results.push({ id: row.id, title: row.title, status: "skipped", places: 0 });
			continue;
		}

		try {
			const groups = await getNearbyPlaceGroups({ latitude, longitude, propertyType: row.category ?? undefined });
			const places = groups.flatMap((group) =>
				group.places.map((place) => ({
					property_id: row.id,
					category: group.category,
					name: place.name,
					distance_meters: place.distanceMeters,
					latitude: place.latitude,
					longitude: place.longitude,
					address: place.address ?? null,
					map_uri: place.googleMapsUri ?? null,
					source: "openstreetmap",
					fetched_at: new Date().toISOString(),
				})),
			);

			await supabaseServer.from("property_nearby_places").delete().eq("property_id", row.id);

			if (places.length > 0) {
				const { error: insertError } = await supabaseServer.from("property_nearby_places").insert(places);
				if (insertError) throw new Error(insertError.message);
			}

			results.push({ id: row.id, title: row.title, status: "updated", places: places.length });
		} catch (error) {
			results.push({
				id: row.id,
				title: row.title,
				status: "failed",
				error: error instanceof Error ? error.message : "Nearby cache update failed.",
			});
		}
	}

	return NextResponse.json({
		requested: limit,
		found: rows.length,
		updated: results.filter((result) => result.status === "updated").length,
		failed: results.filter((result) => result.status === "failed").length,
		results,
	});
}
