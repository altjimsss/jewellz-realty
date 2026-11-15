import { getSettingValues } from "@/lib/system-settings";

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
	provider: "groq" | "openrouter" | "gemini";
	model: string;
};

export type AiProvider = "groq" | "openrouter" | "gemini";

const DEFAULT_GROQ_MODELS = [
	"openai/gpt-oss-120b",
	"qwen/qwen3.8-27b",
	"openai/gpt-oss-20b",
];

const DEFAULT_OPENROUTER_MODELS = [
	"openrouter/free",
];

const DEFAULT_GEMINI_MODELS = [
	"gemini-1.5-flash",
	"gemini-2.0-flash",
	"gemini-1.5-pro",
];

const RETIRED_OPENROUTER_FREE_MODELS = new Set([
	"z-ai/glm-4.5-air:free",
	"openai/gpt-oss-120b:free",
	"nvidia/nemotron-3-super-120b-a12b:free",
]);

function parseModels(envValue?: string): string[] {
	if (!envValue) return [];
	return envValue
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);
}

/**
 * Resolves AI credentials dynamically:
 * Checks system_settings first, then falls back to environment variables.
 */
export async function getAiCredentials() {
	const values = await getSettingValues({
		primaryProvider: { dbKey: "primary_ai_provider", default: "groq" },
		groqKey: { dbKey: "groq_api_key", envKey: "GROQ_API_KEY" },
		groqModel: { dbKey: "groq_model", envKey: "GROQ_MODEL" },
		openRouterKey: { dbKey: "openrouter_api_key", envKey: "OPENROUTER_API_KEY" },
		openRouterModel: { dbKey: "openrouter_model", envKey: "OPENROUTER_RECOMMENDATION_MODEL" },
		geminiKey: { dbKey: "gemini_api_key", envKey: "GEMINI_API_KEY" },
		geminiModel: { dbKey: "gemini_model", envKey: "GEMINI_MODEL", default: "gemini-1.5-flash" },
	});

	let primaryProvider: AiProvider = "groq";
	const candidate = values.primaryProvider.toLowerCase().trim();
	if (candidate === "openrouter" || candidate === "gemini") {
		primaryProvider = candidate;
	}

	return {
		primaryProvider,
		groqKey: values.groqKey.trim(),
		groqModel: values.groqModel.trim(),
		openRouterKey: values.openRouterKey.trim(),
		openRouterModel: values.openRouterModel.trim(),
		geminiKey: values.geminiKey.trim(),
		geminiModel: values.geminiModel.trim(),
	};
}

export async function getGroqModels(caller?: string): Promise<string[]> {
	const creds = await getAiCredentials();
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
		...parseModels(creds.groqModel),
		...DEFAULT_GROQ_MODELS,
	];

	return configured.filter((model, index, all) => all.indexOf(model) === index);
}

export async function getOpenRouterModels(caller?: string): Promise<string[]> {
	const creds = await getAiCredentials();
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
		...parseModels(creds.openRouterModel),
		...DEFAULT_OPENROUTER_MODELS,
	].map((model) => RETIRED_OPENROUTER_FREE_MODELS.has(model) ? "openrouter/free" : model);

	return configured.filter((model, index, all) => all.indexOf(model) === index);
}

export async function getGeminiModels(): Promise<string[]> {
	const creds = await getAiCredentials();
	const configured = [
		...parseModels(creds.geminiModel),
		...DEFAULT_GEMINI_MODELS,
	];
	return configured.filter((model, index, all) => all.indexOf(model) === index);
}

export async function hasAiConfigured(): Promise<boolean> {
	const creds = await getAiCredentials();
	return Boolean(creds.groqKey || creds.openRouterKey || creds.geminiKey);
}

export async function getPrimaryAiProvider(): Promise<AiProvider | null> {
	const creds = await getAiCredentials();
	if (creds.primaryProvider === "gemini" && creds.geminiKey) return "gemini";
	if (creds.primaryProvider === "openrouter" && creds.openRouterKey) return "openrouter";
	if (creds.groqKey) return "groq";
	if (creds.openRouterKey) return "openrouter";
	if (creds.geminiKey) return "gemini";
	return null;
}

/**
 * Strips chain-of-thought <think>…</think> blocks emitted by reasoning models
 * (e.g. qwen/qwen3.8-27b, openai/gpt-oss-120b on Groq) so callers always
 * receive only the final answer text.
 */
