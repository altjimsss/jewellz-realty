"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Building2, FileText, FolderTree, Home, LayoutDashboard, LogOut, MessageSquare, RefreshCw, Search, Settings, UserCircle, Users, type LucideIcon } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Role = "admin" | "agent" | "developer_partner" | "buyer" | null;
type FieldType = "text" | "textarea" | "number" | "checkbox" | "select" | "datetime-local" | "email" | "url" | "array";

type FieldOption = { label: string; value: string };
type FieldSpec = {
	name: string;
	label: string;
	type: FieldType;
	placeholder?: string;
	rows?: number;
	options?: FieldOption[];
	help?: string;
};

type SectionProps = {
	title: string;
	description: string;
	children: ReactNode;
};

type EditorProps = {
	title: string;
	description: string;
	rows: any[];
	selectedId: string | null;
	fields: FieldSpec[];
	defaultValues?: Record<string, any>;
	canEdit: boolean;
	rowLabel: (row: any) => string;
	rowMeta?: (row: any) => string;
	onSelect: (row: any | null) => void;
	onCreateNew: () => void;
	onDelete?: (row: any) => Promise<void>;
	onSubmit: (payload: Record<string, any>, currentRow: any | null) => Promise<void>;
	extra?: ReactNode;
	idKey?: string;
};

type Workspace = {
	properties: any[];
	projects: any[];
	developers: any[];
	agents: any[];
	inquiries: any[];
	cmsPages: any[];
	galleryItems: any[];
	testimonials: any[];
	heroBanners: any[];
	partnerLogos: any[];
	siteStats: any[];
	settings: any[];
	listingPerformance: any[];
	dailyInquiryVolume: any[];
	trafficSources: any[];
	agentPerformance: any[];
	developerPortfolio: any[];
	recommendations: any[];
};

type SelectionState = {
	properties: string | null;
	projects: string | null;
	developers: string | null;
	agents: string | null;
	inquiries: string | null;
	cmsPages: string | null;
	galleryItems: string | null;
	testimonials: string | null;
	heroBanners: string | null;
	partnerLogos: string | null;
	siteStats: string | null;
	settings: string | null;
};

type CmsSection =
	| "overview"
	| "properties"
	| "projects"
	| "inquiries"
	| "pipeline"
	| "timeline"
	| "analytics"
	| "traffic"
	| "agentPerformance"
	| "developerPortfolio"
	| "agents"
	| "developers"
	| "profiles"
	| "hero"
	| "gallery"
	| "testimonials"
	| "logos"
	| "stats"
	| "pages"
	| "settings"
	| "activityLogs";

type CmsPrimary = "dashboard" | "listings" | "inquiries" | "analytics" | "people" | "content" | "settings";

type CmsNavGroup = {
	id: CmsPrimary;
	label: string;
	icon: LucideIcon;
	items: { id: CmsSection; label: string; hint: string; icon: LucideIcon }[];
};

const emptyWorkspace: Workspace = {
	properties: [],
	projects: [],
	developers: [],
	agents: [],
	inquiries: [],
	cmsPages: [],
	galleryItems: [],
	testimonials: [],
	heroBanners: [],
	partnerLogos: [],
	siteStats: [],
	settings: [],
	listingPerformance: [],
	dailyInquiryVolume: [],
	trafficSources: [],
	agentPerformance: [],
	developerPortfolio: [],
	recommendations: [],
};

const emptySelection: SelectionState = {
	properties: null,
	projects: null,
	developers: null,
	agents: null,
	inquiries: null,
	cmsPages: null,
	galleryItems: null,
	testimonials: null,
	heroBanners: null,
	partnerLogos: null,
	siteStats: null,
	settings: null,
};

const propertyCategoryOptions: FieldOption[] = [
	{ label: "Condo", value: "condo" },
	{ label: "House", value: "house" },
	{ label: "House and Lot", value: "house_and_lot" },
	{ label: "Townhouse", value: "townhouse" },
	{ label: "Lot", value: "lot" },
	{ label: "Farm", value: "farm" },
	{ label: "Memorial", value: "memorial" },
	{ label: "Commercial", value: "commercial" },
];

const propertySidebarCategoryOptions: FieldOption[] = [
	{ label: "Condo", value: "condo" },
	{ label: "House", value: "house" },
	{ label: "Lot", value: "lot" },
	{ label: "Farm", value: "farm" },
	{ label: "Memorial", value: "memorial" },
];

const listingStatusOptions: FieldOption[] = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Reserved", value: "reserved" },
	{ label: "Sold", value: "sold" },
	{ label: "Unpublished", value: "unpublished" },
];

const listingBadgeOptions: FieldOption[] = [
	{ label: "None", value: "none" },
	{ label: "Featured", value: "featured" },
	{ label: "Promo", value: "promo" },
	{ label: "New", value: "new" },
	{ label: "Hot", value: "hot" },
];

const inquiryStatusOptions: FieldOption[] = [
	{ label: "New", value: "new" },
	{ label: "Assigned", value: "assigned" },
	{ label: "Contacted", value: "contacted" },
	{ label: "Viewing Scheduled", value: "viewing_scheduled" },
	{ label: "Negotiating", value: "negotiating" },
	{ label: "Reserved", value: "reserved" },
	{ label: "Closed Won", value: "closed_won" },
	{ label: "Closed Lost", value: "closed_lost" },
];

const priorityOptions: FieldOption[] = [
	{ label: "High", value: "high" },
	{ label: "Medium", value: "medium" },
	{ label: "Low", value: "low" },
];

const trafficSourceOptions: FieldOption[] = [
	{ label: "Direct", value: "direct" },
	{ label: "Organic Search", value: "organic_search" },
	{ label: "Facebook", value: "social_media_facebook" },
	{ label: "Instagram", value: "social_media_instagram" },
	{ label: "Other Social", value: "social_media_other" },
	{ label: "Email", value: "email_campaign" },
	{ label: "Referral", value: "referral" },
	{ label: "Walk In", value: "walk_in" },
	{ label: "Phone", value: "phone" },
	{ label: "Other", value: "other" },
];

const gallerySectionOptions: FieldOption[] = [
	{ label: "Achievements", value: "achievements" },
	{ label: "Events", value: "events" },
	{ label: "Trainings", value: "trainings" },
	{ label: "Service", value: "service" },
	{ label: "General", value: "general" },
];

function asText(value: unknown) {
	return value == null ? "" : String(value);
}

function asArrayText(value: unknown) {
	if (Array.isArray(value)) {
		return value.filter(Boolean).join("\n");
	}

	return asText(value);
}

function parseArrayText(value: FormDataEntryValue | null) {
	return asText(value)
		.split(/\r?\n|,/) 
		.map((item) => item.trim())
		.filter(Boolean);
}

function toDateTimeLocal(value: unknown) {
	if (!value) {
		return "";
	}

	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const offset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function readNumber(value: FormDataEntryValue | null) {
	const text = asText(value).trim();
	return text === "" ? null : Number(text);
}

function readBoolean(value: FormDataEntryValue | null) {
	return value === "on";
}

function buildPayload(fields: FieldSpec[], formData: FormData) {
	const payload: Record<string, any> = {};

	for (const field of fields) {
		const raw = formData.get(field.name);

		if (field.type === "checkbox") {
			payload[field.name] = readBoolean(raw);
			continue;
		}

		if (field.type === "number") {
			payload[field.name] = readNumber(raw);
			continue;
		}

		if (field.type === "array") {
			payload[field.name] = parseArrayText(raw);
			continue;
		}

		if (field.type === "datetime-local") {
			payload[field.name] = asText(raw).trim() ? new Date(asText(raw)).toISOString() : null;
			continue;
		}

		const text = asText(raw).trim();
		payload[field.name] = text === "" ? null : text;
	}

	return payload;
}

function displayValue(field: FieldSpec, value: unknown) {
	if (field.type === "checkbox") {
		return Boolean(value) ? "true" : "";
	}

	if (field.type === "number") {
		return value == null ? "" : String(value);
	}

	if (field.type === "array") {
		return asArrayText(value);
	}

	if (field.type === "datetime-local") {
		return toDateTimeLocal(value);
	}

	return asText(value);
}

function labelForRow(row: any) {
	return row?.title ?? row?.company_name ?? row?.project_name ?? row?.author_name ?? row?.headline ?? row?.label ?? row?.key ?? row?.slug ?? row?.id ?? "Record";
}

function SectionShell({ title, description, children }: SectionProps) {
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

function InfoCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/45">{label}</div>
			<div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">{value}</div>
			{hint ? <div className="mt-1 text-xs text-black/45">{hint}</div> : null}
		</div>
	);
}

