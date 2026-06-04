"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, Building2, CalendarDays, Download, FileText, FolderTree, Home, LayoutDashboard, LogOut, MessageSquare, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Settings, UserCircle, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AgentPerformanceTable } from "@/components/dashboard/AgentPerformanceTable";
import { InquiryVolumeChart } from "@/components/dashboard/InquiryVolumeChart";
import { LeadScoreBadge } from "@/components/dashboard/LeadScoreBadge";
import { ListingPerformanceChart } from "@/components/dashboard/ListingPerformanceChart";
import { TrafficSourceChart } from "@/components/dashboard/TrafficSourceChart";
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

function toNullableNumber(value: unknown) {
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function hoursSince(value: unknown) {
	const timestamp = new Date(asText(value)).getTime();
	if (!Number.isFinite(timestamp)) return null;
	return (Date.now() - timestamp) / 36e5;
}

function relativeAge(value: unknown) {
	const hours = hoursSince(value);
	if (hours == null) return "No date";
	if (hours < 1) return "Just now";
	if (hours < 24) return `${Math.floor(hours)}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

function csvEscape(value: unknown) {
	const textValue = asText(value);
	return /[",\n\r]/.test(textValue) ? `"${textValue.replaceAll('"', '""')}"` : textValue;
}

function downloadCsv(filename: string, rows: CmsRow[], columns: string[]) {
	const csv = [
		columns.join(","),
		...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
	].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

function formatHour(hour: number) {
	const suffix = hour >= 12 ? "PM" : "AM";
	const displayHour = hour % 12 || 12;
	return `${displayHour} ${suffix}`;
}

const NEW_RECORD_ID = "__new__";

function PeakEngagementChart({ events }: { events: CmsRow[] }) {
	const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
	const dayCounts = dayLabels.map((day) => ({ day, count: 0 }));

	for (const event of events) {
		const date = new Date(asText(event.created_at));
		if (Number.isNaN(date.getTime())) continue;
		hourCounts[date.getHours()].count += 1;
		dayCounts[date.getDay()].count += 1;
	}

	const peakHour = hourCounts.reduce((best, row) => row.count > best.count ? row : best, hourCounts[0]);
	const peakDay = dayCounts.reduce((best, row) => row.count > best.count ? row : best, dayCounts[0]);

	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Peak Engagement Periods</div>
					<p className="mt-1 text-sm text-black/55">Based on analytics event timestamps.</p>
				</div>
				<div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-black/70">
					Peak: {peakDay.day}, {formatHour(peakHour.hour)}
				</div>
			</div>
			<div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
				<div>
					<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Time of day</div>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={hourCounts} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
								<CartesianGrid vertical={false} stroke="#ececec" />
								<XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
								<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
								<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Bar dataKey="count" name="Events" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={18} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
				<div>
					<div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Day of week</div>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={dayCounts} layout="vertical" margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
								<CartesianGrid horizontal={false} stroke="#ececec" />
								<XAxis type="number" hide allowDecimals={false} />
								<YAxis dataKey="day" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} width={44} />
								<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
								<Bar dataKey="count" name="Events" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={14} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	);
}

function AgentMetricsSummary({ agentId, agentPerformance }: { agentId: string | null; agentPerformance: CmsRow[] }) {
	if (!agentId || agentId === NEW_RECORD_ID) {
		return (
			<div className="rounded-lg border border-dashed border-black/15 bg-zinc-50 p-4 text-sm text-black/55">
				Select an existing agent to see live assignment, conversion, and response metrics.
			</div>
		);
	}

	const metrics = agentPerformance.find((row) => asText(row.agent_id) === asText(agentId));

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Live Performance</div>
			{metrics ? (
				<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<InfoCard label="Assigned" value={asText(metrics.total_assigned ?? 0)} hint="Leads assigned to this agent." />
					<InfoCard label="Conversions" value={asText(metrics.conversions ?? 0)} hint="Reserved or closed-won leads." />
					<InfoCard label="Conversion Rate" value={`${metrics.conversion_rate_pct ?? 0}%`} hint="From assigned leads." />
					<InfoCard label="Avg Response" value={metrics.avg_response_time_hours == null ? "n/a" : `${metrics.avg_response_time_hours}h`} hint="Creation to first contact." />
				</div>
			) : (
				<p className="mt-2 text-sm text-black/55">No performance row exists for this agent yet. It will appear once assignments and pipeline activity are recorded.</p>
			)}
		</div>
	);
}

function OverviewBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
	return (
		<div className="h-40 border-b border-black/10">
			{rows.length ? (
				<div className="h-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={rows} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
							<CartesianGrid vertical={false} stroke="#ececec" />
							<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
							<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
							<Tooltip content={<OverviewTrendTooltip />} cursor={{ stroke: "#d4d4d8", strokeDasharray: "4 4" }} />
							<Line type="monotone" dataKey="value" name="Inquiries" stroke="#111111" strokeWidth={2.5} dot={{ r: 3, fill: "#ffffff", stroke: "#111111", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#111111", stroke: "#ffffff", strokeWidth: 2 }} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			) : (
				<p className="flex h-full items-center text-sm text-black/45">No chart data yet.</p>
			)}
		</div>
	);
}

function OverviewTrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string }>; label?: string }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 font-semibold text-[#111111]">{label}</div>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center justify-between gap-4 text-black/60">
					<span>{item.name}</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
		</div>
	);
}

function OverviewPipelineBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
	return (
		<div className="h-44">
			{rows.length ? (
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={rows} layout="vertical" margin={{ top: 4, right: 10, left: -8, bottom: 4 }}>
						<CartesianGrid horizontal={false} stroke="#ececec" />
						<XAxis type="number" hide allowDecimals={false} />
						<YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickFormatter={(value) => asText(value).replaceAll("_", " ")} tick={{ fontSize: 11, fill: "#71717a" }} width={92} />
						<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
						<Bar dataKey="value" name="Leads" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={16} />
					</BarChart>
				</ResponsiveContainer>
			) : (
				<p className="text-sm text-black/45">No pipeline activity yet.</p>
			)}
		</div>
	);
}

function OverviewListingChart({ rows }: { rows: Array<{ title: string; views: number; rate: number }> }) {
	return (
		<div className="h-56">
			{rows.length ? (
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={rows} margin={{ top: 8, right: 8, left: -22, bottom: 18 }}>
						<CartesianGrid vertical={false} stroke="#ececec" />
						<XAxis dataKey="title" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} tickFormatter={(value) => compactChartLabel(asText(value))} />
						<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#71717a" }} allowDecimals={false} />
						<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
						<Bar dataKey="views" name="Views" fill="#111111" radius={[6, 6, 0, 0]} maxBarSize={28} />
					</BarChart>
				</ResponsiveContainer>
			) : (
				<p className="flex h-full items-center text-sm text-black/45">No listing analytics yet.</p>
			)}
		</div>
	);
}

function CmsChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string | number }) {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs shadow-lg">
			<div className="mb-1 font-semibold text-[#111111]">{label}</div>
			{payload.map((item) => (
				<div key={item.name} className="flex items-center justify-between gap-4 text-black/60">
					<span className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color ?? "#111111" }} />
						{item.name}
					</span>
					<span className="font-medium text-[#111111]">{item.value}</span>
				</div>
			))}
		</div>
	);
}

