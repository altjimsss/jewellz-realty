import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload = {
	type?: "INSERT" | "UPDATE" | "DELETE";
	table?: string;
	schema?: string;
	record?: PropertyWebhookRecord | null;
	old_record?: PropertyWebhookRecord | null;
};

type PropertyWebhookRecord = {
	id?: string;
	title?: string | null;
	embedding_text?: string | null;
	embedding?: unknown;
};

const model = new Supabase.ai.Session("gte-small");

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function formatEmbeddingForPostgres(embedding: number[]) {
	return `[${embedding.join(",")}]`;
}

Deno.serve(async (request) => {
	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405);
	}

	const webhookSecret = Deno.env.get("PROPERTY_EMBEDDING_WEBHOOK_SECRET");

	if (webhookSecret && request.headers.get("x-webhook-secret") !== webhookSecret) {
		return jsonResponse({ error: "Unauthorized." }, 401);
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

	if (!supabaseUrl || !serviceRoleKey) {
		return jsonResponse({ error: "Missing Supabase environment variables." }, 500);
	}

	let payload: WebhookPayload;

	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON payload." }, 400);
	}

	const record = payload.record;

	if (!record?.id) {
		return jsonResponse({ skipped: true, reason: "Missing property record id." });
	}

	if (payload.type === "DELETE") {
		return jsonResponse({ skipped: true, reason: "Delete events do not need embeddings." });
	}

	if (record.embedding) {
		return jsonResponse({ skipped: true, reason: "Property already has an embedding.", id: record.id });
	}

	if (!record.embedding_text?.trim()) {
		return jsonResponse({ skipped: true, reason: "Property has no embedding_text.", id: record.id });
	}

	const embedding = await model.run(record.embedding_text, {
		mean_pool: true,
		normalize: true,
	});

	if (!Array.isArray(embedding) || embedding.length !== 384) {
		return jsonResponse({ error: `Expected 384-dimensional embedding, received ${Array.isArray(embedding) ? embedding.length : "unknown"}.` }, 500);
	}

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { persistSession: false },
	});
	const { error } = await supabase
		.from("properties")
		.update({
			embedding: formatEmbeddingForPostgres(embedding),
			embedding_updated_at: new Date().toISOString(),
		})
		.eq("id", record.id);

	if (error) {
		return jsonResponse({ error: error.message }, 500);
	}

	return jsonResponse({
		updated: true,
		id: record.id,
		title: record.title,
		dimensions: embedding.length,
	});
});
