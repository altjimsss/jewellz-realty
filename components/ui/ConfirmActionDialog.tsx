"use client";

import { useEffect } from "react";

type ConfirmActionDialogProps = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	pending?: boolean;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
};

export function ConfirmActionDialog({ open, title, description, confirmLabel, pending = false, onConfirm, onCancel }: ConfirmActionDialogProps) {
	useEffect(() => {
		if (!open) return;
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && !pending) onCancel();
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, pending, onCancel]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
			<section role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description" className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 shadow-2xl">
				<h2 id="confirm-action-title" className="text-lg font-semibold tracking-tight text-[#111111]">{title}</h2>
				<p id="confirm-action-description" className="mt-2 text-sm leading-5 text-black/60">{description}</p>
				<div className="mt-5 flex justify-end gap-2">
					<button type="button" autoFocus disabled={pending} onClick={onCancel} className="h-9 rounded-lg border border-black/10 px-3.5 text-sm font-medium text-[#111111] transition hover:bg-zinc-50 disabled:opacity-50">Cancel</button>
					<button type="button" disabled={pending} onClick={() => void onConfirm()} className="h-9 rounded-lg bg-[#DE141C] px-3.5 text-sm font-semibold text-white transition hover:bg-[#BE1119] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Please wait…" : confirmLabel}</button>
				</div>
			</section>
		</div>
	);
}
