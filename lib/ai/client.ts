export type AiMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

export type AiCompletionOptions = {
	caller?: "property-chat" | "recommendations" | "analytics-chat" | "analytics-report" | string;
	messages: AiMessage[];
	temperature?: number;
	maxTokens?: number;
	responseFormat?: "json_object" | "text";
	timeoutMs?: number;
};

export type AiCompletionResult = {
	content: string;
	provider: "groq" | "openrouter";
	model: string;
};

const DEFAULT_GROQ_MODELS = [
	"openai/gpt-oss-120b",
	"qwen/qwen3.8-27b",
	"openai/gpt-oss-20b",
];

const DEFAULT_OPENROUTER_MODELS = [
	"z-ai/glm-4.5-air:free",
	"openai/gpt-oss-120b:free",
	"nvidia/nemotron-3-super-120b-a12b:free",
];

function parseModels(envValue?: string): string[] {
	if (!envValue) return [];
	return envValue
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);
}

export function getGroqModels(caller?: string): string[] {
	let specificEnv: string | undefined;

	if (caller === "property-chat") {
		specificEnv = process.env.GROQ_PROPERTY_CHAT_MODEL;
	} else if (caller === "recommendations") {
		specificEnv = process.env.GROQ_RECOMMENDATION_MODEL;
	} else if (caller === "analytics-chat" || caller === "analytics-report") {
		specificEnv = process.env.GROQ_ANALYTICS_MODEL;
	}

	const configured = [
		...parseModels(specificEnv),
		...parseModels(process.env.GROQ_MODEL),
		...DEFAULT_GROQ_MODELS,
	];

	return configured.filter((model, index, all) => all.indexOf(model) === index);
}

export function getOpenRouterModels(caller?: string): string[] {
	let specificEnv: string | undefined;

	if (caller === "property-chat") {
		specificEnv = process.env.OPENROUTER_PROPERTY_CHAT_MODEL;
	} else if (caller === "recommendations") {
		specificEnv = process.env.OPENROUTER_RECOMMENDATION_MODEL;
	} else if (caller === "analytics-chat" || caller === "analytics-report") {
		specificEnv = process.env.OPENROUTER_ANALYTICS_MODEL;
	}

	const configured = [
		...parseModels(specificEnv),
		...parseModels(process.env.OPENROUTER_RECOMMENDATION_MODEL),
		...DEFAULT_OPENROUTER_MODELS,
	];

	return configured.filter((model, index, all) => all.indexOf(model) === index);
}

export function hasAiConfigured(): boolean {
	return Boolean(process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY);
}

export function getPrimaryAiProvider(): "groq" | "openrouter" | null {
	if (process.env.GROQ_API_KEY) return "groq";
	if (process.env.OPENROUTER_API_KEY) return "openrouter";
	return null;
}

function extractContentFromPayload(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const candidate = data as {
		choices?: Array<{ message?: { content?: unknown } }>;
	};
	const content = candidate.choices?.[0]?.message?.content;
	return typeof content === "string" ? content.trim() : null;
}

async function callGroq(
	apiKey: string,
	model: string,
	options: AiCompletionOptions,
	signal: AbortSignal,
): Promise<string | null> {
	// Standard Groq payload (OpenAI-compatible)
	const bodyPayload: Record<string, unknown> = {
		model,
		messages: options.messages,
		temperature: options.temperature ?? 0.25,
		max_tokens: options.maxTokens ?? 650,
	};

	if (options.responseFormat === "json_object") {
		bodyPayload.response_format = { type: "json_object" };
	}

	const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(bodyPayload),
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.warn(`Groq request failed for model ${model} (status ${response.status}):`, errorText);
		return null;
	}

	const data: unknown = await response.json().catch(() => null);
	return extractContentFromPayload(data);
}

async function callOpenRouter(
	apiKey: string,
	model: string,
	options: AiCompletionOptions,
	signal: AbortSignal,
): Promise<string | null> {
	const bodyPayload: Record<string, unknown> = {
		model,
		messages: options.messages,
		temperature: options.temperature ?? 0.25,
		max_tokens: options.maxTokens ?? 650,
	};

	if (options.responseFormat === "json_object") {
		bodyPayload.response_format = { type: "json_object" };
	}

	const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
			"HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
			"X-Title": "Jewellz Realty",
		},
		body: JSON.stringify(bodyPayload),
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		console.warn(`OpenRouter request failed for model ${model} (status ${response.status}):`, errorText);
		return null;
	}

	const data: unknown = await response.json().catch(() => null);
	return extractContentFromPayload(data);
}

/**
 * Executes an AI chat completion with Groq prioritized as the Primary AI provider.
 * Automatically falls back to OpenRouter if Groq encounters errors or rate limits.
 */
export async function runAiChatCompletion(
	options: AiCompletionOptions,
): Promise<AiCompletionResult | null> {
	const groqKey = process.env.GROQ_API_KEY?.trim();
	const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

	const timeoutMs = options.timeoutMs ?? 25_000;

	// 1. PRIMARY PROVIDER: Groq
	if (groqKey) {
		const groqModels = getGroqModels(options.caller);
		for (const model of groqModels) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const content = await callGroq(groqKey, model, options, controller.signal);
				if (content) {
					return {
						content,
						provider: "groq",
						model,
					};
				}
			} catch (err) {
				console.warn(`Groq execution error for model ${model}:`, err);
			} finally {
				clearTimeout(timeoutId);
			}
		}
	}

	// 2. SECONDARY / FALLBACK PROVIDER: OpenRouter
	if (openRouterKey) {
		const openRouterModels = getOpenRouterModels(options.caller);
		for (const model of openRouterModels) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const content = await callOpenRouter(openRouterKey, model, options, controller.signal);
				if (content) {
					return {
						content,
						provider: "openrouter",
						model,
					};
				}
			} catch (err) {
				console.warn(`OpenRouter execution error for model ${model}:`, err);
			} finally {
				clearTimeout(timeoutId);
			}
		}
	}

	return null;
}
