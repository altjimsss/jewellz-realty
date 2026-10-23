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
  previewMode?: boolean;
};

const quickPrompts = [
  "What schools are nearby? 🏫",
  "Is there a hospital close by? 🏥",
  "Compare with similar properties",
  "Good for a small family? 👨‍👩‍👧",
  "Is this still available?",
  "What should I ask before booking?",
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
    headers: { "Content-Type": "application/json" },
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

/** Very lightweight markdown-to-JSX: handles **bold**, *italic*, and bullet lists */
function ChatBubbleText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  function flushBullets(key: string) {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key} className="my-1 space-y-0.5 pl-1">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#DE141C]/60" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  function renderInline(raw: string): React.ReactNode[] {
    // Handle **bold** and *italic*
    const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-black/90">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  }

  lines.forEach((line, i) => {
    const stripped = line.trim();
    if (!stripped) {
      flushBullets(`flush-${i}`);
      return;
    }
    // Bullet line
    if (/^[-•*]\s/.test(stripped)) {
      bulletBuffer.push(stripped.replace(/^[-•*]\s/, ""));
      return;
    }
    // Numbered list
    if (/^\d+\.\s/.test(stripped)) {
      bulletBuffer.push(stripped.replace(/^\d+\.\s/, ""));
      return;
    }
    flushBullets(`flush-${i}`);
    elements.push(
      <p key={i} className="leading-[1.6]">
        {renderInline(stripped)}
      </p>
    );
  });

  flushBullets("final");

  return <div className="space-y-1 text-[12px]">{elements}</div>;
}

export function PropertyChatAssistant({ property, previewMode = false }: PropertyChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content: `Hey there! 👋 I'm Jade, your Jewellz Realty guide for this listing. Ask me anything about ${property.title} — nearby spots, how it compares to similar properties, viewing steps, you name it!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string>("Jade is ready to help.");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const history = messages.slice(-8);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSend(nextMessage: string) {
    const trimmedMessage = nextMessage.trim();
    if (!trimmedMessage || isSending || previewMode) return;

    setInput("");
    setIsSending(true);
    setStatus("Jade is thinking…");

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmedMessage,
    };

    const assistantId = createId();

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", isLoading: true },
    ]);

    try {
      const payload = await fetchPropertyPrompt(property, trimmedMessage, [...history, userMessage]);
      setStatus("Jade is ready.");
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: payload.content || payload.fallbackReply, isLoading: false }
            : message
        )
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "I'm having a little trouble right now — try again in a moment!";
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: fallbackMessage, isLoading: false }
            : message
        )
      );
      setStatus("Jade encountered an issue.");
    } finally {
      setIsSending(false);
    }
  }

  /** Quick action tasks */
  function handleBookAppointment() {
    if (previewMode) return;
    window.location.href = `/appointment?from=${encodeURIComponent(`/project-list/${property.slug}`)}&property=${encodeURIComponent(property.title)}`;
  }

  function handleShareProperty() {
    if (previewMode) return;
    const url = `${window.location.origin}/project-list/${property.slug}`;
    void navigator.clipboard.writeText(url).then(() => {
      void handleSend("I just shared this property link with someone interested. What should I tell them about it?");
    });
  }

  return (
    <>
      {/* ── Book an Appointment Button ── */}
      <button
        type="button"
        disabled={previewMode}
        title={previewMode ? "Disabled in CMS preview" : undefined}
        className={`group flex w-full items-center justify-between gap-3 rounded-2xl border border-[#DE141C] bg-[#DE141C] px-4 py-3 text-left text-white shadow-sm transition-colors ${previewMode ? "cursor-not-allowed opacity-80" : "hover:bg-[#c51018]"}`}
        onClick={handleBookAppointment}
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-white/80" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2 8h16M7 1v4M13 1v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">Book an Appointment</span>
        </div>
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── Chat Widget ── */}
      <div className="flex h-[540px] max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white">
        {/* Header */}
        <div className="border-b border-black/8 bg-[#f5f5f5] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Image
                src="/assets/chaticon.svg"
                alt="Jade AI"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-xl border border-black/10 bg-white p-1"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f5f5f5] bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-black">Jade</p>
                <span className="rounded-full bg-emerald-50 px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  AI Guide
                </span>
              </div>
              <p className="text-[10.5px] text-black/40">{status}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-[#fafafa] to-white p-3.5"
          aria-live="polite"
        >
          <div className="space-y-3.5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Image
                    src="/assets/chatbot.svg"
                    alt="Jade"
                    width={26}
                    height={26}
                    className="mb-0.5 h-[26px] w-[26px] shrink-0 rounded-full object-cover"
                  />
                )}

                <div
                  className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 ${
                    message.role === "user"
                      ? "rounded-br-[4px] bg-[#DE141C] text-white"
                      : "rounded-bl-[4px] border border-black/[0.08] bg-white text-black/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-1 py-0.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-black/25"
                          style={{ animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                        />
                      ))}
                    </div>
                  ) : message.role === "assistant" ? (
                    <ChatBubbleText text={message.content} />
                  ) : (
                    <p className="text-[12px] leading-[1.55]">{message.content}</p>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="mb-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-black/80 text-white">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M5 19a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-black/[0.07] bg-[#f5f5f5] p-2.5">
          {/* Quick prompts */}
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={isSending || previewMode}
                className="shrink-0 whitespace-nowrap rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10.5px] font-medium text-black/55 transition hover:border-[#DE141C]/30 hover:bg-red-50/40 hover:text-[#DE141C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Action chips */}
          <div className="mb-2 flex gap-1.5">
            <button
              type="button"
              disabled={previewMode}
              onClick={handleBookAppointment}
              className="flex items-center gap-1 rounded-full border border-[#DE141C]/20 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-[#DE141C] transition hover:bg-red-100 disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 6h13M5.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Book a viewing
            </button>
            <button
              type="button"
              disabled={previewMode}
              onClick={handleShareProperty}
              className="flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-semibold text-black/55 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5.5 7.1l5-2.7M5.5 9l5 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Share listing
            </button>
          </div>

          {/* Input */}
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
              className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-[12px] text-black/80 outline-none placeholder:text-black/30 focus:border-[#DE141C]/35 focus:ring-2 focus:ring-[#DE141C]/10"
              aria-label="Message Jade"
              placeholder="Ask Jade anything about this property…"
              disabled={isSending || previewMode}
            />
            <button
              type="submit"
              disabled={isSending || previewMode || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DE141C] text-white transition hover:bg-[#c51018] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M3 11.9L20.4 4.6 13.1 22l-1.8-7.5L3 11.9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M20.4 4.6L11.3 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
