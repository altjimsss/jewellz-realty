import { NextResponse } from "next/server";
import { getPublicGalleryItems } from "@/lib/supabase/content";

export async function GET() {
	return NextResponse.json({ items: await getPublicGalleryItems() });
}
