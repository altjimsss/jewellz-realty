import { NextResponse } from "next/server";
import { getPublicFooterContent } from "@/lib/supabase/content";

export const dynamic = "force-dynamic";

export async function GET() {
	return NextResponse.json(await getPublicFooterContent(), {
		headers: { "Cache-Control": "no-store, max-age=0" },
	});
}
