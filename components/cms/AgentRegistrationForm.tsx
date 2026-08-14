"use client";

import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AgentRegistrationForm({ onRegistered }: { onRegistered: () => Promise<void> }) {
	const [form, setForm] = useState({ email: "", fullName: "", licenseNumber: "", specialization: "", photoUrl: "", facebookUrl: "", instagramUrl: "", twitterUrl: "", linkedinUrl: "", isTopAgent: false });
	const [status, setStatus] = useState("");
	const [saving, setSaving] = useState(false);

	function update(field: keyof typeof form, value: string | boolean) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setStatus("Creating the agent account...");

		try {
			const { data } = await supabaseBrowser.auth.getSession();
			const token = data.session?.access_token;
			const response = await fetch("/api/admin/agents", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: "same-origin",
				body: JSON.stringify(form),
			});
			const payload = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
			if (!response.ok || !payload?.ok) {
				setStatus(payload?.error ?? "Unable to create the agent right now.");
				setSaving(false);
				return;
			}

			setStatus(`Agent ${form.email} created. Supabase has emailed them a secure link to set their password and sign in.`);
			setForm({ email: "", fullName: "", licenseNumber: "", specialization: "", photoUrl: "", facebookUrl: "", instagramUrl: "", twitterUrl: "", linkedinUrl: "", isTopAgent: false });
			setSaving(false);
			await onRegistered();
		} catch {
			setStatus("Could not reach the agent registration service.");
			setSaving(false);
		}
	}

	const inputClass = "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:bg-zinc-50 disabled:text-black/45";

	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Register a new agent</div>
			<p className="mt-1 text-sm leading-5 text-black/55">Creates the sign-in account, profile, and agent record in one step. Supabase emails the agent a secure link to set their own password — you never need to create or share one.</p>

			<form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Full name</div>
					<input type="text" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="e.g. Maria Santos" className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Email (login)</div>
					<input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="agent@jewellzrealty.com" className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">License number</div>
					<input type="text" value={form.licenseNumber} onChange={(event) => update("licenseNumber", event.target.value)} placeholder="e.g. PRC-50122" className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Specialization</div>
					<input type="text" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} placeholder="e.g. Condo & Pre-selling" className={inputClass} />
				</label>
				<label className="block md:col-span-2">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Photo URL</div>
					<input type="url" value={form.photoUrl} onChange={(event) => update("photoUrl", event.target.value)} placeholder="Paste an image link (e.g. https://...)" className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Facebook URL</div>
					<input type="url" value={form.facebookUrl} onChange={(event) => update("facebookUrl", event.target.value)} placeholder="https://facebook.com/..." className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Instagram URL</div>
					<input type="url" value={form.instagramUrl} onChange={(event) => update("instagramUrl", event.target.value)} placeholder="https://instagram.com/..." className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Twitter / X URL</div>
					<input type="url" value={form.twitterUrl} onChange={(event) => update("twitterUrl", event.target.value)} placeholder="https://x.com/..." className={inputClass} />
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">LinkedIn URL</div>
					<input type="url" value={form.linkedinUrl} onChange={(event) => update("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
				</label>
				<label className="mt-1 flex items-center gap-2 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-black/70">
					<input type="checkbox" checked={form.isTopAgent} onChange={(event) => update("isTopAgent", event.target.checked)} className="h-4 w-4" />
					<span>Mark as top agent (shows on the homepage "Meet Our Agents" section)</span>
				</label>
				<div className="flex flex-wrap items-center gap-3 md:col-span-2">
					<button type="submit" disabled={saving || !form.email.trim() || !form.fullName.trim()} className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
						{saving ? "Creating..." : "Register agent"}
					</button>
					{status ? <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-black/70">{status}</span> : null}
				</div>
			</form>
		</div>
	);
}