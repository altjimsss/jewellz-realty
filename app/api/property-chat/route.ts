import { NextResponse } from "next/server";
import {
	buildPropertyChatContext,
	buildPropertyChatConversation,
	buildPropertyChatPrompt,
	extractPropertyChatContent,
	parsePropertyChatRequestBody,
} from "@/lib/property-chat";

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

  const propertyContext = buildPropertyChatContext(parsedBody.slug);

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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Jewellz Realty",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: "Property chat provider request failed." }, { status: response.status });
    }

    const content = extractPropertyChatContent(data);

    return NextResponse.json({
      content: content ?? "",
      propertyTitle: propertyContext.property.title,
      fallbackReply: `I can help with ${propertyContext.property.title}'s price, features, and viewing details. Ask me anything specific about this listing.`,
    });
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