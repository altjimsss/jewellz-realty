"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, Plus, RefreshCw, Shield, Trash2, Upload, UserRound, X } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CmsPayload, CmsRow } from "./types";
import { asText } from "./utils";

const inputClass =
	"mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-black/50";
const primaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20";

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

function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AgentAvatar({ src, name, size = "sm" }: { src: string; name: string; size?: "sm" | "lg" }) {
	const box = size === "lg" ? "h-14 w-14 rounded-full" : "h-10 w-10 rounded-full";
	const pixels = size === "lg" ? 56 : 40;
	return (
		<SafeImage
			src={src}
			alt={name}
			width={pixels}
			height={pixels}
			className={`${box} shrink-0 border border-black/10 bg-zinc-100 object-cover`}
			fallbackContent={
				<div className={`flex ${box} shrink-0 items-center justify-center border border-black/10 bg-zinc-100 text-xs font-semibold text-black/50`}>
					{initials(name) || <UserRound className="h-4 w-4" />}
				</div>
			}
		/>
	);
}

type RecordEmailFor = (row: CmsRow) => string;

type WorkspaceProps = {
	rows: CmsRow[];
	selectedId: string | null;
	canEdit: boolean;
	rowMeta: (row: CmsRow) => string;
	emailForRow: RecordEmailFor;
	metrics?: ReactNode;
	onSelect: (row: CmsRow | null) => void;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
	onReload: () => Promise<void>;
};

