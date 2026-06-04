import { NextResponse } from "next/server";
import { getPublishedProperties } from "@/lib/supabase/properties";

export async function GET() {
	return NextResponse.json({ data: await getPublishedProperties() });
}
