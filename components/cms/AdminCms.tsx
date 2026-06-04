"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Building2, FileText, FolderTree, Home, LayoutDashboard, LogOut, MessageSquare, RefreshCw, Search, Settings, UserCircle, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PropertyDetailContent } from "@/components/properties/PropertyDetailContent";
import type { NearbyPlaceGroup } from "@/lib/nearby-places";
import type { Property } from "@/types/property";
import { EntityEditor, InfoCard, SectionShell } from "./blocks";
import { agentFields, cmsPageFields, developerFields, emptySelection, emptyWorkspace, galleryFields, heroBannerFields, inquiryStatusOptions, partnerLogoFields, priorityOptions, projectFields, propertyCategoryOptions, propertyFields, propertySidebarCategoryOptions, settingFields, siteStatFields, testimonialFields } from "./constants";
import type { CmsNavGroup, CmsPayload, CmsPrimary, CmsRow, CmsSection, FieldOption, FieldSpec, Role, SelectionState, Workspace } from "./types";
import { asText, labelForRow } from "./utils";

function asRole(value: unknown): Role {
	return value === "admin" || value === "agent" || value === "developer_partner" || value === "buyer" ? value : null;
}

function optionalId(row: CmsRow | undefined) {
	return row?.id == null ? null : asText(row.id);
}

function optionFromRow(row: CmsRow, label: string, fallback = "Unnamed record", meta?: Record<string, string>): FieldOption {
	return {
		label: label.trim() || fallback,
		value: asText(row.id),
		meta,
	};
}

function displayCategory(value: unknown) {
	return asText(value)
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ") || "Property";
}

function toNumberValue(value: unknown) {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : undefined;
}

const NEW_RECORD_ID = "__new__";

function PropertyPublicPreview({ payload, currentRow, imageUrls }: { payload: CmsPayload; currentRow: CmsRow | null; imageUrls: string[] }) {
	const title = asText(payload.title || currentRow?.title || "Untitled Property");
	const type = displayCategory(payload.category || currentRow?.category);
	const location = [payload.city, payload.province].filter(Boolean).join(", ") || [currentRow?.city, currentRow?.province].filter(Boolean).join(", ") || "Location not specified";
	const description = asText(payload.description || currentRow?.description || "Add a clear buyer-friendly description so visitors understand what makes this property worth viewing.");
	const image = asText(currentRow?.cover_image_url).trim() || undefined;
	const price = Number(payload.price || currentRow?.price || 0);
	const latitude = toNumberValue(payload.latitude || currentRow?.latitude);
	const longitude = toNumberValue(payload.longitude || currentRow?.longitude);
	const galleryImages = imageUrls.length ? imageUrls : image ? [image] : [];
	const property: Property = {
		id: asText(currentRow?.id || "preview-property"),
		slug: asText(payload.slug || currentRow?.slug || "preview-property"),
		title,
		price: Number.isFinite(price) ? price : 0,
		description,
		location,
		coordinates: latitude != null && longitude != null ? [latitude, longitude] : undefined,
		image: galleryImages[0],
		images: galleryImages.length ? galleryImages : undefined,
		beds: Number(payload.bedrooms || currentRow?.bedrooms || 0),
		baths: Number(payload.bathrooms || currentRow?.bathrooms || 0),
		areaSqm: Number(payload.floor_area_sqm || payload.lot_area_sqm || currentRow?.floor_area_sqm || currentRow?.lot_area_sqm || 0),
		type,
		category: payload.status === "published" || currentRow?.status === "published" ? "For Sale" : displayCategory(payload.status || currentRow?.status || "Draft"),
		specs: [
			{ label: "Lot Area", value: payload.lot_area_sqm || currentRow?.lot_area_sqm ? `${payload.lot_area_sqm || currentRow?.lot_area_sqm} sqm` : "N/A" },
			{ label: "Levels", value: asText(payload.floor_count || currentRow?.floor_count || "N/A") },
			{ label: "Garage", value: asText(payload.parking_slots || currentRow?.parking_slots || "0") },
		],
	};

	const fallbackRelatedProperties: Property[] = [
		{ ...property, id: `${property.id}-preview-1`, slug: `${property.slug}-preview-1` },
		{ ...property, id: `${property.id}-preview-2`, slug: `${property.slug}-preview-2`, title: `Similar ${type}` },
		{ ...property, id: `${property.id}-preview-3`, slug: `${property.slug}-preview-3`, title: `Nearby ${type}` },
	];

	const nearbyGroups: NearbyPlaceGroup[] = [
		{ category: "Education", places: [] },
		{ category: "Health", places: [] },
		{ category: "Food", places: [] },
		{ category: "Culture", places: [] },
	];

	return (
		<PropertyDetailContent
			property={property}
			galleryImages={property.images ?? []}
			nearbyGroups={nearbyGroups}
			relatedProperties={fallbackRelatedProperties}
			backHref="#"
			developerName={asText(currentRow?.developer_id) || "Jewellz Realty"}
			previewMode
		/>
	);
}

type AdminCmsProps = {
	initialPrimary?: CmsPrimary;
	initialSection?: CmsSection;
	initialPropertyCategory?: string;
	initialPropertyId?: string | null;
};

type DestructiveAction = {
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => Promise<void>;
};

function routeForPrimary(primary: CmsPrimary) {
	const routes: Record<CmsPrimary, string> = {
		dashboard: "/admin",
		listings: "/admin/listings",
		inquiries: "/admin/inquiries",
		analytics: "/admin?section=analytics",
		people: "/admin/agents",
		content: "/admin?section=hero",
		settings: "/admin/settings",
	};

	return routes[primary];
}

function routeForSection(section: CmsSection) {
	const routes: Partial<Record<CmsSection, string>> = {
		overview: "/admin",
		properties: "/admin/listings",
		projects: "/admin/listings?section=projects",
		inquiries: "/admin/inquiries",
		pipeline: "/admin/inquiries?section=pipeline",
		timeline: "/admin/inquiries?section=timeline",
		analytics: "/admin?section=analytics",
		traffic: "/admin?section=traffic",
		agentPerformance: "/admin?section=agentPerformance",
		developerPortfolio: "/admin?section=developerPortfolio",
		agents: "/admin/agents",
		developers: "/admin/agents?section=developers",
		profiles: "/admin/agents?section=profiles",
		hero: "/admin?section=hero",
		gallery: "/admin?section=gallery",
		testimonials: "/admin?section=testimonials",
		logos: "/admin?section=logos",
		stats: "/admin?section=stats",
		pages: "/admin?section=pages",
		settings: "/admin/settings",
		activityLogs: "/admin/settings?section=activityLogs",
	};

	return routes[section] ?? "/admin";
}

