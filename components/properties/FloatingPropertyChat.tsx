"use client";

import { useState } from "react";
import { PropertyChatAssistant } from "@/components/properties/PropertyChatAssistant";
import type { Property } from "@/types/property";

export function FloatingPropertyChat({ property, previewMode = false }: { property?: Property; previewMode?: boolean }) {
	const [open, setOpen] = useState(false);

	return (
		<div>
			{open ? (
				<div className="fixed inset-x-3 bottom-24 z-[5600] sm:left-auto sm:right-5 sm:w-[380px]">
					<div className="overflow-hidden rounded-2xl shadow-2xl">
						<PropertyChatAssistant property={property} previewMode={previewMode} />
					</div>
				</div>
			) : null}

			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				aria-label={open ? "Close chat" : "Chat with Jewel, our AI guide"}
				className="fixed bottom-5 right-5 z-[5600] grid h-14 w-14 place-items-center rounded-full bg-[#DE141C] text-white shadow-[0_12px_30px_rgba(222,20,28,0.4)] transition-transform active:scale-95"
			>
				{open ? (
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
				) : (
					<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 01-8.5 8.4c-1.16 0-2.27-.23-3.29-.66L4 21l1.77-4.26A8.3 8.3 0 013 11.5 8.4 8.4 0 0111.5 3 8.4 8.4 0 0121 11.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.5 10.5h7M8.5 13.5H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
				)}
			</button>
		</div>
	);
}
