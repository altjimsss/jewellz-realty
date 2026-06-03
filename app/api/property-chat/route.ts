import { NextResponse } from "next/server";
import {
	buildPropertyChatContext,
	buildPropertyChatConversation,
	buildPropertyChatPrompt,
	extractPropertyChatContent,
	parsePropertyChatRequestBody,
} from "@/lib/property-chat";

function getPropertyChatModels() {
	const configuredModels = (process.env.OPENROUTER_PROPERTY_CHAT_MODEL ?? process.env.OPENROUTER_RECOMMENDATION_MODEL ?? "")
		.split(",")
		.map((model) => model.trim())
		.filter(Boolean);

	return [
		...configuredModels,
		"z-ai/glm-4.5-air:free",
		"openai/gpt-oss-120b:free",
		"nvidia/nemotron-3-super-120b-a12b:free",
	].filter((model, index, models) => models.indexOf(model) === index);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedBody = parsePropertyChatRequestBody(body);

  if (!parsedBody) {
    return NextResponse.json({ error: "Missing slug or message." }, { status: 400 });
  }

  const propertyContext = await buildPropertyChatContext(parsedBody.slug);

  if (!propertyContext) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const conversation = buildPropertyChatConversation(parsedBody.history);
  const prompt = buildPropertyChatPrompt(propertyContext, parsedBody.message, conversation);

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 500 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    let lastStatus = 502;

    for (const model of getPropertyChatModels()) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "Jewellz Realty",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: "You are a concise, factual real estate assistant. Use only the provided context.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 650,
          temperature: 0.25,
        }),
        signal: controller.signal,
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        lastStatus = response.status;
        if ([400, 404, 429, 502, 503].includes(response.status)) continue;
        return NextResponse.json({ error: "Property chat provider request failed." }, { status: response.status });
      }

      const content = extractPropertyChatContent(data);

      if (content) {
        return NextResponse.json({
          content,
          propertyTitle: propertyContext.property.title,
          fallbackReply: `I can help with ${propertyContext.property.title}'s price, features, comparisons, and viewing details. Ask me anything specific about this listing.`,
          model,
        });
      }
    }

    return NextResponse.json({ error: "Property chat provider returned no usable response." }, { status: lastStatus });
  } catch (error) {
    const isAbortError = error instanceof DOMException && error.name === "AbortError";

    return NextResponse.json(
      { error: isAbortError ? "Property chat request timed out." : "Property chat request failed." },
      { status: isAbortError ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
