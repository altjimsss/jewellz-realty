import { FormEvent } from "react";
import type { EditorProps, SectionProps } from "./types";
import { asText, buildPayload, displayValue } from "./utils";

export function SectionShell({ title, description, children }: SectionProps) {
	return (
		<section className="overflow-hidden rounded-lg border border-black/10 bg-white">
			<div className="flex flex-col gap-2 border-b border-black/10 pb-4">
				<div className="px-5 pt-5">
					<h2 className="text-base font-semibold text-[#111111]">{title}</h2>
					<p className="mt-1 max-w-3xl text-sm leading-6 text-black/55">{description}</p>
				</div>
			</div>
			<div className="p-5">{children}</div>
		</section>
	);
}

export function InfoCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/45">{label}</div>
			<div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">{value}</div>
			{hint ? <div className="mt-1 text-xs text-black/45">{hint}</div> : null}
		</div>
	);
}

export function EntityEditor({
	title,
	description,
	rows,
	selectedId,
	fields,
	defaultValues,
	canEdit,
	rowLabel,
	rowMeta,
	onSelect,
	onCreateNew,
	onDelete,
	onSubmit,
	extra,
	idKey = "id",
}: EditorProps) {
	const selectedRow = rows.find((row) => asText(row?.[idKey]) === asText(selectedId)) ?? null;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		await onSubmit(buildPayload(fields, formData), selectedRow);
	}

	return (
		<SectionShell title={title} description={description}>
			<div className="grid gap-4 xl:grid-cols-[260px_1fr]">
				<aside className="rounded-lg border border-black/10 bg-white p-3">
					<div className="flex items-center justify-between gap-2 px-1 pb-3">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Records</div>
						{canEdit ? (
							<button type="button" onClick={onCreateNew} className="rounded-md border border-black/10 px-3 py-1 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
								New
							</button>
						) : null}
					</div>
					<div className="max-h-[460px] space-y-2 overflow-auto pr-1">
						{rows.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No records available.</p> : null}
						{rows.map((row) => {
							const rowId = asText(row?.[idKey]);
							const active = rowId === asText(selectedId);
							return (
								<button key={rowId} type="button" onClick={() => onSelect(row)} className={`w-full rounded-md border px-3 py-2 text-left transition ${active ? "border-red-200 bg-red-50" : "border-transparent bg-white hover:border-black/10 hover:bg-zinc-50"}`}>
									<div className="truncate text-sm font-medium text-[#111111]">{rowLabel(row)}</div>
									{rowMeta ? <div className="mt-1 truncate text-xs text-black/50">{rowMeta(row)}</div> : null}
								</button>
							);
						})}
					</div>
				</aside>

				<div className="rounded-lg border border-black/10 bg-white p-4">
					<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
						<div>
							<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Editor</div>
							<div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#111111]">{selectedRow ? `Editing ${rowLabel(selectedRow)}` : `Create a new ${title.toLowerCase()}`}</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{selectedRow && canEdit && onDelete ? (
								<button type="button" onClick={() => onDelete(selectedRow)} className="rounded-md border border-[#F0997B] bg-[#FAECE7] px-4 py-2 text-sm font-medium text-[#993C1D] transition hover:bg-[#F5C4B3]">
									Delete
								</button>
							) : null}
							{!canEdit ? <span className="rounded-md bg-black/5 px-4 py-2 text-sm text-black/55">Read-only for this role</span> : null}
						</div>
					</div>

					<form key={selectedRow ? asText(selectedRow[idKey]) : "new"} className="mt-4 grid gap-4" onSubmit={handleSubmit}>
						<div className="grid gap-4 md:grid-cols-2">
							{fields.map((field) => {
								const value = selectedRow ? selectedRow[field.name] : (defaultValues?.[field.name] ?? "");
								const commonInputClass = "mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-300 disabled:bg-zinc-50 disabled:text-black/45";
								return (
									<label key={field.name} className={field.type === "textarea" || field.type === "array" ? "md:col-span-2" : ""}>
										<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">{field.label}</div>
										{field.type === "textarea" || field.type === "array" ? (
											<textarea name={field.name} rows={field.rows ?? 4} defaultValue={displayValue(field, value)} placeholder={field.placeholder} disabled={!canEdit} className={`${commonInputClass} min-h-[110px] py-3`} />
										) : field.type === "select" ? (
											<select name={field.name} defaultValue={displayValue(field, value)} disabled={!canEdit} className={commonInputClass}>
												<option value="">Select</option>
												{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										) : field.type === "checkbox" ? (
											<label className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
												<input type="checkbox" name={field.name} defaultChecked={Boolean(value)} disabled={!canEdit} />
												<span>{field.help ?? "Enabled"}</span>
											</label>
										) : (
											<input type={field.type} name={field.name} defaultValue={displayValue(field, value)} placeholder={field.placeholder} disabled={!canEdit} className={commonInputClass} />
										)}
										{field.help ? <p className="mt-1 text-[11px] leading-5 text-black/45">{field.help}</p> : null}
									</label>
								);
							})}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
							<p className="text-xs text-black/45">{selectedRow ? "Update the current row or create a new one." : "Fill in the form to create a new row."}</p>
							<button type="submit" disabled={!canEdit} className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-5 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20">
								Save
							</button>
						</div>
					</form>
				</div>
			</div>

			{extra ? <div className="mt-5">{extra}</div> : null}
		</SectionShell>
	);
}
