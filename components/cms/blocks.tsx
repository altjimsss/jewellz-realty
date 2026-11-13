import { Fragment, FormEvent, useId, useMemo, useRef, useState } from "react";
import { Activity, ArrowUpRight, Building2, Clock3, Eye, MessageSquare, Search, TrendingUp, Users } from "lucide-react";
import type { CmsPayload, EditorProps, SectionProps } from "./types";
import { asText, buildPayload, displayValue } from "./utils";

function slugify(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function SectionShell({ title, description, children }: SectionProps) {
	return (
		<section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm shadow-black/[0.025]">
			<div className="border-b border-black/[0.07] bg-zinc-50 px-5 py-5 sm:px-6">
				<div className="flex flex-col gap-1.5">
					<h2 className="text-base font-semibold tracking-tight text-[#111111]">{title}</h2>
					<p className="max-w-3xl text-sm leading-5 text-black/50">{description}</p>
				</div>
			</div>
			<div className="p-4 sm:p-5">{children}</div>
		</section>
	);
}

export function InfoCard({ label, value, hint, compact = false }: { label: string; value: string | number; hint?: string; compact?: boolean }) {
	const text = String(value);
	const isLong = text.length > 14;
	const labelKey = label.toLowerCase();
	const MetricIcon = labelKey.includes("inquiry") || labelKey.includes("lead") || labelKey.includes("engagement")
		? MessageSquare
		: labelKey.includes("view") || labelKey.includes("visitor") || labelKey.includes("session")
			? Eye
			: labelKey.includes("rate") || labelKey.includes("conversion") || labelKey.includes("trend")
				? TrendingUp
				: labelKey.includes("time") || labelKey.includes("duration") || labelKey.includes("response") || labelKey.includes("dwell")
					? Clock3
					: labelKey.includes("agent") || labelKey.includes("profile") || labelKey.includes("user")
						? Users
						: labelKey.includes("property") || labelKey.includes("listing") || labelKey.includes("portfolio")
							? Building2
							: Activity;
	return (
		<div className={`portal-stat-card flex h-full min-w-0 flex-col ${compact ? "min-h-[104px] p-3" : "min-h-[132px]"}`}>
			<div className="flex min-w-0 items-center gap-2">
				<span className={`grid shrink-0 place-items-center bg-[#DE141C] text-white ${compact ? "h-6 w-6" : "h-7 w-7"}`} aria-hidden="true"><MetricIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /></span>
				<div className="portal-stat-label min-w-0 flex-1 truncate">{label}</div>
				<ArrowUpRight className="h-4 w-4 shrink-0 text-black/55" aria-hidden="true" />
			</div>
			<div className={`portal-stat-value break-all leading-tight ${isLong ? "text-lg" : ""}`}>{value}</div>
			{hint ? <div className="portal-stat-hint mt-auto flex min-w-0 items-center gap-1.5 truncate pt-1"><span className="h-1.5 w-1.5 shrink-0 bg-[#DE141C]" aria-hidden="true" />{hint}</div> : null}
		</div>
	);
}

export function DashboardMetricCard({ Icon, label, value, hint, progress, compact = false, onClick, ariaPressed }: { Icon: typeof Activity; label: string; value: string | number; hint?: string; progress?: number; compact?: boolean; onClick?: () => void; ariaPressed?: boolean }) {
	const isLong = String(value).length > 18;
	const content = (
		<>
			<div className="flex min-w-0 items-center gap-2">
				<span className={`grid shrink-0 place-items-center bg-[#DE141C] text-white ${compact ? "h-6 w-6" : "h-7 w-7"}`} aria-hidden="true"><Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /></span>
				<div className="portal-stat-label min-w-0 flex-1 truncate">{label}</div>
				<ArrowUpRight className="h-4 w-4 shrink-0 text-black/55" aria-hidden="true" />
			</div>
			<div className={`portal-stat-value min-w-0 break-words ${isLong ? "text-base leading-5" : ""}`}>{value}</div>
			<div className="mt-auto min-w-0 pt-1">
				{progress != null ? <div className="mb-1.5 h-1 w-full overflow-hidden bg-zinc-100"><div className="h-full bg-[#DE141C] transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div> : null}
				{hint ? <p className="portal-stat-hint flex min-w-0 items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 shrink-0 bg-[#DE141C]" aria-hidden="true" />{hint}</p> : null}
			</div>
		</>
	);
	const className = `portal-stat-card flex h-full min-w-0 flex-col text-left ${compact ? "min-h-[104px] p-3" : "min-h-[132px]"}`;
	return onClick ? (
		<button type="button" onClick={onClick} aria-pressed={ariaPressed} className={`${className} transition hover:border-black/15 hover:bg-zinc-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30`}>{content}</button>
	) : <div className={className}>{content}</div>;
}

export function StatusBadge({ value }: { value: string }) {
	const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
	const tone = /published|active|visible|closed won|contacted|complete|approved|live/.test(normalized)
		? { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-600" }
		: /reserved|pending|review|medium|negotiat|scheduled/.test(normalized)
			? { badge: "bg-amber-50 text-amber-800", dot: "bg-amber-600" }
			: /sold|closed lost|rejected|inactive|hidden|high|urgent/.test(normalized)
				? { badge: "bg-red-50 text-[#DE141C]", dot: "bg-[#DE141C]" }
				: /new|assigned|draft|low/.test(normalized)
					? { badge: "bg-zinc-100 text-zinc-700", dot: "bg-zinc-500" }
					: { badge: "bg-zinc-100 text-zinc-700", dot: "bg-zinc-500" };
	const label = normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unknown";
	return <span className={`inline-flex items-center gap-2 px-2 py-1 text-[10px] font-semibold leading-none ${tone.badge}`}><span className={`h-1.5 w-1.5 shrink-0 ${tone.dot}`} aria-hidden="true" />{label}</span>;
}

export function EntityEditor({
	title,
	description,
	rows,
	selectedId,
	fields,
	defaultValues,
	canEdit,
	isSaving = false,
	rowLabel,
	rowMeta,
	onSelect,
	onCreateNew,
	onDelete,
	onSubmit,
	renderPreview,
	guidance,
	extra,
	saveLabel,
	createLabel,
	canCreate = true,
	idKey = "id",
}: EditorProps) {
	const selectedRow = rows.find((row) => asText(row?.[idKey]) === asText(selectedId)) ?? null;
	const selectedRowKey = selectedRow ? asText(selectedRow[idKey]) : "__new__";
	const formId = useId();
	const formRef = useRef<HTMLFormElement | null>(null);
	const [previewPayload, setPreviewPayload] = useState<CmsPayload | null>(null);
	const [recordSearch, setRecordSearch] = useState("");
	const [editedFormValues, setEditedFormValues] = useState<{ key: string; values: CmsPayload } | null>(null);
	const initialFormValues = useMemo(() => {
		const nextValues: CmsPayload = {};
		for (const field of fields) {
			nextValues[field.name] = selectedRow ? selectedRow[field.name] : (defaultValues?.[field.name] ?? "");
		}
		return nextValues;
	}, [defaultValues, fields, selectedRow]);
	const formValues = editedFormValues?.key === selectedRowKey ? editedFormValues.values : initialFormValues;
	const filteredRows = rows.filter((row) => {
		const query = recordSearch.trim().toLowerCase();
		if (!query) return true;
		return [rowLabel(row), rowMeta?.(row), asText(row?.[idKey])]
			.filter(Boolean)
			.join(" ")
			.toLowerCase()
			.includes(query);
	});

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
		if (target.name === "slug" && target instanceof HTMLInputElement) {
			target.dataset.autoGenerated = "false";
		}
		if (!selectedRow) {
			const slugField = fields.find((field) => field.autoSlugFrom === target.name);
			if (slugField) {
				const slugInput = event.currentTarget.elements.namedItem(slugField.name);
				if (slugInput instanceof HTMLInputElement && slugInput.dataset.autoGenerated !== "false") {
					slugInput.value = slugify(target.value);
					slugInput.dataset.autoGenerated = "true";
				}
			}
		}
		if (target.name === "developer_id") {
			const projectSelect = event.currentTarget.elements.namedItem("project_id");
			if (projectSelect instanceof HTMLSelectElement) {
				projectSelect.value = "";
			}
		}

		setEditedFormValues({ key: selectedRowKey, values: buildPayload(fields, new FormData(event.currentTarget)) });
	}

	return (
		<SectionShell title={title} description={description}>
			<div className="grid gap-4 xl:grid-cols-[minmax(260px,0.78fr)_minmax(0,1.5fr)] xl:items-start">
				<aside className="overflow-hidden rounded-2xl border border-black/[0.08] bg-zinc-50/65">
					<div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
						<div>
							<div className="text-sm font-semibold text-[#111111]">Records</div>
							<div className="mt-0.5 text-xs text-black/45">Choose an item to edit</div>
						</div>
						<span className="rounded-lg border border-black/[0.07] bg-white px-2 py-1 text-xs font-semibold tabular-nums text-black/55">{filteredRows.length}</span>
						{canEdit && canCreate ? (
							<button type="button" onClick={onCreateNew} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#111111] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20">
								<span className="text-base leading-none">+</span> New
							</button>
						) : null}
					</div>
					<label className="relative mx-3 mb-3 block">
						<span className="sr-only">Search records</span>
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
						<input
							type="search"
							value={recordSearch}
							onChange={(event) => setRecordSearch(event.target.value)}
							placeholder={`Search ${title.toLowerCase()}...`}
							className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/40 focus:ring-4 focus:ring-[#DE141C]/[0.08]"
						/>
					</label>
					<div className="max-h-[680px] min-h-40 space-y-1.5 overflow-auto px-2 pb-2 xl:max-h-[calc(100vh-340px)]">
						{rows.length === 0 ? <p className="rounded-xl px-3 py-5 text-sm text-black/45">No records available yet.</p> : null}
						{rows.length > 0 && filteredRows.length === 0 ? <p className="rounded-xl px-3 py-5 text-sm text-black/45">No records match your search.</p> : null}
						{filteredRows.map((row) => {
							const rowId = asText(row?.[idKey]);
							const active = rowId === asText(selectedId);
							return (
								<button key={rowId} type="button" onClick={() => onSelect(row)} className={`group w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30 ${active ? "border-[#DE141C]/20 bg-white shadow-sm shadow-black/[0.04] ring-1 ring-inset ring-[#DE141C]/10" : "border-transparent bg-transparent hover:border-black/[0.06] hover:bg-white/80"}`}>
									<div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[#DE141C]" : "bg-black/15 group-hover:bg-black/30"}`} /><div className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111111]">{rowLabel(row)}</div></div>
									{rowMeta ? <div className="mt-1.5 truncate pl-3.5 text-xs text-black/45">{rowMeta(row)}</div> : null}
								</button>
							);
						})}
					</div>
				</aside>

				<div className="min-w-0 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm shadow-black/[0.025] sm:p-6">
					<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.07] pb-5">
						<div>
							<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">{selectedRow ? "Edit record" : "New record"}</div>
							<div className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-[#111111]">{selectedRow ? `Editing ${rowLabel(selectedRow)}` : createLabel ?? `Create ${title.toLowerCase().replace(/s$/, "")}`}</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{selectedRow && canEdit && onDelete ? (
								<button type="button" onClick={() => onDelete(selectedRow)} className="rounded-lg border border-red-200 bg-red-50/50 px-4 py-2 text-sm font-medium text-red-700 shadow-2xs transition-all duration-150 hover:bg-red-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
									Delete
								</button>
							) : null}
							{!canEdit ? <span className="rounded-md bg-black/5 px-4 py-2 text-sm text-black/55">Read-only for this role</span> : null}
						</div>
					</div>

					{!selectedRow && !canCreate ? (
						<div className="mt-4 rounded-lg border border-dashed border-black/15 bg-zinc-50 p-6 text-sm leading-6 text-black/55">
							Select an existing {title.toLowerCase()} from the list to edit its details. New {title.toLowerCase()} are added with the registration form above.
						</div>
					) : (
						<>
					<form ref={formRef} id={formId} key={selectedRowKey} className="mt-4 grid gap-4" onChange={handleFormChange} onSubmit={handleSubmit}>
						{guidance ? <div>{guidance}</div> : null}
						<div className="grid gap-4 md:grid-cols-2">
							{fields.map((field, index) => {
								const value = selectedRow ? selectedRow[field.name] : (defaultValues?.[field.name] ?? "");
								const commonInputClass = "mt-2 w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/45 focus:ring-4 focus:ring-[#DE141C]/[0.08] disabled:bg-zinc-50 disabled:text-zinc-400";
								const previousField = fields[index - 1];
								const shouldShowSection = field.section && field.section !== previousField?.section;
								return (
									<Fragment key={field.name}>
										{shouldShowSection ? (
										<div className={`mb-1 md:col-span-2 ${index === 0 ? "" : "mt-2 border-t border-black/[0.07] pt-5"}`}>
											<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">{field.section}</div>
											</div>
										) : null}
										<div className={field.type === "textarea" || field.type === "array" ? "md:col-span-2" : ""}>
										<label>
						<div className="text-sm font-medium text-[#111111]">{field.label}</div>
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
								<div className="mt-2 flex items-center gap-3 rounded-xl border border-black/[0.08] bg-zinc-50/60 px-4 py-3 text-sm text-black/70">
													<input type="checkbox" name={field.name} defaultChecked={Boolean(value)} disabled={!canEdit} />
									<span className="leading-5">{field.help ?? "Enabled"}</span>
								</div>
											) : (
								<input type={field.type} name={field.name} step={field.step} defaultValue={displayValue(field, value)} placeholder={field.placeholder} disabled={!canEdit} className={commonInputClass} />
											)}
							{field.help && field.type !== "checkbox" ? <p className="mt-1.5 text-xs leading-5 text-black/45">{field.help}</p> : null}
										</label>
									</div>
									</Fragment>
								);
							})}
						</div>
					</form>

					{extra ? <div className="mt-5 border-t border-black/10 pt-5">{extra}</div> : null}

						<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] pt-5">
						<p className="text-xs text-black/45">{renderPreview ? "Preview the public card before saving changes." : selectedRow ? "Review the details before saving." : "Fill in the required details to create this record."}</p>
						{renderPreview ? (
							<button type="button" onClick={openPreview} disabled={!canEdit} className="inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.08] bg-white px-4 text-sm font-semibold text-[#111111] transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50">
								Preview property
							</button>
						) : (
							<button form={formId} type="submit" disabled={!canEdit || isSaving} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50">
									{isSaving ? "Saving…" : selectedRow ? "Save changes" : saveLabel ?? "Save property"}
							</button>
						)}
					</div>
						</>
					)}
				</div>
			</div>
			{renderPreview && previewPayload ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
					<div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
						<div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
							<div>
							<div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DE141C]">{title} preview</div>
							<p className="mt-1 text-sm text-black/55">Preview the current unsaved values, then return to the editor to make changes.</p>
							</div>
							<button type="button" onClick={() => setPreviewPayload(null)} className="rounded-md border border-black/10 px-3 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50">
								Close
							</button>
						</div>
						<div className="overflow-auto">
							{renderPreview(previewPayload, selectedRow)}
						</div>
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 px-5 py-4">
							<p className="text-xs text-black/45">Need changes? Return to the editor, update the fields, then preview again.</p>
							<div className="flex flex-wrap gap-2">
								<button type="button" onClick={() => setPreviewPayload(null)} className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50">
									Back to edit
								</button>
								<button form={formId} type="submit" disabled={!canEdit || isSaving} className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
								{isSaving ? "Saving…" : selectedRow ? "Save changes" : saveLabel ?? "Save property"}
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</SectionShell>
	);
}