function EntityEditor({
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
								<button key={rowId} type="button" onClick={() => onSelect(row)} className={`w-full rounded-md border px-3 py-2 text-left transition ${active ? "border-black/10 bg-[#eef3fc]" : "border-transparent bg-white hover:border-black/10 hover:bg-zinc-50"}`}>
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
								const commonInputClass = "mt-1 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 disabled:bg-zinc-50 disabled:text-black/45";
								return (
									<label key={field.name} className={field.type === "textarea" || field.type === "array" ? "md:col-span-2" : ""}>
										<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">{field.label}</div>
										{field.type === "textarea" || field.type === "array" ? (
											<textarea
												name={field.name}
												rows={field.rows ?? 4}
												defaultValue={displayValue(field, value)}
												placeholder={field.placeholder}
												disabled={!canEdit}
												className={`${commonInputClass} min-h-[110px] py-3`}
											/>
										) : field.type === "select" ? (
											<select name={field.name} defaultValue={displayValue(field, value)} disabled={!canEdit} className={commonInputClass}>
												<option value="">Select</option>
												{field.options?.map((option) => (
													<option key={option.value} value={option.value}>{option.label}</option>
												))}
											</select>
										) : field.type === "checkbox" ? (
											<label className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black/70">
												<input type="checkbox" name={field.name} defaultChecked={Boolean(value)} disabled={!canEdit} />
												<span>{field.help ?? "Enabled"}</span>
											</label>
										) : (
											<input
												type={field.type}
												name={field.name}
												defaultValue={displayValue(field, value)}
												placeholder={field.placeholder}
												disabled={!canEdit}
												className={commonInputClass}
											/>
										)}
										{field.help ? <p className="mt-1 text-[11px] leading-5 text-black/45">{field.help}</p> : null}
									</label>
								);
							})}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
							<p className="text-xs text-black/45">{selectedRow ? "Update the current row or create a new one." : "Fill in the form to create a new row."}</p>
							<button type="submit" disabled={!canEdit} className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
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

function PropertyImagesManager({ propertyId, canEdit, onChanged }: { propertyId: string | null; canEdit: boolean; onChanged: () => Promise<void> | void }) {
	const [images, setImages] = useState<any[]>([]);
	const [draft, setDraft] = useState({ storage_url: "", caption: "", sort_order: "0", is_cover: false });
	const [saving, setSaving] = useState(false);

	async function loadImages() {
		if (!propertyId) {
			setImages([]);
			return;
		}

		const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
		setImages(data ?? []);
	}

	useEffect(() => {
		setDraft({ storage_url: "", caption: "", sort_order: "0", is_cover: false });
		void loadImages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [propertyId]);

	async function saveImage(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!propertyId) return;

		setSaving(true);
		const payload = {
			property_id: propertyId,
			storage_url: draft.storage_url.trim(),
			caption: draft.caption.trim() || null,
			sort_order: Number(draft.sort_order || 0),
			is_cover: draft.is_cover,
		};

		const { error } = await supabaseBrowser.from("property_images").insert(payload);
		if (error) {
			setSaving(false);
			return;
		}

		await loadImages();
		await onChanged();
		setDraft({ storage_url: "", caption: "", sort_order: "0", is_cover: false });
		setSaving(false);
	}

	async function deleteImage(id: string) {
		await supabaseBrowser.from("property_images").delete().eq("id", id);
		await loadImages();
		await onChanged();
	}

	if (!propertyId) {
		return <div className="rounded-2xl border border-dashed border-black/15 bg-zinc-50 px-4 py-5 text-sm text-black/50">Select a property to manage its image gallery.</div>;
	}

	return (
		<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Property Images</div>
					<div className="mt-1 text-sm text-black/60">Add, sort, and remove gallery images for the selected listing.</div>
				</div>
				<div className="text-xs text-black/45">{images.length} images</div>
			</div>

			<form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={saveImage}>
				<input value={draft.storage_url} onChange={(event) => setDraft((state) => ({ ...state, storage_url: event.target.value }))} placeholder="Storage URL" disabled={!canEdit} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none disabled:bg-zinc-100" />
				<input value={draft.caption} onChange={(event) => setDraft((state) => ({ ...state, caption: event.target.value }))} placeholder="Caption" disabled={!canEdit} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none disabled:bg-zinc-100" />
				<input value={draft.sort_order} onChange={(event) => setDraft((state) => ({ ...state, sort_order: event.target.value }))} type="number" placeholder="Sort order" disabled={!canEdit} className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none disabled:bg-zinc-100" />
				<label className="flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70">
					<input checked={draft.is_cover} onChange={(event) => setDraft((state) => ({ ...state, is_cover: event.target.checked }))} type="checkbox" disabled={!canEdit} />
					Cover image
				</label>
				<div className="md:col-span-4">
					<button type="submit" disabled={!canEdit || saving} className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">Add image</button>
				</div>
			</form>

			<div className="mt-4 grid gap-2 md:grid-cols-2">
				{images.map((image) => (
					<div key={image.id} className="rounded-2xl border border-black/10 bg-white p-3">
						<div className="truncate text-sm font-medium text-[#111111]">{image.caption || image.storage_url}</div>
						<div className="mt-1 text-xs text-black/45">{image.storage_url}</div>
						<div className="mt-3 flex items-center justify-between gap-2 text-xs text-black/55">
							<span>Sort order: {image.sort_order}</span>
							<span>{image.is_cover ? "Cover" : "Secondary"}</span>
						</div>
						{canEdit ? <button type="button" onClick={() => deleteImage(image.id)} className="mt-3 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50">Delete</button> : null}
					</div>
				))}
			</div>
		</div>
	);
}

