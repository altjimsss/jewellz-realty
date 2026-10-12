import { NextResponse } from "next/server";
import { getPublicCareerJobs } from "@/lib/supabase/content";

export async function GET() {
	return NextResponse.json({ jobs: await getPublicCareerJobs() });
}
