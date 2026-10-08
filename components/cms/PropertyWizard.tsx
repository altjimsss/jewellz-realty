"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Building2,
	MapPin,
	Home,
	DollarSign,
	FileText,
	ImageIcon,
	ChevronLeft,
	ChevronRight,
	Check,
	Plus,
	Pencil,
	Trash2,
	Search,
	X,
	Eye,
} from "lucide-react";
import type { CmsPayload, CmsRow, FieldSpec } from "./types";
import { asText, displayValue } from "./utils";
import type { ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PropertyWizardProps = {
	rows: CmsRow[];
	selectedId: string | null;
	fields: FieldSpec[];
	defaultValues?: CmsPayload;
	canEdit: boolean;
	rowLabel: (row: CmsRow) => string;
	rowMeta?: (row: CmsRow) => string;
	onSelect: (row: CmsRow | null) => void;
	onCreateNew: () => void;
	onDelete?: (row: CmsRow) => Promise<void>;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
	renderPreview?: (payload: CmsPayload, currentRow: CmsRow | null) => ReactNode;
	extra?: ReactNode;
};

// ─── Step definitions ────────────────────────────────────────────────────────

type StepDef = {
	id: string;
	label: string;
	description: string;
	icon: typeof Building2;
	sectionPrefix: string;
	required: string[];
};

const STEPS: StepDef[] = [
	{
		id: "ownership",
		label: "Ownership",
		description: "Link the listing to a developer, project, and agent.",
		icon: Building2,
		sectionPrefix: "Step 1",
		required: ["developer_id"],
	},
	{
		id: "listing",
		label: "Listing Info",
		description: "Core details buyers see at a glance.",
		icon: Home,
		sectionPrefix: "Step 2",
		required: ["title", "slug", "category", "status"],
	},
	{
		id: "location",
		label: "Location",
		description: "Address and map coordinates.",
		icon: MapPin,
		sectionPrefix: "Step 3",
		required: ["address", "city", "province"],
	},
	{
		id: "details",
		label: "Property Details",
		description: "Sizes, rooms, and unit specifics.",
		icon: Home,
		sectionPrefix: "Step 4",
		required: [],
	},
	{
		id: "pricing",
		label: "Pricing",
		description: "Price, per-sqm rate, and financing info.",
		icon: DollarSign,
		sectionPrefix: "Step 5",
		required: ["price"],
	},
	{
		id: "content",
		label: "Content & AI",
		description: "Description, key features, and amenities.",
		icon: FileText,
		sectionPrefix: "Step 6",
		required: [],
	},
	{
		id: "photos",
		label: "Photos & Publish",
		description: "Video URL, publish date, and images.",
		icon: ImageIcon,
		sectionPrefix: "Step 7",
		required: [],
	},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stepFields(step: StepDef, allFields: FieldSpec[]): FieldSpec[] {
	return allFields.filter((f) => f.section?.startsWith(step.sectionPrefix));
}

function stepIsComplete(step: StepDef, payload: CmsPayload): boolean {
	return step.required.every((name) => {
		const v = payload[name];
		return v !== null && v !== undefined && String(v).trim() !== "";
	});
}

function buildEmptyPayload(
	fields: FieldSpec[],
	defaultValues?: CmsPayload,
	row?: CmsRow | null,
): CmsPayload {
	const result: CmsPayload = {};
	for (const field of fields) {
		result[field.name] = row ? row[field.name] : (defaultValues?.[field.name] ?? "");
	}
	return result;
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldInput({
	field,
	value,
	payload,
	canEdit,
	onChange,
}: {
	field: FieldSpec;
	value: CmsPayload[string];
	payload: CmsPayload;
	canEdit: boolean;
	onChange: (name: string, val: string | boolean) => void;
}) {
	const commonClass =
		"mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-2 focus:ring-black/5 disabled:bg-zinc-50 disabled:text-black/45";

	if (field.type === "textarea" || field.type === "array") {
		return (
			<textarea
				name={field.name}
				rows={field.rows ?? 4}
				defaultValue={displayValue(field, value)}
				placeholder={field.placeholder}
				disabled={!canEdit}
				onChange={(e) => onChange(field.name, e.target.value)}
				className={`${commonClass} min-h-[110px] py-3`}
			/>
		);
	}

	if (field.type === "select") {
		const dependsOnValue = field.dependsOn ? asText(payload[field.dependsOn]) : undefined;
		const isDisabled = !canEdit || Boolean(field.dependsOn && !dependsOnValue);
		const filteredOptions =
			field.dependsOn && field.optionParentKey
				? field.options?.filter(
						(opt) =>
							opt.meta?.[field.optionParentKey as string] === dependsOnValue,
					)
				: field.options;

		return (
			<select
				name={field.name}
				defaultValue={displayValue(field, value)}
				disabled={isDisabled}
				onChange={(e) => onChange(field.name, e.target.value)}
				className={commonClass}
			>
				<option value="">
					{isDisabled ? "Select Developer Partner first" : "— Select —"}
				</option>
				{filteredOptions?.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		);
	}

	if (field.type === "checkbox") {
		return (
			<label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#111111] transition hover:border-black/20">
				<input
					type="checkbox"
					name={field.name}
					defaultChecked={Boolean(value)}
					disabled={!canEdit}
					onChange={(e) => onChange(field.name, e.target.checked)}
					className="h-4 w-4 accent-[#111111]"
				/>
				<span>{field.help ?? "Enabled"}</span>
			</label>
		);
	}

	return (
		<input
			type={field.type}
			name={field.name}
			defaultValue={displayValue(field, value)}
			placeholder={field.placeholder}
			disabled={!canEdit}
			onChange={(e) => onChange(field.name, e.target.value)}
			className={commonClass}
		/>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PropertyWizard({
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
	extra,
}: PropertyWizardProps) {
	const [search, setSearch] = useState("");
	const [wizardOpen, setWizardOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [saving, setSaving] = useState(false);
	const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
	const [previewPayload, setPreviewPayload] = useState<CmsPayload | null>(null);
	const formRef = useRef<HTMLFormElement | null>(null);

	const selectedRow = useMemo(
		() => rows.find((r) => asText(r.id) === asText(selectedId)) ?? null,
		[rows, selectedId],
	);

	const [payload, setPayload] = useState<CmsPayload>(() =>
		buildEmptyPayload(fields, defaultValues, selectedRow),
	);

	useEffect(() => {
		setPayload(buildEmptyPayload(fields, defaultValues, selectedRow));
		setCurrentStep(0);
		setStepErrors({});
	}, [selectedRow, fields, defaultValues]);

	useEffect(() => {
		if (selectedId === "__new__") {
			setWizardOpen(true);
			setCurrentStep(0);
		}
	}, [selectedId]);

	const filteredRows = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter((row) =>
			[rowLabel(row), rowMeta?.(row), asText(row.id)]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}, [rows, search, rowLabel, rowMeta]);

	const handleFieldChange = useCallback((name: string, val: string | boolean) => {
		setPayload((prev) => {
			const next = { ...prev, [name]: val };
			if (name === "developer_id") next["project_id"] = "";
			return next;
		});
	}, []);

	function handleFormChange(e: FormEvent<HTMLFormElement>) {
		const data = new FormData(e.currentTarget);
		const updates: CmsPayload = {};
		for (const [key, val] of data.entries()) {
			updates[key] = val as string;
		}
		setPayload((prev) => ({ ...prev, ...updates }));
	}

	function handleNext() {
		const step = STEPS[currentStep];
		const missing = step.required.filter((name) => {
			const v = payload[name];
			return v === null || v === undefined || String(v).trim() === "";
		});
		if (missing.length > 0) {
			setStepErrors({
				[step.id]: `Please fill in: ${missing.map((n) => n.replace(/_/g, " ")).join(", ")}.`,
			});
			return;
		}
		setStepErrors({});
		setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
	}

	function handlePrev() {
		setStepErrors({});
		setCurrentStep((s) => Math.max(s - 1, 0));
	}

	async function handleSave() {
		const errors: Record<string, string> = {};
		for (const step of STEPS) {
			const missing = step.required.filter((name) => {
				const v = payload[name];
				return v === null || v === undefined || String(v).trim() === "";
			});
			if (missing.length > 0) {
				errors[step.id] = `Missing: ${missing.map((n) => n.replace(/_/g, " ")).join(", ")}`;
			}
		}
		if (Object.keys(errors).length > 0) {
			setStepErrors(errors);
			const firstBadIdx = STEPS.findIndex((s) => errors[s.id]);
			if (firstBadIdx >= 0) setCurrentStep(firstBadIdx);
			return;
		}
		setSaving(true);
		try {
			await onSubmit(payload, selectedRow);
			setWizardOpen(false);
		} finally {
			setSaving(false);
		}
	}

	function openWizardForRow(row: CmsRow) {
		onSelect(row);
		setWizardOpen(true);
		setCurrentStep(0);
		setStepErrors({});
	}

	function openWizardForNew() {
		onCreateNew();
		setWizardOpen(true);
		setCurrentStep(0);
		setStepErrors({});
	}

	function closeWizard() {
		setWizardOpen(false);
		setPreviewPayload(null);
		setStepErrors({});
	}

	const step = STEPS[currentStep];
	const stepFieldList = stepFields(step, fields);
	const isLastStep = currentStep === STEPS.length - 1;
	const isFirstStep = currentStep === 0;

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<>
			{/* Listing panel */}
			<section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
				<div className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
					<div>
						<h2 className="text-sm font-semibold text-[#111111]">Properties</h2>
						<p className="mt-0.5 text-xs text-black/45">
							{rows.length} listing{rows.length !== 1 ? "s" : ""} · click any card to edit
						</p>
					</div>
					{canEdit && (
						<button
							type="button"
							onClick={openWizardForNew}
							className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black/80"
						>
							<Plus className="h-3.5 w-3.5" />
							Add property
						</button>
					)}
				</div>

				<div className="border-b border-black/10 px-5 py-3">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
						<input
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search properties…"
							className="h-9 w-full rounded-xl border border-black/10 bg-zinc-50 pl-9 pr-3 text-xs text-[#111111] outline-none transition placeholder:text-black/35 focus:border-black/25 focus:bg-white"
						/>
					</div>
				</div>

				<div className="p-5">
					{filteredRows.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/10 py-16 text-center">
							<Building2 className="mb-3 h-10 w-10 text-black/20" />
							<p className="text-sm font-medium text-black/45">No properties yet</p>
							{canEdit && (
								<button
									type="button"
									onClick={openWizardForNew}
									className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black/80"
								>
									<Plus className="h-3.5 w-3.5" />
									Add your first property
								</button>
							)}
						</div>
					) : (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredRows.map((row) => {
								const id = asText(row.id);
								const isActive = id === asText(selectedId);
								const status = asText(row.status ?? "draft");
								const badge = asText(row.badge ?? "none");
								const statusColors: Record<string, string> = {
									published: "bg-emerald-50 text-emerald-700 border-emerald-200",
									draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
									reserved: "bg-amber-50 text-amber-700 border-amber-200",
									sold: "bg-red-50 text-red-700 border-red-200",
									unpublished: "bg-zinc-50 text-zinc-500 border-zinc-200",
								};
								const statusClass = statusColors[status] ?? statusColors["draft"];

								return (
									<div
										key={id}
										onClick={() => openWizardForRow(row)}
										className={`group relative cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${isActive ? "border-black/30 bg-zinc-50 shadow-sm" : "border-black/10 bg-white hover:border-black/20"}`}
									>
										{badge && badge !== "none" && (
											<span className="absolute right-3 top-3 rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
												{badge}
											</span>
										)}
										<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
											<Building2 className="h-5 w-5 text-black/40" />
										</div>
										<div className="truncate text-sm font-semibold text-[#111111]">
											{rowLabel(row)}
										</div>
										{rowMeta && (
											<div className="mt-0.5 truncate text-xs text-black/45">
												{rowMeta(row)}
											</div>
										)}
										<div className="mt-3 flex items-center justify-between gap-2">
											<span
												className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClass}`}
											>
												{status}
											</span>
											{row.price != null && (
												<span className="text-xs font-medium text-black/55">
													₱{Number(row.price).toLocaleString()}
												</span>
											)}
										</div>
										{canEdit && (
											<div className="absolute right-3 bottom-3 opacity-0 transition-opacity group-hover:opacity-100">
												<Pencil className="h-3.5 w-3.5 text-black/35" />
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</section>

			{/* Wizard overlay */}
			{wizardOpen && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
					onClick={(e) => {
						if (e.target === e.currentTarget) closeWizard();
					}}
				>
					<div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
						{/* Header */}
						<div className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-5">
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
									{selectedRow ? `Editing · ${rowLabel(selectedRow)}` : "New Property"}
								</div>
								<div className="mt-0.5 text-lg font-semibold tracking-tight text-[#111111]">
									{step.label}
								</div>
								<p className="mt-0.5 text-xs text-black/50">{step.description}</p>
							</div>
							<button
								type="button"
								onClick={closeWizard}
								className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-black/50 transition hover:bg-zinc-50 hover:text-[#111111]"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{/* Step rail */}
						<div className="flex items-center overflow-x-auto border-b border-black/10 px-2 scrollbar-hide">
							{STEPS.map((s, idx) => {
								const isActive = idx === currentStep;
								const isDone = stepIsComplete(s, payload) && idx < currentStep;
								const hasError = Boolean(stepErrors[s.id]);
								const Icon = s.icon;

								return (
									<button
										key={s.id}
										type="button"
										onClick={() => {
											setStepErrors({});
											setCurrentStep(idx);
										}}
										className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3.5 text-xs font-semibold transition ${isActive ? "border-[#111111] text-[#111111]" : hasError ? "border-red-500 text-red-600" : isDone ? "border-emerald-500 text-emerald-600" : "border-transparent text-black/40 hover:text-black/70"}`}
									>
										{isDone && !hasError ? (
											<Check className="h-3 w-3 text-emerald-500" />
										) : (
											<Icon className={`h-3 w-3 ${isActive ? "text-[#111111]" : "opacity-60"}`} />
										)}
										<span className="hidden sm:inline">{s.label}</span>
										<span className="sm:hidden text-[10px]">{idx + 1}</span>
										{hasError && (
											<span className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
												!
											</span>
										)}
									</button>
								);
							})}
						</div>

						{/* Step content */}
						<div className="flex-1 overflow-y-auto px-6 py-6">
							{stepErrors[step.id] && (
								<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{stepErrors[step.id]}
								</div>
							)}

							<form
								ref={formRef}
								id="property-wizard-form"
								onChange={handleFormChange}
								onSubmit={(e) => e.preventDefault()}
							>
								<div className="grid gap-5 sm:grid-cols-2">
									{stepFieldList.map((field) => {
										const val = selectedRow
											? selectedRow[field.name]
											: (defaultValues?.[field.name] ?? "");
										const isWide =
											field.type === "textarea" ||
											field.type === "array" ||
											field.type === "url";

										return (
											<div key={field.name} className={isWide ? "sm:col-span-2" : ""}>
												<label>
													<div className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
														{field.label}
														{step.required.includes(field.name) && (
															<span className="ml-1 text-red-500">*</span>
														)}
													</div>
													<FieldInput
														field={field}
														value={val}
														payload={payload}
														canEdit={canEdit}
														onChange={handleFieldChange}
													/>
													{field.help && (
														<p className="mt-1.5 text-[11px] leading-5 text-black/40">
															{field.help}
														</p>
													)}
												</label>
											</div>
										);
									})}
								</div>
							</form>

							{isLastStep && extra && (
								<div className="mt-6 border-t border-black/10 pt-6">{extra}</div>
							)}
						</div>

						{/* Footer */}
						<div className="flex items-center justify-between gap-3 border-t border-black/10 px-6 py-4">
							<div className="flex items-center gap-2">
								{!isFirstStep && (
									<button
										type="button"
										onClick={handlePrev}
										className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-medium text-[#111111] transition hover:bg-zinc-50"
									>
										<ChevronLeft className="h-4 w-4" />
										Back
									</button>
								)}
								{selectedRow && canEdit && onDelete && (
									<button
										type="button"
										onClick={() => {
											void onDelete(selectedRow);
											closeWizard();
										}}
										className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50"
									>
										<Trash2 className="h-4 w-4" />
										Delete
									</button>
								)}
							</div>

							<div className="flex items-center gap-2">
								<span className="text-xs text-black/40">
									{currentStep + 1} / {STEPS.length}
								</span>

								{isLastStep && renderPreview && (
									<button
										type="button"
										disabled={!canEdit}
										onClick={() => setPreviewPayload({ ...payload })}
										className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-medium text-[#111111] transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<Eye className="h-4 w-4" />
										Preview
									</button>
								)}

								{!isLastStep ? (
									<button
										type="button"
										onClick={handleNext}
										className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-black/80"
									>
										Next
										<ChevronRight className="h-4 w-4" />
									</button>
								) : (
									<button
										type="button"
										disabled={!canEdit || saving}
										onClick={handleSave}
										className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20"
									>
										{saving ? (
											<>
												<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
												Saving…
											</>
										) : (
											<>
												<Check className="h-4 w-4" />
												{selectedRow ? "Save changes" : "Create listing"}
											</>
										)}
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Preview overlay */}
			{renderPreview && previewPayload && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
					<div className="flex max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
						<div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
							<div>
								<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/50">
									Property Preview
								</div>
								<p className="mt-0.5 text-sm text-black/55">
									How this listing will look to buyers on the public site.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setPreviewPayload(null)}
								className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-black/50 transition hover:bg-zinc-50"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="flex-1 overflow-auto">
							{renderPreview(previewPayload, selectedRow)}
						</div>
						<div className="flex items-center justify-between gap-3 border-t border-black/10 px-6 py-4">
							<p className="text-xs text-black/45">
								Close preview, adjust fields, then preview again.
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setPreviewPayload(null)}
									className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50"
								>
									Back to edit
								</button>
								<button
									type="button"
									disabled={!canEdit || saving}
									onClick={handleSave}
									className="rounded-xl bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:bg-black/20"
								>
									{selectedRow ? "Save changes" : "Create listing"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