const PROPERTY_IMAGE_BUCKET = "property-images";

function sanitizeFileName(fileName: string) {
	return fileName
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function storagePathFromPublicUrl(url: string) {
	const marker = `/storage/v1/object/public/${PROPERTY_IMAGE_BUCKET}/`;
	const markerIndex = url.indexOf(marker);
	return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : null;
}

function PropertyImagesManager({ propertyId, canEdit, onChanged, onRequestDelete }: { propertyId: string | null; canEdit: boolean; onChanged: () => Promise<void> | void; onRequestDelete: (action: DestructiveAction) => void }) {
	const [images, setImages] = useState<CmsRow[]>([]);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [uploadMessage, setUploadMessage] = useState("");
	const [saving, setSaving] = useState(false);

	async function loadImages() {
		if (!propertyId) {
			setImages([]);
			return;
		}

		const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
		setImages(data ?? []);
	}

	function handleFilesChange(event: ChangeEvent<HTMLInputElement>) {
		setSelectedFiles(Array.from(event.target.files ?? []));
		setUploadMessage("");
	}

	async function uploadSelectedImages() {
		if (!propertyId || selectedFiles.length === 0) return;

		setSaving(true);
		setUploadMessage(`Uploading ${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"}...`);

		const nextRows = [];
		const existingCover = images.some((image) => Boolean(image.is_cover));

		for (const [index, file] of selectedFiles.entries()) {
			const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
			const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "property-image";
			const filePath = `${propertyId}/${Date.now()}-${index}-${baseName}.${extension}`;

			const { error: uploadError } = await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).upload(filePath, file, {
				cacheControl: "3600",
				upsert: false,
			});

			if (uploadError) {
				setUploadMessage(`Upload failed: ${uploadError.message}. Check that the "${PROPERTY_IMAGE_BUCKET}" storage bucket exists and allows CMS uploads.`);
				setSaving(false);
				return;
			}

			const { data: publicUrlData } = supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).getPublicUrl(filePath);
			const publicUrl = publicUrlData.publicUrl;
			const isCover = !existingCover && index === 0 && images.length === 0;

			nextRows.push({
				property_id: propertyId,
				storage_url: publicUrl,
				caption: file.name.replace(/\.[^.]+$/, ""),
				sort_order: images.length + index,
				is_cover: isCover,
			});
		}

		if (nextRows.length) {
			const { error: insertError } = await supabaseBrowser.from("property_images").insert(nextRows);
			if (insertError) {
				setUploadMessage(insertError.message);
				setSaving(false);
				return;
			}

			const coverRow = nextRows.find((row) => row.is_cover);
			if (coverRow) {
				await supabaseBrowser.from("properties").update({ cover_image_url: coverRow.storage_url }).eq("id", propertyId);
			}
		}

		await loadImages();
		await onChanged();
		setSelectedFiles([]);
		setUploadMessage(`Uploaded ${nextRows.length} image${nextRows.length === 1 ? "" : "s"}.`);
		setSaving(false);
	}

	useEffect(() => {
		let active = true;

		void (async () => {
			await Promise.resolve();
			if (!propertyId) {
				if (active) setImages([]);
				return;
			}

			const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
			if (active) setImages(data ?? []);
		})();

		return () => {
			active = false;
		};
	}, [propertyId]);

	async function deleteImage(id: string) {
		const image = images.find((item) => asText(item.id) === id);
		onRequestDelete({
			title: "Delete this property photo?",
			description: `This will permanently delete ${asText(image?.caption || image?.storage_url || "this image")} from the listing gallery.`,
			confirmLabel: "Verify password and delete photo",
			onConfirm: async () => {
				await supabaseBrowser.from("property_images").delete().eq("id", id);
				const storagePath = storagePathFromPublicUrl(asText(image?.storage_url));
				if (storagePath) {
					await supabaseBrowser.storage.from(PROPERTY_IMAGE_BUCKET).remove([storagePath]);
				}
				await loadImages();
				await onChanged();
			},
		});
	}

	async function setCoverImage(image: CmsRow) {
		if (!propertyId) return;
		setSaving(true);
		await supabaseBrowser.from("property_images").update({ is_cover: false }).eq("property_id", propertyId);
		await supabaseBrowser.from("property_images").update({ is_cover: true }).eq("id", image.id);
		await supabaseBrowser.from("properties").update({ cover_image_url: image.storage_url }).eq("id", propertyId);
		await loadImages();
		await onChanged();
		setSaving(false);
	}

	if (!propertyId) {
		return (
			<div className="rounded-lg border border-dashed border-black/15 bg-zinc-50 px-4 py-5">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Photo Uploads</div>
				<p className="mt-1 text-sm text-black/55">Save the property details first, then upload as many photos as you need. This keeps each photo attached to the correct property.</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Photo Uploads</div>
					<div className="mt-1 text-sm text-black/60">Choose one or more photos, then upload them in one action. The first uploaded photo becomes the cover if no cover exists yet.</div>
				</div>
				<div className="text-xs text-black/45">{images.length} images</div>
			</div>

			<div className="mt-4 rounded-xl border border-dashed border-black/15 bg-white p-4">
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Upload Photos</div>
					<input type="file" accept="image/*" multiple disabled={!canEdit || saving} onChange={handleFilesChange} className="mt-2 block w-full text-sm text-black/60 file:mr-4 file:rounded-md file:border-0 file:bg-red-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60" />
				</label>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs text-black/45">{selectedFiles.length ? `${selectedFiles.length} selected: ${selectedFiles.map((file) => file.name).join(", ")}` : "Choose one or more JPG, PNG, or WebP images."}</p>
					<button type="button" onClick={uploadSelectedImages} disabled={!canEdit || saving || selectedFiles.length === 0} className="inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20">
						{saving ? "Uploading..." : "Upload photos"}
					</button>
				</div>
				{uploadMessage ? <p className="mt-2 text-xs text-black/55">{uploadMessage}</p> : null}
			</div>

			<div className="mt-4 grid gap-2 md:grid-cols-2">
				{images.map((image) => (
					<div key={asText(image.id)} className="rounded-2xl border border-black/10 bg-white p-3">
						{image.storage_url ? <img src={asText(image.storage_url)} alt={asText(image.caption || "Property image")} className="mb-3 h-36 w-full rounded-xl object-cover" /> : null}
						<div className="truncate text-sm font-medium text-[#111111]">{image.caption || image.storage_url}</div>
						<div className="mt-1 text-xs text-black/45">{image.storage_url}</div>
						<div className="mt-3 flex items-center justify-between gap-2 text-xs text-black/55">
							<span>Sort order: {image.sort_order}</span>
							<span>{image.is_cover ? "Cover" : "Secondary"}</span>
						</div>
						{canEdit ? (
							<div className="mt-3 flex flex-wrap gap-2">
								<button type="button" onClick={() => setCoverImage(image)} disabled={saving || Boolean(image.is_cover)} className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/65 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50">Set cover</button>
								<button type="button" onClick={() => deleteImage(asText(image.id))} className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50">Delete</button>
							</div>
						) : null}
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
	inquiries: CmsRow[];
	agents: CmsRow[];
	currentRole: Role;
	currentUserId: string | null;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onReload: () => Promise<void>;
	canEdit: boolean;
	canReassign: boolean;
}) {
	const [timeline, setTimeline] = useState<CmsRow[]>([]);
	const [draft, setDraft] = useState({ inquiryId: "", status: "new", assignedAgentId: "", note: "" });
	const [saving, setSaving] = useState(false);

	const selectedInquiry = inquiries.find((item) => asText(item.id) === asText(selectedId)) ?? null;
	const selectedInquiryId = asText(selectedInquiry?.id);
	const status = draft.inquiryId === selectedInquiryId ? draft.status : asText(selectedInquiry?.status || "new");
	const assignedAgentId = draft.inquiryId === selectedInquiryId ? draft.assignedAgentId : asText(selectedInquiry?.assigned_agent_id);
	const note = draft.inquiryId === selectedInquiryId ? draft.note : "";
	const updateDraft = (updates: Partial<typeof draft>) => setDraft((current) => ({ ...current, inquiryId: selectedInquiryId, ...updates }));

	useEffect(() => {
		let active = true;

		void (async () => {
			if (!selectedInquiry) {
				await Promise.resolve();
				if (active) setTimeline([]);
				return;
			}

			const { data } = await supabaseBrowser.from("inquiry_timeline").select("*").eq("inquiry_id", selectedInquiry.id).order("created_at", { ascending: false });
			if (active) setTimeline(data ?? []);
		})();

		return () => {
			active = false;
		};
	}, [selectedInquiry, selectedInquiryId]);

	async function saveInquiry() {
		if (!selectedInquiry || !canEdit) return;

		setSaving(true);
		const now = new Date().toISOString();
		const updatePayload: CmsPayload = {
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
		updateDraft({ note: "" });
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
		updateDraft({ note: "" });
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
								<button key={asText(item.id)} type="button" onClick={() => onSelect(asText(item.id))} className={`w-full rounded-2xl border px-3 py-2 text-left transition ${active ? "border-red-200 bg-red-50 shadow-sm" : "border-transparent bg-white/60 hover:border-black/10 hover:bg-white"}`}>
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
											<select value={status} onChange={(event) => updateDraft({ status: event.target.value })} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												{inquiryStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Priority</div>
											<select value={asText(selectedInquiry.priority)} disabled className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												<option value="">Auto-derived</option>
												{priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Assigned Agent</div>
											<select value={assignedAgentId} onChange={(event) => updateDraft({ assignedAgentId: event.target.value })} disabled={!canReassign} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50">
												<option value="">Unassigned</option>
												{agents.map((agent) => <option key={asText(agent.id)} value={asText(agent.id)}>{agent.profile_id ?? agent.id}</option>)}
											</select>
										</label>
										<label className="block">
											<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Timeline Note</div>
											<textarea value={note} onChange={(event) => updateDraft({ note: event.target.value })} rows={4} disabled={!canEdit} className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none disabled:bg-zinc-50" placeholder="Add an internal note or next step..." />
										</label>
										<div className="flex flex-wrap gap-2">
											<button type="button" onClick={saveInquiry} disabled={!canEdit || saving} className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20">Save pipeline</button>
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
											<div key={asText(entry.id)} className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
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
	trafficSources,
	agentPerformance,
	developerPortfolio,
}: {
	isAdmin: boolean;
	properties: CmsRow[];
	inquiries: CmsRow[];
	recommendations: CmsRow[];
	listingPerformance: CmsRow[];
	trafficSources: CmsRow[];
	agentPerformance: CmsRow[];
	developerPortfolio: CmsRow[];
}) {
	const inquiryCounts = inquiries.reduce((acc: Record<string, number>, item) => {
		const status = asText(item.status || "unclassified");
		acc[status] = (acc[status] ?? 0) + 1;
		return acc;
	}, {});

	const priorityCounts = inquiries.reduce((acc: Record<string, number>, item) => {
		const priority = asText(item.priority || "unclassified");
		acc[priority] = (acc[priority] ?? 0) + 1;
		return acc;
	}, {});

	const averageResponseHours = (() => {
		const responseHours = inquiries
			.map((item) => {
				if (!item.first_contacted_at || !item.created_at) return null;
				return (new Date(asText(item.first_contacted_at)).getTime() - new Date(asText(item.created_at)).getTime()) / 36e5;
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
									<div className="h-2 rounded-full bg-red-700" style={{ width: `${Math.max(10, Math.min(100, count * 10))}%` }} />
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
										<tr key={asText(row.property_id)} className="border-t border-black/5">
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
								<div key={asText(row.source)} className="rounded-xl border border-black/10 bg-zinc-50 p-3 text-sm">
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
										<tr key={asText(row.agent_id)} className="border-t border-black/5">
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
										<tr key={asText(row.developer_id)} className="border-t border-black/5">
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

export default function AdminCms({
	initialPrimary = "dashboard",
	initialSection = "overview",
	initialPropertyCategory = "all",
	initialPropertyId = null,
}: AdminCmsProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("Loading workspace...");
	const [saving, setSaving] = useState(false);
	const [sessionUser, setSessionUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<CmsRow | null>(null);
	const [agentProfile, setAgentProfile] = useState<CmsRow | null>(null);
	const [developerProfile, setDeveloperProfile] = useState<CmsRow | null>(null);
	const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
	const [selectedPropertyImages, setSelectedPropertyImages] = useState<CmsRow[]>([]);
	const [destructiveAction, setDestructiveAction] = useState<DestructiveAction | null>(null);
	const [destructivePassword, setDestructivePassword] = useState("");
	const [destructiveMessage, setDestructiveMessage] = useState("");
	const [confirmingDestructiveAction, setConfirmingDestructiveAction] = useState(false);
	const [dashboardSearch, setDashboardSearch] = useState("");
	const [showNotifications, setShowNotifications] = useState(false);
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [selection, setSelection] = useState<SelectionState>({ ...emptySelection, properties: initialPropertyId });
	const [activePrimary, setActivePrimary] = useState<CmsPrimary>(initialPrimary);
	const [activeSection, setActiveSection] = useState<CmsSection>(initialSection);
	const [propertyCategoryFilter, setPropertyCategoryFilter] = useState(initialPropertyCategory);

	const role = asRole(profile?.role);
	const isAdmin = role === "admin";
	const isAgent = role === "agent";
	const isDeveloper = role === "developer_partner";
	const canEditCatalog = isAdmin;
	const canEditContent = isAdmin;
	const canEditSettings = isAdmin;
	const canEditInquiries = isAdmin || isAgent || isDeveloper;
	const canReassignInquiries = isAdmin;

	const selectedPropertyId = selection.properties === NEW_RECORD_ID ? NEW_RECORD_ID : selection.properties ?? optionalId(workspace.properties[0]);
	const selectedProjectId = selection.projects === NEW_RECORD_ID ? NEW_RECORD_ID : selection.projects ?? optionalId(workspace.projects[0]);
	const selectedDeveloperId = selection.developers === NEW_RECORD_ID ? NEW_RECORD_ID : selection.developers ?? optionalId(workspace.developers[0]);
	const selectedAgentId = selection.agents === NEW_RECORD_ID ? NEW_RECORD_ID : selection.agents ?? optionalId(workspace.agents[0]);
	const selectedInquiryId = selection.inquiries ?? optionalId(workspace.inquiries[0]);
	const selectedProperty = workspace.properties.find((row) => asText(row.id) === asText(selectedPropertyId)) ?? null;
	const selectedPropertyImageUrls = useMemo(
		() => selectedPropertyImages.map((image) => asText(image.storage_url).trim()).filter(Boolean),
		[selectedPropertyImages],
	);
	const dashboardSearchResults = useMemo(() => {
		const query = dashboardSearch.trim().toLowerCase();
		if (!query) return [];
		return [
			...workspace.properties.map((row) => ({ label: asText(row.title), meta: "Property", open: () => openPropertyForEditing(asText(row.id)) })),
			...workspace.projects.map((row) => ({ label: asText(row.project_name ?? row.slug), meta: "Project", open: () => { setActivePrimary("listings"); setActiveSection("projects"); setSelection((current) => ({ ...current, projects: asText(row.id) })); router.push("/admin/listings?section=projects"); } })),
			...workspace.inquiries.map((row) => ({ label: asText(row.buyer_name ?? row.buyer_email), meta: "Inquiry", open: () => { setActivePrimary("inquiries"); setActiveSection("inquiries"); setSelection((current) => ({ ...current, inquiries: asText(row.id) })); router.push("/admin/inquiries"); } })),
		].filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(query)).slice(0, 6);
	}, [dashboardSearch, router, workspace.inquiries, workspace.projects, workspace.properties]);

	function requestDestructiveAction(action: DestructiveAction) {
		setDestructiveAction(action);
		setDestructivePassword("");
		setDestructiveMessage("");
	}

	async function confirmDestructiveAction() {
		if (!destructiveAction) return;
		if (!sessionUser?.email) {
			setDestructiveMessage("Cannot verify password because the current user email is missing.");
			return;
		}
		if (!destructivePassword) {
			setDestructiveMessage("Enter your password to continue.");
			return;
		}

		setConfirmingDestructiveAction(true);
		setDestructiveMessage("Verifying password...");
		const { error } = await supabaseBrowser.auth.signInWithPassword({
			email: sessionUser.email,
			password: destructivePassword,
		});

		if (error) {
			setDestructiveMessage("Password verification failed. Nothing was deleted.");
			setConfirmingDestructiveAction(false);
			return;
		}

		setDestructiveMessage("Deleting...");
		await destructiveAction.onConfirm();
		setDestructiveAction(null);
		setDestructivePassword("");
		setDestructiveMessage("");
		setConfirmingDestructiveAction(false);
	}
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
	const currentSection = navItems.some((item) => item.id === activeSection) ? activeSection : "overview";
	const activeNavItem = navItems.find((item) => item.id === currentSection);
	const activeNavGroup = navGroups.find((group) => group.id === activePrimary) ?? navGroups[0];
	const activeSidebarItems = activeNavGroup?.items ?? [];
	const visibleProperties = useMemo(() => {
		if (propertyCategoryFilter === "all") {
			return workspace.properties;
		}

		return workspace.properties.filter((property) => property.category === propertyCategoryFilter);
	}, [propertyCategoryFilter, workspace.properties]);
	const selectedCategoryLabel = propertyCategoryFilter === "all" ? "All Categories" : (propertyCategoryOptions.find((option) => option.value === propertyCategoryFilter)?.label ?? "All Categories");
	const developerOptions = useMemo(
		() => workspace.developers.map((developer) => optionFromRow(developer, asText(developer.company_name ?? developer.slug), "Unnamed developer")),
		[workspace.developers],
	);
	const projectOptions = useMemo(
		() => workspace.projects.map((project) => optionFromRow(project, `${asText(project.project_name ?? project.slug)}${project.location_city ? ` · ${project.location_city}` : ""}`, "Unnamed project", { developer_id: asText(project.developer_id) })),
		[workspace.projects],
	);
	const agentOptions = useMemo(
		() => workspace.agents.map((agent) => optionFromRow(agent, `${asText(agent.license_number ?? agent.specialization ?? agent.profile_id)}${agent.is_top_agent ? " · Top agent" : ""}`, "Unnamed agent")),
		[workspace.agents],
	);
	const propertyEditorFields = useMemo<FieldSpec[]>(
		() => propertyFields.map((field) => {
			if (field.name === "developer_id") return { ...field, options: developerOptions };
			if (field.name === "project_id") return { ...field, options: projectOptions };
			if (field.name === "assigned_agent_id") return { ...field, options: agentOptions };
			return field;
		}),
		[agentOptions, developerOptions, projectOptions],
	);
	const projectEditorFields = useMemo<FieldSpec[]>(
		() => projectFields.map((field) => field.name === "developer_id" ? { ...field, options: developerOptions } : field),
		[developerOptions],
	);

	function openPrimary(group: CmsNavGroup) {
		setActivePrimary(group.id);
		setActiveSection(group.items[0].id);
		router.push(routeForPrimary(group.id));
	}

	function openSection(section: CmsSection) {
		setActiveSection(section);
		router.push(routeForSection(section));
	}

	function openPropertyCategory(category: string) {
		setActivePrimary("listings");
		setActiveSection("properties");
		setPropertyCategoryFilter(category);
		setSelection((current) => ({ ...current, properties: null }));
		router.push(category === "all" ? "/admin/listings" : `/admin/listings?category=${category}`);
	}

	function openPropertyForEditing(propertyId: string) {
		setActivePrimary("listings");
		setActiveSection("properties");
		setPropertyCategoryFilter("all");
		setSelection((current) => ({ ...current, properties: propertyId }));
		router.push("/admin/listings");
	}

	async function loadWorkspace(currentUser: User, currentProfile: CmsRow, currentAgent: CmsRow | null, currentDeveloper: CmsRow | null) {
		const agentId = currentAgent?.id ?? null;
		const developerId = currentDeveloper?.id ?? null;
		const activeRole = asRole(currentProfile?.role);
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
				profilesResult,
				activityLogsResult,
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
				supabaseBrowser.from("profiles").select("*").order("created_at", { ascending: false }),
				supabaseBrowser.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
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
			nextWorkspace.profiles = profilesResult.data ?? [];
			nextWorkspace.activityLogs = activityLogsResult.data ?? [];
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

	async function loadPropertyImages(propertyId: string | null) {
		if (!propertyId) {
			setSelectedPropertyImages([]);
			return;
		}

		const { data } = await supabaseBrowser.from("property_images").select("*").eq("property_id", propertyId).order("sort_order", { ascending: true });
		setSelectedPropertyImages(data ?? []);
	}

	useEffect(() => {
		if (!selectedPropertyId || selectedPropertyId === NEW_RECORD_ID) {
			setSelectedPropertyImages([]);
			return;
		}
		void loadPropertyImages(asText(selectedPropertyId));
	}, [selectedPropertyId]);

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
	}, []);

	const stats = useMemo(() => ({
		propertyCount: workspace.properties.length,
		inquiryCount: workspace.inquiries.length,
		projectCount: workspace.projects.length,
		developerCount: workspace.developers.length,
		agentCount: workspace.agents.length,
		publishedCount: workspace.properties.filter((item) => item.status === "published").length,
		closedCount: workspace.inquiries.filter((item) => ["reserved", "closed_won"].includes(asText(item.status))).length,
	}), [workspace.agents.length, workspace.developers.length, workspace.inquiries, workspace.properties, workspace.projects.length]);

	async function saveEntity(table: string, payload: CmsPayload, currentRow: CmsRow | null, idKey = "id") {
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

	async function deleteEntity(table: string, currentRow: CmsRow, idKey = "id") {
		if (!currentRow) return;
		requestDestructiveAction({
			title: `Delete ${labelForRow(currentRow)}?`,
			description: `This will permanently delete this record from ${table}. This action cannot be undone.`,
			confirmLabel: "Verify password and delete",
			onConfirm: async () => {
				setMessage(`Deleting from ${table}...`);
				setSaving(true);
				await supabaseBrowser.from(table).delete().eq(idKey, currentRow[idKey]);
				setSaving(false);
				await reloadWorkspace();
			},
		});
	}

	async function saveProperty(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.developer_id) {
			setMessage("Choose a Developer Partner first. If none exists, create one under People → Developer Partners.");
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

	async function saveProject(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.developer_id || !payload.project_name || !payload.slug) {
			setMessage("Projects need a Developer Partner, Project Name, and Slug.");
			return;
		}
		await saveEntity("projects", payload, currentRow);
	}

	async function saveDeveloper(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.company_name || !payload.slug) {
			setMessage("Developer partners need company_name and slug.");
			return;
		}
		await saveEntity("developer_partners", payload, currentRow);
	}

	async function saveAgent(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.profile_id) {
			setMessage("Agents need a profile_id linked to auth.users.");
			return;
		}
		await saveEntity("agents", payload, currentRow);
	}

	async function saveCmsPage(payload: CmsPayload, currentRow: CmsRow | null) {
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

	async function saveGalleryItem(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.section || !payload.title || !payload.image_url) {
			setMessage("Gallery items need section, title, and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("gallery_items", payload, currentRow);
	}

	async function saveTestimonial(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.author_name || !payload.quote) {
			setMessage("Testimonials need author_name and quote.");
			return;
		}
		await saveEntity("testimonials", payload, currentRow);
	}

	async function saveHeroBanner(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.headline || !payload.image_url) {
			setMessage("Hero banners need headline and image_url.");
			return;
		}
		if (sessionUser?.id && !currentRow) payload.created_by = sessionUser.id;
		await saveEntity("hero_banners", payload, currentRow);
	}

	async function savePartnerLogo(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.name || !payload.logo_url) {
			setMessage("Partner logos need name and logo_url.");
			return;
		}
		await saveEntity("partner_logos", payload, currentRow);
	}

	async function saveSiteStat(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.key || !payload.label) {
			setMessage("Site stats need key and label.");
			return;
		}
		await saveEntity("site_stats", payload, currentRow, "key");
	}

	async function saveSetting(payload: CmsPayload, currentRow: CmsRow | null) {
		if (!payload.key || payload.value == null) {
			setMessage("Settings need key and value.");
			return;
		}
		if (sessionUser?.id) payload.updated_by = sessionUser.id;
		await saveEntity("system_settings", payload, currentRow, "key");
	}

	if (loading) {
		return <main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-10 text-[#111111]"><div className="mx-auto max-w-6xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">{message}</div></main>;
	}

	if (!sessionUser || !profile) {
		return (
			<main className="min-h-screen bg-[linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-10 text-[#111111]">
				<div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-8 shadow-sm">
					<div className="text-xs font-semibold uppercase tracking-[0.24em] text-red-700">Jewellz Realty CMS</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in required</h1>
					<p className="mt-2 text-sm leading-6 text-black/60">Use the login page to access the CMS. The dashboard honors Supabase Auth and role-based visibility from the profiles table.</p>
					<button onClick={() => router.push("/login")} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-medium text-white transition hover:bg-red-800">Go to login</button>
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
							<Image src="/assets/logo-icon.png" alt="Jewellz Realty" width={32} height={32} className="h-8 w-8 object-contain" />
						</div>
						<div className="flex flex-col gap-2">
							{navGroups.map((group) => {
								const Icon = group.icon;
								const active = activePrimary === group.id;
								return (
									<button
										key={group.id}
										type="button"
										onClick={() => openPrimary(group)}
										className={`flex h-10 w-10 items-center justify-center rounded-md transition ${active ? "bg-red-50 text-red-700" : "text-black/60 hover:bg-red-50 hover:text-red-700"}`}
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
						<div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black">Jewellz Realty</div>
						<p className="mt-2 truncate text-xs text-black/45">{profile.full_name}</p>
					</div>

					<nav className="max-h-[calc(100vh-178px)] overflow-auto py-4">
						<div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/40">{activeNavGroup?.label ?? "Dashboard"}</div>
						<div className="space-y-0">
							{activeSidebarItems.map((item) => {
								const ItemIcon = item.icon;
								const active = currentSection === item.id;
								return (
									<div key={item.id}>
										<button
											type="button"
											onClick={() => openSection(item.id)}
											className={`flex w-full items-center gap-2 border-l-2 px-4 py-2 text-left transition ${active ? "border-red-700 bg-red-50 text-red-700" : "border-transparent text-black/65 hover:bg-red-50 hover:text-red-700"}`}
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
													onClick={() => openPropertyCategory("all")}
													className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${propertyCategoryFilter === "all" ? "bg-red-50 font-medium text-red-700" : "text-black/50 hover:bg-red-50 hover:text-red-700"}`}
												>
													All Categories
												</button>
												{propertySidebarCategoryOptions.map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() => openPropertyCategory(option.value)}
														className={`mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs transition ${propertyCategoryFilter === option.value ? "bg-red-50 font-medium text-red-700" : "text-black/50 hover:bg-red-50 hover:text-red-700"}`}
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
							{saving ? <div className="font-medium text-red-700">Saving...</div> : null}
						</div>
						<div className="mt-3 flex gap-2 lg:hidden">
							<button onClick={() => void reloadWorkspace()} className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium">Refresh</button>
							<button onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex-1 rounded-xl bg-[#111111] px-3 py-2 text-sm font-medium text-white">Sign out</button>
						</div>
					</div>
				</aside>

				<section className="flex min-w-0 flex-col bg-white">
					<header className="sticky top-0 z-20 flex h-12 items-center border-b border-black/10 bg-white px-5">
						<div className="relative ml-auto hidden w-full max-w-xs md:block">
							<div className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-zinc-50 px-3 text-sm text-black/60">
								<Search className="h-4 w-4" />
								<input value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} placeholder="Search dashboard..." className="w-full bg-transparent text-sm outline-none placeholder:text-black/35" />
							</div>
							{dashboardSearch.trim() ? (
								<div className="absolute right-0 top-10 z-30 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl">
									{dashboardSearchResults.length === 0 ? <div className="px-3 py-3 text-xs text-black/45">No CMS records found.</div> : null}
									{dashboardSearchResults.map((item) => (
										<button key={`${item.meta}-${item.label}`} type="button" onClick={() => { item.open(); setDashboardSearch(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-red-50">
											<span className="font-medium text-[#111111]">{item.label}</span>
											<span className="ml-2 text-xs text-black/45">{item.meta}</span>
										</button>
									))}
								</div>
							) : null}
						</div>
						<div className="relative ml-6 flex items-center gap-2 text-black/60">
							<button type="button" onClick={() => setShowNotifications((current) => !current)} className="rounded-md p-1.5 transition hover:bg-zinc-100" title="Notifications">
								<Bell className="h-4 w-4" />
							</button>
							<button type="button" onClick={() => setShowProfileMenu((current) => !current)} className="rounded-md p-1.5 transition hover:bg-zinc-100" title={asText(profile.email ?? profile.full_name)}>
								<UserCircle className="h-5 w-5" />
							</button>
							{showNotifications ? (
								<div className="absolute right-8 top-10 z-30 w-72 rounded-lg border border-black/10 bg-white p-3 text-sm shadow-xl">
									<div className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Notifications</div>
									<p className="mt-2 text-black/60">{workspace.inquiries.filter((item) => item.status === "new").length} new inquiries need review.</p>
									<p className="mt-1 text-xs text-black/45">{workspace.properties.filter((item) => item.status === "draft").length} draft properties are not public yet.</p>
								</div>
							) : null}
							{showProfileMenu ? (
								<div className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-black/10 bg-white p-3 text-sm shadow-xl">
									<div className="font-medium text-[#111111]">{profile.full_name ?? "CMS User"}</div>
									<div className="mt-1 text-xs text-black/45">{profile.email ?? sessionUser.email}</div>
									<div className="mt-2 rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">{role ?? "no role"}</div>
									<button type="button" onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="mt-3 w-full rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white">Sign out</button>
								</div>
							) : null}
						</div>
					</header>

					<div className="flex-1 overflow-auto bg-white px-4 py-5 sm:px-6 lg:px-8">
						<div className="mx-auto flex max-w-6xl flex-col gap-5">
							<div className="flex items-center justify-between">
								<div className="text-base font-medium text-[#111111]">
									{activeNavGroup?.label ?? "Dashboard"} / <strong>{activeNavItem?.label ?? "Overview"}</strong>{currentSection === "properties" && propertyCategoryFilter !== "all" ? <> / <strong>{selectedCategoryLabel}</strong></> : null}
								</div>
								<button onClick={() => void reloadWorkspace()} className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
									<RefreshCw className="h-3.5 w-3.5" />
									Refresh
								</button>
							</div>

						{currentSection === "overview" ? (
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

						{currentSection === "properties" ? (
							canEditCatalog ? (
								propertyCategoryFilter === "all" ? (
									<EntityEditor
										title="Properties"
										description="Guided CRUD for creating public property listings without typing database IDs."
										rows={workspace.properties}
										selectedId={selectedPropertyId}
										fields={propertyEditorFields}
										defaultValues={{ status: "draft", badge: "none" }}
										canEdit={canEditCatalog}
										rowLabel={labelForRow}
										rowMeta={(row) => `${row.city ?? ""} ${row.province ?? ""} • ${row.status ?? "draft"}`}
										onSelect={(row) => setSelection((current) => ({ ...current, properties: row ? asText(row.id) : null }))}
										onCreateNew={() => setSelection((current) => ({ ...current, properties: NEW_RECORD_ID }))}
										onDelete={(row) => deleteEntity("properties", row)}
										onSubmit={saveProperty}
										renderPreview={(payload, currentRow) => <PropertyPublicPreview payload={payload} currentRow={currentRow} imageUrls={selectedPropertyImageUrls} />}
										extra={
											<PropertyImagesManager
												propertyId={selectedProperty ? asText(selectedProperty.id) : null}
												canEdit={canEditCatalog}
												onRequestDelete={requestDestructiveAction}
												onChanged={async () => {
													await reloadWorkspace();
													await loadPropertyImages(selectedProperty ? asText(selectedProperty.id) : null);
												}}
											/>
										}
									/>
								) : (
									<SectionShell title={`${selectedCategoryLabel} Properties`} description={`Showing only listings categorized as ${selectedCategoryLabel}. Click any row to open it in Listings / Properties.`}>
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
														<tr
															key={asText(property.id)}
															role="button"
															tabIndex={0}
															title="Open this property in the editor"
															onClick={() => openPropertyForEditing(asText(property.id))}
															onKeyDown={(event) => {
																if (event.key === "Enter" || event.key === " ") {
																	event.preventDefault();
																	openPropertyForEditing(asText(property.id));
																}
															}}
															className="cursor-pointer border-b border-black/10 transition last:border-b-0 hover:bg-red-50/70 focus:bg-red-50 focus:outline-none"
														>
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
										{visibleProperties.map((row) => <div key={asText(row.id)} className="rounded-2xl border border-black/10 bg-zinc-50 p-4"><div className="font-medium text-[#111111]">{row.title}</div><div className="mt-1 text-sm text-black/55">{row.city ?? ""} {row.province ?? ""}</div></div>)}
									</div>
								</SectionShell>
							)
						) : null}

						{currentSection === "projects" && isAdmin ? (
							<EntityEditor title="Projects" description="Developer project portfolios. Choose the developer by company name; the CMS stores the ID automatically." rows={workspace.projects} selectedId={selectedProjectId} fields={projectEditorFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.location_city ?? ""} ${row.location_province ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, projects: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, projects: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("projects", row)} onSubmit={saveProject} />
						) : null}

						{currentSection === "agents" && isAdmin ? (
							<EntityEditor title="Agents" description="Profile info, social links, and top-agent flags." rows={workspace.agents} selectedId={selectedAgentId} fields={agentFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.license_number ?? "no license"}${row.is_top_agent ? " • top agent" : ""}`} onSelect={(row) => setSelection((current) => ({ ...current, agents: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, agents: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("agents", row)} onSubmit={saveAgent} />
						) : null}

						{currentSection === "developers" && isAdmin ? (
							<EntityEditor title="Developer Partners" description="Company profile CRUD for developer partners." rows={workspace.developers} selectedId={selectedDeveloperId} fields={developerFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => asText(row.contact_email ?? row.website_url ?? row.slug)} onSelect={(row) => setSelection((current) => ({ ...current, developers: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, developers: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("developer_partners", row)} onSubmit={saveDeveloper} />
						) : null}

						{currentSection === "profiles" && isAdmin ? (
							<SectionShell title="Profiles & Buyers" description="Read-only account overview from the profiles table.">
								<div className="overflow-x-auto rounded-lg border border-black/10">
									<table className="min-w-full text-left text-sm">
										<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
											<tr>
												<th className="px-4 py-3">Name</th>
												<th className="px-4 py-3">Email</th>
												<th className="px-4 py-3">Role</th>
												<th className="px-4 py-3">Active</th>
											</tr>
										</thead>
										<tbody>
											{workspace.profiles.length === 0 ? <tr><td colSpan={4} className="px-4 py-5 text-black/45">No profiles found.</td></tr> : null}
											{workspace.profiles.map((row) => (
												<tr key={asText(row.id)} className="border-t border-black/10">
													<td className="px-4 py-3 font-medium text-[#111111]">{row.full_name ?? "Unnamed"}</td>
													<td className="px-4 py-3 text-black/60">{row.email ?? "—"}</td>
													<td className="px-4 py-3 text-black/60">{row.role ?? "buyer"}</td>
													<td className="px-4 py-3 text-black/60">{asText(row.is_active) === "false" ? "No" : "Yes"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</SectionShell>
						) : null}

						{currentSection === "inquiries" || currentSection === "pipeline" || currentSection === "timeline" ? (
							<InquiryPanel inquiries={workspace.inquiries} agents={workspace.agents} currentRole={role} currentUserId={sessionUser.id} selectedId={selectedInquiryId} onSelect={(id) => setSelection((current) => ({ ...current, inquiries: id }))} onReload={reloadWorkspace} canEdit={canEditInquiries} canReassign={canReassignInquiries} />
						) : null}

						{currentSection === "pages" && isAdmin ? (
							<EntityEditor title="CMS Pages" description="Static and semi-static content pages." rows={workspace.cmsPages} selectedId={selection.cmsPages} fields={cmsPageFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => asText(row.slug ?? row.meta_title ?? "cms")} onSelect={(row) => setSelection((current) => ({ ...current, cmsPages: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, cmsPages: null }))} onDelete={(row) => deleteEntity("cms_pages", row)} onSubmit={saveCmsPage} />
						) : null}

						{currentSection === "gallery" && isAdmin ? (
							<EntityEditor title="Gallery Items" description="Browse Gallery tiles for achievements, events, trainings, service, and general content." rows={workspace.galleryItems} selectedId={selection.galleryItems} fields={galleryFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.section ?? "general"} • ${row.sort_order ?? 0}`} onSelect={(row) => setSelection((current) => ({ ...current, galleryItems: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, galleryItems: null }))} onDelete={(row) => deleteEntity("gallery_items", row)} onSubmit={saveGalleryItem} />
						) : null}

						{currentSection === "testimonials" && isAdmin ? (
							<EntityEditor title="Testimonials" description="Homepage testimonials carousel content." rows={workspace.testimonials} selectedId={selection.testimonials} fields={testimonialFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.author_title ?? ""} • ${row.rating ?? "n/a"} stars`} onSelect={(row) => setSelection((current) => ({ ...current, testimonials: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, testimonials: null }))} onDelete={(row) => deleteEntity("testimonials", row)} onSubmit={saveTestimonial} />
						) : null}

						{currentSection === "hero" && isAdmin ? (
							<EntityEditor title="Hero Banners" description="Rotating hero slides for the public landing page." rows={workspace.heroBanners} selectedId={selection.heroBanners} fields={heroBannerFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, heroBanners: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, heroBanners: null }))} onDelete={(row) => deleteEntity("hero_banners", row)} onSubmit={saveHeroBanner} />
						) : null}

						{currentSection === "logos" && isAdmin ? (
							<EntityEditor title="Partner Logos" description="Homepage logo strip for developer partners." rows={workspace.partnerLogos} selectedId={selection.partnerLogos} fields={partnerLogoFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.sort_order ?? 0} • ${row.is_active ? "active" : "inactive"}`} onSelect={(row) => setSelection((current) => ({ ...current, partnerLogos: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, partnerLogos: null }))} onDelete={(row) => deleteEntity("partner_logos", row)} onSubmit={savePartnerLogo} />
						) : null}

						{currentSection === "stats" && isAdmin ? (
							<EntityEditor title="Site Stats" description="Key-value counters shown in the homepage stat strip." rows={workspace.siteStats} selectedId={selection.siteStats} idKey="key" fields={siteStatFields} canEdit={canEditContent} rowLabel={labelForRow} rowMeta={(row) => `${row.value ?? 0}${row.suffix ?? ""}`} onSelect={(row) => setSelection((current) => ({ ...current, siteStats: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, siteStats: null }))} onDelete={(row) => deleteEntity("site_stats", row, "key")} onSubmit={saveSiteStat} />
						) : null}

						{currentSection === "settings" && isAdmin ? (
							<EntityEditor title="System Settings" description="Key-value configuration editor for platform behavior." rows={workspace.settings} selectedId={selection.settings} idKey="key" fields={settingFields} canEdit={canEditSettings} rowLabel={labelForRow} rowMeta={(row) => asText(row.description ?? row.value)} onSelect={(row) => setSelection((current) => ({ ...current, settings: row ? asText(row.key) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, settings: null }))} onDelete={(row) => deleteEntity("system_settings", row, "key")} onSubmit={saveSetting} />
						) : null}

						{(currentSection === "analytics" || currentSection === "traffic" || currentSection === "agentPerformance" || currentSection === "developerPortfolio") && isAdmin ? (
							<AnalyticsPanel isAdmin={isAdmin} properties={workspace.properties} inquiries={workspace.inquiries} recommendations={workspace.recommendations} listingPerformance={workspace.listingPerformance} trafficSources={workspace.trafficSources} agentPerformance={workspace.agentPerformance} developerPortfolio={workspace.developerPortfolio} />
						) : null}

						{currentSection === "activityLogs" && isAdmin ? (
							<SectionShell title="Activity Logs" description="Recent audit records from the activity_logs table.">
								<div className="overflow-x-auto rounded-lg border border-black/10">
									<table className="min-w-full text-left text-sm">
										<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
											<tr>
												<th className="px-4 py-3">When</th>
												<th className="px-4 py-3">Action</th>
												<th className="px-4 py-3">Table</th>
												<th className="px-4 py-3">Record</th>
											</tr>
										</thead>
										<tbody>
											{workspace.activityLogs.length === 0 ? <tr><td colSpan={4} className="px-4 py-5 text-black/45">No activity logs found.</td></tr> : null}
											{workspace.activityLogs.map((row, index) => (
												<tr key={asText(row.id ?? index)} className="border-t border-black/10">
													<td className="px-4 py-3 text-black/60">{asText(row.created_at ?? row.occurred_at) || "—"}</td>
													<td className="px-4 py-3 font-medium text-[#111111]">{row.action ?? row.event_type ?? "Activity"}</td>
													<td className="px-4 py-3 text-black/60">{row.table_name ?? row.entity_type ?? "—"}</td>
													<td className="px-4 py-3 text-black/60">{row.record_id ?? row.entity_id ?? "—"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</SectionShell>
						) : null}
					</div>
					</div>
				</section>
			</div>
			{destructiveAction ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Destructive Action</div>
						<h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#111111]">{destructiveAction.title}</h2>
						<p className="mt-2 text-sm leading-6 text-black/60">{destructiveAction.description}</p>
						<p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">Please confirm you are sure. Enter your password to continue.</p>
						<label className="mt-4 block">
							<span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Password</span>
							<input
								type="password"
								value={destructivePassword}
								onChange={(event) => setDestructivePassword(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") void confirmDestructiveAction();
								}}
								className="mt-1 h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-red-300"
								placeholder="Enter your CMS password"
								autoFocus
							/>
						</label>
						{destructiveMessage ? <p className="mt-3 text-sm text-black/55">{destructiveMessage}</p> : null}
						<div className="mt-5 flex flex-wrap justify-end gap-2">
							<button
								type="button"
								disabled={confirmingDestructiveAction}
								onClick={() => {
									setDestructiveAction(null);
									setDestructivePassword("");
									setDestructiveMessage("");
								}}
								className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-zinc-50 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={confirmingDestructiveAction}
								onClick={() => void confirmDestructiveAction()}
								className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-black/20"
							>
								{confirmingDestructiveAction ? "Verifying..." : destructiveAction.confirmLabel ?? "Verify password and delete"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
