"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
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
	const [uploadingLogo, setUploadingLogo] = useState(false);

	function update(field: keyof typeof form, value: string) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleUploadLogo(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadingLogo(true);
		setStatus("Uploading developer logo...");

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", "developer-logos");

			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			const data = await res.json();
			if (!res.ok || !data?.url) {
				setStatus(data?.error || "Failed to upload logo.");
			} else {
				update("logoUrl", data.url);
				setStatus("Logo uploaded! It will be shown in the website marquee once the account is created.");
			}
		} catch {
			setStatus("Error uploading logo image.");
		} finally {
			setUploadingLogo(false);
		}
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

			setStatus(`Developer partner ${form.companyName} created! Invitation sent to ${form.email}. Their logo is now live on the website marquee.`);
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
		<div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
						Register a Developer Partner
					</div>
					<p className="mt-1 text-sm leading-5 text-black/55">
						Creates the company partner record, profile, and Supabase login account in one step. Their logo will automatically be shown in the homepage marquee.
					</p>
				</div>
			</div>

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

				{/* Logo Section with direct file upload and preview */}
				<div className="md:col-span-2 rounded-lg border border-black/10 bg-zinc-50/60 p-3 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
							Company Logo (Displayed in Public Marquee)
						</span>
						{form.logoUrl ? (
							<button
								type="button"
								onClick={() => update("logoUrl", "")}
								className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
							>
								<X className="h-3 w-3" /> Remove logo
							</button>
						) : null}
					</div>

					<div className="flex flex-wrap items-center gap-4">
						{form.logoUrl ? (
							<div className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-2">
								<Image
									src={form.logoUrl}
									alt="Logo preview"
									width={120}
									height={40}
									unoptimized
									className="h-9 w-auto max-w-[140px] object-contain"
								/>
								<span className="text-xs text-black/50 truncate max-w-[200px]">
									{form.logoUrl}
								</span>
							</div>
						) : null}

						<label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#111111] shadow-xs hover:bg-zinc-100">
							<Upload className="h-3.5 w-3.5" />
							<span>{uploadingLogo ? "Uploading..." : "Upload Logo Image"}</span>
							<input
								type="file"
								accept="image/*"
								onChange={handleUploadLogo}
								disabled={uploadingLogo}
								className="hidden"
							/>
						</label>

						<input
							type="url"
							value={form.logoUrl}
							onChange={(e) => update("logoUrl", e.target.value)}
							placeholder="Or enter logo URL (https://...)"
							className="h-8 flex-1 min-w-[200px] rounded-md border border-black/10 bg-white px-2.5 text-xs text-[#111111] outline-none focus:border-black/30"
						/>
					</div>
				</div>

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
