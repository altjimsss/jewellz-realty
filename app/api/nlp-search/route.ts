import { NextResponse } from "next/server";
import { nlpSearch } from "@/lib/nlp-search";
import { sanitizePropertySearchQuery } from "@/lib/property-search";

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const rawPrompt = typeof body?.prompt === "string" ? body.prompt : typeof body?.query === "string" ? body.query : "";
	const prompt = sanitizePropertySearchQuery(rawPrompt);

	if (!prompt) {
		return NextResponse.json({ error: "Search prompt is required." }, { status: 400 });
	}

	return NextResponse.json(await nlpSearch(prompt));
}
