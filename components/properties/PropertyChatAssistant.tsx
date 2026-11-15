"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal, UserRound } from "lucide-react";
import type { Property } from "@/types/property";
import type { PropertyChatMessage, PropertyChatResponse } from "@/lib/property-chat";

type ChatAction =
  | { type: "book-appointment" }
  | { type: "view-property"; slug: string; title: string }
  | { type: "share-listing" };

type ChatMessage = PropertyChatMessage & {
  id: string;
  isLoading?: boolean;
  actions?: ChatAction[];
};

type PropertyChatAssistantProps = {
	property?: Property;
  previewMode?: boolean;
};

const quickPrompts = [
  { label: "Nearby", prompt: "What schools, hospitals, and shops are nearby?" },
  { label: "Compare", prompt: "Compare this with similar properties." },
  { label: "Viewing", prompt: "How can I book a viewing?" },
];

function createId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * Parse [ACTION:...] tokens from Jewel's AI response text.
 * Strips tokens from the displayed text and returns them as structured actions.
 *
 * Supported tokens:
 *   [ACTION:book-appointment]
 *   [ACTION:view-property:slug:Title text]
 *   [ACTION:share-listing]
 */
function parseActions(raw: string): { text: string; actions: ChatAction[] } {
  const actions: ChatAction[] = [];
  const pushUnique = (action: ChatAction) => {
    const key =
      action.type === "view-property" ? `view-property:${action.slug}` : action.type;
    const exists = actions.some((item) =>
      (item.type === "view-property" ? `view-property:${item.slug}` : item.type) === key,
    );
    if (!exists) actions.push(action);
  };

  const cleaned = raw
    .replace(/\[ACTION:([\w-]+)(?::([^:\]]+))?(?::([^\]]+))?\]/g, (_match, type, arg1, arg2) => {
      if (type === "book-appointment") {
        pushUnique({ type: "book-appointment" });
      } else if (type === "view-property" && arg1 && arg2) {
        pushUnique({ type: "view-property", slug: arg1.trim(), title: arg2.trim() });
      } else if (type === "share-listing") {
        pushUnique({ type: "share-listing" });
      }
      return "";
    })
    .trim();
  return { text: cleaned, actions };
}

/** Inline action buttons rendered inside the assistant's chat bubble */
function ChatActions({
  actions,
  property,
  previewMode,
  onSend,
}: {
  actions: ChatAction[];
  property?: Property;
  previewMode: boolean;
  onSend: (msg: string) => void;
}) {
  if (actions.length === 0) return null;

  function handleBook() {
    if (previewMode || !property) return;
    window.location.href = `/appointment?from=${encodeURIComponent(`/project-list/${property.slug}`)}&property=${encodeURIComponent(property.title)}`;
  }

  function handleShare() {
    if (previewMode || !property) return;
    const url = `${window.location.origin}/project-list/${property.slug}`;
    void navigator.clipboard.writeText(url).then(() => {
      onSend("I just shared this property link with a friend. What should I tell them about it?");
    });
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {actions.map((action, i) => {
        if (action.type === "book-appointment") {
          if (!property) return null;
          return (
            <button
              key={i}
              type="button"
              disabled={previewMode}
              onClick={handleBook}
              className="flex items-center gap-1.5 rounded-lg border border-[#DE141C] bg-[#DE141C] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#c51018] disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" aria-hidden="true">
                <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 6h13M5.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Book an appointment
            </button>
          );
        }
        if (action.type === "view-property") {
          return (
            <a
              key={i}
              href={`/project-list/${action.slug}`}
              className="flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-black/70 transition hover:border-black/25 hover:bg-zinc-50"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View {action.title}
            </a>
          );
        }
        if (action.type === "share-listing") {
          if (!property) return null;
          return (
            <button
              key={i}
              type="button"
              disabled={previewMode}
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-black/70 transition hover:border-black/25 hover:bg-zinc-50 disabled:opacity-50"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" aria-hidden="true">
                <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5.5 7.1l5-2.7M5.5 9l5 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Share this listing
            </button>
          );
        }
        return null;
      })}
    </div>
  );
}

