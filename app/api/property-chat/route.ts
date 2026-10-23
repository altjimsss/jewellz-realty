import { NextResponse } from "next/server";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/lib/rate-limit";
import {
	buildPropertyChatContext,
	buildPropertyChatConversation,
	buildPropertyChatPrompt,
	parsePropertyChatRequestBody,
} from "@/lib/property-chat";
import { hasAiConfigured, runAiChatCompletion } from "@/lib/ai/client";

export async function POST(request: Request) {
  const limiter = checkRateLimit(`property-chat:${clientKey(request)}`, { limit: 20, windowMs: 60_000 });
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many chat requests. Please try again later." }, { status: 429, headers: rateLimitHeaders(limiter) });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: rateLimitHeaders(limiter) });
  }

  const parsedBody = parsePropertyChatRequestBody(body);

  if (!parsedBody) {
    return NextResponse.json({ error: "Missing slug or message." }, { status: 400, headers: rateLimitHeaders(limiter) });
  }

  const propertyContext = await buildPropertyChatContext(parsedBody.slug);

  if (!propertyContext) {
    return NextResponse.json({ error: "Property not found." }, { status: 404, headers: rateLimitHeaders(limiter) });
  }

  const conversation = buildPropertyChatConversation(parsedBody.history);
  const prompt = buildPropertyChatPrompt(propertyContext, parsedBody.message, conversation);

  if (!hasAiConfigured()) {
    return NextResponse.json({ error: "AI provider is not configured." }, { status: 500, headers: rateLimitHeaders(limiter) });
  }

  try {
    const aiResult = await runAiChatCompletion({
      caller: "property-chat",
      messages: [
        {
          role: "system",
          content: "You are Jewel, a warm and friendly real estate guide at Jewellz Realty. You speak like a knowledgeable friend, not a formal agent. Keep your tone conversational, upbeat, and human — like texting a helpful colleague who knows a lot about real estate. Never use markdown tables or headers. Use plain conversational sentences. Short paragraphs are fine. Only use bullet points when listing 3 or more distinct items and it genuinely helps clarity. Use only the provided context — never invent fees, dates, or legal details.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 700,
      temperature: 0.65,
      timeoutMs: 20_000,
    });

    if (aiResult?.content) {
      return NextResponse.json({
        content: aiResult.content,
        propertyTitle: propertyContext.property.title,
        fallbackReply: `I can help with ${propertyContext.property.title}'s price, features, comparisons, and viewing details. Ask me anything specific about this listing.`,
        model: aiResult.model,
        provider: aiResult.provider,
      });
    }

    return NextResponse.json({ error: "Property chat provider returned no usable response." }, { status: 502 });
  } catch (error) {
    const isAbortError = error instanceof DOMException && error.name === "AbortError";

    return NextResponse.json(
      { error: isAbortError ? "Property chat request timed out." : "Property chat request failed." },
      { status: isAbortError ? 504 : 502 }
    );
  }
}
