"use client";

import { useState } from "react";
import { Plus, Settings as SettingsIcon, Trash2 } from "lucide-react";
import type { CmsPayload, CmsRow } from "./types";
import { asText } from "./utils";

const inputClass =
	"mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-black/50";
const primaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20";

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

function ValueChip({ kind, value }: { kind: ValueKind; value: string }) {
	if (kind === "boolean") {
		const on = value.trim().toLowerCase() === "true";
		return (
			<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/10 bg-zinc-100 text-black/50"}`}>
				{on ? "On" : "Off"}
			</span>
		);
	}
	return <span className="inline-flex max-w-[120px] items-center truncate rounded-full border border-black/10 bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-black/55">{value.trim() || "—"}</span>;
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
		<section className="overflow-hidden rounded-lg border border-black/10 bg-white">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3">
				<div>
					<h2 className="text-sm font-semibold text-[#111111]">System Settings</h2>
					<p className="mt-1 max-w-2xl text-xs leading-5 text-black/55">
						Key-value configuration for platform behavior. Values adapt to their type — toggles for switches, numeric inputs for counts and thresholds.
					</p>
				</div>
				{canEdit ? (
					<button
						type="button"
						onClick={onCreateNew}
						className="inline-flex items-center gap-1.5 rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white transition hover:bg-black/80"
					>
						<Plus className="h-3.5 w-3.5" />
						New setting
					</button>
				) : null}
			</div>

			<div className="p-4">
				<div className="grid gap-4 xl:grid-cols-[320px_1fr]">
					<aside className="rounded-lg border border-black/10 bg-white p-3">
						<div className="flex items-center justify-between gap-2 px-1 pb-3">
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Settings</div>
							<span className="text-xs text-black/40">{rows.length}</span>
						</div>
						<label className="mb-3 block px-1">
							<span className="sr-only">Search settings</span>
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search settings..."
								className="h-9 w-full rounded-md border border-black/10 bg-zinc-50 px-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/30 focus:bg-white"
							/>
						</label>
						<div className="max-h-[720px] min-h-[520px] space-y-2 overflow-auto pr-1 xl:max-h-[calc(100vh-300px)]">
							{rows.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No settings yet. Use “New setting”.</p> : null}
							{rows.length > 0 && filtered.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No settings match your search.</p> : null}
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
										className={`w-full rounded-md border px-3 py-2 text-left transition ${active ? "border-black/20 bg-zinc-100" : "border-transparent bg-white hover:border-black/10 hover:bg-zinc-50"}`}
									>
										<div className="flex items-center gap-2">
											<span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-[#111111]">{key}</span>
											<ValueChip kind={kind} value={value} />
										</div>
										<div className="mt-1 truncate text-xs text-black/50">{asText(row.description) || "No description"}</div>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="rounded-lg border border-black/10 bg-white p-4">
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
							<div className="flex min-h-[520px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-zinc-50 p-8 text-center">
								<SettingsIcon className="h-6 w-6 text-black/30" />
								<p className="text-sm font-medium text-[#111111]">Select a setting to edit</p>
								<p className="max-w-sm text-xs leading-5 text-black/50">Choose a key from the list, or create a new one.</p>
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
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
				<div className="min-w-0">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{isCreating ? "New setting" : "Editing setting"}</div>
					<div className="mt-1 truncate font-mono text-lg font-semibold tracking-[-0.02em] text-[#111111]">{key.trim() || "new_setting_key"}</div>
					<div className="mt-1 flex items-center gap-1.5 text-[11px] text-black/45">
						<span className="rounded-full border border-black/10 bg-zinc-100 px-2 py-0.5 font-medium text-black/55">{kindLabel[kind]}</span>
						<span>value type</span>
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
					<div className={labelClass}>Key</div>
					<input
						type="text"
						value={key}
						onChange={(event) => {
							setKey(event.target.value);
							setStatus("");
						}}
						placeholder="e.g. hot_picks_count"
						disabled={!canEdit || !isCreating}
						className={`${inputClass} font-mono`}
					/>
					{!isCreating ? <p className="mt-1 text-[11px] text-black/45">The key is the identifier and can’t be changed.</p> : null}
				</label>

				<div className="md:col-span-2">
					<div className={labelClass}>Value</div>
					{kind === "boolean" ? (
						<label className={`mt-1 flex items-center justify-between gap-3 rounded-md border border-black/10 bg-white px-4 py-3 ${canEdit ? "cursor-pointer" : ""}`}>
							<span>
								<span className="block text-sm font-medium text-[#111111]">{value.trim().toLowerCase() === "true" ? "Enabled" : "Disabled"}</span>
								<span className="block text-xs text-black/50">Toggle this setting on or off.</span>
							</span>
							<input
								type="checkbox"
								checked={value.trim().toLowerCase() === "true"}
								onChange={(event) => {
									setValue(event.target.checked ? "true" : "false");
									setStatus("");
								}}
								disabled={!canEdit}
								className="h-4 w-4 shrink-0 accent-[#111111]"
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

				<label className="block md:col-span-2">
					<div className={labelClass}>Description</div>
					<textarea
						rows={3}
						value={description}
						onChange={(event) => {
							setDescription(event.target.value);
							setStatus("");
						}}
						placeholder="What does this setting control?"
						disabled={!canEdit}
						className={`${inputClass} min-h-[90px] py-3`}
					/>
				</label>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
				<p className="text-xs text-black/45">{status || (isCreating ? "Fill in the key and value to create a setting." : "Review the value before saving.")}</p>
				<button type="button" onClick={handleSubmit} disabled={!canSave} className={primaryButton}>
					{saving ? "Saving..." : isCreating ? "Create setting" : "Save changes"}
				</button>
			</div>
		</div>
	);
}

export default SettingsWorkspace;
