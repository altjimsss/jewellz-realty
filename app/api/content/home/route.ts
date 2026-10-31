import { NextResponse } from "next/server";
import { getPublicHomeContent } from "@/lib/supabase/content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
	const data = await getPublicHomeContent();
	return NextResponse.json(data, {
		headers: {
			"Cache-Control": "no-store, must-revalidate",
		},
	});
}
