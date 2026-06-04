import { Fragment, FormEvent, useEffect, useId, useRef, useState } from "react";
import type { CmsPayload, EditorProps, SectionProps } from "./types";
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
	renderPreview,
	guidance,
	extra,
	idKey = "id",
}: EditorProps) {
	const selectedRow = rows.find((row) => asText(row?.[idKey]) === asText(selectedId)) ?? null;
	const formId = useId();
	const formRef = useRef<HTMLFormElement | null>(null);
	const [previewPayload, setPreviewPayload] = useState<CmsPayload | null>(null);
	const [recordSearch, setRecordSearch] = useState("");
	const [formValues, setFormValues] = useState<CmsPayload>({});
	const filteredRows = rows.filter((row) => {
		const query = recordSearch.trim().toLowerCase();
		if (!query) return true;
		return [rowLabel(row), rowMeta?.(row), asText(row?.[idKey])]
			.filter(Boolean)
			.join(" ")
			.toLowerCase()
			.includes(query);
	});

	useEffect(() => {
		const nextValues: CmsPayload = {};
		for (const field of fields) {
			nextValues[field.name] = selectedRow ? selectedRow[field.name] : (defaultValues?.[field.name] ?? "");
		}
		setFormValues(nextValues);
	}, [defaultValues, fields, selectedRow]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		await onSubmit(buildPayload(fields, formData), selectedRow);
		setPreviewPayload(null);
	}

	function openPreview() {
		if (!formRef.current) return;
		setPreviewPayload(buildPayload(fields, new FormData(formRef.current)));
	}

	function handleFormChange(event: FormEvent<HTMLFormElement>) {
		const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
		if (target.name === "developer_id") {
			const projectSelect = event.currentTarget.elements.namedItem("project_id");
			if (projectSelect instanceof HTMLSelectElement) {
				projectSelect.value = "";
			}
		}

		setFormValues(buildPayload(fields, new FormData(event.currentTarget)));
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
					<label className="mb-3 block px-1">
						<span className="sr-only">Search records</span>
						<input
							type="search"
							value={recordSearch}
							onChange={(event) => setRecordSearch(event.target.value)}
							placeholder={`Search ${title.toLowerCase()}...`}
							className="h-9 w-full rounded-md border border-black/10 bg-zinc-50 px-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-red-300 focus:bg-white"
						/>
					</label>
					<div className="max-h-[720px] min-h-[620px] space-y-2 overflow-auto pr-1 xl:max-h-[calc(100vh-260px)]">
						{rows.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No records available.</p> : null}
						{rows.length > 0 && filteredRows.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No records match your search.</p> : null}
						{filteredRows.map((row) => {
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

					<form ref={formRef} id={formId} key={selectedRow ? asText(selectedRow[idKey]) : "new"} className="mt-4 grid gap-4" onChange={handleFormChange} onSubmit={handleSubmit}>
						{guidance ? <div>{guidance}</div> : null}
						<div className="grid gap-4 md:grid-cols-2">
							{fields.map((field, index) => {
								const value = selectedRow ? selectedRow[field.name] : (defaultValues?.[field.name] ?? "");
								const commonInputClass = "mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-300 disabled:bg-zinc-50 disabled:text-black/45";
								const previousField = fields[index - 1];
								const shouldShowSection = field.section && field.section !== previousField?.section;
								return (
									<Fragment key={field.name}>
										{shouldShowSection ? (
											<div className={`mb-1 md:col-span-2 ${index === 0 ? "" : "mt-2 border-t border-black/10 pt-4"}`}>
												<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700">{field.section}</div>
											</div>
										) : null}
										<div className={field.type === "textarea" || field.type === "array" ? "md:col-span-2" : ""}>
										<label>
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">{field.label}</div>
											{field.type === "textarea" || field.type === "array" ? (
												<textarea name={field.name} rows={field.rows ?? 4} defaultValue={displayValue(field, value)} placeholder={field.placeholder} disabled={!canEdit} className={`${commonInputClass} min-h-[110px] py-3`} />
											) : field.type === "select" ? (
												<select name={field.name} defaultValue={displayValue(field, value)} disabled={!canEdit || Boolean(field.dependsOn && !asText(formValues[field.dependsOn]))} className={commonInputClass}>
													<option value="">{field.dependsOn && !asText(formValues[field.dependsOn]) ? "Select Developer Partner first" : "Select"}</option>
													{(field.dependsOn && field.optionParentKey
														? field.options?.filter((option) => option.meta?.[field.optionParentKey as string] === asText(formValues[field.dependsOn as string]))
														: field.options
													)?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
									</div>
									</Fragment>
								);
							})}
						</div>
					</form>

					{extra ? <div className="mt-5 border-t border-black/10 pt-5">{extra}</div> : null}

					<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
						<p className="text-xs text-black/45">{renderPreview ? "Preview the public listing before saving changes." : selectedRow ? "Review the details before saving." : "Fill in the form to create a new row."}</p>
						{renderPreview ? (
							<button type="button" onClick={openPreview} disabled={!canEdit} className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-5 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20">
								Preview property
							</button>
						) : (
							<button form={formId} type="submit" disabled={!canEdit} className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-5 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20">
								{selectedRow ? "Save changes" : "Save property"}
							</button>
						)}
					</div>
				</div>
			</div>
			{renderPreview && previewPayload ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
					<div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
						<div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
							<div>
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Property Preview</div>
								<p className="mt-1 text-sm text-black/55">This is a CMS preview of how the public property page will feel.</p>
							</div>
							<button type="button" onClick={() => setPreviewPayload(null)} className="rounded-md border border-black/10 px-3 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50">
								Close
							</button>
						</div>
						<div className="overflow-auto">
							{renderPreview(previewPayload, selectedRow)}
						</div>
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-5 py-4">
							<p className="text-xs text-black/45">Need changes? Close preview, edit the fields, then preview again.</p>
							<div className="flex flex-wrap gap-2">
								<button type="button" onClick={() => setPreviewPayload(null)} className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50">
									Back to edit
								</button>
								<button form={formId} type="submit" disabled={!canEdit} className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20">
									{selectedRow ? "Save changes" : "Save property"}
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</SectionShell>
	);
}