async function fetchPropertyPrompt(property: Property | undefined, message: string, history: ChatMessage[]) {
  const response = await fetch("/api/property-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(property ? { slug: property.slug } : {}),
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
      content: property
        ? `Hi! I'm Jewel, your J'WELLZ REALTY guide for ${property.title}. Ask about this property, nearby places, or booking a viewing.`
        : "Hi! I'm Jewel, your J'WELLZ REALTY property guide. Ask me to find a listing, compare properties, or learn about a home, condo, or lot.",
      actions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
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
    setAnnouncement("Jewel is thinking.");

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
      const rawContent = payload.content || payload.fallbackReply;
      const { text, actions } = parseActions(rawContent);
      setAnnouncement(`Jewel replied: ${text}`);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: text, actions, isLoading: false }
            : message
        )
      );
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "I'm having a little trouble right now — try again in a moment!";
      setAnnouncement(`Jewel could not respond: ${fallbackMessage}`);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, content: fallbackMessage, actions: [], isLoading: false }
            : message
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {/* ── Chat Widget ── */}
      <div className="flex h-[540px] max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#E5E5E7] bg-white">
        {/* Header */}
        <div className="border-b border-[#ECECEF] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#DE141C] text-white">
              <Bot aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold tracking-tight text-[#191919]">Jewel</p>
                <span className="rounded bg-[#FDEBED] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#B5121B]">AI guide</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
                <span className={`h-1.5 w-1.5 rounded-full ${isSending ? "animate-pulse bg-[#DE141C]" : "bg-emerald-500"}`} />
                {isSending ? "Jewel is thinking..." : "Online | Here to help"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          className="min-h-0 flex-1 overflow-y-auto bg-[#F7F7F8] p-4"
        >
          <div className="space-y-4">
            {messages.map((message, messageIndex) => (
              <div
                key={message.id}
                className={`flex gap-2.5 ${message.role === "user" ? "items-end justify-end" : "items-start justify-start"}`}
              >
                {message.role === "assistant" && (
                  <span className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#DE141C] text-white">
                    <Bot aria-label="Jewel" className="h-4 w-4" strokeWidth={2.1} />
                  </span>
                )}

                <div className={message.role === "assistant" ? "flex max-w-[85%] flex-col items-start" : "max-w-[85%]"}>
                <div
                  className={`max-w-full rounded-[16px] px-3.5 py-2.5 ${
                    message.role === "user"
                      ? "rounded-br-[5px] bg-[#DE141C] text-white"
                      : "rounded-bl-[5px] border border-[#ECECEF] bg-white text-[#303030]"
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
                    <>
                      <ChatBubbleText text={message.content} />
                      {message.actions && message.actions.length > 0 && (
                        <ChatActions
                          actions={message.actions}
                          property={property}
                          previewMode={previewMode}
                          onSend={handleSend}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-[12px] leading-[1.6]">{message.content}</p>
                  )}
                </div>

                {messages.length === 1 && messageIndex === 0 && message.role === "assistant" && !message.isLoading ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quickPrompts.map(({ label, prompt }) => (
                      <button key={label} type="button" title={prompt} onClick={() => void handleSend(prompt)} disabled={isSending || previewMode} className="rounded-md border border-[#E5E5E7] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#555555] transition-colors hover:border-[#DE141C] hover:bg-[#DE141C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30 disabled:cursor-not-allowed disabled:opacity-50">{label}</button>
                    ))}
                  </div>
                ) : null}
                </div>
                {message.role === "user" && <span className="mb-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#222222] text-white"><UserRound aria-label="You" className="h-4 w-4" strokeWidth={2} /></span>}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#ECECEF] bg-white p-3">

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
              className="h-10 w-full rounded-lg border border-[#E0E0E3] bg-white px-3 text-sm text-[#222222] placeholder:text-[#929292] focus:border-[#DE141C] focus:ring-2 focus:ring-[#DE141C]/15 focus-visible:outline-none"
              aria-label="Message Jewel"
              placeholder={property ? "Ask about this property..." : "Ask Jewel about a property..."}
              disabled={isSending || previewMode}
            />
            <button
              type="submit"
              disabled={isSending || previewMode || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DE141C] text-white transition-colors hover:bg-[#C4121A] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
            >
              <SendHorizontal aria-hidden="true" className="h-4 w-4 fill-white" strokeWidth={2.2} />
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
