"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { PropertyChatAssistant } from "@/components/properties/PropertyChatAssistant";
import type { Property } from "@/types/property";

export function FloatingPropertyChat({ property, previewMode = false }: { property?: Property; previewMode?: boolean }) {
	const [open, setOpen] = useState(false);

	return (
		<div>
			<div hidden={!open} className="chat-panel-enter fixed inset-x-3 bottom-24 z-[5600] sm:left-auto sm:right-5 sm:w-[380px]">
				<div className="overflow-hidden rounded-2xl shadow-[0_20px_70px_rgba(17,17,17,0.16)]">
					<PropertyChatAssistant property={property} previewMode={previewMode} />
				</div>
			</div>

			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				aria-label={open ? "Close chat" : "Chat with Jewel, our AI guide"}
				className="group fixed bottom-5 right-5 z-[5600] grid h-14 w-14 place-items-center rounded-full bg-[#DE141C] text-white shadow-[0_10px_26px_rgba(222,20,28,0.32)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-[#C4121A] hover:shadow-[0_16px_34px_rgba(222,20,28,0.42)] active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#DE141C]/25 motion-reduce:transition-none"
			>
				{open ? (
						<X aria-hidden="true" className="h-6 w-6 transition-transform duration-200 group-hover:rotate-90 motion-reduce:transition-none" strokeWidth={2.4} />
				) : (
						<MessageCircle aria-hidden="true" className="h-6 w-6 fill-white transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 motion-reduce:transition-none" strokeWidth={2.2} />
				)}
			</button>
			<style>{`@keyframes chat-panel-enter { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } } .chat-panel-enter { animation: chat-panel-enter .2s ease-out both; transform-origin: bottom right; } @media (prefers-reduced-motion: reduce) { .chat-panel-enter { animation: none; } }`}</style>
		</div>
	);
}
