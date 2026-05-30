"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Property } from "@/types/property";
import type { PropertyChatMessage, PropertyChatResponse } from "@/lib/property-chat";

type ChatMessage = PropertyChatMessage & {
  id: string;
  isLoading?: boolean;
};

type PropertyChatAssistantProps = {
  property: Property;
};

const quickPrompts = [
  "Is this property still available?",
  "What makes this listing a good fit?",
  "Can you tell me about the price and features?",
];

function createId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

async function fetchPropertyPrompt(property: Property, message: string, history: ChatMessage[]) {
  const response = await fetch("/api/property-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: property.slug,
      message,
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? "Unable to prepare the property chat prompt.");
  }

  return (await response.json()) as PropertyChatResponse;
}

export function PropertyChatAssistant({ property }: PropertyChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content: "Ask about pricing, availability, site viewing, or property details.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string>("AI assistant is ready.");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const history = messages.slice(-8);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSend(nextMessage: string) {
    const trimmedMessage = nextMessage.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    setInput("");
    setIsSending(true);
    setStatus("Preparing property context...");

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmedMessage,
    };

    const assistantId = createId();

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        isLoading: true,
      },
    ]);

    try {
      const payload = await fetchPropertyPrompt(property, trimmedMessage, [...history, userMessage]);
      setStatus(`Using ${payload.propertyTitle} context`);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: payload.content || payload.fallbackReply, isLoading: false }
            : message
        )
      );
      setStatus("Ready to answer more questions.");
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : "The property assistant is temporarily unavailable.";

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: fallbackMessage, isLoading: false }
            : message
        )
      );
      setStatus("Using fallback response.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {/* ── Book an Appointment Button ── */}
      <a
        href="/appointment"
        className="group flex items-center justify-between gap-3 rounded-2xl border border-[#DE141C] bg-[#DE141C] px-4 py-3 text-white shadow-sm transition-colors hover:bg-[#c51018]"
      >
        <div className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 shrink-0 text-white/80"
            fill="none"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2 8h16M7 1v4M13 1v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            Book an Appointment
          </span>
        </div>
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      {/* ── Chat Widget ── */}
      <div className="flex h-[520px] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/10 bg-[#f4f4f4] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/assets/chaticon.svg"
              alt="Chat icon"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg border border-black/10 bg-white p-1"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-black">Chat</p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white" style={{ backgroundColor: '#10b981' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  AI
                </span>
              </div>
              <p className="text-[11px] leading-4 text-black/45">Message us your questions</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#FCFCFC] to-[#FFFFF] p-3 text-[11px] text-black/55" aria-live="polite">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" ? (
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src="/assets/chatbot.svg"
                      alt="Jewellz Realty AI"
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div
                  className={`max-w-[84%] rounded-[14px] px-3 py-2 text-[12px] leading-5 ${
                    message.role === "user"
                      ? "bg-[#DE141C] text-white"
                      : "border border-black/10 bg-white text-black/75"
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-black/60">
                      <span>Thinking</span>
                      <Image
                        src="/assets/thinking.svg"
                        alt="Thinking"
                        width={18}
                        height={18}
                        className="h-[18px] w-[18px] shrink-0"
                        style={{ animation: "thinking-pulse 0.95s ease-in-out infinite", transformOrigin: "center" }}
                      />
                    </div>
                  ) : (
                    message.content
                  )}
                </div>

                {message.role === "user" ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M5 19a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                ) : null}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-black/10 bg-f4f4f4 p-2.5 backdrop-blur">
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={isSending}
                className="shrink-0 whitespace-nowrap rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-semibold text-black/60 transition-colors hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-[12px] text-black/80 outline-none placeholder:text-black/35 focus:border-[#DE141C]/40 focus:ring-2 focus:ring-[#DE141C]/10"
              placeholder="Type your message here..."
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="flex h-9 items-center gap-1.5 rounded-md bg-[#DE141C] px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[#c51018] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <path d="M3 11.9L20.4 4.6 13.1 22l-1.8-7.5L3 11.9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M20.4 4.6L11.3 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Send
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes thinking-pulse {
          0%,
          100% {
            transform: scale(0.72);
            opacity: 0.45;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}