"use client";

import { useState } from "react";
import { Plus, Search, Settings as SettingsIcon, Trash2 } from "lucide-react";
import type { CmsPayload, CmsRow } from "./types";
import { asText } from "./utils";

const inputClass =
"mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "text-sm font-medium text-[#111111]";
const primaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#DE141C] px-4 text-sm font-semibold text-white shadow-sm shadow-red-900/10 transition hover:bg-[#bf1018] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#DE141C]/20 disabled:cursor-not-allowed disabled:bg-black/20";

type ValueKind = "boolean" | "number" | "text";

function valueKind(key: string, value: string): ValueKind {
	const normalizedKey = key.trim().toLowerCase();
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "true" || normalizedValue === "false") return "boolean";
	if (/(enabled$|_enabled$|auto_assign|_flag$|is_[a-z])/.test(normalizedKey)) return "boolean";
	if (/(secs|seconds|hours|minutes|days|count|threshold|percent|_pct|rate|limit|size|_min$|_max$)/.test(normalizedKey)) return "number";
	if (value.trim() !== "" && !Number.isNaN(Number(value))) return "number";
	return "text";
}

const kindLabel: Record<ValueKind, string> = { boolean: "Toggle", number: "Number", text: "Text" };

function settingName(key: string) {
	return key.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "New setting";
}

function ValueChip({ kind, value }: { kind: ValueKind; value: string }) {
	if (kind === "boolean") {
		const on = value.trim().toLowerCase() === "true";
		return (
			<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/10 bg-zinc-100 text-black/50"}`}>
				<span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-black/25"}`} />
				{on ? "On" : "Off"}
			</span>
		);
	}
	return <span className="inline-flex max-w-[136px] items-center truncate rounded-full border border-black/10 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-medium text-black/60">{value.trim() || "—"}</span>;
}

type WorkspaceProps = {
	rows: CmsRow[];
	selectedId: string | null;
	canEdit: boolean;
	onSelect: (row: CmsRow | null) => void;
	onCreateNew: () => void;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
};

