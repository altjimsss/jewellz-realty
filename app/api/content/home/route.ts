import { NextResponse } from "next/server";
import { getPublicHomeContent } from "@/lib/supabase/content";

export async function GET() {
	return NextResponse.json(await getPublicHomeContent());
}
