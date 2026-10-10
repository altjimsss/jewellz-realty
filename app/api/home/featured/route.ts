import { NextResponse } from "next/server";
import { getHomepageFeaturedProperties } from "@/lib/supabase/properties";

export const dynamic = "force-dynamic";

function getNextManilaMidnight(now = new Date()) {
	const manilaParts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Manila",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);

	const year = Number(manilaParts.find((part) => part.type === "year")?.value);
	const month = Number(manilaParts.find((part) => part.type === "month")?.value);
	const day = Number(manilaParts.find((part) => part.type === "day")?.value);

	const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, 16, 0, 0);
	return new Date(nextMidnightUtc);
}

export async function GET() {
	const refreshesAt = getNextManilaMidnight();
	const properties = await getHomepageFeaturedProperties(12);

	return NextResponse.json(
		{
			properties,
			refreshesAt: refreshesAt.toISOString(),
			secondsUntilRefresh: Math.max(0, Math.floor((refreshesAt.getTime() - Date.now()) / 1000)),
		},
		{
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}
