"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import { AlertCircle, Building2, CheckCircle2, Globe, Plus, RefreshCw, Shield, Trash2, Upload } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CmsPayload, CmsRow } from "./types";
import { asText } from "./utils";

const inputClass =
	"mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-black/50";
const primaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20";
const subtleButton =
	"inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-medium text-[#111111] transition hover:bg-zinc-50 disabled:opacity-50";

type Tone = "emerald" | "amber" | "zinc" | "blue";

const toneClasses: Record<Tone, string> = {
	emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
	amber: "border-amber-200 bg-amber-50 text-amber-700",
	zinc: "border-black/10 bg-zinc-100 text-black/55",
	blue: "border-blue-200 bg-blue-50 text-blue-700",
};

function Pill({ tone = "zinc", children }: { tone?: Tone; children: ReactNode }) {
	return (
		<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneClasses[tone]}`}>
			{children}
		</span>
	);
}

function LogoBadge({ src, name, size = "sm" }: { src: string; name: string; size?: "sm" | "lg" }) {
	const box = size === "lg" ? "h-14 w-14 rounded-lg" : "h-10 w-10 rounded-md";
	if (src.trim()) {
		return (
			<div className={`flex ${box} shrink-0 items-center justify-center overflow-hidden border border-black/10 bg-white`}>
				<Image src={src} alt={name} width={80} height={80} unoptimized className="h-full w-full object-contain" />
			</div>
		);
	}
	return (
		<div className={`flex ${box} shrink-0 items-center justify-center border border-black/10 bg-zinc-50 text-black/35`}>
			<Building2 className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
		</div>
	);
}

type WorkspaceProps = {
	rows: CmsRow[];
	selectedId: string | null;
	canEdit: boolean;
	onSelect: (row: CmsRow | null) => void;
	onCreateNew: () => void;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
	onReload: () => Promise<void>;
};

export function DeveloperPartnersWorkspace({ rows, selectedId, canEdit, onSelect, onCreateNew, onDelete, onSubmit, onReload }: WorkspaceProps) {
	const [search, setSearch] = useState("");
	const selectedRow = rows.find((row) => asText(row.id) === asText(selectedId)) ?? null;
	const isCreating = Boolean(selectedId) && !selectedRow;
	const editorKey = selectedRow ? asText(selectedRow.id) : isCreating ? "__new__" : "__none__";

	const query = search.trim().toLowerCase();
	const filtered = rows.filter((row) => {
		if (!query) return true;
		return [asText(row.company_name), asText(row.contact_email), asText(row.website_url)].join(" ").toLowerCase().includes(query);
	});

	return (
		<section className="overflow-hidden rounded-lg border border-black/10 bg-white">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3">
				<div>
					<h2 className="text-sm font-semibold text-[#111111]">Developer Partners</h2>
					<p className="mt-1 max-w-2xl text-xs leading-5 text-black/55">
						Manage the partner companies shown in the homepage marquee. A logo is all that is needed to appear — a login account is optional and lets the partner manage their own logo.
					</p>
				</div>
				{canEdit ? (
					<button
						type="button"
						onClick={onCreateNew}
						className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white transition hover:bg-black/80"
					>
						<Plus className="h-3.5 w-3.5" />
						Add partner
					</button>
				) : null}
			</div>

			<div className="p-4">
				<div className="grid gap-4 xl:grid-cols-[300px_1fr]">
					<aside className="rounded-lg border border-black/10 bg-white p-3">
						<div className="flex items-center justify-between gap-2 px-1 pb-3">
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Partners</div>
							<span className="text-xs text-black/40">{rows.length}</span>
						</div>
						<label className="mb-3 block px-1">
							<span className="sr-only">Search partners</span>
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search partners..."
								className="h-9 w-full rounded-md border border-black/10 bg-zinc-50 px-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 focus:bg-white"
							/>
						</label>
						<div className="max-h-[720px] min-h-[520px] space-y-2 overflow-auto pr-1 xl:max-h-[calc(100vh-300px)]">
							{rows.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No partners yet. Use “Add partner”.</p> : null}
							{rows.length > 0 && filtered.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No partners match your search.</p> : null}
							{filtered.map((row) => {
								const id = asText(row.id);
								const active = id === asText(selectedId);
								const isActive = asText(row.is_active) !== "false";
								const hasLogo = Boolean(asText(row.logo_url).trim());
								const hasAccount = Boolean(asText(row.profile_id).trim());
								return (
									<button
										key={id}
										type="button"
										onClick={() => onSelect(row)}
										className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition ${active ? "border-black/20 bg-zinc-100" : "border-transparent bg-white hover:border-black/10 hover:bg-zinc-50"}`}
									>
										<LogoBadge src={asText(row.logo_url)} name={asText(row.company_name)} />
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium text-[#111111]">{asText(row.company_name) || "Untitled partner"}</div>
											<div className="mt-1 flex flex-wrap gap-1">
												<Pill tone={isActive ? "emerald" : "zinc"}>{isActive ? "Live" : "Hidden"}</Pill>
												{hasLogo ? null : <Pill tone="amber">No logo</Pill>}
												{hasAccount ? <Pill tone="blue">Account</Pill> : null}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="rounded-lg border border-black/10 bg-white p-4">
						{selectedRow || isCreating ? (
							<DeveloperEditor
								key={editorKey}
								row={selectedRow}
								isCreating={isCreating}
								canEdit={canEdit}
								onDelete={onDelete}
								onSubmit={onSubmit}
								onReload={onReload}
							/>
						) : (
							<div className="flex min-h-[520px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-zinc-50 p-8 text-center">
								<Building2 className="h-6 w-6 text-black/30" />
								<p className="text-sm font-medium text-[#111111]">Select a partner to edit</p>
								<p className="max-w-sm text-xs leading-5 text-black/50">Choose a company from the list, or add a new partner to feature in the homepage marquee.</p>
								{canEdit ? (
									<button
										type="button"
										onClick={onCreateNew}
										className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-2 text-xs font-medium text-[#111111] transition hover:bg-zinc-50"
									>
										<Plus className="h-3.5 w-3.5" />
										Add partner
									</button>
								) : null}
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}

type EditorProps = {
	row: CmsRow | null;
	isCreating: boolean;
	canEdit: boolean;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
	onReload: () => Promise<void>;
};

function DeveloperEditor({ row, isCreating, canEdit, onDelete, onSubmit, onReload }: EditorProps) {
	const [form, setForm] = useState(() => ({
		company_name: asText(row?.company_name),
		website_url: asText(row?.website_url),
		description: asText(row?.description),
		contact_email: asText(row?.contact_email),
		contact_phone: asText(row?.contact_phone),
		logo_url: asText(row?.logo_url),
		is_active: row ? asText(row.is_active) !== "false" : true,
	}));
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [status, setStatus] = useState("");
	const [logoError, setLogoError] = useState("");

	const companyName = form.company_name.trim();
	const displayName = companyName || "New developer partner";
	const canSave = canEdit && Boolean(companyName) && !saving;

	function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setUploading(true);
		setLogoError("");
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", "developer-logos");

			const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
			const response = await fetch("/api/upload", {
				method: "POST",
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				body: formData,
			});

			const data = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
			if (!response.ok || !data?.url) {
				setLogoError(data?.error || "Failed to upload logo.");
				return;
			}
			update("logo_url", data.url);
		} catch {
			setLogoError("Network error while uploading logo.");
		} finally {
			setUploading(false);
		}
	}

	async function handleSubmit() {
		if (!companyName) {
			setStatus("Company name is required.");
			return;
		}

		setSaving(true);
		setStatus("Saving developer partner...");

		const payload: CmsPayload = {
			company_name: companyName,
			website_url: form.website_url.trim() || null,
			description: form.description.trim() || null,
			contact_email: form.contact_email.trim().toLowerCase() || null,
			contact_phone: form.contact_phone.trim() || null,
			logo_url: form.logo_url.trim() || null,
			is_active: form.is_active,
		};

		await onSubmit(payload, row);
		setSaving(false);

		if (isCreating) {
			setForm({ company_name: "", website_url: "", description: "", contact_email: "", contact_phone: "", logo_url: "", is_active: true });
			setStatus("Partner created. Select it from the list to manage its login account.");
		} else {
			setStatus("Changes saved.");
		}
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
				<div className="flex items-center gap-3">
					<LogoBadge src={form.logo_url} name={displayName} size="lg" />
					<div>
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{isCreating ? "New partner" : "Editing partner"}</div>
						<div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#111111]">{displayName}</div>
						{form.website_url.trim() ? (
							<a
								href={form.website_url}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-1 inline-flex items-center gap-1 text-xs text-black/50 transition hover:text-[#111111]"
							>
								<Globe className="h-3 w-3" />
								{form.website_url.replace(/^https?:\/\//, "")}
							</a>
						) : null}
					</div>
				</div>
				{!isCreating && row && canEdit ? (
					<button
						type="button"
						onClick={() => onDelete(row)}
						className="inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Delete
					</button>
				) : null}
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<label className="block md:col-span-2">
					<div className={labelClass}>Company name</div>
					<input
						type="text"
						value={form.company_name}
						onChange={(event) => update("company_name", event.target.value)}
						placeholder="e.g. Ayala Land Premier"
						disabled={!canEdit}
						className={inputClass}
					/>
				</label>
				<label className="block">
					<div className={labelClass}>Website</div>
					<input
						type="url"
						value={form.website_url}
						onChange={(event) => update("website_url", event.target.value)}
						placeholder="https://company.com"
						disabled={!canEdit}
						className={inputClass}
					/>
				</label>
				<label className="block">
					<div className={labelClass}>Contact phone</div>
					<input
						type="text"
						value={form.contact_phone}
						onChange={(event) => update("contact_phone", event.target.value)}
						placeholder="+63 917 123 4567"
						disabled={!canEdit}
						className={inputClass}
					/>
				</label>
				<label className="block md:col-span-2">
					<div className={labelClass}>Description</div>
					<textarea
						rows={3}
						value={form.description}
						onChange={(event) => update("description", event.target.value)}
						placeholder="Brief overview of the developer and their projects..."
						disabled={!canEdit}
						className={`${inputClass} min-h-[90px] py-3`}
					/>
				</label>
			</div>

			<div className="rounded-lg border border-black/10 bg-zinc-50/60 p-4">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<div className="text-sm font-semibold text-[#111111]">Marquee logo</div>
						<p className="text-xs text-black/50">Shown in the homepage partner loop. Partners without a logo use a text badge instead.</p>
					</div>
					{form.logo_url.trim() ? (
						<button
							type="button"
							onClick={() => update("logo_url", "")}
							disabled={!canEdit || uploading}
							className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
						>
							<Trash2 className="h-3 w-3" />
							Remove logo
						</button>
					) : null}
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-4">
					<div className="flex min-h-[72px] min-w-[160px] items-center justify-center rounded-lg border border-dashed border-black/15 bg-white p-3">
						{form.logo_url.trim() ? (
							<Image src={form.logo_url} alt={displayName} width={180} height={64} unoptimized className="max-h-14 w-auto object-contain" />
						) : (
							<span className="text-xs text-black/40">No logo uploaded</span>
						)}
					</div>
					<div className="flex-1 space-y-2">
						<label className={`${subtleButton} cursor-pointer justify-center`}>
							<Upload className="h-3.5 w-3.5" />
							<span>{uploading ? "Uploading..." : "Upload image"}</span>
							<input
								type="file"
								accept="image/png,image/jpeg,image/svg+xml,image/webp"
								onChange={handleUpload}
								disabled={!canEdit || uploading}
								className="hidden"
							/>
						</label>
						<input
							type="url"
							value={form.logo_url}
							onChange={(event) => update("logo_url", event.target.value)}
							placeholder="Or paste an image URL (https://...)"
							disabled={!canEdit}
							className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30"
						/>
						{logoError ? <p className="text-[11px] text-red-600">{logoError}</p> : null}
					</div>
				</div>
			</div>

			<label className={`flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 ${canEdit ? "cursor-pointer" : ""}`}>
				<span>
					<span className="block text-sm font-medium text-[#111111]">Visible on the website</span>
					<span className="block text-xs text-black/50">When off, this partner is hidden from the homepage marquee.</span>
				</span>
				<input
					type="checkbox"
					checked={form.is_active}
					onChange={(event) => update("is_active", event.target.checked)}
					disabled={!canEdit}
					className="h-4 w-4 shrink-0 accent-[#111111]"
				/>
			</label>

			{!isCreating && row ? <AccountPanel developer={row} defaultEmail={asText(row.contact_email)} onReload={onReload} /> : null}

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
				<p className="text-xs text-black/45">
					{status || (isCreating ? "Fill in the details to add a new partner." : "Review the details before saving.")}
				</p>
				<button type="button" onClick={handleSubmit} disabled={!canSave} className={primaryButton}>
					{saving ? "Saving..." : isCreating ? "Create partner" : "Save changes"}
				</button>
			</div>
		</div>
	);
}

function AccountPanel({ developer, defaultEmail, onReload }: { developer: CmsRow; defaultEmail: string; onReload: () => Promise<void> }) {
	const profileId = asText(developer.profile_id);
	const hasAccount = Boolean(profileId.trim());
	const companyName = asText(developer.company_name);
	const [email, setEmail] = useState(defaultEmail);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");

	async function createAccount() {
		const target = email.trim().toLowerCase();
		if (!target) {
			setMessage("Enter an email address for the login account.");
			return;
		}

		setBusy(true);
		setMessage(`Creating account and sending invite to ${target}...`);
		try {
			const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
			const response = await fetch("/api/admin/developers", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				body: JSON.stringify({ developerId: asText(developer.id), email: target, companyName }),
			});

			const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!response.ok || !data?.ok) {
				setMessage(data?.error || "Failed to create the account.");
				return;
			}

			setMessage(`Invitation sent to ${target}.`);
			await onReload();
		} catch {
			setMessage("Network error while creating the account.");
		} finally {
			setBusy(false);
		}
	}

	async function sendReset() {
		const target = asText(developer.contact_email).trim().toLowerCase();
		if (!target) {
			setMessage("No contact email on file.");
			return;
		}

		setBusy(true);
		setMessage(`Sending password reset to ${target}...`);
		try {
			const { error } = await supabaseBrowser.auth.resetPasswordForEmail(target, {
				redirectTo: `${window.location.origin}/reset-password?next=/developer`,
			});
			setMessage(error ? `Error: ${error.message}` : `Password reset email sent to ${target}.`);
		} catch {
			setMessage("Failed to send password reset.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<div className="text-sm font-semibold text-[#111111]">Login account</div>
					<p className="text-xs text-black/50">Optional. Lets this partner sign in to manage their own logo.</p>
				</div>
				{hasAccount ? (
					<Pill tone="emerald">
						<CheckCircle2 className="h-3 w-3" /> Account active
					</Pill>
				) : (
					<Pill tone="amber">
						<AlertCircle className="h-3 w-3" /> No account
					</Pill>
				)}
			</div>

			{hasAccount ? (
				<div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
					<div className="min-w-0">
						<div className="break-all font-medium text-emerald-900">{asText(developer.contact_email) || "Linked account"}</div>
						<div className="mt-0.5 truncate font-mono text-[10px] text-emerald-900/60">{profileId}</div>
					</div>
					<button
						type="button"
						onClick={sendReset}
						disabled={busy}
						className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:opacity-50"
					>
						<RefreshCw className="h-3 w-3" />
						{busy ? "Sending..." : "Send password reset"}
					</button>
				</div>
			) : (
				<div className="mt-4 space-y-3">
					<label className="block">
						<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/50">Account email</span>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="partner@developer.com"
							className={inputClass}
						/>
					</label>
					<button type="button" onClick={createAccount} disabled={busy || !email.trim()} className={primaryButton}>
						<Shield className="h-3.5 w-3.5" />
						{busy ? "Creating account..." : "Create account & invite"}
					</button>
				</div>
			)}

			{message ? <p className="mt-3 text-[11px] text-black/60">{message}</p> : null}
		</div>
	);
}

export default DeveloperPartnersWorkspace;
