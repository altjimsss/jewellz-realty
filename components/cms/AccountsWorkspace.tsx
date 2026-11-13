"use client";

import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CmsRow } from "./types";
import { asText } from "./utils";

type AccountsWorkspaceProps = {
	rows: CmsRow[];
	inquiries: CmsRow[];
	currentUserId: string | null;
	onReload: () => Promise<void>;
	onViewInquiry: (inquiryId: string) => void;
};

export function AccountsWorkspace({ rows, inquiries, currentUserId, onReload, onViewInquiry }: AccountsWorkspaceProps) {
	const [email, setEmail] = useState("");
	const [fullName, setFullName] = useState("");
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState("");
	const [error, setError] = useState(false);

	async function sendRequest(method: "POST" | "DELETE", body: Record<string, string>) {
		const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
		const response = await fetch("/api/admin/accounts", {
			method,
			headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
			body: JSON.stringify(body),
		});
		const result = await response.json().catch(() => ({})) as { error?: string };
		if (!response.ok) throw new Error(result.error || "The account request could not be completed.");
	}

	async function inviteAdmin(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setNotice("");
		setError(false);
		try {
			await sendRequest("POST", { email, fullName });
			setEmail("");
			setFullName("");
			setNotice("Admin invitation sent. They can set their password from the email link.");
			await onReload();
		} catch (cause) {
			setError(true);
			setNotice(cause instanceof Error ? cause.message : "Could not invite this admin.");
		} finally {
			setBusy(false);
		}
	}

	async function deleteAccount(row: CmsRow) {
		const id = asText(row.id);
		const name = asText(row.full_name) || asText(row.email) || "this account";
		if (!id || !window.confirm(`Permanently delete ${name}'s sign-in account? This cannot be undone.`)) return;
		setBusy(true);
		setNotice("");
		setError(false);
		try {
			await sendRequest("DELETE", { id });
			setNotice(`Deleted ${name}'s account.`);
			await onReload();
		} catch (cause) {
			setError(true);
			setNotice(cause instanceof Error ? cause.message : "Could not delete this account.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<section className="space-y-5">
			<div className="border border-black/10 bg-white p-4 sm:p-5">
				<div className="mb-4 flex items-start gap-3">
					<span className="grid h-9 w-9 shrink-0 place-items-center bg-[#DE141C] text-white"><ShieldCheck className="h-4 w-4" aria-hidden="true" /></span>
					<div><h2 className="text-base font-semibold text-[#111111]">Admin access</h2><p className="mt-0.5 text-sm text-black/50">Invite another administrator. They’ll receive an email link to set a password.</p></div>
				</div>
				<form onSubmit={inviteAdmin} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
					<label className="block text-xs font-medium text-black/60">Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#DE141C]" placeholder="Admin name" /></label>
					<label className="block text-xs font-medium text-black/60">Email address<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full border border-black/15 bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#DE141C]" placeholder="name@example.com" /></label>
					<button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 bg-black px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="h-4 w-4" aria-hidden="true" />Invite admin</button>
				</form>
				{notice ? <p role="status" className={`mt-3 text-sm ${error ? "text-red-700" : "text-emerald-700"}`}>{notice}</p> : null}
			</div>

			<div className="border border-black/10 bg-white">
				<div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3"><div><h2 className="text-sm font-semibold text-[#111111]">Accounts</h2><p className="text-xs text-black/45">Remove sign-in access for an account. Your own account and the last active admin are protected.</p></div><span className="bg-zinc-100 px-2 py-1 text-xs font-medium text-black/60">{rows.length} total</span></div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-left text-sm">
						<thead className="bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Inquiries</th><th className="px-4 py-3 text-right">Account</th></tr></thead>
						<tbody>
							{rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-black/45">No accounts found.</td></tr> : null}
							{rows.map((row) => {
								const id = asText(row.id);
								const rowEmail = asText(row.email).toLowerCase();
								const matching = inquiries.filter((inquiry) => asText(inquiry.buyer_email).toLowerCase() === rowEmail);
								const isSelf = id === currentUserId;
								const isActive = asText(row.is_active) !== "false";
								return <tr key={id} className="border-t border-black/[0.07]">
									<td className="px-4 py-3 font-medium text-[#111111]">{asText(row.full_name) || "Unnamed"}{isSelf ? <span className="ml-2 bg-zinc-100 px-1.5 py-0.5 text-[10px] text-black/55">You</span> : null}</td>
									<td className="px-4 py-3 text-black/60">{rowEmail || "—"}</td>
									<td className="px-4 py-3"><span className={`px-2 py-1 text-[11px] font-medium ${asText(row.role) === "admin" ? "bg-red-50 text-[#B5121B]" : "bg-zinc-100 text-black/65"}`}>{asText(row.role) || "buyer"}</span></td>
									<td className="px-4 py-3 text-black/60">{isActive ? "Active" : "Inactive"}</td>
									<td className="px-4 py-3">{matching.length ? <button type="button" onClick={() => onViewInquiry(asText(matching[0].id))} className="font-semibold text-[#111111] underline decoration-black/20 underline-offset-2 hover:decoration-black">View {matching.length}</button> : <span className="text-black/35">None</span>}</td>
									<td className="px-4 py-3 text-right"><button type="button" disabled={busy || isSelf} title={isSelf ? "You cannot delete your own account" : "Permanently delete account"} onClick={() => void deleteAccount(row)} className="inline-flex h-8 items-center gap-1.5 border border-black/10 px-2.5 text-xs font-medium text-black/65 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</button></td>
								</tr>;
							})}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