function compactChartLabel(value: string) {
	return value.length > 10 ? `${value.slice(0, 9)}...` : value;
}

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
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Photo Uploads</div>
				<p className="mt-1 text-sm text-black/55">Save the property details first, then upload as many photos as you need. This keeps each photo attached to the correct property.</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-black/10 bg-zinc-50 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Photo Uploads</div>
					<div className="mt-1 text-sm text-black/60">Choose one or more photos, then upload them in one action. The first uploaded photo becomes the cover if no cover exists yet.</div>
				</div>
				<div className="text-xs text-black/45">{images.length} images</div>
			</div>

			<div className="mt-4 rounded-xl border border-dashed border-black/15 bg-white p-4">
				<label className="block">
					<div className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Upload Photos</div>
					<input type="file" accept="image/*" multiple disabled={!canEdit || saving} onChange={handleFilesChange} className="mt-2 block w-full text-sm text-black/60 file:mr-4 file:rounded-md file:border-0 file:bg-[#111111] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-60" />
				</label>
				<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
					<p className="text-xs text-black/45">{selectedFiles.length ? `${selectedFiles.length} selected: ${selectedFiles.map((file) => file.name).join(", ")}` : "Choose one or more JPG, PNG, or WebP images."}</p>
					<button type="button" onClick={uploadSelectedImages} disabled={!canEdit || saving || selectedFiles.length === 0} className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-4 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">
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
								<button type="button" onClick={() => deleteImage(asText(image.id))} className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-[#111111] transition hover:bg-zinc-100">Delete</button>
							</div>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}

