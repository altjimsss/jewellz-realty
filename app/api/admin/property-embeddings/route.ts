import { NextResponse } from "next/server";
import { generatePropertyEmbedding, formatEmbeddingForPostgres } from "@/lib/ai/property-embeddings";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

type PropertyEmbeddingRow = {
	id: string;
	title: string | null;
	embedding_text: string | null;
};

function isAuthorized(request: Request) {
	const secret = process.env.EMBEDDING_ADMIN_SECRET;

	if (!secret) {
		return process.env.NODE_ENV !== "production";
	}

	const url = new URL(request.url);
	return request.headers.get("x-admin-secret") === secret || url.searchParams.get("secret") === secret;
}

async function getLimit(request: Request) {
	try {
		const body: unknown = await request.clone().json();
		if (typeof body === "object" && body !== null && "limit" in body) {
			const limit = Number((body as { limit: unknown }).limit);
			if (Number.isFinite(limit)) return Math.max(1, Math.min(50, Math.floor(limit)));
		}
	} catch {
		// Body is optional.
	}

	const urlLimit = Number(new URL(request.url).searchParams.get("limit") ?? 10);
	return Number.isFinite(urlLimit) ? Math.max(1, Math.min(50, Math.floor(urlLimit))) : 10;
}

export async function POST(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required to update property embeddings." }, { status: 500 });
	}

	const limit = await getLimit(request);
	const { data, error } = await supabaseServer
		.from("properties")
		.select("id, title, embedding_text")
		.is("embedding", null)
		.not("embedding_text", "is", null)
		.limit(limit);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const rows = (data ?? []) as PropertyEmbeddingRow[];
	const results: Array<{ id: string; title: string | null; status: "updated" | "failed"; error?: string }> = [];

	for (const row of rows) {
		if (!row.embedding_text) continue;

		try {
			const embedding = await generatePropertyEmbedding(row.embedding_text);
			const { error: updateError } = await supabaseServer
				.from("properties")
				.update({
					embedding: formatEmbeddingForPostgres(embedding),
					embedding_updated_at: new Date().toISOString(),
				})
				.eq("id", row.id);

			if (updateError) throw new Error(updateError.message);

			results.push({ id: row.id, title: row.title, status: "updated" });
		} catch (error) {
			results.push({
				id: row.id,
				title: row.title,
				status: "failed",
				error: error instanceof Error ? error.message : "Embedding generation failed.",
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
