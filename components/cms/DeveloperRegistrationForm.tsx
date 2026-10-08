"use client";

import { FormEvent, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function DeveloperRegistrationForm({ onRegistered }: { onRegistered: () => Promise<void> }) {
	const [form, setForm] = useState({
		email: "",
		companyName: "",
		contactPhone: "",
		websiteUrl: "",
		logoUrl: "",
		description: "",
		slug: "",
	});
	const [status, setStatus] = useState("");
	const [saving, setSaving] = useState(false);

	function update(field: keyof typeof form, value: string) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setStatus("Registering developer partner account...");

		try {
			const { data } = await supabaseBrowser.auth.getSession();
			const token = data.session?.access_token;
			const response = await fetch("/api/admin/developers", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				credentials: "same-origin",
				body: JSON.stringify(form),
			});
			const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!response.ok || !payload?.ok) {
				setStatus(payload?.error ?? "Unable to create developer partner account.");
				setSaving(false);
				return;
			}

			setStatus(`Developer partner ${form.companyName} created. An invite email was sent to ${form.email}.`);
			setForm({
				email: "",
				companyName: "",
				contactPhone: "",
				websiteUrl: "",
				logoUrl: "",
				description: "",
				slug: "",
			});
			setSaving(false);
			await onRegistered();
		} catch {
			setStatus("Could not connect to the developer registration service.");
			setSaving(false);
		}
	}

	const inputClass =
		"mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:bg-zinc-50 disabled:text-black/45";

	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
				Register a Developer Partner
			</div>
			<p className="mt-1 text-sm leading-5 text-black/55">
				Creates the company partner record, profile, and Supabase login account in one step. The developer receives an invitation email to set their password and access their portfolio hub.
			</p>

			<form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Company Name</div>
					<input
						type="text"
						required
						value={form.companyName}
						onChange={(e) => update("companyName", e.target.value)}
						placeholder="e.g. Ayala Land Premier"
						className={inputClass}
					/>
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Login / Contact Email</div>
					<input
						type="email"
						required
						value={form.email}
						onChange={(e) => update("email", e.target.value)}
						placeholder="partner@developer.com"
						className={inputClass}
					/>
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Contact Phone</div>
					<input
						type="text"
						value={form.contactPhone}
						onChange={(e) => update("contactPhone", e.target.value)}
						placeholder="+63 917 123 4567"
						className={inputClass}
					/>
				</label>
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Website URL</div>
					<input
						type="url"
						value={form.websiteUrl}
						onChange={(e) => update("websiteUrl", e.target.value)}
						placeholder="https://company.com"
						className={inputClass}
					/>
				</label>
				<label className="block md:col-span-2">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Company Logo URL</div>
					<input
						type="url"
						value={form.logoUrl}
						onChange={(e) => update("logoUrl", e.target.value)}
						placeholder="https://.../logo.png"
						className={inputClass}
					/>
				</label>
				<label className="block md:col-span-2">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Company Description</div>
					<textarea
						rows={3}
						value={form.description}
						onChange={(e) => update("description", e.target.value)}
						placeholder="Brief overview of developer track record and project developments..."
						className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30"
					/>
				</label>

				<div className="flex flex-wrap items-center gap-3 md:col-span-2 pt-1">
					<button
						type="submit"
						disabled={saving || !form.email.trim() || !form.companyName.trim()}
						className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20"
					>
						{saving ? "Creating..." : "Register Developer Partner"}
					</button>
					{status ? (
						<span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-black/70">
							{status}
						</span>
					) : null}
				</div>
			</form>
		</div>
	);
}