export function SettingsWorkspace({ rows, selectedId, canEdit, onSelect, onCreateNew, onDelete, onSubmit }: WorkspaceProps) {
	const [search, setSearch] = useState("");
	const selectedRow = rows.find((row) => asText(row.key) === asText(selectedId)) ?? null;
	const isCreating = !selectedRow;
	const editorKey = selectedRow ? asText(selectedRow.key) : "__new__";

	const query = search.trim().toLowerCase();
	const filtered = rows.filter((row) => {
		if (!query) return true;
		return [asText(row.key), asText(row.description), asText(row.value)].join(" ").toLowerCase().includes(query);
	});

	return (
		<section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm shadow-black/[0.025]">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.07] bg-zinc-50 px-5 py-5 sm:px-6">
				<div className="flex min-w-0 items-start gap-3.5">
					<div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#DE141C]/[0.08] text-[#DE141C] ring-1 ring-inset ring-[#DE141C]/10">
						<SettingsIcon className="h-5 w-5" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-base font-semibold tracking-tight text-[#111111]">System settings</h2>
							<span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-black/55">{rows.length} total</span>
						</div>
						<p className="mt-1 max-w-2xl text-sm leading-5 text-black/50">Manage platform behavior. Each setting uses an editor suited to its value type.</p>
					</div>
				</div>
				{canEdit ? (
					<button
						type="button"
						onClick={onCreateNew}
						className={primaryButton}
					>
						<Plus className="h-4 w-4" />
						Add setting
					</button>
				) : null}
			</div>

			<div className="grid gap-4 p-4 sm:gap-5 sm:p-5 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.5fr)] xl:items-start">
					<aside className="overflow-hidden rounded-2xl border border-black/[0.08] bg-zinc-50/65">
						<div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
							<div>
								<div className="text-sm font-semibold text-[#111111]">Setting directory</div>
								<div className="mt-0.5 text-xs text-black/45">Choose a value to edit</div>
							</div>
							<span className="rounded-lg border border-black/[0.07] bg-white px-2 py-1 text-xs font-semibold tabular-nums text-black/55">{filtered.length}</span>
						</div>
						<label className="relative mx-3 mb-3 block">
							<span className="sr-only">Search settings</span>
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search settings..."
								className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/40 focus:ring-4 focus:ring-[#DE141C]/[0.08]"
							/>
						</label>
						<div className="max-h-[680px] min-h-40 space-y-1.5 overflow-auto px-2 pb-2 xl:max-h-[calc(100vh-340px)]">
							{rows.length === 0 ? <p className="rounded-xl px-3 py-5 text-sm text-black/45">No settings yet. Add one to get started.</p> : null}
							{rows.length > 0 && filtered.length === 0 ? <p className="rounded-xl px-3 py-5 text-sm text-black/45">No settings match your search.</p> : null}
							{filtered.map((row) => {
								const key = asText(row.key);
								const value = asText(row.value);
								const active = key === asText(selectedId);
								const kind = valueKind(key, value);
								return (
									<button
										key={key}
										type="button"
										onClick={() => onSelect(row)}
										className={`group w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30 ${active ? "border-[#DE141C]/20 bg-white shadow-sm shadow-black/[0.04] ring-1 ring-inset ring-[#DE141C]/10" : "border-transparent bg-transparent hover:border-black/[0.06] hover:bg-white/80"}`}
									>
										<div className="flex items-center gap-2">
											<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[#DE141C]" : "bg-black/15 group-hover:bg-black/30"}`} />
											<span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111111]">{settingName(key)}</span>
											<ValueChip kind={kind} value={value} />
										</div>
									<div className="mt-1.5 truncate pl-3.5 text-xs text-black/45">{kindLabel[kind]} setting</div>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="min-w-0 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm shadow-black/[0.025] sm:p-6">
						{selectedRow || isCreating ? (
							<SettingEditor
								key={editorKey}
								row={selectedRow}
								isCreating={isCreating}
								canEdit={canEdit}
								onDelete={onDelete}
								onSubmit={onSubmit}
							/>
						) : (
							<div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-zinc-50/70 p-8 text-center">
								<div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black/35 shadow-sm ring-1 ring-black/[0.06]">
									<SettingsIcon className="h-5 w-5" />
								</div>
								<p className="text-sm font-medium text-[#111111]">Select a setting to edit</p>
								<p className="max-w-sm text-xs leading-5 text-black/50">Choose a key from the list, or create a new one.</p>
							</div>
						)}
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
};

function SettingEditor({ row, isCreating, canEdit, onDelete, onSubmit }: EditorProps) {
	const [key, setKey] = useState(asText(row?.key));
	const [value, setValue] = useState(asText(row?.value));
	const [description, setDescription] = useState(asText(row?.description));
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	const kind = valueKind(key, value);
	const canSave = canEdit && Boolean(key.trim()) && !saving;

	async function handleSubmit() {
		if (!key.trim()) {
			setStatus("Key is required.");
			return;
		}

		setSaving(true);
		setStatus("Saving setting...");

		const payload: CmsPayload = {
			key: key.trim(),
			value: value.trim(),
			description: description.trim() || null,
		};

		await onSubmit(payload, row);
		setSaving(false);

		if (isCreating) {
			setKey("");
			setValue("");
			setDescription("");
			setStatus("Setting created.");
		} else {
			setStatus("Changes saved.");
		}
	}

	return (
	<div className="space-y-6">
		<div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.07] pb-5">
				<div className="min-w-0">
				<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">{isCreating ? "Add a setting" : "Edit setting"}</div>
				<div className="mt-1.5 truncate text-xl font-semibold tracking-[-0.03em] text-[#111111]">{settingName(key)}</div>
				<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/45">
					<span className="rounded-full border border-black/[0.08] bg-zinc-50 px-2.5 py-1 font-medium text-black/60">{kindLabel[kind]}</span>
					<span>{isCreating ? "Give this setting a name and choose its value." : "Change the value below and save."}</span>
					</div>
				</div>
				{!isCreating && row && canEdit ? (
					<button
						type="button"
						onClick={() => onDelete(row)}
						className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200/80 bg-white px-3.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/10"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Delete
					</button>
				) : null}
			</div>

		<div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
				<div className="md:col-span-2">
					<div className={labelClass}>{settingName(key)} value</div>
					{kind === "boolean" ? (
						<label className={`mt-2 flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-zinc-50/60 px-4 py-4 transition ${canEdit ? "cursor-pointer hover:border-black/15 hover:bg-zinc-50" : ""}`}>
							<span>
								<span className="block text-sm font-medium text-[#111111]">{value.trim().toLowerCase() === "true" ? "Enabled" : "Disabled"}</span>
								<span className="mt-0.5 block text-xs text-black/50">Switch this setting on or off.</span>
							</span>
							<input
								type="checkbox"
								checked={value.trim().toLowerCase() === "true"}
								onChange={(event) => {
									setValue(event.target.checked ? "true" : "false");
									setStatus("");
								}}
								disabled={!canEdit}
								className="h-5 w-5 shrink-0 accent-[#DE141C]"
							/>
						</label>
					) : (
						<input
							type={kind === "number" ? "number" : "text"}
							value={value}
							onChange={(event) => {
								setValue(event.target.value);
								setStatus("");
							}}
							placeholder={kind === "number" ? "0" : "Value"}
							disabled={!canEdit}
							className={inputClass}
						/>
					)}
				</div>

				<details className="md:col-span-2 rounded-xl border border-black/[0.08] bg-zinc-50/60 px-4 py-3" open={isCreating ? true : undefined}>
					<summary className="cursor-pointer text-sm font-medium text-black/65">Advanced details</summary>
					<div className="mt-4 grid gap-4">
						<label className="block">
							<div className={labelClass}>Setting identifier</div>
							<input type="text" value={key} onChange={(event) => { setKey(event.target.value); setStatus(""); }} placeholder="e.g. hot_picks_count" disabled={!canEdit || !isCreating} className={`${inputClass} font-mono`} />
							<p className="mt-1 text-[11px] text-black/45">Used internally by the system. Leave unchanged when editing.</p>
						</label>
						<label className="block">
							<div className={labelClass}>Internal note <span className="font-normal text-black/40">(optional)</span></div>
							<textarea rows={2} value={description} onChange={(event) => { setDescription(event.target.value); setStatus(""); }} placeholder="Add a note for other administrators" disabled={!canEdit} className={`${inputClass} resize-y leading-6`} />
						</label>
					</div>
				</details>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] pt-5">
				<p className={`text-xs ${status.includes("saved") || status.includes("created") ? "text-emerald-700" : status.includes("required") ? "text-red-600" : "text-black/45"}`} aria-live="polite">{status || (isCreating ? "Complete the setting details above to create it." : "Changes take effect after you save.")}</p>
				<button type="button" onClick={handleSubmit} disabled={!canSave} className={primaryButton}>
					{saving ? "Saving..." : isCreating ? "Create setting" : "Save changes"}
				</button>
			</div>
		</div>
	);
}

export default SettingsWorkspace;
