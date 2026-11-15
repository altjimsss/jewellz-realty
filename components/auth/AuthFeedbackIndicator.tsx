"use client";

type AuthFeedbackMessage = { text: string; type: "info" | "error" | "success" } | null;

export function AuthFeedbackIndicator({ message, loading }: { message: AuthFeedbackMessage; loading: boolean }) {
	if (!message) return <span aria-hidden="true" className="h-9 w-9 shrink-0" />;

	const label = message.text;
	if (/session has expired due to inactivity/i.test(label)) {
		return (
			<div role="status" title={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F3F4F6] text-[#73778B]">
				<svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 14.4A8 8 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" /><path d="M13 7h3l-3 3h3m1 2h3l-3 3h3" /></svg>
				<span className="sr-only">{label}</span>
			</div>
		);
	}

	if (loading && message.type === "info") {
		return (
			<div role="status" title={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F3F4F6] text-[#DE141C]">
				<span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-[#DE141C]/20 border-t-[#DE141C]" />
				<span className="sr-only">{label}</span>
			</div>
		);
	}

	if (message.type === "success") {
		return (
			<div role="status" title={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
				<svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2M9 16l2 2 4-4" /></svg>
				<span className="sr-only">{label}</span>
			</div>
		);
	}

	return (
		<div role={message.type === "error" ? "alert" : "status"} title={label} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${message.type === "error" ? "bg-red-50 text-[#DE141C]" : "bg-blue-50 text-blue-700"}`}>
			{message.type === "error" ? <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></svg> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.4 1.6c-1.1 1-1.9 1.4-1.9 3m0 3h.01" /></svg>}
			<span className="sr-only">{label}</span>
		</div>
	);
}
