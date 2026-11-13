"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import Image from "next/image";
import { AlertCircle, Building2, CheckCircle2, Globe, Plus, RefreshCw, Shield, Trash2, Upload } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CmsPayload, CmsRow } from "./types";
import { asText } from "./utils";
import { DeveloperLogoCropDialog } from "./DeveloperLogoCropDialog";

const inputClass =
	"mt-1.5 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/40 focus:ring-4 focus:ring-[#DE141C]/[0.08] disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "text-sm font-medium text-[#111111]";
const primaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15 disabled:cursor-not-allowed disabled:bg-black/20";
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
	}).sort((left, right) => asText(left.company_name).localeCompare(asText(right.company_name)));
	const liveCount = rows.filter((row) => asText(row.is_active) !== "false").length;

	return (
		<section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm shadow-black/[0.025]">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.07] bg-zinc-50/70 px-5 py-5 sm:px-6">
				<div>
					<h2 className="text-base font-semibold tracking-tight text-[#111111]">Developer partners</h2>
					<p className="mt-1 max-w-2xl text-sm leading-5 text-black/55">
						Manage the partner companies shown in the homepage marquee. A logo is all that is needed to appear — a login account is optional and lets the partner manage their own logo.
					</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<Pill>{rows.length} total</Pill>
						<Pill tone="emerald">{liveCount} visible</Pill>
						{rows.length - liveCount > 0 ? <Pill tone="zinc">{rows.length - liveCount} hidden</Pill> : null}
					</div>
				</div>
				{canEdit ? (
					<button
						type="button"
						onClick={onCreateNew}
						className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#111111] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/15"
					>
						<Plus className="h-3.5 w-3.5" />
						Add partner
					</button>
				) : null}
			</div>

			<div className="p-4 sm:p-5">
				<div className="grid gap-4 xl:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.6fr)] xl:items-start">
					<aside className="overflow-hidden rounded-2xl border border-black/[0.08] bg-zinc-50/60">
						<div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
							<div>
								<div className="text-sm font-semibold text-[#111111]">Your partners</div>
								<div className="mt-0.5 text-xs text-black/45">Select a company to edit</div>
							</div>
							<span className="rounded-lg border border-black/[0.07] bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-black/55">{filtered.length}</span>
						</div>
						<label className="relative mx-3 mb-3 block">
							<span className="sr-only">Search partners</span>
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search partners..."
								className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/40 focus:ring-4 focus:ring-[#DE141C]/[0.08]"
							/>
						</label>
						<div className="max-h-[640px] min-h-40 space-y-1.5 overflow-auto px-2 pb-2 xl:max-h-[calc(100vh-330px)]">
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
										className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30 ${active ? "border-[#DE141C]/20 bg-white shadow-sm ring-1 ring-inset ring-[#DE141C]/10" : "border-transparent bg-transparent hover:border-black/[0.06] hover:bg-white/80"}`}
									>
										<LogoBadge src={asText(row.logo_url)} name={asText(row.company_name)} />
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium text-[#111111]">{asText(row.company_name) || "Untitled partner"}</div>
											<div className="mt-1 flex flex-wrap gap-1">
												<Pill tone={isActive ? "emerald" : "zinc"}>{isActive ? "Visible" : "Hidden"}</Pill>
												{hasLogo ? null : <Pill tone="amber">Logo needed</Pill>}
												{hasAccount ? <Pill tone="blue">Login active</Pill> : null}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="min-w-0 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm shadow-black/[0.025] sm:p-6">
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
							<div className="flex min-h-[360px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-zinc-50/70 p-8 text-center">
								<Building2 className="h-8 w-8 text-black/25" />
								<p className="text-sm font-semibold text-[#111111]">Choose a developer partner</p>
								<p className="max-w-sm text-sm leading-5 text-black/50">Select a company from the list to edit its details, logo, visibility, or login access.</p>
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
	const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
	const [currentLogoCropFile, setCurrentLogoCropFile] = useState<File | null>(null);
	const [loadingLogoForCrop, setLoadingLogoForCrop] = useState(false);
	const [status, setStatus] = useState("");
	const [logoError, setLogoError] = useState("");

	const companyName = form.company_name.trim();
	const displayName = companyName || "New developer partner";
	const cropFile = pendingLogoFile ?? currentLogoCropFile;
	const canSave = canEdit && Boolean(companyName) && !saving;

	function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		setLogoError("");
		setPendingLogoFile(file);
	}

	async function cropCurrentLogo() {
		const sourceUrl = form.logo_url.trim();
		if (!sourceUrl) return;
		setLoadingLogoForCrop(true);
		setLogoError("");
		try {
			const response = await fetch(sourceUrl);
			if (!response.ok) throw new Error("Could not load the saved logo. Check its URL and try again.");
			const blob = await response.blob();
			const contentType = blob.type.startsWith("image/") ? blob.type : "image/png";
			setCurrentLogoCropFile(new File([blob], `${companyName || "developer-logo"}.png`, { type: contentType }));
		} catch (error) {
			setLogoError(error instanceof Error ? error.message : "Could not load the saved logo for cropping.");
		} finally {
			setLoadingLogoForCrop(false);
		}
	}

	async function uploadCroppedLogo(blob: Blob) {
		setUploading(true);
		setLogoError("");
		try {
			const formData = new FormData();
			formData.append("file", new File([blob], `${companyName || "developer-logo"}.png`, { type: "image/png" }));
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
				setPendingLogoFile(null);
				setCurrentLogoCropFile(null);
				return;
			}
			update("logo_url", data.url);
			setPendingLogoFile(null);
			setCurrentLogoCropFile(null);
		} catch {
			setLogoError("Network error while uploading logo.");
			setPendingLogoFile(null);
			setCurrentLogoCropFile(null);
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
			{cropFile ? <DeveloperLogoCropDialog
				key={cropFile.name}
				file={cropFile}
				companyName={displayName}
				onCancel={() => { setPendingLogoFile(null); setCurrentLogoCropFile(null); }}
				onSave={uploadCroppedLogo}
			/> : null}
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

			<div>
				<h3 className="text-sm font-semibold text-[#111111]">Company details</h3>
				<p className="mt-0.5 text-xs text-black/45">Basic information shown to your team and used on partner listings.</p>
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
					<div className={labelClass}>Contact email</div>
					<input
						type="email"
						value={form.contact_email}
						onChange={(event) => update("contact_email", event.target.value)}
						placeholder="contact@company.com"
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
					<div className={labelClass}>Company description <span className="font-normal text-black/40">(optional)</span></div>
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

			<div className="rounded-2xl border border-black/[0.08] bg-zinc-50/70 p-4 sm:p-5">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<div className="text-sm font-semibold text-[#111111]">Homepage logo</div>
						<p className="mt-1 text-xs leading-5 text-black/50">This image appears in the homepage partner carousel. Upload and crop a logo, or paste an image URL.</p>
					</div>
					{form.logo_url.trim() ? (
						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={() => void cropCurrentLogo()}
								disabled={!canEdit || uploading || loadingLogoForCrop}
								className="inline-flex items-center gap-1 text-xs font-medium text-[#111111] transition hover:text-black/60 disabled:opacity-50"
							>
								{loadingLogoForCrop ? "Loading logo…" : "Crop current logo"}
							</button>
							<button
								type="button"
								onClick={() => update("logo_url", "")}
								disabled={!canEdit || uploading || loadingLogoForCrop}
								className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
							>
								<Trash2 className="h-3 w-3" />
								Remove logo
							</button>
						</div>
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
							<span>{uploading ? "Uploading..." : "Upload and crop image"}</span>
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

				<label className={`flex items-center justify-between gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 py-4 ${canEdit ? "cursor-pointer hover:border-black/15" : ""}`}>
				<span>
					<span className="block text-sm font-medium text-[#111111]">Show in homepage carousel</span>
					<span className="mt-0.5 block text-xs text-black/50">Turn off to keep this partner in the admin list but hide it from visitors.</span>
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
		<div className="rounded-2xl border border-black/[0.08] bg-zinc-50/60 p-4 sm:p-5">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<div className="text-sm font-semibold text-[#111111]">Partner login access <span className="font-normal text-black/40">(optional)</span></div>
					<p className="mt-1 text-xs text-black/50">Create an account only if the partner needs to sign in and manage their own logo.</p>
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