function stripThinkingTokens(content: string): string {
	return content
		.replace(/<think>[\s\S]*?<\/think>/gi, "")
		.replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, "")
		.trim();
}

function extractContentFromPayload(data: unknown): string | null {
	if (!data || typeof data !== "object") return null;
	const candidate = data as {
		choices?: Array<{ message?: { content?: unknown } }>;
	};
	const content = candidate.choices?.[0]?.message?.content;
	if (typeof content !== "string") return null;
	const cleaned = stripThinkingTokens(content);
	return cleaned || null;
}

async function callGroq(
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

	if (options.caller === "recommendations") {
		bodyPayload.reasoning_effort = "low";
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
			"X-Title": "J'WELLZ REALTY",
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
 * Google Gemini via OpenAI-compatible endpoint.
 * Supported on Gemini 1.5/2.0 API keys.
 */
async function callGemini(
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

	const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
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
		console.warn(`Gemini request failed for model ${model} (status ${response.status}):`, errorText);
		return null;
	}

	const data: unknown = await response.json().catch(() => null);
	return extractContentFromPayload(data);
}

/**
 * Tests live connection for a specific AI provider.
 */
export async function verifyAiCredentials(provider: AiProvider, apiKey: string, model?: string) {
	const testOptions: AiCompletionOptions = {
		messages: [
			{ role: "user", content: "Reply with the single word: OK" },
		],
		maxTokens: 10,
		timeoutMs: 12_000,
	};

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), testOptions.timeoutMs);

	try {
		let reply: string | null = null;
		const targetModel = model?.trim() || (provider === "groq" ? "openai/gpt-oss-120b" : provider === "gemini" ? "gemini-1.5-flash" : "openrouter/free");

		if (provider === "groq") {
			reply = await callGroq(apiKey, targetModel, testOptions, controller.signal);
		} else if (provider === "gemini") {
			reply = await callGemini(apiKey, targetModel, testOptions, controller.signal);
		} else {
			reply = await callOpenRouter(apiKey, targetModel, testOptions, controller.signal);
		}

		if (reply) {
			return { success: true, message: `Connected successfully to ${provider.toUpperCase()} (${targetModel})! Test response: "${reply.slice(0, 30)}"` };
		}
		return { success: false, error: `Connection failed: ${provider.toUpperCase()} returned an empty response.` };
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return { success: false, error: `Connection error (${provider.toUpperCase()}): ${msg}` };
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Executes an AI chat completion dynamically using configured providers.
 * Respects primaryProvider and seamlessly cascades to other available providers.
 */
export async function runAiChatCompletion(
	options: AiCompletionOptions,
): Promise<AiCompletionResult | null> {
	const creds = await getAiCredentials();
	const timeoutMs = options.timeoutMs ?? 25_000;

	// Build prioritized list of providers to attempt
	const providerOrder: AiProvider[] = [creds.primaryProvider];
	const fallbacks: AiProvider[] = ["groq", "gemini", "openrouter"];
	for (const p of fallbacks) {
		if (!providerOrder.includes(p)) providerOrder.push(p);
	}

	for (const provider of providerOrder) {
		if (provider === "groq" && creds.groqKey) {
			const groqModels = await getGroqModels(options.caller);
			for (const model of groqModels) {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
				try {
					const content = await callGroq(creds.groqKey, model, options, controller.signal);
					if (content) {
						return { content, provider: "groq", model };
					}
				} catch (err) {
					console.warn(`Groq execution error for model ${model}:`, err);
				} finally {
					clearTimeout(timeoutId);
				}
			}
		}

		if (provider === "gemini" && creds.geminiKey) {
			const geminiModels = await getGeminiModels();
			for (const model of geminiModels) {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
				try {
					const content = await callGemini(creds.geminiKey, model, options, controller.signal);
					if (content) {
						return { content, provider: "gemini", model };
					}
				} catch (err) {
					console.warn(`Gemini execution error for model ${model}:`, err);
				} finally {
					clearTimeout(timeoutId);
				}
			}
		}

		if (provider === "openrouter" && creds.openRouterKey) {
			const openRouterModels = await getOpenRouterModels(options.caller);
			for (const model of openRouterModels) {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
				try {
					const content = await callOpenRouter(creds.openRouterKey, model, options, controller.signal);
					if (content) {
						return { content, provider: "openrouter", model };
					}
				} catch (err) {
					console.warn(`OpenRouter execution error for model ${model}:`, err);
				} finally {
					clearTimeout(timeoutId);
				}
			}
		}
	}

	return null;
}