function InquiryPanel({
	inquiries,
	agents,
	currentRole,
	currentUserId,
	selectedId,
	onSelect,
	onReload,
	canEdit,
	canReassign,
}: {
	inquiries: any[];
	agents: any[];
	currentRole: Role;
	currentUserId: string | null;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onReload: () => Promise<void>;
	canEdit: boolean;
	canReassign: boolean;
}) {
	const [timeline, setTimeline] = useState<any[]>([]);
	const [status, setStatus] = useState("new");
	const [assignedAgentId, setAssignedAgentId] = useState("");
	const [note, setNote] = useState("");
	const [saving, setSaving] = useState(false);

	const selectedInquiry = inquiries.find((item) => asText(item.id) === asText(selectedId)) ?? null;

	useEffect(() => {
		if (!selectedInquiry) {
			setTimeline([]);
			setStatus("new");
			setAssignedAgentId("");
			setNote("");
			return;
		}

		setStatus(selectedInquiry.status ?? "new");
		setAssignedAgentId(asText(selectedInquiry.assigned_agent_id));
		setNote("");

		void (async () => {
			const { data } = await supabaseBrowser.from("inquiry_timeline").select("*").eq("inquiry_id", selectedInquiry.id).order("created_at", { ascending: false });
			setTimeline(data ?? []);
		})();
	}, [selectedInquiry]);

	async function saveInquiry() {
		if (!selectedInquiry || !canEdit) return;

		setSaving(true);
		const now = new Date().toISOString();
		const updatePayload: Record<string, any> = {
			status,
			last_activity_at: now,
		};

		if (canReassign) {
			updatePayload.assigned_agent_id = assignedAgentId || null;
		}

		if (status === "contacted" && !selectedInquiry.first_contacted_at) {
			updatePayload.first_contacted_at = now;
		}

		if (["reserved", "closed_won", "closed_lost"].includes(status) && !selectedInquiry.closed_at) {
			updatePayload.closed_at = now;
		}

		const { error } = await supabaseBrowser.from("inquiries").update(updatePayload).eq("id", selectedInquiry.id);
		if (error) {
			setSaving(false);
			return;
		}

		if (canReassign && assignedAgentId && assignedAgentId !== selectedInquiry.assigned_agent_id) {
			await supabaseBrowser.from("agent_assignments").update({ unassigned_at: now }).eq("inquiry_id", selectedInquiry.id).is("unassigned_at", null);
			await supabaseBrowser.from("agent_assignments").insert({ inquiry_id: selectedInquiry.id, agent_id: assignedAgentId, assigned_by: currentUserId, assigned_at: now });
		}

		if (note.trim()) {
			await supabaseBrowser.from("inquiry_timeline").insert({
				inquiry_id: selectedInquiry.id,
				changed_by: currentUserId,
				old_status: selectedInquiry.status,
				new_status: status,
				note: note.trim(),
			});
		}

		setSaving(false);
		setNote("");
		await onReload();
	}

	async function addTimelineNote() {
		if (!selectedInquiry || !note.trim() || !canEdit) return;
		setSaving(true);
		await supabaseBrowser.from("inquiry_timeline").insert({
			inquiry_id: selectedInquiry.id,
			changed_by: currentUserId,
			old_status: selectedInquiry.status,
			new_status: status,
			note: note.trim(),
		});
		setNote("");
		await onReload();
		const { data } = await supabaseBrowser.from("inquiry_timeline").select("*").eq("inquiry_id", selectedInquiry.id).order("created_at", { ascending: false });
		setTimeline(data ?? []);
		setSaving(false);
	}

	return (
		<SectionShell title="Inquiries" description="View submissions, assign leads, update pipeline stages, and keep an internal status timeline.">
			<div className="grid gap-4 xl:grid-cols-[300px_1fr]">
				<aside className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Queue</div>
					<div className="mt-3 max-h-[480px] space-y-2 overflow-auto pr-1">
						{inquiries.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No inquiries available.</p> : null}
						{inquiries.map((item) => {
							const active = asText(item.id) === asText(selectedId);
							return (
								<button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`w-full rounded-2xl border px-3 py-2 text-left transition ${active ? "border-[#0E4B74] bg-white shadow-sm" : "border-transparent bg-white/60 hover:border-black/10 hover:bg-white"}`}>
									<div className="text-sm font-medium text-[#111111]">{item.buyer_name}</div>
									<div className="mt-1 flex flex-wrap gap-2 text-xs text-black/55">
										<span>{item.status}</span>
										<span>Priority: {item.priority ?? "n/a"}</span>
										<span>{item.buyer_email}</span>
									</div>
								</button>
							);
						})}
					</div>
				</aside>

				<div className="rounded-2xl border border-black/10 bg-white p-4">
					{selectedInquiry ? (
						<div className="space-y-4">
							<div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-4">
								<div>
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Selected Lead</div>
									<div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#111111]">{selectedInquiry.buyer_name}</div>
									<div className="mt-1 text-sm text-black/55">{selectedInquiry.buyer_email} {selectedInquiry.buyer_phone ? `• ${selectedInquiry.buyer_phone}` : ""}</div>
								</div>
								<div className="rounded-full bg-black/5 px-4 py-2 text-xs font-medium text-black/60">Current status: {selectedInquiry.status}</div>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Details</div>
									<div className="mt-3 space-y-2 text-sm text-black/70">
										<p><span className="font-medium text-[#111111]">Property:</span> {selectedInquiry.property_id}</p>
										<p><span className="font-medium text-[#111111]">Developer:</span> {selectedInquiry.developer_id ?? "—"}</p>
										<p><span className="font-medium text-[#111111]">Source:</span> {selectedInquiry.source}</p>
										<p><span className="font-medium text-[#111111]">Session:</span> {selectedInquiry.session_id ?? "—"}</p>
										<p><span className="font-medium text-[#111111]">Lead score:</span> {selectedInquiry.lead_score ?? "—"}</p>
										<p className="whitespace-pre-wrap"><span className="font-medium text-[#111111]">Message:</span> {selectedInquiry.buyer_message ?? "—"}</p>
									</div>
								</div>

								<div className="rounded-2xl border border-black/10 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Pipeline Update</div>
									<div className="mt-4 space-y-3">
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Status</div>
											<select value={status} onChange={(event) => setStatus(event.target.value)} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												{inquiryStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Priority</div>
											<select value={selectedInquiry.priority ?? ""} disabled className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												<option value="">Auto-derived</option>
												{priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Assigned Agent</div>
											<select value={assignedAgentId} onChange={(event) => setAssignedAgentId(event.target.value)} disabled={!canReassign} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												<option value="">Unassigned</option>
												{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.profile_id ?? agent.id}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Timeline Note</div>
											<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50" placeholder="Add an internal note or next step..." />
										</label>
										<div className="flex flex-wrap gap-2">
											<button type="button" onClick={saveInquiry} disabled={!canEdit || saving} className="rounded-full bg-[#0E4B74] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0b3d5c] disabled:cursor-not-allowed disabled:bg-black/20">Save pipeline</button>
											<button type="button" onClick={addTimelineNote} disabled={!canEdit || saving || !note.trim()} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:bg-black/5">Add note</button>
										</div>
									</div>
								</div>
							</div>

							<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
								<div className="rounded-2xl border border-black/10 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Timeline History</div>
									<div className="mt-3 space-y-3">
										{timeline.length === 0 ? <p className="text-sm text-black/45">No timeline events yet.</p> : null}
										{timeline.map((entry) => (
											<div key={entry.id} className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
												<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{entry.new_status}</div>
												<div className="mt-1 text-sm text-black/70">{entry.note ?? "Status change recorded."}</div>
												<div className="mt-2 text-xs text-black/45">{entry.created_at}</div>
											</div>
										))}
									</div>
								</div>
								<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4 text-sm text-black/60">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Role Scope</div>
									<p className="mt-3 leading-6">
										{currentRole === "admin"
											? "Admin can view and update every inquiry, including assignment history and pipeline notes."
											: currentRole === "agent"
												? "Agents only see their assigned leads. Assignment changes are restricted to the UI and RLS policy."
												: "Developer partners only see inquiries related to their portfolio."}
									</p>
								</div>
							</div>
						</div>
					) : (
						<div className="rounded-2xl border border-dashed border-black/15 bg-zinc-50 px-4 py-10 text-sm text-black/50">Select an inquiry to inspect its pipeline and timeline.</div>
					)}
				</div>
			</div>
		</SectionShell>
	);
}

function AnalyticsPanel({
	isAdmin,
	properties,
	inquiries,
	recommendations,
	listingPerformance,
	dailyInquiryVolume,
	trafficSources,
	agentPerformance,
	developerPortfolio,
}: {
	isAdmin: boolean;
	properties: any[];
	inquiries: any[];
	recommendations: any[];
	listingPerformance: any[];
	dailyInquiryVolume: any[];
	trafficSources: any[];
	agentPerformance: any[];
	developerPortfolio: any[];
}) {
	const inquiryCounts = inquiries.reduce((acc: Record<string, number>, item) => {
		acc[item.status] = (acc[item.status] ?? 0) + 1;
		return acc;
	}, {});

	const priorityCounts = inquiries.reduce((acc: Record<string, number>, item) => {
		acc[item.priority ?? "unclassified"] = (acc[item.priority ?? "unclassified"] ?? 0) + 1;
		return acc;
	}, {});

	const averageResponseHours = (() => {
		const responseHours = inquiries
			.map((item) => {
				if (!item.first_contacted_at || !item.created_at) return null;
				return (new Date(item.first_contacted_at).getTime() - new Date(item.created_at).getTime()) / 36e5;
			})
			.filter((value): value is number => value != null && Number.isFinite(value));
		if (!responseHours.length) return null;
		return responseHours.reduce((sum, value) => sum + value, 0) / responseHours.length;
	})();

	const recommendationStats = (() => {
		if (!recommendations.length) return { total: 0, clicked: 0, fallback: 0 };
		const total = recommendations.length;
		const clicked = recommendations.filter((item) => item.was_clicked).length;
		const fallback = recommendations.filter((item) => item.is_fallback).length;
		return { total, clicked, fallback };
	})();

	const clickThrough = recommendationStats.total ? (recommendationStats.clicked / recommendationStats.total) * 100 : 0;
	const fallbackRate = recommendationStats.total ? (recommendationStats.fallback / recommendationStats.total) * 100 : 0;

	return (
		<SectionShell title="Analytics" description="Operational KPI view powered by the materialized views and live inquiry tables already present in the schema.">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<InfoCard label="Visible Listings" value={properties.length} hint="Scope depends on the signed-in role." />
				<InfoCard label="Visible Inquiries" value={inquiries.length} hint="Assigned leads or all leads for admin." />
				<InfoCard label="Avg. Response" value={averageResponseHours == null ? "n/a" : `${averageResponseHours.toFixed(2)} hrs`} hint="Average time from inquiry creation to first contact." />
				<InfoCard label="Recommendations CTR" value={`${clickThrough.toFixed(1)}%`} hint={`${recommendationStats.clicked}/${recommendationStats.total} clicked`} />
				<InfoCard label="Fallback Rate" value={`${fallbackRate.toFixed(1)}%`} hint="Popularity-based recommendation usage." />
				<InfoCard label="Statuses Tracked" value={Object.keys(inquiryCounts).length} hint="Live pipeline distribution." />
			</div>

			<div className="mt-5 grid gap-5 xl:grid-cols-2">
				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Pipeline</div>
					<div className="mt-3 grid gap-2">
						{Object.entries(inquiryCounts).length === 0 ? <p className="text-sm text-black/45">No inquiry activity yet.</p> : null}
						{Object.entries(inquiryCounts).map(([status, count]) => (
							<div key={status} className="flex items-center gap-3">
								<div className="w-36 text-sm text-black/60">{status}</div>
								<div className="h-2 flex-1 rounded-full bg-black/5">
									<div className="h-2 rounded-full bg-[#0E4B74]" style={{ width: `${Math.max(10, Math.min(100, count * 10))}%` }} />
								</div>
								<div className="w-10 text-right text-sm font-medium text-black/70">{count}</div>
							</div>
						))}
					</div>
					<div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Priority Split</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{Object.entries(priorityCounts).map(([priority, count]) => (
							<span key={priority} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-black/65">{priority}: {count}</span>
						))}
					</div>
				</div>

				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Recommendation Analytics</div>
					<div className="mt-3 space-y-3 text-sm text-black/65">
						<p>Total recommendations: <span className="font-medium text-[#111111]">{recommendationStats.total}</span></p>
						<p>Clicked recommendations: <span className="font-medium text-[#111111]">{recommendationStats.clicked}</span></p>
						<p>Fallback recommendations: <span className="font-medium text-[#111111]">{recommendationStats.fallback}</span></p>
						<p>Click-through rate: <span className="font-medium text-[#111111]">{clickThrough.toFixed(1)}%</span></p>
						<p>Fallback rate: <span className="font-medium text-[#111111]">{fallbackRate.toFixed(1)}%</span></p>
					</div>
				</div>
			</div>

			{isAdmin ? (
				<div className="mt-5 grid gap-5 xl:grid-cols-2">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Listing Performance</div>
						<div className="mt-3 overflow-x-auto">
							<table className="min-w-full text-left text-sm">
								<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
									<tr>
										<th className="py-2 pr-4">Property</th>
										<th className="py-2 pr-4">Views</th>
										<th className="py-2 pr-4">Opens</th>
										<th className="py-2 pr-4">Inquiries</th>
										<th className="py-2 pr-4">Rate</th>
									</tr>
								</thead>
								<tbody>
									{listingPerformance.slice(0, 8).map((row) => (
										<tr key={row.property_id} className="border-t border-black/5">
											<td className="py-2 pr-4 font-medium text-[#111111]">{row.title}</td>
											<td className="py-2 pr-4">{row.total_views ?? 0}</td>
											<td className="py-2 pr-4">{row.detail_opens ?? 0}</td>
											<td className="py-2 pr-4">{row.total_inquiries ?? 0}</td>
											<td className="py-2 pr-4">{row.inquiry_rate_pct ?? 0}%</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Traffic Sources</div>
						<div className="mt-3 space-y-2">
							{trafficSources.map((row) => (
								<div key={row.source} className="rounded-xl border border-black/10 bg-zinc-50 p-3 text-sm">
									<div className="flex items-center justify-between gap-3">
										<span className="font-medium text-[#111111]">{row.source}</span>
										<span>{row.share_pct ?? 0}%</span>
									</div>
									<div className="mt-1 text-xs text-black/45">{row.session_count} sessions • {row.total_page_views ?? 0} page views</div>
								</div>
							))}
						</div>
					</div>
				</div>
			) : null}

			{isAdmin ? (
				<div className="mt-5 grid gap-5 xl:grid-cols-2">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Agent Performance</div>
						<div className="mt-3 overflow-x-auto">
							<table className="min-w-full text-left text-sm">
								<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
									<tr>
										<th className="py-2 pr-4">Agent</th>
										<th className="py-2 pr-4">Assigned</th>
										<th className="py-2 pr-4">Conversions</th>
										<th className="py-2 pr-4">Rate</th>
										<th className="py-2 pr-4">Response</th>
									</tr>
								</thead>
								<tbody>
									{agentPerformance.map((row) => (
										<tr key={row.agent_id} className="border-t border-black/5">
											<td className="py-2 pr-4 font-medium text-[#111111]">{row.agent_name}</td>
											<td className="py-2 pr-4">{row.total_assigned ?? 0}</td>
											<td className="py-2 pr-4">{row.conversions ?? 0}</td>
											<td className="py-2 pr-4">{row.conversion_rate_pct ?? 0}%</td>
											<td className="py-2 pr-4">{row.avg_response_time_hours ?? "n/a"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Developer Portfolio</div>
						<div className="mt-3 overflow-x-auto">
							<table className="min-w-full text-left text-sm">
								<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
									<tr>
										<th className="py-2 pr-4">Developer</th>
										<th className="py-2 pr-4">Listings</th>
										<th className="py-2 pr-4">Views</th>
										<th className="py-2 pr-4">Conversions</th>
									</tr>
								</thead>
								<tbody>
									{developerPortfolio.map((row) => (
										<tr key={row.developer_id} className="border-t border-black/5">
											<td className="py-2 pr-4 font-medium text-[#111111]">{row.company_name}</td>
											<td className="py-2 pr-4">{row.total_listings ?? 0}</td>
											<td className="py-2 pr-4">{row.total_views ?? 0}</td>
											<td className="py-2 pr-4">{row.total_conversions ?? 0}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			) : null}
		</SectionShell>
	);
}

export default function AdminCms() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("Loading workspace...");
	const [saving, setSaving] = useState(false);
	const [sessionUser, setSessionUser] = useState<any>(null);
	const [profile, setProfile] = useState<any>(null);
	const [agentProfile, setAgentProfile] = useState<any>(null);
	const [developerProfile, setDeveloperProfile] = useState<any>(null);
	const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
	const [selection, setSelection] = useState<SelectionState>(emptySelection);
	const [activePrimary, setActivePrimary] = useState<CmsPrimary>("dashboard");
	const [activeSection, setActiveSection] = useState<CmsSection>("overview");
	const [propertyCategoryFilter, setPropertyCategoryFilter] = useState("all");

	const role: Role = profile?.role ?? null;
	const isAdmin = role === "admin";
	const isAgent = role === "agent";
	const isDeveloper = role === "developer_partner";
	const canEditCatalog = isAdmin;
	const canEditContent = isAdmin;
	const canEditSettings = isAdmin;
	const canEditInquiries = isAdmin || isAgent || isDeveloper;
	const canReassignInquiries = isAdmin;

	const selectedProperty = workspace.properties.find((row) => asText(row.id) === asText(selection.properties)) ?? null;
	const navGroups = useMemo<CmsNavGroup[]>(() => {
		const groups: CmsNavGroup[] = [
			{
				id: "dashboard",
				label: "Dashboard",
				icon: LayoutDashboard,
				items: [{ id: "overview", label: "Overview", hint: "Counts and status", icon: Home }],
			},
			{
				id: "listings",
				label: "Listings",
				icon: Building2,
				items: [
					{ id: "properties", label: "Properties", hint: `${workspace.properties.length} listings`, icon: Building2 },
					{ id: "projects", label: "Projects", hint: `${workspace.projects.length} projects`, icon: FolderTree },
				],
			},
			{
				id: "inquiries",
				label: "Inquiries",
				icon: MessageSquare,
				items: [
					{ id: "inquiries", label: "All Inquiries", hint: `${workspace.inquiries.length} leads`, icon: MessageSquare },
					{ id: "pipeline", label: "Pipeline", hint: "Lead stages", icon: FolderTree },
					{ id: "timeline", label: "Status Timeline", hint: "Inquiry history", icon: FileText },
				],
			},
		];

		if (isAdmin) {
			groups.push(
				{
					id: "analytics",
					label: "Analytics",
					icon: BarChart3,
					items: [
						{ id: "analytics", label: "Overview", hint: "Performance summary", icon: BarChart3 },
						{ id: "traffic", label: "Traffic Sources", hint: "Session channels", icon: BarChart3 },
						{ id: "agentPerformance", label: "Agent Performance", hint: "Conversion rates", icon: Users },
						{ id: "developerPortfolio", label: "Developer Portfolio", hint: "Portfolio KPIs", icon: Building2 },
					],
				},
				{
					id: "people",
					label: "People",
					icon: Users,
					items: [
						{ id: "agents", label: "Agents", hint: `${workspace.agents.length} agents`, icon: Users },
						{ id: "developers", label: "Developer Partners", hint: `${workspace.developers.length} partners`, icon: Building2 },
						{ id: "profiles", label: "Profiles & Buyers", hint: "Auth profiles", icon: UserCircle },
					],
				},
				{
					id: "content",
					label: "Content",
					icon: FileText,
					items: [
						{ id: "hero", label: "Hero Banners", hint: `${workspace.heroBanners.length} banners`, icon: FileText },
						{ id: "gallery", label: "Gallery", hint: `${workspace.galleryItems.length} items`, icon: FileText },
						{ id: "testimonials", label: "Testimonials", hint: `${workspace.testimonials.length} quotes`, icon: MessageSquare },
						{ id: "logos", label: "Partner Logos", hint: `${workspace.partnerLogos.length} logos`, icon: Building2 },
						{ id: "stats", label: "Site Stats", hint: `${workspace.siteStats.length} counters`, icon: BarChart3 },
						{ id: "pages", label: "Pages", hint: `${workspace.cmsPages.length} pages`, icon: FileText },
					],
				},
				{
					id: "settings",
					label: "System",
					icon: Settings,
					items: [
						{ id: "settings", label: "System Settings", hint: "System config", icon: Settings },
						{ id: "activityLogs", label: "Activity Logs", hint: "Audit trail", icon: FileText },
					],
				},
			);
		}

		return groups;
	}, [isAdmin, workspace.agents.length, workspace.cmsPages.length, workspace.developers.length, workspace.galleryItems.length, workspace.heroBanners.length, workspace.inquiries.length, workspace.partnerLogos.length, workspace.projects.length, workspace.properties.length, workspace.siteStats.length, workspace.testimonials.length]);
	const navItems = useMemo(() => navGroups.flatMap((group) => group.items), [navGroups]);
	const activeNavItem = navItems.find((item) => item.id === activeSection);
	const activeNavGroup = navGroups.find((group) => group.id === activePrimary) ?? navGroups[0];
	const activeSidebarItems = activeNavGroup?.items ?? [];
	const visibleProperties = useMemo(() => {
		if (propertyCategoryFilter === "all") {
			return workspace.properties;
		}

		return workspace.properties.filter((property) => property.category === propertyCategoryFilter);
	}, [propertyCategoryFilter, workspace.properties]);
	const selectedCategoryLabel = propertyCategoryFilter === "all" ? "All Categories" : (propertyCategoryOptions.find((option) => option.value === propertyCategoryFilter)?.label ?? "All Categories");

	async function loadWorkspace(currentUser: any, currentProfile: any, currentAgent: any, currentDeveloper: any) {
		const agentId = currentAgent?.id ?? null;
		const developerId = currentDeveloper?.id ?? null;
		const activeRole: Role = currentProfile?.role ?? null;
		const activeIsAdmin = activeRole === "admin";
		const activeIsAgent = activeRole === "agent";
		const activeIsDeveloper = activeRole === "developer_partner";

		const propertyQuery = activeIsAgent && agentId
			? supabaseBrowser.from("properties").select("*").eq("assigned_agent_id", agentId).order("created_at", { ascending: false })
			: activeIsDeveloper && developerId
				? supabaseBrowser.from("properties").select("*").eq("developer_id", developerId).order("created_at", { ascending: false })
				: supabaseBrowser.from("properties").select("*").order("created_at", { ascending: false });

		const projectQuery = activeIsDeveloper && developerId
			? supabaseBrowser.from("projects").select("*").eq("developer_id", developerId).order("created_at", { ascending: false })
			: supabaseBrowser.from("projects").select("*").order("created_at", { ascending: false });

		const inquiryQuery = activeIsAgent && agentId
			? supabaseBrowser.from("inquiries").select("*").eq("assigned_agent_id", agentId).order("created_at", { ascending: false })
			: activeIsDeveloper && developerId
				? supabaseBrowser.from("inquiries").select("*").eq("developer_id", developerId).order("created_at", { ascending: false })
				: supabaseBrowser.from("inquiries").select("*").order("created_at", { ascending: false });

		const [propertiesResult, projectsResult, inquiriesResult] = await Promise.all([propertyQuery, projectQuery, inquiryQuery]);

		const nextWorkspace: Workspace = {
			...emptyWorkspace,
			properties: propertiesResult.data ?? [],
			projects: projectsResult.data ?? [],
			inquiries: inquiriesResult.data ?? [],
		};

		if (activeIsAdmin) {
			const [
				developersResult,
				agentsResult,
				pagesResult,
				galleryResult,
				testimonialsResult,
				heroBannersResult,
				partnerLogosResult,
				siteStatsResult,
				settingsResult,
				listingPerformanceResult,
				dailyInquiryVolumeResult,
				trafficSourcesResult,
				agentPerformanceResult,
				developerPortfolioResult,
				recommendationsResult,
			] = await Promise.all([
				supabaseBrowser.from("developer_partners").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("agents").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("cms_pages").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("gallery_items").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("testimonials").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("hero_banners").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("partner_logos").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("site_stats").select("*").order("sort_order", { ascending: true }),
				supabaseBrowser.from("system_settings").select("*").order("updated_at", { ascending: false }),
				supabaseBrowser.from("mv_listing_performance").select("*"),
				supabaseBrowser.from("mv_daily_inquiry_volume").select("*"),
				supabaseBrowser.from("mv_traffic_sources").select("*"),
				supabaseBrowser.from("mv_agent_performance").select("*"),
				supabaseBrowser.from("mv_developer_portfolio").select("*"),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at"),
			]);

			nextWorkspace.developers = developersResult.data ?? [];
			nextWorkspace.agents = agentsResult.data ?? [];
			nextWorkspace.cmsPages = pagesResult.data ?? [];
			nextWorkspace.galleryItems = galleryResult.data ?? [];
			nextWorkspace.testimonials = testimonialsResult.data ?? [];
			nextWorkspace.heroBanners = heroBannersResult.data ?? [];
			nextWorkspace.partnerLogos = partnerLogosResult.data ?? [];
			nextWorkspace.siteStats = siteStatsResult.data ?? [];
			nextWorkspace.settings = settingsResult.data ?? [];
			nextWorkspace.listingPerformance = listingPerformanceResult.data ?? [];
			nextWorkspace.dailyInquiryVolume = dailyInquiryVolumeResult.data ?? [];
			nextWorkspace.trafficSources = trafficSourcesResult.data ?? [];
			nextWorkspace.agentPerformance = agentPerformanceResult.data ?? [];
			nextWorkspace.developerPortfolio = developerPortfolioResult.data ?? [];
			nextWorkspace.recommendations = recommendationsResult.data ?? [];
		} else if (activeIsDeveloper && developerId) {
			const [developerResult, recommendationsResult] = await Promise.all([
				supabaseBrowser.from("developer_partners").select("*").eq("id", developerId).maybeSingle(),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at").eq("buyer_id", currentUser?.id),
			]);
			setDeveloperProfile(developerResult.data ?? null);
			nextWorkspace.recommendations = recommendationsResult.data ?? [];
		} else if (activeIsAgent && agentId) {
			const [agentResult, recommendationsResult] = await Promise.all([
				supabaseBrowser.from("agents").select("*").eq("id", agentId).maybeSingle(),
				supabaseBrowser.from("recommendations").select("id, was_clicked, is_fallback, clicked_at, generated_at").eq("buyer_id", currentUser?.id),
			]);
			setAgentProfile(agentResult.data ?? null);
			nextWorkspace.recommendations = recommendationsResult.data ?? [];
		}

		setWorkspace(nextWorkspace);
		setMessage("Workspace loaded.");
	}

	async function reloadWorkspace() {
		if (!sessionUser || !profile) return;
		setMessage("Refreshing data...");
		await loadWorkspace(sessionUser, profile, agentProfile, developerProfile);
	}

	useEffect(() => {
		let active = true;
		void (async () => {
			const { data: sessionResult } = await supabaseBrowser.auth.getSession();
			const user = sessionResult.session?.user ?? null;

			if (!user) {
				if (active) {
					setSessionUser(null);
					setProfile(null);
					setLoading(false);
					setMessage("Sign in to open the CMS.");
				}
				return;
			}

			const { data: profileResult } = await supabaseBrowser.from("profiles").select("*").eq("id", user.id).maybeSingle();
			if (!profileResult) {
				if (active) {
					setSessionUser(user);
					setProfile(null);
					setLoading(false);
					setMessage("No profile row found for the current auth user.");
				}
				return;
			}

			let currentAgent = null;
			let currentDeveloper = null;
			if (profileResult.role === "agent") {
				const { data } = await supabaseBrowser.from("agents").select("*").eq("profile_id", user.id).maybeSingle();
				currentAgent = data ?? null;
			}
			if (profileResult.role === "developer_partner") {
				const { data } = await supabaseBrowser.from("developer_partners").select("*").eq("profile_id", user.id).maybeSingle();
				currentDeveloper = data ?? null;
			}

			if (!active) return;
			setSessionUser(user);
			setProfile(profileResult);
			setAgentProfile(currentAgent);
			setDeveloperProfile(currentDeveloper);
			setLoading(false);
			await loadWorkspace(user, profileResult, currentAgent, currentDeveloper);
		})();

		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (workspace.properties.length && !selection.properties) {
			setSelection((current) => ({ ...current, properties: workspace.properties[0].id }));
		}
	}, [selection.properties, workspace.properties]);

	useEffect(() => {
		if (workspace.projects.length && !selection.projects && isAdmin) {
			setSelection((current) => ({ ...current, projects: workspace.projects[0].id }));
		}
	}, [isAdmin, selection.projects, workspace.projects]);

	useEffect(() => {
		if (workspace.developers.length && !selection.developers && isAdmin) {
			setSelection((current) => ({ ...current, developers: workspace.developers[0].id }));
		}
	}, [isAdmin, selection.developers, workspace.developers]);

	useEffect(() => {
		if (workspace.agents.length && !selection.agents && isAdmin) {
			setSelection((current) => ({ ...current, agents: workspace.agents[0].id }));
		}
	}, [isAdmin, selection.agents, workspace.agents]);

	useEffect(() => {
		if (workspace.inquiries.length && !selection.inquiries) {
			setSelection((current) => ({ ...current, inquiries: workspace.inquiries[0].id }));
		}
	}, [selection.inquiries, workspace.inquiries]);

	useEffect(() => {
		if (!navItems.some((item) => item.id === activeSection)) {
			setActivePrimary("dashboard");
			setActiveSection("overview");
		}
	}, [activeSection, navItems]);

	const stats = useMemo(() => ({
		propertyCount: workspace.properties.length,
		inquiryCount: workspace.inquiries.length,
		projectCount: workspace.projects.length,
		developerCount: workspace.developers.length,
		agentCount: workspace.agents.length,
		publishedCount: workspace.properties.filter((item) => item.status === "published").length,
		closedCount: workspace.inquiries.filter((item) => ["reserved", "closed_won"].includes(item.status)).length,
	}), [workspace.agents.length, workspace.developers.length, workspace.inquiries, workspace.properties, workspace.projects.length]);

	async function saveEntity(table: string, payload: Record<string, any>, currentRow: any | null, idKey = "id") {
		setMessage(`Saving ${table}...`);
		setSaving(true);

		const result = currentRow ? await supabaseBrowser.from(table).update(payload).eq(idKey, currentRow[idKey]) : await supabaseBrowser.from(table).insert(payload);
		if (result.error) {
			setMessage(result.error.message);
			setSaving(false);
			return false;
		}

		setSaving(false);
		await reloadWorkspace();
		return true;
	}

	async function deleteEntity(table: string, currentRow: any, idKey = "id") {
		if (!currentRow) return;
		setMessage(`Deleting from ${table}...`);
		setSaving(true);
		await supabaseBrowser.from(table).delete().eq(idKey, currentRow[idKey]);
		setSaving(false);
		await reloadWorkspace();
	}

	async function saveProperty(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.developer_id) {
			setMessage("Property records require developer_id.");
			return;
		}
		if (!payload.title || !payload.slug || !payload.address || !payload.city || !payload.province) {
			setMessage("Property records need title, slug, address, city, and province.");
			return;
		}

		if (payload.status === "published" && !payload.published_at) {
			payload.published_at = new Date().toISOString();
		}

		if (sessionUser?.id) {
			payload.updated_by = sessionUser.id;
			if (!currentRow) payload.created_by = sessionUser.id;
		}

		await saveEntity("properties", payload, currentRow);
	}

	async function saveProject(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.developer_id || !payload.project_name || !payload.slug) {
			setMessage("Projects need developer_id, project_name, and slug.");
			return;
		}
		await saveEntity("projects", payload, currentRow);
	}

	async function saveDeveloper(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.company_name || !payload.slug) {
			setMessage("Developer partners need company_name and slug.");
			return;
		}
		await saveEntity("developer_partners", payload, currentRow);
	}

	async function saveAgent(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.profile_id) {
			setMessage("Agents need a profile_id linked to auth.users.");
			return;
		}
		await saveEntity("agents", payload, currentRow);
	}

	async function saveCmsPage(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.slug || !payload.title) {
			setMessage("CMS pages need slug and title.");
			return;
		}
		if (payload.is_published && !payload.published_at) {
			payload.published_at = new Date().toISOString();
		}
		if (sessionUser?.id) {
			payload.updated_by = sessionUser.id;
			if (!currentRow) payload.created_by = sessionUser.id;
		}
		await saveEntity("cms_pages", payload, currentRow);
	}

	async function saveGalleryItem(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.section || !payload.title || !payload.image_url) {
			setMessage("Gallery items need section, title, and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("gallery_items", payload, currentRow);
	}

	async function saveTestimonial(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.author_name || !payload.quote) {
			setMessage("Testimonials need author_name and quote.");
			return;
		}
		await saveEntity("testimonials", payload, currentRow);
	}

	async function saveHeroBanner(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.headline || !payload.image_url) {
			setMessage("Hero banners need headline and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("hero_banners", payload, currentRow);
	}

	async function savePartnerLogo(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.name || !payload.logo_url) {
			setMessage("Partner logos need name and logo_url.");
			return;
		}
		await saveEntity("partner_logos", payload, currentRow);
	}

	async function saveSiteStat(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.key || !payload.label) {
			setMessage("Site stats need key and label.");
			return;
		}
		await saveEntity("site_stats", payload, currentRow, "key");
	}

	async function saveSetting(payload: Record<string, any>, currentRow: any | null) {
		if (!payload.key || payload.value == null) {
			setMessage("Settings need key and value.");
			return;
		}
		if (sessionUser?.id) payload.updated_by = sessionUser.id;
		await saveEntity("system_settings", payload, currentRow, "key");
	}

	const propertyFields: FieldSpec[] = [
		{ name: "project_id", label: "Project ID", type: "text", placeholder: "UUID from projects" },
		{ name: "developer_id", label: "Developer ID", type: "text", placeholder: "UUID from developer_partners" },
		{ name: "assigned_agent_id", label: "Assigned Agent ID", type: "text", placeholder: "UUID from agents" },
		{ name: "title", label: "Title", type: "text", placeholder: "Palm Village Unit 12" },
		{ name: "slug", label: "Slug", type: "text", placeholder: "palm-village-unit-12" },
		{ name: "category", label: "Category", type: "select", options: propertyCategoryOptions },
		{ name: "status", label: "Status", type: "select", options: listingStatusOptions },
		{ name: "badge", label: "Badge", type: "select", options: listingBadgeOptions },
		{ name: "address", label: "Address", type: "text" },
		{ name: "city", label: "City", type: "text" },
		{ name: "province", label: "Province", type: "text" },
		{ name: "region", label: "Region", type: "text" },
		{ name: "zip_code", label: "Zip Code", type: "text" },
		{ name: "latitude", label: "Latitude", type: "number", placeholder: "13.7563" },
		{ name: "longitude", label: "Longitude", type: "number", placeholder: "121.0583" },
		{ name: "google_maps_url", label: "Google Maps URL", type: "url" },
		{ name: "bedrooms", label: "Bedrooms", type: "number" },
		{ name: "bathrooms", label: "Bathrooms", type: "number" },
		{ name: "floor_area_sqm", label: "Floor Area (sqm)", type: "number" },
		{ name: "lot_area_sqm", label: "Lot Area (sqm)", type: "number" },
		{ name: "floor_count", label: "Floor Count", type: "number" },
		{ name: "unit_number", label: "Unit Number", type: "text" },
		{ name: "parking_slots", label: "Parking Slots", type: "number" },
		{ name: "price", label: "Price", type: "number" },
		{ name: "price_per_sqm", label: "Price per sqm", type: "number" },
		{ name: "is_price_negotiable", label: "Price Negotiable", type: "checkbox", help: "Enable if the listed price can still be negotiated." },
		{ name: "monthly_amortization", label: "Monthly Amortization", type: "number" },
		{ name: "description", label: "Description", type: "textarea", rows: 5 },
		{ name: "key_features", label: "Key Features", type: "array", rows: 4, help: "One feature per line, or comma-separated." },
		{ name: "amenities", label: "Amenities", type: "array", rows: 4, help: "One amenity per line, or comma-separated." },
		{ name: "nearby_landmarks", label: "Nearby Landmarks", type: "array", rows: 4 },
		{ name: "cover_image_url", label: "Cover Image URL", type: "url" },
		{ name: "video_url", label: "Video URL", type: "url" },
		{ name: "published_at", label: "Published At", type: "datetime-local" },
	];

	const projectFields: FieldSpec[] = [
		{ name: "developer_id", label: "Developer ID", type: "text" },
		{ name: "project_name", label: "Project Name", type: "text" },
		{ name: "slug", label: "Slug", type: "text" },
		{ name: "tagline", label: "Tagline", type: "text" },
		{ name: "description", label: "Description", type: "textarea", rows: 5 },
		{ name: "location_city", label: "City", type: "text" },
		{ name: "location_province", label: "Province", type: "text" },
		{ name: "region", label: "Region", type: "text" },
		{ name: "latitude", label: "Latitude", type: "number" },
		{ name: "longitude", label: "Longitude", type: "number" },
		{ name: "cover_image_url", label: "Cover Image URL", type: "url" },
		{ name: "brochure_url", label: "Brochure URL", type: "url" },
		{ name: "is_active", label: "Active", type: "checkbox", help: "Show this project in the portfolio." },
	];

	const developerFields: FieldSpec[] = [
		{ name: "profile_id", label: "Profile ID", type: "text" },
		{ name: "company_name", label: "Company Name", type: "text" },
		{ name: "slug", label: "Slug", type: "text" },
		{ name: "logo_url", label: "Logo URL", type: "url" },
		{ name: "website_url", label: "Website URL", type: "url" },
		{ name: "description", label: "Description", type: "textarea", rows: 5 },
		{ name: "contact_email", label: "Contact Email", type: "email" },
		{ name: "contact_phone", label: "Contact Phone", type: "text" },
		{ name: "is_active", label: "Active", type: "checkbox" },
	];

	const agentFields: FieldSpec[] = [
		{ name: "profile_id", label: "Profile ID", type: "text" },
		{ name: "license_number", label: "License Number", type: "text" },
		{ name: "specialization", label: "Specialization", type: "text" },
		{ name: "bio", label: "Bio", type: "textarea", rows: 5 },
		{ name: "photo_url", label: "Photo URL", type: "url" },
		{ name: "facebook_url", label: "Facebook URL", type: "url" },
		{ name: "instagram_url", label: "Instagram URL", type: "url" },
		{ name: "twitter_url", label: "Twitter URL", type: "url" },
		{ name: "linkedin_url", label: "LinkedIn URL", type: "url" },
		{ name: "is_top_agent", label: "Top Agent", type: "checkbox" },
	];

	const cmsPageFields: FieldSpec[] = [
		{ name: "slug", label: "Slug", type: "text" },
		{ name: "title", label: "Title", type: "text" },
		{ name: "content_html", label: "Content HTML", type: "textarea", rows: 10, help: "Paste raw HTML or simple text content." },
		{ name: "meta_title", label: "Meta Title", type: "text" },
		{ name: "meta_description", label: "Meta Description", type: "textarea", rows: 3 },
		{ name: "is_published", label: "Published", type: "checkbox" },
		{ name: "published_at", label: "Published At", type: "datetime-local" },
	];

	const galleryFields: FieldSpec[] = [
		{ name: "section", label: "Section", type: "select", options: gallerySectionOptions },
		{ name: "title", label: "Title", type: "text" },
		{ name: "description", label: "Description", type: "textarea", rows: 4 },
		{ name: "image_url", label: "Image URL", type: "url" },
		{ name: "link_url", label: "Link URL", type: "url" },
		{ name: "sort_order", label: "Sort Order", type: "number" },
		{ name: "is_published", label: "Published", type: "checkbox" },
	];

	const testimonialFields: FieldSpec[] = [
		{ name: "author_name", label: "Author Name", type: "text" },
		{ name: "author_title", label: "Author Title", type: "text" },
		{ name: "avatar_url", label: "Avatar URL", type: "url" },
		{ name: "quote", label: "Quote", type: "textarea", rows: 5 },
		{ name: "rating", label: "Rating", type: "number" },
		{ name: "is_published", label: "Published", type: "checkbox" },
		{ name: "sort_order", label: "Sort Order", type: "number" },
	];

	const heroBannerFields: FieldSpec[] = [
		{ name: "headline", label: "Headline", type: "text" },
		{ name: "subheadline", label: "Subheadline", type: "textarea", rows: 3 },
		{ name: "cta_label", label: "CTA Label", type: "text" },
		{ name: "cta_url", label: "CTA URL", type: "url" },
		{ name: "image_url", label: "Image URL", type: "url" },
		{ name: "linked_property", label: "Linked Property ID", type: "text" },
		{ name: "sort_order", label: "Sort Order", type: "number" },
		{ name: "is_active", label: "Active", type: "checkbox" },
	];

	const partnerLogoFields: FieldSpec[] = [
		{ name: "name", label: "Name", type: "text" },
		{ name: "logo_url", label: "Logo URL", type: "url" },
		{ name: "website_url", label: "Website URL", type: "url" },
		{ name: "sort_order", label: "Sort Order", type: "number" },
		{ name: "is_active", label: "Active", type: "checkbox" },
	];

	const siteStatFields: FieldSpec[] = [
		{ name: "key", label: "Key", type: "text" },
		{ name: "label", label: "Label", type: "text" },
		{ name: "value", label: "Value", type: "number" },
		{ name: "suffix", label: "Suffix", type: "text" },
		{ name: "sort_order", label: "Sort Order", type: "number" },
	];

	const settingFields: FieldSpec[] = [
		{ name: "key", label: "Key", type: "text" },
		{ name: "value", label: "Value", type: "text" },
		{ name: "description", label: "Description", type: "textarea", rows: 3 },
	];

	if (loading) {
		return <main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-10 text-[#111111]"><div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">{message}</div></main>;
	}

	if (!sessionUser || !profile) {
		return (
			<main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-10 text-[#111111]">
				<div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
					<div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0E4B74]">Jewellz Realty CMS</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in required</h1>
					<p className="mt-2 text-sm leading-6 text-black/60">Use the login page to access the CMS. The dashboard honors Supabase Auth and role-based visibility from the profiles table.</p>
					<button onClick={() => router.push("/login")} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#0E4B74] px-5 text-sm font-medium text-white transition hover:bg-[#0b3d5c]">Go to login</button>
				</div>
			</main>
		);
	}

	if (role === "buyer") {
		return <main className="min-h-screen bg-white px-6 py-10 text-[#111111]"><div className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-zinc-50 p-8 text-sm text-black/60">Buyer accounts do not have CMS access.</div></main>;
	}

	return (
		<main className="min-h-screen bg-white text-[#111111]">
			<div className="grid min-h-screen w-full lg:grid-cols-[56px_180px_1fr]">
				<aside className="hidden border-r border-black/10 bg-white py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-md">
							<img src="/assets/logo-icon.png" alt="Jewellz Realty" className="h-8 w-8 object-contain" />
						</div>
						<div className="flex flex-col gap-2">
							{navGroups.map((group) => {
								const Icon = group.icon;
								const active = activePrimary === group.id;
								return (
									<button
										key={group.id}
										type="button"
										onClick={() => {
											setActivePrimary(group.id);
											setActiveSection(group.items[0].id);
										}}
										className={`flex h-10 w-10 items-center justify-center rounded-md transition ${active ? "bg-zinc-100 text-[#111111]" : "text-black/60 hover:bg-zinc-100 hover:text-[#111111]"}`}
										title={group.label}
									>
										<Icon className="h-4 w-4" />
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<button onClick={() => void reloadWorkspace()} className="flex h-10 w-10 items-center justify-center rounded-md text-black/60 transition hover:bg-zinc-100 hover:text-[#111111]" title="Refresh">
							<RefreshCw className="h-4 w-4" />
						</button>
						<button onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex h-10 w-10 items-center justify-center rounded-md text-black/60 transition hover:bg-zinc-100 hover:text-[#111111]" title="Sign out">
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</aside>

				<aside className="border-b border-black/10 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
					<div className="border-b border-black/10 px-4 py-5">
						<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">Jewellz Realty</div>
						<p className="mt-2 truncate text-xs text-black/45">{profile.full_name}</p>
					</div>

					<nav className="max-h-[calc(100vh-178px)] overflow-auto py-4">
						<div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/40">{activeNavGroup?.label ?? "Dashboard"}</div>
						<div className="space-y-0">
							{activeSidebarItems.map((item) => {
								const ItemIcon = item.icon;
								const active = activeSection === item.id;
								return (
									<div key={item.id}>
										<button
											type="button"
											onClick={() => setActiveSection(item.id)}
											className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-left transition ${active ? "border-[#111111] bg-zinc-50 text-[#111111]" : "border-transparent text-black/65 hover:bg-zinc-50 hover:text-[#111111]"}`}
										>
											<ItemIcon className="h-4 w-4 shrink-0" />
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-medium">{item.label}</span>
												<span className="block truncate text-xs text-black/40">{item.id === "properties" ? selectedCategoryLabel : item.hint}</span>
											</span>
										</button>
										{activePrimary === "listings" && item.id === "properties" ? (
											<div className="border-l-2 border-transparent py-1 pl-8 pr-2">
												<button
													type="button"
													onClick={() => {
														setActiveSection("properties");
														setPropertyCategoryFilter("all");
														setSelection((current) => ({ ...current, properties: null }));
													}}
													className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${propertyCategoryFilter === "all" ? "bg-zinc-100 font-medium text-[#111111]" : "text-black/50 hover:bg-zinc-50 hover:text-[#111111]"}`}
												>
													All Categories
												</button>
												{propertySidebarCategoryOptions.map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() => {
															setActiveSection("properties");
															setPropertyCategoryFilter(option.value);
															setSelection((current) => ({ ...current, properties: null }));
														}}
														className={`mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs transition ${propertyCategoryFilter === option.value ? "bg-zinc-100 font-medium text-[#111111]" : "text-black/50 hover:bg-zinc-50 hover:text-[#111111]"}`}
													>
														{option.label}
													</button>
												))}
											</div>
										) : null}
									</div>
								);
							})}
						</div>
					</nav>

					<div className="border-t border-black/10 px-5 py-4">
						<div className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-black/55">
							<div>{message}</div>
							{saving ? <div className="font-medium text-[#0E4B74]">Saving...</div> : null}
						</div>
						<div className="mt-3 flex gap-2 lg:hidden">
							<button onClick={() => void reloadWorkspace()} className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium">Refresh</button>
							<button onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex-1 rounded-xl bg-[#111111] px-3 py-2 text-sm font-medium text-white">Sign out</button>
						</div>
					</div>
				</aside>

				<section className="flex min-w-0 flex-col bg-white">
					<header className="sticky top-0 z-20 flex h-12 items-center border-b border-black/10 bg-white px-5">
						<div className="ml-auto hidden h-8 w-full max-w-xs items-center gap-2 rounded-md border border-black/10 bg-zinc-50 px-3 text-sm text-black/35 md:flex">
							<Search className="h-4 w-4" />
							<span>Search dashboard...</span>
						</div>
						<div className="ml-6 flex items-center gap-2 text-black/60">
							<button type="button" className="rounded-md p-1.5 transition hover:bg-zinc-100" title="Notifications">
								<Bell className="h-4 w-4" />
							</button>
							<button type="button" className="rounded-md p-1.5 transition hover:bg-zinc-100" title={profile.email ?? profile.full_name}>
								<UserCircle className="h-5 w-5" />
							</button>
						</div>
					</header>

					<div className="flex-1 overflow-auto bg-white px-4 py-5 sm:px-6 lg:px-8">
						<div className="mx-auto flex max-w-6xl flex-col gap-5">
							<div className="flex items-center justify-between">
								<div className="text-base font-medium text-[#111111]">
									{activeNavGroup?.label ?? "Dashboard"} / <strong>{activeNavItem?.label ?? "Overview"}</strong>{activeSection === "properties" && propertyCategoryFilter !== "all" ? <> / <strong>{selectedCategoryLabel}</strong></> : null}
								</div>
								<button onClick={() => void reloadWorkspace()} className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
									<RefreshCw className="h-3.5 w-3.5" />
									Refresh
								</button>
							</div>

						{activeSection === "overview" ? (
							<>
								<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
									<InfoCard label="Properties" value={stats.propertyCount} hint={isAdmin ? "All properties" : "Visible to your role"} />
									<InfoCard label="Inquiries" value={stats.inquiryCount} hint={isAdmin ? "Full lead queue" : "Assigned or permitted leads"} />
									<InfoCard label="Published" value={stats.publishedCount} hint="Published listings in the visible set" />
									<InfoCard label="Closed Leads" value={stats.closedCount} hint="Reserved or closed_won" />
								</div>
								<SectionShell title="Quick Start" description="Use the sidebar to manage one CMS area at a time. This keeps the admin workspace simple while preserving the full CRUD tools.">
									<div className="grid gap-3 md:grid-cols-3">
										<div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60"><span className="font-medium text-[#111111]">Properties</span><br />Create listings and manage galleries.</div>
										<div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60"><span className="font-medium text-[#111111]">Inquiries</span><br />Assign agents and update lead status.</div>
										<div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/60"><span className="font-medium text-[#111111]">Analytics</span><br />Review live and materialized dashboard data.</div>
									</div>
								</SectionShell>
							</>
						) : null}

						{activeSection === "properties" ? (
							canEditCatalog ? (
								propertyCategoryFilter === "all" ? (
									<EntityEditor
										title="Properties"
										description="Full CRUD for adding and maintaining property records."
										rows={workspace.properties}
										selectedId={selection.properties}
										fields={propertyFields}
										defaultValues={{ status: "draft", badge: "none" }}
										canEdit={canEditCatalog}
										rowLabel={labelForRow}
										rowMeta={(row) => `${row.city ?? ""} ${row.province ?? ""} • ${row.status ?? "draft"}`}
										onSelect={(row) => setSelection((current) => ({ ...current, properties: row ? asText(row.id) : null }))}
										onCreateNew={() => setSelection((current) => ({ ...current, properties: null }))}
										onDelete={(row) => deleteEntity("properties", row)}
										onSubmit={saveProperty}
										extra={<PropertyImagesManager propertyId={selectedProperty?.id ?? null} canEdit={canEditCatalog} onChanged={reloadWorkspace} />}
									/>
								) : (
									<SectionShell title={`${selectedCategoryLabel} Properties`} description={`Showing only listings categorized as ${selectedCategoryLabel}. Use Listings / Properties to add or edit property records.`}>
										<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
											<table className="w-full border-collapse text-sm">
												<thead>
													<tr className="border-b border-black/10 text-left text-[11px] uppercase tracking-[0.08em] text-black/45">
														<th className="px-4 py-3 font-medium">Title</th>
														<th className="px-4 py-3 font-medium">City</th>
														<th className="px-4 py-3 font-medium">Price</th>
														<th className="px-4 py-3 font-medium">Status</th>
													</tr>
												</thead>
												<tbody>
													{visibleProperties.length === 0 ? (
														<tr><td colSpan={4} className="px-4 py-5 text-sm text-black/45">No properties found in this category.</td></tr>
													) : null}
													{visibleProperties.map((property) => (
														<tr key={property.id} className="border-b border-black/10 last:border-b-0 hover:bg-zinc-50">
															<td className="px-4 py-3 font-medium text-[#111111]">{property.title}</td>
															<td className="px-4 py-3 text-black/60">{property.city ?? "n/a"}</td>
															<td className="px-4 py-3 text-black/60">{property.price == null ? "n/a" : `₱${Number(property.price).toLocaleString()}`}</td>
															<td className="px-4 py-3 text-black/60">{property.status ?? "draft"}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</SectionShell>
								)
							) : (
								<SectionShell title="Properties" description="Read-only property list for the current role.">
									<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
										{visibleProperties.map((row) => <div key={row.id} className="rounded-2xl border border-black/10 bg-zinc-50 p-4"><div className="font-medium text-[#111111]">{row.title}</div><div className="mt-1 text-sm text-black/55">{row.city ?? ""} {row.province ?? ""}</div></div>)}
									</div>
								</SectionShell>
							)
						) : null}

						{activeSection === "projects" && isAdmin ? (
							<EntityEditor title="Projects" description="Developer project portfolios." rows={workspace.projects} selectedId={selection.projects} fields={projectFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.location_city ?? ""} ${row.location_province ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, projects: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, projects: null }))} onDelete={(row) => deleteEntity("projects", row)} onSubmit={saveProject} />
						) : null}

						{activeSection === "agents" && isAdmin ? (
							<EntityEditor title="Agents" description="Profile info, social links, and top-agent flags." rows={workspace.agents} selectedId={selection.agents} fields={agentFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.license_number ?? "no license"}${row.is_top_agent ? " • top agent" : ""}`} onSelect={(row) => setSelection((current) => ({ ...current, agents: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, agents: null }))} onDelete={(row) => deleteEntity("agents", row)} onSubmit={saveAgent} />
						) : null}

						{activeSection === "developers" && isAdmin ? (
							<EntityEditor title="Developer Partners" description="Company profile CRUD for developer partners." rows={workspace.developers} selectedId={selection.developers} fields={developerFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => row.contact_email ?? row.website_url ?? row.slug} onSelect={(row) => setSelection((current) => ({ ...current, developers: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, developers: null }))} onDelete={(row) => deleteEntity("developer_partners", row)} onSubmit={saveDeveloper} />
						) : null}

						{activeSection === "profiles" && isAdmin ? (
							<SectionShell title="Profiles & Buyers" description="Buyer profile browsing can be added here when you want user-management CRUD in the CMS.">
								<div className="text-sm text-black/55">This section is reserved for profile and buyer account management.</div>
							</SectionShell>
						) : null}

						{activeSection === "inquiries" || activeSection === "pipeline" || activeSection === "timeline" ? (
							<InquiryPanel inquiries={workspace.inquiries} agents={workspace.agents} currentRole={role} currentUserId={sessionUser.id} selectedId={selection.inquiries} onSelect={(id) => setSelection((current) => ({ ...current, inquiries: id }))} onReload={reloadWorkspace} canEdit={canEditInquiries} canReassign={canReassignInquiries} />
						) : null}

						{activeSection === "pages" && isAdmin ? (
							<EntityEditor title="CMS Pages" description="Static and semi-static content pages." rows={workspace.cmsPages} selectedId={selection.cmsPages} fields={cmsPageFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => row.slug ?? row.meta_title ?? "cms"} onSelect={(row) => setSelection((current) => ({ ...current, cmsPages: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, cmsPages: null }))} onDelete={(row) => deleteEntity("cms_pages", row)} onSubmit={saveCmsPage} />
						) : null}

						{activeSection === "gallery" && isAdmin ? (
							<EntityEditor title="Gallery Items" description="Browse Gallery tiles for achievements, events, trainings, service, and general content." rows={workspace.galleryItems} selectedId={selection.galleryItems} fields={galleryFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.section ?? "general"} • ${row.sort_order ?? 0}`} onSelect={(row) => setSelection((current) => ({ ...current, galleryItems: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, galleryItems: null }))} onDelete={(row) => deleteEntity("gallery_items", row)} onSubmit={saveGalleryItem} />
						) : null}

						{activeSection === "testimonials" && isAdmin ? (
							<EntityEditor title="Testimonials" description="Homepage testimonials carousel content." rows={workspace.testimonials} selectedId={selection.testimonials} fields={testimonialFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.author_title ?? ""} • ${row.rating ?? "n/a"} stars`} onSelect={(row) => setSelection((current) => ({ ...current, testimonials: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, testimonials: null }))} onDelete={(row) => deleteEntity("testimonials", row)} onSubmit={saveTestimonial} />
						) : null}

						{activeSection === "hero" && isAdmin ? (
							<EntityEditor title="Hero Banners" description="Rotating hero slides for the public landing page." rows={workspace.heroBanners} selectedId={selection.heroBanners} fields={heroBannerFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, heroBanners: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, heroBanners: null }))} onDelete={(row) => deleteEntity("hero_banners", row)} onSubmit={saveHeroBanner} />
						) : null}

						{activeSection === "logos" && isAdmin ? (
							<EntityEditor title="Partner Logos" description="Homepage logo strip for developer partners." rows={workspace.partnerLogos} selectedId={selection.partnerLogos} fields={partnerLogoFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, partnerLogos: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, partnerLogos: null }))} onDelete={(row) => deleteEntity("partner_logos", row)} onSubmit={savePartnerLogo} />
						) : null}

						{activeSection === "stats" && isAdmin ? (
							<EntityEditor title="Site Stats" description="Key-value counters shown in the homepage stat strip." rows={workspace.siteStats} selectedId={selection.siteStats} idKey="key" fields={siteStatFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.value ?? 0}${row.suffix ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, siteStats: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, siteStats: null }))} onDelete={(row) => deleteEntity("site_stats", row, "key")} onSubmit={saveSiteStat} />
						) : null}

						{activeSection === "settings" && isAdmin ? (
							<EntityEditor title="System Settings" description="Key-value configuration editor for platform behavior." rows={workspace.settings} selectedId={selection.settings} idKey="key" fields={settingFields} canEdit={canEditSettings} rowLabel={labelForRow} rowMeta={(row) => row.description ?? row.value} onSelect={(row) => setSelection((current) => ({ ...current, settings: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, settings: null }))} onDelete={(row) => deleteEntity("system_settings", row, "key")} onSubmit={saveSetting} />
						) : null}

						{(activeSection === "analytics" || activeSection === "traffic" || activeSection === "agentPerformance" || activeSection === "developerPortfolio") && isAdmin ? (
							<AnalyticsPanel isAdmin={isAdmin} properties={workspace.properties} inquiries={workspace.inquiries} recommendations={workspace.recommendations} listingPerformance={workspace.listingPerformance} dailyInquiryVolume={workspace.dailyInquiryVolume} trafficSources={workspace.trafficSources} agentPerformance={workspace.agentPerformance} developerPortfolio={workspace.developerPortfolio} />
						) : null}

						{activeSection === "activityLogs" && isAdmin ? (
							<SectionShell title="Activity Logs" description="Audit trail browsing can be connected to the activity_logs table here.">
								<div className="text-sm text-black/55">This section is reserved for activity log review.</div>
							</SectionShell>
						) : null}
					</div>
					</div>
				</section>
			</div>
		</main>
	);
}