function InquiryPanel({
	activeView,
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
	activeView: CmsSection;
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
	const [stageFilter, setStageFilter] = useState("");
	const [actionMessage, setActionMessage] = useState("");
	const showStageControls = activeView === "pipeline";
	const showPipelineEditor = activeView === "inquiries" || activeView === "pipeline";
	const showTimelineReport = activeView === "timeline";
	const panelTitle = activeView === "pipeline" ? "Lead Stages" : activeView === "timeline" ? "Activity History" : "All Inquiries";
	const panelDescription = activeView === "pipeline"
		? "Filter leads by pipeline stage and update status, assignment, and next steps."
		: activeView === "timeline"
			? "Review inquiry notes, status changes, and follow-up history."
			: "Review submissions, lead scores, urgency signals, and buyer details.";

	const selectedInquiry = inquiries.find((item) => asText(item.id) === asText(selectedId)) ?? null;
	const selectedInquiryId = asText(selectedInquiry?.id);
	const status = draft.inquiryId === selectedInquiryId ? draft.status : asText(selectedInquiry?.status || "new");
	const assignedAgentId = draft.inquiryId === selectedInquiryId ? draft.assignedAgentId : asText(selectedInquiry?.assigned_agent_id);
	const note = draft.inquiryId === selectedInquiryId ? draft.note : "";
	const selectedLeadScore = toNullableNumber(selectedInquiry?.lead_score);
	const updateDraft = (updates: Partial<typeof draft>) => setDraft((current) => ({ ...current, inquiryId: selectedInquiryId, ...updates }));
	const stageCounts = inquiryStatusOptions.map((option) => ({
		...option,
		count: inquiries.filter((item) => asText(item.status || "new") === option.value).length,
	}));
	const visibleInquiries = (stageFilter ? inquiries.filter((item) => asText(item.status || "new") === stageFilter) : inquiries)
		.slice()
		.sort((first, second) => {
			const firstScore = toNullableNumber(first.lead_score) ?? 0;
			const secondScore = toNullableNumber(second.lead_score) ?? 0;
			const firstStale = !first.first_contacted_at && (hoursSince(first.created_at) ?? 0) >= 24 ? 1 : 0;
			const secondStale = !second.first_contacted_at && (hoursSince(second.created_at) ?? 0) >= 24 ? 1 : 0;
			const firstUnassigned = !asText(first.assigned_agent_id) ? 1 : 0;
			const secondUnassigned = !asText(second.assigned_agent_id) ? 1 : 0;
			return (secondScore + secondStale * 0.2 + secondUnassigned * 0.1) - (firstScore + firstStale * 0.2 + firstUnassigned * 0.1);
		});

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
		setActionMessage("Saved.");
		window.setTimeout(() => setActionMessage(""), 2400);
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
		setActionMessage("Note added.");
		window.setTimeout(() => setActionMessage(""), 2400);
	}

	return (
		<SectionShell title={panelTitle} description={panelDescription}>
			{showStageControls ? <div className="mb-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead stages</div>
				<div className="mt-3 flex flex-wrap gap-2">
					<button type="button" onClick={() => setStageFilter("")} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${stageFilter ? "bg-white text-black/60 hover:bg-zinc-100" : "bg-[#111111] text-white"}`}>All {inquiries.length}</button>
					{stageCounts.map((stage) => (
						<button key={stage.value} type="button" onClick={() => setStageFilter(stage.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${stageFilter === stage.value ? "bg-[#111111] text-white" : "bg-white text-black/60 hover:bg-zinc-100"}`}>
							{stage.label} {stage.count}
						</button>
					))}
				</div>
				<p className="mt-3 text-xs leading-5 text-black/50">Typical flow: New to Assigned to Contacted to Viewing Scheduled to Negotiating to Reserved or Closed.</p>
			</div> : null}
			<div className="grid gap-4 xl:grid-cols-[300px_1fr]">
				<aside className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">{showTimelineReport ? "Select Lead" : "Lead Queue"}</div>
					<div className="mt-3 max-h-[480px] space-y-2 overflow-auto pr-1">
						{visibleInquiries.length === 0 ? <p className="px-2 py-4 text-sm text-black/45">No inquiries available for this stage.</p> : null}
						{visibleInquiries.map((item) => {
							const active = asText(item.id) === asText(selectedId);
							const highPriority = asText(item.priority) === "high" || (toNullableNumber(item.lead_score) ?? 0) >= 0.72;
							const unassigned = !asText(item.assigned_agent_id);
							const stale = !item.first_contacted_at && (hoursSince(item.created_at) ?? 0) >= 24;
							return (
								<button key={asText(item.id)} type="button" onClick={() => onSelect(asText(item.id))} className={`w-full rounded-2xl border border-l-4 px-3 py-2 text-left transition ${active ? "border-black/15 border-l-[#111111] bg-zinc-100 shadow-sm" : highPriority || stale ? "border-black/10 border-l-[#111111] bg-zinc-50 hover:bg-zinc-100" : unassigned ? "border-black/10 border-l-zinc-500 bg-zinc-50 hover:bg-zinc-100" : "border-transparent border-l-zinc-300 bg-white/60 hover:border-black/10 hover:bg-white"}`}>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 text-sm font-medium text-[#111111]">{item.buyer_name}</div>
										<span className="shrink-0 text-[11px] text-black/45">{relativeAge(item.created_at)}</span>
									</div>
									<div className="mt-1 flex flex-wrap gap-2 text-xs text-black/55">
										<span>{item.status}</span>
										<span>Priority: {item.priority ?? "n/a"}</span>
										<span>{item.buyer_email}</span>
									</div>
									<div className="mt-2 flex flex-wrap gap-1.5">
										{unassigned ? <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-800">Unassigned</span> : null}
										{stale ? <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-white">Needs follow-up</span> : null}
										{highPriority ? <span className="rounded-full bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-white">High intent</span> : null}
									</div>
									<div className="mt-2">
										<LeadScoreBadge score={toNullableNumber(item.lead_score)} />
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
								<div className="flex flex-wrap items-center gap-2">
									<LeadScoreBadge score={selectedLeadScore} />
									<div className="rounded-full bg-black/5 px-4 py-2 text-xs font-medium text-black/60">Current status: {selectedInquiry.status}</div>
								</div>
							</div>

							{showPipelineEditor ? <div className="grid gap-4 md:grid-cols-2">
								<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Details</div>
									<div className="mt-3 space-y-2 text-sm text-black/70">
										<p><span className="font-medium text-[#111111]">Property:</span> {selectedInquiry.property_id}</p>
										<p><span className="font-medium text-[#111111]">Developer:</span> {selectedInquiry.developer_id ?? "—"}</p>
										<p><span className="font-medium text-[#111111]">Source:</span> {selectedInquiry.source}</p>
										<p><span className="font-medium text-[#111111]">Session:</span> {selectedInquiry.session_id ?? "—"}</p>
										<p className="flex items-center gap-2"><span className="font-medium text-[#111111]">Lead score:</span> <LeadScoreBadge score={selectedLeadScore} /></p>
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
											<button type="button" onClick={saveInquiry} disabled={!canEdit || saving} className="rounded-full bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20">Save pipeline</button>
											<button type="button" onClick={addTimelineNote} disabled={!canEdit || saving || !note.trim()} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[#111111] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:bg-black/5">Add note</button>
											{actionMessage ? <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-2 text-xs font-semibold text-black/70">{actionMessage}</span> : null}
										</div>
									</div>
								</div>
							</div> : null}

							{showTimelineReport ? <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
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
							</div> : null}
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
	activeReport,
	isAdmin,
	properties,
	inquiries,
	recommendations,
	listingPerformance,
	dailyInquiryVolume,
	trafficSources,
	agentPerformance,
	developerPortfolio,
	engagementEvents,
	selectedPortfolioDeveloperId,
	selectedPortfolioPropertyId,
	onSelectPortfolioDeveloper,
	onSelectPortfolioProperty,
}: {
	activeReport: CmsSection;
	isAdmin: boolean;
	properties: CmsRow[];
	inquiries: CmsRow[];
	recommendations: CmsRow[];
	listingPerformance: CmsRow[];
	dailyInquiryVolume: CmsRow[];
	trafficSources: CmsRow[];
	agentPerformance: CmsRow[];
	developerPortfolio: CmsRow[];
	engagementEvents: CmsRow[];
	selectedPortfolioDeveloperId: string | null;
	selectedPortfolioPropertyId: string | null;
	onSelectPortfolioDeveloper: (id: string | null) => void;
	onSelectPortfolioProperty: (id: string | null) => void;
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
	const pipelineChartRows = Object.entries(inquiryCounts).map(([label, value]) => ({ label, value }));
	const responseHint = averageResponseHours == null
		? "No contacted leads yet."
		: averageResponseHours <= 4
			? "Healthy: response is within the 4 hour target."
			: averageResponseHours <= 24
				? "Watch: same-day response, but faster is better."
				: "Needs attention: leads are waiting more than a day.";
	const ctrHint = recommendationStats.total === 0
		? "No recommendation clicks recorded yet."
		: clickThrough >= 15
			? `${recommendationStats.clicked}/${recommendationStats.total} clicked. Strong engagement.`
			: clickThrough >= 5
				? `${recommendationStats.clicked}/${recommendationStats.total} clicked. Usable, but can improve.`
				: `${recommendationStats.clicked}/${recommendationStats.total} clicked. Review recommendation quality.`;
	const fallbackHint = fallbackRate <= 25
		? "Healthy: AI or semantic recommendations are usually available."
		: fallbackRate <= 60
			? "Watch: fallback recommendations are common."
			: "Needs attention: fallback recommendations dominate.";
	const inquiryVolumeRows = dailyInquiryVolume.map((row) => ({
		inquiry_date: asText(row.inquiry_date),
		total_inquiries: toNullableNumber(row.total_inquiries) ?? 0,
	}));
	const agentPerformanceRows = agentPerformance.map((row) => ({
		agent_id: asText(row.agent_id),
		agent_name: asText(row.agent_name),
		total_assigned: toNullableNumber(row.total_assigned) ?? 0,
		conversions: toNullableNumber(row.conversions) ?? 0,
		conversion_rate_pct: toNullableNumber(row.conversion_rate_pct) ?? 0,
		avg_response_time_hours: toNullableNumber(row.avg_response_time_hours),
	}));
	const listingChartRows = listingPerformance.map((row) => ({
		property_id: asText(row.property_id),
		title: asText(row.title),
		total_views: toNullableNumber(row.total_views) ?? 0,
		detail_opens: toNullableNumber(row.detail_opens) ?? 0,
		total_interactions: toNullableNumber(row.total_interactions) ?? 0,
		avg_dwell_seconds: toNullableNumber(row.avg_dwell_seconds) ?? 0,
		total_inquiries: toNullableNumber(row.total_inquiries) ?? 0,
		inquiry_rate_pct: toNullableNumber(row.inquiry_rate_pct) ?? 0,
	}));
	const selectedPortfolioDeveloper = selectedPortfolioDeveloperId
		? developerPortfolio.find((row) => asText(row.developer_id) === selectedPortfolioDeveloperId) ?? null
		: null;
	const selectedDeveloperProperties = selectedPortfolioDeveloperId
		? properties.filter((property) => asText(property.developer_id) === selectedPortfolioDeveloperId)
		: [];
	const selectedPortfolioProperty = selectedPortfolioPropertyId
		? properties.find((property) => asText(property.id) === selectedPortfolioPropertyId) ?? null
		: null;
	const selectedPropertyPerformance = selectedPortfolioPropertyId
		? listingChartRows.find((row) => row.property_id === selectedPortfolioPropertyId) ?? null
		: null;
	const selectedPropertyInquiries = selectedPortfolioPropertyId
		? inquiries.filter((inquiry) => asText(inquiry.property_id) === selectedPortfolioPropertyId)
		: [];
	const selectedPropertyRecommendationClicks = selectedPortfolioPropertyId
		? recommendations.filter((recommendation) => asText(recommendation.property_id) === selectedPortfolioPropertyId || asText(recommendation.recommended_property_id) === selectedPortfolioPropertyId).filter((recommendation) => Boolean(recommendation.was_clicked)).length
		: 0;
	const selectedPropertyChartRows = selectedPortfolioPropertyId ? [
		{ label: "Views", value: selectedPropertyPerformance?.total_views ?? 0 },
		{ label: "Interactions", value: selectedPropertyPerformance?.total_interactions ?? selectedPropertyPerformance?.detail_opens ?? 0 },
		{ label: "Inquiries", value: selectedPropertyPerformance?.total_inquiries ?? selectedPropertyInquiries.length },
		{ label: "Rec Clicks", value: selectedPropertyRecommendationClicks },
	] : [];
	const trafficChartRows = trafficSources.map((row) => ({
		source: asText(row.source),
		session_count: toNullableNumber(row.session_count) ?? 0,
		total_page_views: toNullableNumber(row.total_page_views) ?? 0,
		share_pct: toNullableNumber(row.share_pct) ?? 0,
	}));
	const reportTitle = activeReport === "traffic"
		? "Traffic Sources"
		: activeReport === "agentPerformance"
			? "Agent Performance"
			: activeReport === "developerPortfolio"
				? "Developer Portfolio"
				: "Analytics Overview";
	const reportDescription = activeReport === "traffic"
		? "Session source and page-view breakdown from captured traffic data."
		: activeReport === "agentPerformance"
			? "Agent workload, response speed, and conversion performance."
			: activeReport === "developerPortfolio"
				? "Developer partner portfolio performance and conversion totals."
				: "Operational KPI view powered by materialized views and live inquiry tables.";
	const showOverviewReport = activeReport === "analytics";
	const showTrafficReport = activeReport === "traffic";
	const showAgentReport = activeReport === "agentPerformance";
	const showDeveloperReport = activeReport === "developerPortfolio";
	const developerPortfolioLevel = selectedPortfolioProperty ? "property" : selectedPortfolioDeveloper ? "developer" : "portfolio";

	return (
		<SectionShell title={reportTitle} description={reportDescription}>
			<div className="mb-4 flex flex-wrap justify-end gap-2">
				{showOverviewReport ? <button type="button" onClick={() => downloadCsv("jewellz-inquiries.csv", inquiries, ["id", "buyer_name", "buyer_email", "buyer_phone", "status", "priority", "lead_score", "source", "created_at"])} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Export inquiries CSV</button> : null}
				{showOverviewReport || showTrafficReport || showDeveloperReport ? <button type="button" onClick={() => downloadCsv("jewellz-listing-performance.csv", listingPerformance, ["property_id", "title", "total_views", "detail_opens", "total_interactions", "avg_dwell_seconds", "total_inquiries", "inquiry_rate_pct"])} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Export listing report CSV</button> : null}
				{showOverviewReport || showAgentReport ? <button type="button" onClick={() => downloadCsv("jewellz-agent-performance.csv", agentPerformance, ["agent_id", "agent_name", "total_assigned", "conversions", "conversion_rate_pct", "avg_response_time_hours"])} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Export agent report CSV</button> : null}
			</div>
			{showOverviewReport ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					<InfoCard label="Visible Listings" value={properties.length} hint="Scope depends on the signed-in role." />
					<InfoCard label="Visible Inquiries" value={inquiries.length} hint="Assigned leads or all leads for admin." />
					<InfoCard label="Avg. Response" value={averageResponseHours == null ? "n/a" : `${averageResponseHours.toFixed(2)} hrs`} hint={responseHint} />
					<InfoCard label="Recommendations CTR" value={`${clickThrough.toFixed(1)}%`} hint={ctrHint} />
					<InfoCard label="Fallback Rate" value={`${fallbackRate.toFixed(1)}%`} hint={fallbackHint} />
					<InfoCard label="Statuses Tracked" value={Object.keys(inquiryCounts).length} hint="Live pipeline distribution." />
				</div>
			) : null}

			{isAdmin && showOverviewReport ? (
				<div className="mt-5 grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Traffic preview</div>
						<p className="mt-2 text-sm text-black/65">{trafficSources[0] ? `${trafficSources[0].source} is the top source with ${trafficSources[0].session_count ?? 0} sessions.` : "No session sources recorded yet."}</p>
					</div>
					<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Agent preview</div>
						<p className="mt-2 text-sm text-black/65">{agentPerformance[0] ? `${agentPerformance[0].agent_name} has ${agentPerformance[0].conversions ?? 0} conversions.` : "Agent conversion data appears after assignments."}</p>
					</div>
					<div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Developer preview</div>
						<p className="mt-2 text-sm text-black/65">{developerPortfolio[0] ? `${developerPortfolio[0].company_name} has ${developerPortfolio[0].total_listings ?? 0} listings in view.` : "Developer portfolio data appears after listings are linked."}</p>
					</div>
				</div>
			) : null}

			{showOverviewReport ? <div className="mt-5 grid gap-5 xl:grid-cols-2">
				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Lead Pipeline</div>
					<div className="mt-3 h-56">
						{pipelineChartRows.length ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={pipelineChartRows} layout="vertical" margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
									<CartesianGrid horizontal={false} stroke="#ececec" />
									<XAxis type="number" hide allowDecimals={false} />
									<YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickFormatter={(value) => asText(value).replaceAll("_", " ")} tick={{ fontSize: 11, fill: "#71717a" }} width={112} />
									<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
									<Bar dataKey="value" name="Leads" fill="#111111" radius={[0, 6, 6, 0]} maxBarSize={16} />
								</BarChart>
							</ResponsiveContainer>
						) : <p className="text-sm text-black/45">No inquiry activity yet.</p>}
					</div>
					<div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Priority Split</div>
					<div className="mt-3 flex flex-wrap gap-2">
						{Object.entries(priorityCounts).map(([priority, count]) => (
							<span key={priority} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-black/65">{priority}: {count}</span>
						))}
					</div>
				</div>

				<div className="rounded-2xl border border-black/10 p-4">
					<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Daily Inquiry Volume</div>
					<div className="mt-3">
						<InquiryVolumeChart rows={inquiryVolumeRows} />
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
			</div> : null}

			{isAdmin && showOverviewReport ? (
				<div className="mt-5 grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Listing Performance</div>
						<div className="mt-3">
							<ListingPerformanceChart rows={listingChartRows} />
						</div>
					</div>

					<PeakEngagementChart events={engagementEvents} />
				</div>
			) : null}

			{isAdmin && showTrafficReport ? (
				<div className="grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Traffic Sources</div>
						<div className="mt-3">
							<TrafficSourceChart rows={trafficChartRows} />
						</div>
					</div>
				</div>
			) : null}

			{isAdmin && showAgentReport ? (
				<div className="grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Agent Performance</div>
						<div className="mt-3">
							<AgentPerformanceTable rows={agentPerformanceRows} />
						</div>
					</div>
				</div>
			) : null}

			{isAdmin && showDeveloperReport ? (
				<div className="grid gap-5">
					<div className="rounded-2xl border border-black/10 p-4">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">
									{developerPortfolioLevel === "property" ? "Property Analytics" : developerPortfolioLevel === "developer" ? "Developer Properties" : "Developer Portfolio"}
								</div>
								<p className="mt-1 text-sm text-black/55">
									{developerPortfolioLevel === "property"
										? "Property-level engagement and lead performance."
										: developerPortfolioLevel === "developer"
											? "Listings owned by this developer. Click one to inspect its analytics."
											: "Click a developer to open its portfolio page."}
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{selectedPortfolioProperty ? (
									<button type="button" onClick={() => onSelectPortfolioProperty(null)} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Back to properties</button>
								) : null}
								{selectedPortfolioDeveloper ? (
									<button type="button" onClick={() => { onSelectPortfolioDeveloper(null); onSelectPortfolioProperty(null); }} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50">Back to developers</button>
								) : null}
							</div>
						</div>

						{developerPortfolioLevel === "portfolio" ? <div className="mt-3 overflow-x-auto">
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
									{developerPortfolio.map((row) => {
										const developerId = asText(row.developer_id);
										const active = selectedPortfolioDeveloperId === developerId;
										return (
												<tr key={developerId} onClick={() => { onSelectPortfolioDeveloper(developerId); onSelectPortfolioProperty(null); }} className={`cursor-pointer border-t border-black/5 transition ${active ? "bg-zinc-100" : "hover:bg-zinc-50"}`}>
												<td className="py-2 pr-4 font-medium text-[#111111]">{row.company_name}</td>
												<td className="py-2 pr-4">{row.total_listings ?? 0}</td>
												<td className="py-2 pr-4">{row.total_views ?? 0}</td>
												<td className="py-2 pr-4">{row.total_conversions ?? 0}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div> : null}

						{developerPortfolioLevel === "developer" && selectedPortfolioDeveloper ? (
							<div className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-4">
								<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Properties By {selectedPortfolioDeveloper.company_name}</div>
								<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
									{selectedDeveloperProperties.length === 0 ? <p className="rounded-md bg-white px-3 py-4 text-sm text-black/50 md:col-span-2 xl:col-span-3">No properties found for this developer.</p> : null}
									{selectedDeveloperProperties.map((property) => {
										const propertyId = asText(property.id);
										const performance = listingChartRows.find((row) => row.property_id === propertyId);
										const active = selectedPortfolioPropertyId === propertyId;
										return (
											<button key={propertyId} type="button" onClick={() => onSelectPortfolioProperty(propertyId)} className={`rounded-md border px-3 py-2 text-left transition ${active ? "border-black/20 bg-white shadow-sm" : "border-black/10 bg-white hover:bg-zinc-50"}`}>
												<div className="truncate text-sm font-semibold text-[#111111]">{property.title ?? "Untitled property"}</div>
												<div className="mt-1 truncate text-xs text-black/45">{property.city ?? ""} {property.province ?? ""}</div>
												<div className="mt-3 flex items-center justify-between gap-3 text-xs text-black/50">
													<span>{performance?.total_views ?? 0} views</span>
													<span>{performance?.total_interactions ?? performance?.detail_opens ?? 0} interactions</span>
												</div>
											</button>
										);
									})}
								</div>
							</div>
						) : null}

						{developerPortfolioLevel === "property" && selectedPortfolioProperty ? (
							<div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
								<div className="rounded-lg border border-black/10 bg-white p-4">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Property Analytics</div>
											<div className="mt-1 text-lg font-semibold text-[#111111]">{selectedPortfolioProperty.title}</div>
											<p className="mt-1 text-sm text-black/50">{selectedPortfolioProperty.city ?? ""} {selectedPortfolioProperty.province ?? ""}</p>
										</div>
										<LeadScoreBadge score={selectedPropertyPerformance ? Math.min(1, (selectedPropertyPerformance.inquiry_rate_pct ?? 0) / 10) : null} />
									</div>
									<div className="mt-4 h-72">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={selectedPropertyChartRows} margin={{ top: 8, right: 8, left: -22, bottom: 18 }}>
												<CartesianGrid vertical={false} stroke="#ececec" />
												<XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
												<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
												<Tooltip content={<CmsChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
												<Bar dataKey="value" name="Count" fill="#111111" radius={[7, 7, 0, 0]} maxBarSize={42} />
											</BarChart>
										</ResponsiveContainer>
									</div>
								</div>

								<div className="rounded-lg border border-black/10 bg-white p-4">
									<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Engagement Detail</div>
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<InfoCard label="Total views" value={selectedPropertyPerformance?.total_views ?? 0} hint="Property page views." />
										<InfoCard label="Interactions" value={selectedPropertyPerformance?.total_interactions ?? selectedPropertyPerformance?.detail_opens ?? 0} hint="Gallery, map, inquiry, and recommendation interactions." />
										<InfoCard label="Inquiries" value={selectedPropertyPerformance?.total_inquiries ?? selectedPropertyInquiries.length} hint="Submitted leads for this property." />
										<InfoCard label="Avg. browse time" value={`${Math.round(selectedPropertyPerformance?.avg_dwell_seconds ?? 0)}s`} hint="Average recorded dwell time per property visit." />
										<InfoCard label="Inquiry rate" value={`${selectedPropertyPerformance?.inquiry_rate_pct ?? 0}%`} hint="Inquiry conversion percentage." />
									</div>
									<div className="mt-4 rounded-lg border border-black/10 bg-zinc-50 p-3 text-sm text-black/60">
										<div className="font-medium text-[#111111]">Recent property leads</div>
										<div className="mt-2 space-y-2">
											{selectedPropertyInquiries.slice(0, 4).map((inquiry) => (
												<div key={asText(inquiry.id)} className="flex items-center justify-between gap-3 border-t border-black/5 pt-2 first:border-t-0 first:pt-0">
													<span className="truncate">{inquiry.buyer_name ?? inquiry.buyer_email}</span>
													<span className="shrink-0 text-xs text-black/45">{relativeAge(inquiry.created_at)}</span>
												</div>
											))}
											{selectedPropertyInquiries.length === 0 ? <p className="text-sm text-black/45">No inquiries for this property yet.</p> : null}
										</div>
									</div>
								</div>
							</div>
						) : null}
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
	const [showSecondarySidebar, setShowSecondarySidebar] = useState(true);
	const [selectedPortfolioDeveloperId, setSelectedPortfolioDeveloperId] = useState<string | null>(null);
	const [selectedPortfolioPropertyId, setSelectedPortfolioPropertyId] = useState<string | null>(null);

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
					{ id: "pipeline", label: "Lead Stages", hint: "New to closed", icon: FolderTree },
					{ id: "timeline", label: "Activity History", hint: "Inquiry notes", icon: FileText },
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
	const selectedPortfolioDeveloperLabel = selectedPortfolioDeveloperId
		? asText(workspace.developerPortfolio.find((row) => asText(row.developer_id) === selectedPortfolioDeveloperId)?.company_name)
			|| asText(workspace.developers.find((row) => asText(row.id) === selectedPortfolioDeveloperId)?.company_name)
		: "";
	const selectedPortfolioPropertyLabel = selectedPortfolioPropertyId
		? asText(workspace.properties.find((row) => asText(row.id) === selectedPortfolioPropertyId)?.title)
		: "";
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
				engagementEventsResult,
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
				supabaseBrowser.from("analytics_events").select("id, event_type, created_at").order("created_at", { ascending: false }).limit(1000),
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
			nextWorkspace.engagementEvents = engagementEventsResult.data ?? [];
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
	const urgentLeads = useMemo(
		() => workspace.inquiries
			.filter((item) => !["reserved", "closed_won", "closed_lost"].includes(asText(item.status)))
			.filter((item) => asText(item.priority) === "high" || (toNullableNumber(item.lead_score) ?? 0) >= 0.72 || (!item.first_contacted_at && (hoursSince(item.created_at) ?? 0) >= 24))
			.sort((first, second) => (toNullableNumber(second.lead_score) ?? 0) - (toNullableNumber(first.lead_score) ?? 0))
			.slice(0, 5),
		[workspace.inquiries],
	);
	const unassignedLeads = useMemo(
		() => workspace.inquiries.filter((item) => !asText(item.assigned_agent_id) && !["reserved", "closed_won", "closed_lost"].includes(asText(item.status))).slice(0, 5),
		[workspace.inquiries],
	);
	const draftListings = useMemo(
		() => workspace.properties.filter((item) => asText(item.status || "draft") === "draft").slice(0, 5),
		[workspace.properties],
	);
	const lowPerformingListings = useMemo(
		() => workspace.listingPerformance
			.filter((item) => (toNullableNumber(item.total_views) ?? 0) >= 5 && (toNullableNumber(item.inquiry_rate_pct) ?? 0) < 2)
			.slice(0, 5),
		[workspace.listingPerformance],
	);
	const overviewInquiryTrend = useMemo(
		() => workspace.dailyInquiryVolume
			.slice()
			.reverse()
			.slice(-8)
			.map((row) => ({
				label: asText(row.inquiry_date).slice(5) || "day",
				value: toNullableNumber(row.total_inquiries) ?? 0,
			})),
		[workspace.dailyInquiryVolume],
	);
	const overviewPipelineRows = useMemo(() => {
		const counts = workspace.inquiries.reduce((acc: Record<string, number>, inquiry) => {
			const status = asText(inquiry.status || "new");
			acc[status] = (acc[status] ?? 0) + 1;
			return acc;
		}, {});
		return Object.entries(counts).map(([label, value]) => ({ label, value }));
	}, [workspace.inquiries]);
	const recentOverviewInquiries = useMemo(
		() => workspace.inquiries
			.slice()
			.sort((first, second) => new Date(asText(second.created_at)).getTime() - new Date(asText(first.created_at)).getTime())
			.slice(0, 5),
		[workspace.inquiries],
	);
	const listingPreviewRows = useMemo(
		() => workspace.listingPerformance
			.slice(0, 4)
			.map((row) => ({
				title: asText(row.title || "Untitled listing"),
				views: toNullableNumber(row.total_views) ?? 0,
				rate: toNullableNumber(row.inquiry_rate_pct) ?? 0,
			})),
		[workspace.listingPerformance],
	);
	const topTrafficSource = workspace.trafficSources[0];

	function openInquiryForEditing(inquiryId: string) {
		setActivePrimary("inquiries");
		setActiveSection("inquiries");
		setSelection((current) => ({ ...current, inquiries: inquiryId }));
		router.push("/admin/inquiries");
	}

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
					<div className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">Jewellz Realty CMS</div>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in required</h1>
					<p className="mt-2 text-sm leading-6 text-black/60">Use the login page to access the CMS. The dashboard honors Supabase Auth and role-based visibility from the profiles table.</p>
					<button onClick={() => router.push("/login")} className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-medium text-white transition hover:bg-black/80">Go to login</button>
				</div>
			</main>
		);
	}

	if (role === "buyer") {
		return <main className="min-h-screen bg-white px-6 py-10 text-[#111111]"><div className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-zinc-50 p-8 text-sm text-black/60">Buyer accounts do not have CMS access.</div></main>;
	}

	return (
		<main className="min-h-screen bg-[#f2f2ef] text-[#111111]">
			<div className={`grid min-h-screen w-full transition-[grid-template-columns] duration-200 ${showSecondarySidebar ? "lg:grid-cols-[56px_220px_1fr]" : "lg:grid-cols-[56px_0px_1fr]"}`}>
				<aside className="hidden border-r border-black/10 bg-[#fbfbfa] py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<div className="flex h-10 w-10 items-center justify-center rounded-md bg-white ring-1 ring-black/10">
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
										className={`flex h-9 w-9 items-center justify-center rounded-md transition ${active ? "bg-[#111111] text-white" : "text-black/55 hover:bg-white hover:text-[#111111]"}`}
										title={group.label}
									>
										<Icon className="h-4 w-4" />
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<button onClick={() => void reloadWorkspace()} className="flex h-9 w-9 items-center justify-center rounded-md text-black/55 transition hover:bg-white hover:text-[#111111]" title="Refresh">
							<RefreshCw className="h-4 w-4" />
						</button>
						<button onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex h-9 w-9 items-center justify-center rounded-md text-black/55 transition hover:bg-white hover:text-[#111111]" title="Sign out">
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</aside>

				<aside className={`${showSecondarySidebar ? "block" : "hidden lg:block lg:w-0 lg:overflow-hidden"} border-b border-black/10 bg-[#fbfbfa] transition-[width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r`}>
					<div className="border-b border-black/10 px-3 py-3">
						<div className="rounded-md border border-black/10 bg-white p-2">
							<div className="text-[10px] uppercase tracking-[0.14em] text-black/40">Agency</div>
							<div className="mt-1 truncate text-xs font-semibold text-[#111111]">Jewellz Realty</div>
							<p className="mt-0.5 truncate text-[11px] text-black/45">{profile.full_name}</p>
						</div>
					</div>

					<nav className="max-h-[calc(100vh-150px)] overflow-auto px-2 py-3">
						<div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40">{activeNavGroup?.label ?? "Dashboard"}</div>
						<div className="space-y-1">
							{activeSidebarItems.map((item) => {
								const ItemIcon = item.icon;
								const active = currentSection === item.id;
								return (
									<div key={item.id}>
										<button
											type="button"
											onClick={() => openSection(item.id)}
											className={`relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 pl-3 text-left transition ${active ? "bg-white text-[#111111] shadow-sm before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/65 hover:bg-white hover:text-[#111111]"}`}
										>
											<ItemIcon className="h-4 w-4 shrink-0" />
											<span className="min-w-0 flex-1">
												<span className="block text-sm font-medium">{item.label}</span>
												<span className={`block truncate text-[11px] ${active ? "text-black/45" : "text-black/40"}`}>{item.id === "properties" ? selectedCategoryLabel : item.hint}</span>
											</span>
										</button>
										{activePrimary === "listings" && item.id === "properties" ? (
											<div className="border-l-2 border-transparent py-1 pl-8 pr-2">
												<button
													type="button"
													onClick={() => openPropertyCategory("all")}
													className={`relative w-full rounded-md px-2 py-1.5 pl-3 text-left text-xs transition ${propertyCategoryFilter === "all" ? "bg-white font-medium text-[#111111] shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/50 hover:bg-white hover:text-[#111111]"}`}
												>
													All Categories
												</button>
												{propertySidebarCategoryOptions.map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() => openPropertyCategory(option.value)}
														className={`relative mt-1 w-full rounded-md px-2 py-1.5 pl-3 text-left text-xs transition ${propertyCategoryFilter === option.value ? "bg-white font-medium text-[#111111] shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/50 hover:bg-white hover:text-[#111111]"}`}
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

					<div className="border-t border-black/10 px-3 py-3">
						<div className="rounded-lg bg-white px-3 py-2 text-xs leading-5 text-black/55 ring-1 ring-black/5">
							<div>{message}</div>
							{saving ? <div className="font-medium text-[#111111]">Saving...</div> : null}
						</div>
						<div className="mt-3 flex gap-2 lg:hidden">
							<button onClick={() => void reloadWorkspace()} className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium">Refresh</button>
							<button onClick={async () => { await supabaseBrowser.auth.signOut(); router.push("/login"); router.refresh(); }} className="flex-1 rounded-xl bg-[#111111] px-3 py-2 text-sm font-medium text-white">Sign out</button>
						</div>
					</div>
				</aside>

				<section className="flex min-w-0 flex-col bg-[#f2f2ef]">
					<header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-black/10 bg-[#fbfbfa] px-4">
						<button type="button" onClick={() => setShowSecondarySidebar((current) => !current)} className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-black/60 transition hover:text-[#111111]" title={showSecondarySidebar ? "Hide sidebar" : "Show sidebar"}>
							{showSecondarySidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
						</button>
						<div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-black/45 md:flex">
							<span>{activeNavGroup?.label ?? "Dashboard"}</span>
							<span>/</span>
							<strong className="truncate text-[#111111]">{activeNavItem?.label ?? "Overview"}</strong>
							{currentSection === "developerPortfolio" && selectedPortfolioDeveloperLabel ? (
								<>
									<span>/</span>
									<strong className="truncate text-[#111111]">{selectedPortfolioDeveloperLabel}</strong>
								</>
							) : null}
							{currentSection === "developerPortfolio" && selectedPortfolioPropertyLabel ? (
								<>
									<span>/</span>
									<strong className="truncate text-[#111111]">{selectedPortfolioPropertyLabel}</strong>
								</>
							) : null}
						</div>
						<div className="relative ml-auto hidden w-full max-w-xs md:block">
							<div className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm text-black/60">
								<Search className="h-4 w-4" />
								<input value={dashboardSearch} onChange={(event) => setDashboardSearch(event.target.value)} placeholder="Search..." className="w-full bg-transparent text-sm outline-none placeholder:text-black/35" />
							</div>
							{dashboardSearch.trim() ? (
								<div className="absolute right-0 top-10 z-30 w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl">
									{dashboardSearchResults.length === 0 ? <div className="px-3 py-3 text-xs text-black/45">No CMS records found.</div> : null}
									{dashboardSearchResults.map((item) => (
										<button key={`${item.meta}-${item.label}`} type="button" onClick={() => { item.open(); setDashboardSearch(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-100">
											<span className="font-medium text-[#111111]">{item.label}</span>
											<span className="ml-2 text-xs text-black/45">{item.meta}</span>
										</button>
									))}
								</div>
							) : null}
						</div>
						<div className="hidden items-center gap-2 md:flex">
							<button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 bg-white px-2.5 text-xs text-black/60">
								<CalendarDays className="h-3.5 w-3.5" />
								{new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
							</button>
							{isAdmin ? (
								<button type="button" onClick={() => downloadCsv("jewellz-inquiries.csv", workspace.inquiries, ["id", "buyer_name", "buyer_email", "status", "priority", "lead_score", "created_at"])} className="inline-flex h-8 items-center gap-1 rounded-md bg-[#111111] px-3 text-xs font-medium text-white">
									<Download className="h-3.5 w-3.5" />
									Export CSV
								</button>
							) : null}
						</div>
						<div className="relative ml-1 flex items-center gap-2 text-black/60">
							<button type="button" onClick={() => setShowNotifications((current) => !current)} className="rounded-md border border-black/10 bg-white p-1.5 transition hover:bg-zinc-100" title="Notifications">
								<Bell className="h-4 w-4" />
							</button>
							<button type="button" onClick={() => setShowProfileMenu((current) => !current)} className="rounded-md border border-black/10 bg-white p-1.5 transition hover:bg-zinc-100" title={asText(profile.email ?? profile.full_name)}>
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

					<div className="flex-1 overflow-auto bg-[#f2f2ef] px-3 py-3 sm:px-4 lg:px-5">
						<div className="mx-auto flex max-w-7xl flex-col gap-3">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">
										Welcome back, {asText(profile.full_name).split(" ")[0] || "Admin"}
									</h1>
								</div>
								<div className="flex items-center gap-2">
									<button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 bg-white px-3 text-xs text-black/60">
										Daily
									</button>
									<button onClick={() => void reloadWorkspace()} className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
										<RefreshCw className="h-3.5 w-3.5" />
										Refresh
									</button>
								</div>
							</div>

						{currentSection === "overview" ? (
							<>
								<div className="grid gap-3">
									<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
										<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Needs attention</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{urgentLeads.length}</div>
											<p className="mt-2 text-xs text-black/50">High-intent or overdue leads.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Unassigned leads</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{unassignedLeads.length}</div>
											<p className="mt-2 text-xs text-black/50">Assign these before follow-up slips.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("listings"); setActiveSection("properties"); router.push("/admin/listings"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Draft listings</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{draftListings.length}</div>
											<p className="mt-2 text-xs text-black/50">Listings not yet public.</p>
										</button>
										<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); router.push("/admin?section=analytics"); }} className="rounded-lg border border-black/10 bg-white p-4 text-left transition hover:border-black/20 hover:bg-zinc-50">
											<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Low inquiry listings</div>
											<div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">{lowPerformingListings.length}</div>
											<p className="mt-2 text-xs text-black/50">Viewed listings below target rate.</p>
										</button>
									</div>

									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Inquiry Trend</div>
												<p className="mt-1 text-xs text-black/45">Latest daily lead volume from the analytics view.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); router.push("/admin?section=analytics"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">View report</button>
										</div>
										<div className="mt-3">
											<OverviewBars rows={overviewInquiryTrend} />
										</div>
									</div>
								</div>

								<div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Priority Leads</div>
												<p className="mt-1 text-xs text-black/45">Sorted by lead score and follow-up urgency.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">Open queue</button>
										</div>
										<div className="mt-4 space-y-2">
											{urgentLeads.length === 0 ? <p className="rounded-md bg-zinc-50 px-3 py-4 text-sm text-black/50">No urgent leads right now.</p> : null}
											{urgentLeads.map((lead) => (
												<button key={asText(lead.id)} type="button" onClick={() => openInquiryForEditing(asText(lead.id))} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-left transition hover:bg-zinc-50">
													<div className="flex items-start justify-between gap-3">
														<div className="min-w-0">
															<div className="truncate text-sm font-semibold text-[#111111]">{lead.buyer_name ?? lead.buyer_email}</div>
															<div className="mt-1 truncate text-xs text-black/50">{lead.status ?? "new"} · {lead.buyer_email}</div>
														</div>
														<div className="flex shrink-0 flex-col items-end gap-1">
															<LeadScoreBadge score={toNullableNumber(lead.lead_score)} />
															<span className="text-[11px] text-black/40">{relativeAge(lead.created_at)}</span>
														</div>
													</div>
												</button>
											))}
										</div>
									</div>

									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Pipeline Health</div>
												<p className="mt-1 text-xs text-black/45">Status distribution across visible leads.</p>
											</div>
											<div className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-black/60">{stats.closedCount} closed</div>
										</div>
										<div className="mt-4">
											<OverviewPipelineBars rows={overviewPipelineRows} />
										</div>
									</div>
								</div>

								<div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
									<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
										<div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Recent Inquiries</div>
												<p className="mt-1 text-xs text-black/45">Newest lead submissions entering the pipeline.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("inquiries"); setActiveSection("inquiries"); router.push("/admin/inquiries"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">See all</button>
										</div>
										<div className="overflow-x-auto">
											<table className="min-w-full text-left text-sm">
												<thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.08em] text-black/40">
													<tr>
														<th className="px-4 py-2 font-medium">Buyer</th>
														<th className="px-4 py-2 font-medium">Status</th>
														<th className="px-4 py-2 font-medium">Priority</th>
														<th className="px-4 py-2 font-medium">Age</th>
													</tr>
												</thead>
												<tbody>
													{recentOverviewInquiries.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-sm text-black/45">No inquiries yet.</td></tr> : null}
													{recentOverviewInquiries.map((inquiry) => (
														<tr key={asText(inquiry.id)} onClick={() => openInquiryForEditing(asText(inquiry.id))} className="cursor-pointer border-t border-black/5 transition hover:bg-zinc-50">
															<td className="max-w-[220px] px-4 py-3">
																<div className="truncate font-medium text-[#111111]">{inquiry.buyer_name ?? "Unnamed buyer"}</div>
																<div className="truncate text-xs text-black/45">{inquiry.buyer_email}</div>
															</td>
															<td className="px-4 py-3 text-black/60">{inquiry.status ?? "new"}</td>
															<td className="px-4 py-3 text-black/60">{inquiry.priority ?? "standard"}</td>
															<td className="px-4 py-3 text-black/45">{relativeAge(inquiry.created_at)}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>

									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="text-sm font-semibold text-[#111111]">Listing Performance</div>
												<p className="mt-1 text-xs text-black/45">Quick view of views and inquiry rate.</p>
											</div>
											<button type="button" onClick={() => { setActivePrimary("analytics"); setActiveSection("analytics"); router.push("/admin?section=analytics"); }} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">Full chart</button>
										</div>
										<div className="mt-4">
											<OverviewListingChart rows={listingPreviewRows} />
										</div>
									</div>
								</div>
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
															className="cursor-pointer border-b border-black/10 transition last:border-b-0 hover:bg-zinc-50 focus:bg-zinc-100 focus:outline-none"
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
							<EntityEditor title="Agents" description="Profile info, social links, top-agent flags, and live performance from assigned inquiry activity." rows={workspace.agents} selectedId={selectedAgentId} fields={agentFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => `${row.license_number ?? "no license"}${row.is_top_agent ? " • top agent" : ""}`} onSelect={(row) => setSelection((current) => ({ ...current, agents: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, agents: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("agents", row)} onSubmit={saveAgent} extra={<AgentMetricsSummary agentId={selectedAgentId} agentPerformance={workspace.agentPerformance} />} />
						) : null}

						{currentSection === "developers" && isAdmin ? (
							<EntityEditor title="Developer Partners" description="Company profile CRUD for developer partners." rows={workspace.developers} selectedId={selectedDeveloperId} fields={developerFields} canEdit={isAdmin} rowLabel={labelForRow} rowMeta={(row) => asText(row.contact_email ?? row.website_url ?? row.slug)} onSelect={(row) => setSelection((current) => ({ ...current, developers: row ? asText(row.id) : null }))} onCreateNew={() => setSelection((current) => ({ ...current, developers: NEW_RECORD_ID }))} onDelete={(row) => deleteEntity("developer_partners", row)} onSubmit={saveDeveloper} />
						) : null}

						{currentSection === "profiles" && isAdmin ? (
							<SectionShell title="Profiles & Buyers" description="Account overview with shortcuts into each buyer's inquiry history.">
								<div className="overflow-x-auto rounded-lg border border-black/10">
									<table className="min-w-full text-left text-sm">
										<thead className="text-xs uppercase tracking-[0.18em] text-black/45">
											<tr>
												<th className="px-4 py-3">Name</th>
												<th className="px-4 py-3">Email</th>
												<th className="px-4 py-3">Role</th>
												<th className="px-4 py-3">Active</th>
												<th className="px-4 py-3">Inquiries</th>
											</tr>
										</thead>
										<tbody>
											{workspace.profiles.length === 0 ? <tr><td colSpan={5} className="px-4 py-5 text-black/45">No profiles found.</td></tr> : null}
											{workspace.profiles.map((row) => {
												const email = asText(row.email).toLowerCase();
												const matchingInquiries = workspace.inquiries.filter((inquiry) => asText(inquiry.buyer_email).toLowerCase() === email);
												return (
													<tr key={asText(row.id)} className="border-t border-black/10">
														<td className="px-4 py-3 font-medium text-[#111111]">{row.full_name ?? "Unnamed"}</td>
														<td className="px-4 py-3 text-black/60">{row.email ?? "—"}</td>
														<td className="px-4 py-3 text-black/60">{row.role ?? "buyer"}</td>
														<td className="px-4 py-3 text-black/60">{asText(row.is_active) === "false" ? "No" : "Yes"}</td>
														<td className="px-4 py-3 text-black/60">
															{matchingInquiries.length ? (
																<button type="button" onClick={() => openInquiryForEditing(asText(matchingInquiries[0].id))} className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100">
																	View {matchingInquiries.length}
																</button>
															) : (
																<span className="text-black/35">None</span>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</SectionShell>
						) : null}

						{currentSection === "inquiries" || currentSection === "pipeline" || currentSection === "timeline" ? (
							<InquiryPanel activeView={currentSection} inquiries={workspace.inquiries} agents={workspace.agents} currentRole={role} currentUserId={sessionUser.id} selectedId={selectedInquiryId} onSelect={(id) => setSelection((current) => ({ ...current, inquiries: id }))} onReload={reloadWorkspace} canEdit={canEditInquiries} canReassign={canReassignInquiries} />
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
							<AnalyticsPanel activeReport={currentSection} isAdmin={isAdmin} properties={workspace.properties} inquiries={workspace.inquiries} recommendations={workspace.recommendations} listingPerformance={workspace.listingPerformance} dailyInquiryVolume={workspace.dailyInquiryVolume} trafficSources={workspace.trafficSources} agentPerformance={workspace.agentPerformance} developerPortfolio={workspace.developerPortfolio} engagementEvents={workspace.engagementEvents} selectedPortfolioDeveloperId={selectedPortfolioDeveloperId} selectedPortfolioPropertyId={selectedPortfolioPropertyId} onSelectPortfolioDeveloper={setSelectedPortfolioDeveloperId} onSelectPortfolioProperty={setSelectedPortfolioPropertyId} />
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
						<div className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60">Destructive Action</div>
						<h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#111111]">{destructiveAction.title}</h2>
						<p className="mt-2 text-sm leading-6 text-black/60">{destructiveAction.description}</p>
						<p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs leading-5 text-black/65">Please confirm you are sure. Enter your password to continue.</p>
						<label className="mt-4 block">
							<span className="text-xs font-semibold uppercase tracking-[0.18em] text-black/50">Password</span>
							<input
								type="password"
								value={destructivePassword}
								onChange={(event) => setDestructivePassword(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") void confirmDestructiveAction();
								}}
								className="mt-1 h-11 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30"
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
								className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20"
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
