"use client";

import { useState } from "react";
import { Bot, Send, UserCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type ChatMessage = { id: string; role: "assistant" | "user"; text: string; loading?: boolean };

export function AgentAssistantSidebar() {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{ id: "welcome", role: "assistant", text: "Ask about your assigned leads, follow-up priorities, conversion, or listing interest." },
	]);
	const [question, setQuestion] = useState("");
	const [thinking, setThinking] = useState(false);

	async function submitQuestion(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const prompt = question.trim();
		if (!prompt || thinking) return;
		const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text: prompt };
		const assistantId = `assistant-${Date.now()}`;
		const history = [...messages, userMessage].slice(-8).map(({ role, text }) => ({ role, content: text }));
		setMessages((current) => [...current, userMessage, { id: assistantId, role: "assistant", text: "Thinking", loading: true }]);
		setQuestion("");
		setThinking(true);
		try {
			const { data } = await supabaseBrowser.auth.getSession();
			const response = await fetch("/api/agent/assistant", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
				},
				body: JSON.stringify({ message: prompt, history }),
			});
			const payload = await response.json().catch(() => ({})) as { content?: string; error?: string };
			setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: payload.content ?? payload.error ?? "I couldn't get a response. Please try again.", loading: false } : item));
		} catch {
			setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, text: "The assistant couldn't connect right now. Please try again.", loading: false } : item));
		} finally {
			setThinking(false);
		}
	}

	return (
		<aside className="fixed right-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] w-[276px] flex-col border-l border-black/10 bg-white max-xl:bottom-0 max-xl:top-auto max-xl:h-[min(72vh,620px)] max-xl:border-t max-xl:border-l-0">
			<header className="border-b border-black/10 bg-white px-3 py-4">
				<div className="flex items-center gap-2">
					<span className="grid h-7 w-7 place-items-center bg-[#111111] text-white"><Bot className="h-4 w-4" /></span>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5"><h2 className="text-sm font-semibold text-black">Agent Assistant</h2><span className="bg-[#111111] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">AI</span></div>
						<p className="text-[11px] text-black/45">{thinking ? "Reviewing your pipeline..." : "Ready to help"}</p>
					</div>
				</div>
			</header>
			<div className="min-h-0 flex-1 overflow-y-auto bg-white p-3" aria-live="polite">
				<div className="space-y-3">
					{messages.map((message) => (
						<div key={message.id} className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
							{message.role === "assistant" ? <span className="grid h-7 w-7 shrink-0 place-items-center bg-[#111111] text-white"><Bot className="h-4 w-4" /></span> : null}
							<div className={`max-w-[82%] px-3 py-2 text-xs leading-5 ${message.role === "user" ? "bg-[#111111] text-white" : "border border-black/10 bg-white text-black/75"}`}>
								{message.loading ? <span className="animate-pulse">Thinking…</span> : message.text}
							</div>
							{message.role === "user" ? <span className="grid h-7 w-7 shrink-0 place-items-center bg-zinc-100 text-black/60"><UserCircle className="h-4 w-4" /></span> : null}
						</div>
					))}
				</div>
			</div>
			<form onSubmit={submitQuestion} className="flex shrink-0 gap-2 border-t border-black/10 bg-white p-2.5">
				<input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Ask the agent assistant" placeholder="Type your message..." disabled={thinking} className="h-9 min-w-0 flex-1 border border-black/10 bg-white px-3 text-xs text-black/80 outline-none placeholder:text-black/35 focus:border-black/30 disabled:opacity-60" />
				<button type="submit" aria-label="Send message" disabled={thinking || !question.trim()} className="grid h-9 w-9 shrink-0 place-items-center bg-[#111111] text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
			</form>
		</aside>
	);
}