export function AgentsWorkspace({ rows, selectedId, canEdit, rowMeta, emailForRow, metrics, onSelect, onDelete, onSubmit, onReload }: WorkspaceProps) {
	const [search, setSearch] = useState("");
	const [showRegister, setShowRegister] = useState(false);
	const selectedRow = rows.find((row) => asText(row.id) === asText(selectedId)) ?? null;

	const query = search.trim().toLowerCase();
	const filtered = rows.filter((row) => {
		if (!query) return true;
		return [asText(row.full_name), rowMeta(row), asText(row.email)].join(" ").toLowerCase().includes(query);
	});

	return (
		<section className="overflow-hidden rounded-lg border border-black/10 bg-white">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3">
				<div>
					<h2 className="text-sm font-semibold text-[#111111]">Agents</h2>
					<p className="mt-1 max-w-2xl text-xs leading-5 text-black/55">
						Profile details, social links, and live performance. Registering an agent creates their sign-in account and emails them a secure link to set their own password.
					</p>
				</div>
				{canEdit ? (
					<button
						type="button"
						onClick={() => setShowRegister((current) => !current)}
						className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white transition hover:bg-black/80"
					>
						{showRegister ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
						{showRegister ? "Close" : "Register agent"}
					</button>
				) : null}
			</div>

			<div className="p-4">
				{canEdit && showRegister ? (
					<div className="mb-4">
						<RegisterAgentForm
							onRegistered={async () => {
								await onReload();
							}}
							onDone={() => setShowRegister(false)}
						/>
					</div>
				) : null}

				<div className="grid gap-4 xl:grid-cols-[300px_1fr]">
					<aside className="rounded-lg border border-black/10 bg-white p-3">
						<div className="flex items-center justify-between gap-2 px-1 pb-3">
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Agents</div>
							<span className="text-xs text-black/40">{rows.length}</span>
						</div>
						<label className="mb-3 block px-1">
							<span className="sr-only">Search agents</span>
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search agents..."
								className="h-9 w-full rounded-md border border-black/10 bg-zinc-50 px-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 focus:bg-white"
							/>
						</label>
						<div className="max-h-[720px] min-h-[520px] space-y-2 overflow-auto pr-1 xl:max-h-[calc(100vh-300px)]">
							{rows.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No agents yet. Use “Register agent”.</p> : null}
							{rows.length > 0 && filtered.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No agents match your search.</p> : null}
							{filtered.map((row) => {
								const id = asText(row.id);
								const active = id === asText(selectedId);
								const isActive = asText(row.is_active) !== "false";
								const isTop = asText(row.is_top_agent) === "true";
								return (
									<button
										key={id}
										type="button"
										onClick={() => onSelect(row)}
										className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition ${active ? "border-black/20 bg-zinc-100" : "border-transparent bg-white hover:border-black/10 hover:bg-zinc-50"}`}
									>
										<AgentAvatar src={asText(row.photo_url)} name={asText(row.full_name)} />
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium text-[#111111]">{asText(row.full_name) || "Unnamed agent"}</div>
											<div className="mt-1 flex flex-wrap gap-1">
												{isTop ? <Pill tone="blue">Top agent</Pill> : null}
												{isActive ? null : <Pill tone="amber">Hidden</Pill>}
												{rowMeta(row) ? <span className="truncate text-[11px] text-black/45">{rowMeta(row)}</span> : null}
											</div>
										</div>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="rounded-lg border border-black/10 bg-white p-4">
						{selectedRow ? (
							<AgentEditor
								key={asText(selectedRow.id)}
								row={selectedRow}
								canEdit={canEdit}
								loginEmail={emailForRow(selectedRow)}
								metrics={metrics}
								onDelete={onDelete}
								onSubmit={onSubmit}
							/>
						) : (
							<div className="flex min-h-[520px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-zinc-50 p-8 text-center">
								<UserRound className="h-6 w-6 text-black/30" />
								<p className="text-sm font-medium text-[#111111]">Select an agent to edit</p>
								<p className="max-w-sm text-xs leading-5 text-black/50">Choose an agent from the list to update their profile, or register a new agent to create a sign-in account.</p>
								{canEdit ? (
									<button
										type="button"
										onClick={() => setShowRegister(true)}
										className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-2 text-xs font-medium text-[#111111] transition hover:bg-zinc-50"
									>
										<Plus className="h-3.5 w-3.5" />
										Register agent
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

function AgentPhotoUploadButton({
	currentUrl,
	onUploaded,
	disabled = false,
}: {
	currentUrl?: string | null;
	onUploaded: (url: string) => void;
	disabled?: boolean;
}) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setError("Please choose a PNG, JPG, or WebP image.");
			return;
		}

		setUploading(true);
		setError("");

		try {
			const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
			const filePath = `agent-photos/${Date.now()}-${cleanName}`;

			// Try direct Supabase storage upload
			const { error: uploadErr } = await supabaseBrowser.storage
				.from("property-images")
				.upload(filePath, file, {
					contentType: file.type || "image/jpeg",
					upsert: true,
				});

			if (!uploadErr) {
				const { data: publicUrlData } = supabaseBrowser.storage
					.from("property-images")
					.getPublicUrl(filePath);
				onUploaded(publicUrlData.publicUrl);
				return;
			}

			// Fallback to /api/upload
			const session = (await supabaseBrowser.auth.getSession()).data.session;
			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", "agent-photos");

			const res = await fetch("/api/upload", {
				method: "POST",
				headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
				body: formData,
			});

			const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
			if (res.ok && data?.url) {
				onUploaded(data.url);
			} else {
				setError(data?.error || uploadErr.message || "Failed to upload photo.");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Upload error.";
			setError(msg);
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	return (
		<div className="flex flex-col gap-1">
			<input
				ref={fileInputRef}
				type="file"
				accept="image/png,image/jpeg,image/jpg,image/webp"
				onChange={handleFileChange}
				disabled={disabled || uploading}
				className="hidden"
			/>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				disabled={disabled || uploading}
				className="inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
			>
				{uploading ? (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin text-black/60" />
						<span>Uploading...</span>
					</>
				) : (
					<>
						<Upload className="h-3.5 w-3.5 text-black/60" />
						<span>{currentUrl ? "Change picture (PNG/JPG)" : "Upload picture (PNG/JPG)"}</span>
					</>
				)}
			</button>
			{error ? <p className="text-xs text-red-600">{error}</p> : null}
		</div>
	);
}

type RegisterProps = {
	onRegistered: () => Promise<void>;
	onDone: () => void;
};

function RegisterAgentForm({ onRegistered, onDone }: RegisterProps) {
	const [form, setForm] = useState({ email: "", fullName: "", licenseNumber: "", specialization: "", photoUrl: "", facebookUrl: "", instagramUrl: "", twitterUrl: "", linkedinUrl: "", isTopAgent: false });
	const [status, setStatus] = useState("");
	const [saving, setSaving] = useState(false);

	function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving) return;
		setSaving(true);
		setStatus("Creating the agent account...");

		try {
			const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
			const response = await fetch("/api/admin/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				credentials: "same-origin",
				body: JSON.stringify(form),
			});
			const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
			if (!response.ok || !payload?.ok) {
				setStatus(payload?.error ?? "Unable to create the agent right now.");
				setSaving(false);
				return;
			}

			setStatus(`Agent ${form.email} created. Supabase emailed them a secure link to set their password.`);
			setForm({ email: "", fullName: "", licenseNumber: "", specialization: "", photoUrl: "", facebookUrl: "", instagramUrl: "", twitterUrl: "", linkedinUrl: "", isTopAgent: false });
			setSaving(false);
			await onRegistered();
		} catch {
			setStatus("Could not reach the agent registration service.");
			setSaving(false);
		}
	}

	return (
		<div className="rounded-lg border border-black/15 bg-zinc-50/70 p-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Register a new agent</div>
					<p className="mt-1 text-sm leading-5 text-black/55">Creates the sign-in account, profile, and agent record in one step. The agent sets their own password from the emailed link.</p>
				</div>
				<button type="button" onClick={onDone} className="inline-flex items-center gap-1 text-xs font-medium text-black/50 transition hover:text-[#111111]">
					<X className="h-3.5 w-3.5" />
					Close
				</button>
			</div>

			<form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
				<label className="block">
					<div className={labelClass}>Full name</div>
					<input type="text" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} placeholder="e.g. Maria Santos" className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>Email (login)</div>
					<input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="agent@jewellzrealty.com" className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>License number</div>
					<input type="text" value={form.licenseNumber} onChange={(event) => update("licenseNumber", event.target.value)} placeholder="e.g. PRC-50122" className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>Specialization</div>
					<input type="text" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} placeholder="e.g. Condo & Pre-selling" className={inputClass} />
				</label>
				<div className="block md:col-span-2 rounded-lg border border-black/10 bg-white p-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<div className={labelClass}>Agent Photo (PNG/JPG)</div>
							<p className="text-xs text-black/50">Upload a picture for the new agent or paste an image link.</p>
						</div>
						{form.photoUrl ? (
							<button
								type="button"
								onClick={() => update("photoUrl", "")}
								className="text-xs text-red-600 hover:text-red-700"
							>
								Remove
							</button>
						) : null}
					</div>
					<div className="mt-2.5 flex flex-wrap items-center gap-3">
						<AgentAvatar src={form.photoUrl} name={form.fullName || "New Agent"} size="sm" />
						<AgentPhotoUploadButton
							currentUrl={form.photoUrl}
							onUploaded={(url) => update("photoUrl", url)}
							disabled={saving}
						/>
						<input
							type="url"
							value={form.photoUrl}
							onChange={(event) => update("photoUrl", event.target.value)}
							placeholder="Or paste photo URL (https://...)"
							className="h-8 min-w-[200px] flex-1 rounded-md border border-black/10 bg-white px-2.5 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30"
						/>
					</div>
				</div>
				<label className="block">
					<div className={labelClass}>Facebook URL</div>
					<input type="url" value={form.facebookUrl} onChange={(event) => update("facebookUrl", event.target.value)} placeholder="https://facebook.com/..." className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>Instagram URL</div>
					<input type="url" value={form.instagramUrl} onChange={(event) => update("instagramUrl", event.target.value)} placeholder="https://instagram.com/..." className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>Twitter / X URL</div>
					<input type="url" value={form.twitterUrl} onChange={(event) => update("twitterUrl", event.target.value)} placeholder="https://x.com/..." className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>LinkedIn URL</div>
					<input type="url" value={form.linkedinUrl} onChange={(event) => update("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/in/..." className={inputClass} />
				</label>
				<label className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/70 md:col-span-2">
					<input type="checkbox" checked={form.isTopAgent} onChange={(event) => update("isTopAgent", event.target.checked)} className="h-4 w-4 accent-[#111111]" />
					<span>Mark as top agent (shows on the homepage “Meet Our Agents” section)</span>
				</label>
				<div className="flex flex-wrap items-center gap-3 md:col-span-2">
					<button type="submit" disabled={saving || !form.email.trim() || !form.fullName.trim()} className={primaryButton}>
						{saving ? "Creating..." : "Register agent"}
					</button>
					{status ? <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black/70 ring-1 ring-black/10">{status}</span> : null}
				</div>
			</form>
		</div>
	);
}

type EditorProps = {
	row: CmsRow;
	canEdit: boolean;
	loginEmail: string;
	metrics?: ReactNode;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
};

function AgentEditor({ row, canEdit, loginEmail, metrics, onDelete, onSubmit }: EditorProps) {
	const [form, setForm] = useState(() => ({
		full_name: asText(row.full_name),
		license_number: asText(row.license_number),
		specialization: asText(row.specialization),
		bio: asText(row.bio),
		photo_url: asText(row.photo_url),
		facebook_url: asText(row.facebook_url),
		instagram_url: asText(row.instagram_url),
		twitter_url: asText(row.twitter_url),
		linkedin_url: asText(row.linkedin_url),
		is_top_agent: asText(row.is_top_agent) === "true",
		is_active: asText(row.is_active) !== "false",
	}));
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	const displayName = form.full_name.trim() || "Unnamed agent";

	function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
		setForm((current) => ({ ...current, [field]: value }));
		setStatus("");
	}

	async function handleSubmit() {
		if (!form.full_name.trim()) {
			setStatus("Full name is required.");
			return;
		}

		setSaving(true);
		setStatus("Saving agent...");

		const payload: CmsPayload = {
			full_name: form.full_name.trim(),
			license_number: form.license_number.trim() || null,
			specialization: form.specialization.trim() || null,
			bio: form.bio.trim() || null,
			photo_url: form.photo_url.trim() || null,
			facebook_url: form.facebook_url.trim() || null,
			instagram_url: form.instagram_url.trim() || null,
			twitter_url: form.twitter_url.trim() || null,
			linkedin_url: form.linkedin_url.trim() || null,
			is_top_agent: form.is_top_agent,
			is_active: form.is_active,
		};

		await onSubmit(payload, row);
		setSaving(false);
		setStatus("Changes saved.");
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
				<div className="flex min-w-0 items-center gap-3">
					<AgentAvatar src={form.photo_url} name={displayName} size="lg" />
					<div className="min-w-0">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Editing agent</div>
						<div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#111111]">{displayName}</div>
						<div className="mt-1 flex flex-wrap items-center gap-1">
							{form.is_top_agent ? <Pill tone="blue">Top agent</Pill> : null}
							{form.is_active ? <Pill tone="emerald">Visible</Pill> : <Pill tone="amber">Hidden</Pill>}
							{loginEmail ? <span className="break-all text-[11px] text-black/45">{loginEmail}</span> : null}
						</div>
					</div>
				</div>
				{canEdit ? (
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
				<label className="block">
					<div className={labelClass}>Full name</div>
					<input type="text" value={form.full_name} onChange={(event) => update("full_name", event.target.value)} disabled={!canEdit} className={inputClass} />
				</label>
				<label className="block">
					<div className={labelClass}>License number</div>
					<input type="text" value={form.license_number} onChange={(event) => update("license_number", event.target.value)} placeholder="e.g. PRC-50122" disabled={!canEdit} className={inputClass} />
				</label>
				<label className="block md:col-span-2">
					<div className={labelClass}>Specialization</div>
					<input type="text" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} placeholder="e.g. Condo & Pre-selling" disabled={!canEdit} className={inputClass} />
				</label>
				<label className="block md:col-span-2">
					<div className={labelClass}>Bio</div>
					<textarea rows={4} value={form.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Short professional background..." disabled={!canEdit} className={`${inputClass} min-h-[110px] py-3`} />
				</label>
			</div>

			<div className="rounded-lg border border-black/10 bg-zinc-50/60 p-4">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<div className="text-sm font-semibold text-[#111111]">Photo</div>
						<p className="text-xs text-black/50">Shown on the homepage “Meet Our Agents” section and agent cards.</p>
					</div>
					{form.photo_url.trim() ? (
						<button
							type="button"
							onClick={() => update("photo_url", "")}
							disabled={!canEdit}
							className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
						>
							<Trash2 className="h-3 w-3" />
							Remove photo
						</button>
					) : null}
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-4">
					<AgentAvatar src={form.photo_url} name={displayName} size="lg" />
					<div className="flex flex-1 flex-col gap-2 min-w-[220px]">
						<div className="flex items-center gap-2">
							<AgentPhotoUploadButton
								currentUrl={form.photo_url}
								onUploaded={(url) => update("photo_url", url)}
								disabled={!canEdit}
							/>
							<span className="text-[11px] text-black/45">or paste URL below</span>
						</div>
						<input
							type="url"
							value={form.photo_url}
							onChange={(event) => update("photo_url", event.target.value)}
							placeholder="Paste an image URL (https://...)"
							disabled={!canEdit}
							className="h-9 min-w-[220px] w-full rounded-md border border-black/10 bg-white px-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30"
						/>
					</div>
				</div>
			</div>

			<div>
				<div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Social links</div>
				<div className="grid gap-4 md:grid-cols-2">
					<label className="block">
						<div className={labelClass}>Facebook URL</div>
						<input type="url" value={form.facebook_url} onChange={(event) => update("facebook_url", event.target.value)} placeholder="https://facebook.com/..." disabled={!canEdit} className={inputClass} />
					</label>
					<label className="block">
						<div className={labelClass}>Instagram URL</div>
						<input type="url" value={form.instagram_url} onChange={(event) => update("instagram_url", event.target.value)} placeholder="https://instagram.com/..." disabled={!canEdit} className={inputClass} />
					</label>
					<label className="block">
						<div className={labelClass}>Twitter / X URL</div>
						<input type="url" value={form.twitter_url} onChange={(event) => update("twitter_url", event.target.value)} placeholder="https://x.com/..." disabled={!canEdit} className={inputClass} />
					</label>
					<label className="block">
						<div className={labelClass}>LinkedIn URL</div>
						<input type="url" value={form.linkedin_url} onChange={(event) => update("linkedin_url", event.target.value)} placeholder="https://linkedin.com/in/..." disabled={!canEdit} className={inputClass} />
					</label>
				</div>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<label className={`flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 ${canEdit ? "cursor-pointer" : ""}`}>
					<span>
						<span className="block text-sm font-medium text-[#111111]">Top agent</span>
						<span className="block text-xs text-black/50">Feature on the homepage “Meet Our Agents” section.</span>
					</span>
					<input type="checkbox" checked={form.is_top_agent} onChange={(event) => update("is_top_agent", event.target.checked)} disabled={!canEdit} className="h-4 w-4 shrink-0 accent-[#111111]" />
				</label>
				<label className={`flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 ${canEdit ? "cursor-pointer" : ""}`}>
					<span>
						<span className="block text-sm font-medium text-[#111111]">Visible on the website</span>
						<span className="block text-xs text-black/50">When off, this agent is hidden from the public site.</span>
					</span>
					<input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} disabled={!canEdit} className="h-4 w-4 shrink-0 accent-[#111111]" />
				</label>
			</div>

			{loginEmail ? <AgentAccountPanel email={loginEmail} /> : null}

			{metrics}

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
				<p className="text-xs text-black/45">{status || "Review the details before saving."}</p>
				<button type="button" onClick={handleSubmit} disabled={!canEdit || saving || !form.full_name.trim()} className={primaryButton}>
					{saving ? "Saving..." : "Save changes"}
				</button>
			</div>
		</div>
	);
}

function AgentAccountPanel({ email }: { email: string }) {
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");

	async function sendReset() {
		if (!email) {
			setMessage("No login email on file.");
			return;
		}
		setBusy(true);
		setMessage(`Sending password reset to ${email}...`);
		try {
			const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/reset-password?next=/agent`,
			});
			setMessage(error ? `Error: ${error.message}` : `Password reset email sent to ${email}.`);
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
					<p className="text-xs text-black/50">The email this agent uses to sign in to their dashboard.</p>
				</div>
				<Pill tone="emerald">
					<CheckCircle2 className="h-3 w-3" /> Account active
				</Pill>
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
				<div className="flex min-w-0 items-center gap-2 font-medium text-emerald-900">
					<Mail className="h-3.5 w-3.5 shrink-0" />
					<span className="break-all">{email}</span>
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

			{message ? <p className="mt-3 text-[11px] text-black/60">{message}</p> : <p className="mt-3 flex items-center gap-1 text-[11px] text-black/45"><Shield className="h-3 w-3" /> Only the agent can set their own password.</p>}
			{!email ? <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700"><AlertCircle className="h-3 w-3" /> No profile is linked to this agent yet.</p> : null}
		</div>
	);
}

export default AgentsWorkspace;
