"use client";

import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
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
	LandPlot,
	Tractor,
	Flower2,
	Video,
	UploadCloud,
	Link2,
} from "lucide-react";
import { compressVideo, VIDEO_COMPRESS_THRESHOLD_BYTES, VIDEO_MAX_UPLOAD_BYTES } from "@/lib/media/compress-video";
import { uploadFileWithProgress, UploadCancelledError } from "@/lib/supabase/upload-with-progress";
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
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<boolean | void>;
	renderPreview?: (payload: CmsPayload, currentRow: CmsRow | null) => ReactNode;
	extra?: ReactNode;
	saveBlocked?: boolean;
	saveBlockedMessage?: string;
};

// ─── Step definitions ────────────────────────────────────────────────────────

const PROPERTY_CATEGORY_ICONS: Record<string, typeof Building2> = {
	condo: Building2,
	house: Home,
	lot: LandPlot,
	farm: Tractor,
	memorial: Flower2,
};

function propertyCategoryIcon(category: string) {
	return PROPERTY_CATEGORY_ICONS[category.trim().toLowerCase()] ?? Building2;
}

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

function getYouTubeEmbedUrl(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname.includes("youtu.be")) {
			const id = parsed.pathname.slice(1);
			return `https://www.youtube.com/embed/${id}`;
		}
		const v = parsed.searchParams.get("v");
		if (v) return `https://www.youtube.com/embed/${v}`;
		if (parsed.pathname.includes("/embed/")) return url;
	} catch {
		// fallback
	}
	return url;
}

function getVimeoEmbedUrl(url: string): string {
	try {
		const match = url.match(/vimeo\.com\/(\d+)/);
		if (match?.[1]) {
			return `https://player.vimeo.com/video/${match[1]}`;
		}
	} catch {
		// fallback
	}
	return url;
}

function VideoWalkthroughInput({
	value,
	canEdit,
	onChange,
	onUploadingChange,
}: {
	value: string;
	canEdit: boolean;
	onChange: (val: string) => void;
	onUploadingChange?: (uploading: boolean) => void;
}) {
	const [uploading, setUploading] = useState(false);
	const [uploadPhase, setUploadPhase] = useState<"idle" | "compressing" | "uploading">("idle");
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadedMB, setUploadedMB] = useState(0);
	const [totalMB, setTotalMB] = useState(0);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [compressionNotice, setCompressionNotice] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const videoSrc = String(value || "").trim();
	const isYouTube = videoSrc.includes("youtube.com") || videoSrc.includes("youtu.be");
	const isVimeo = videoSrc.includes("vimeo.com");
	const isDirectVideo =
		/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(videoSrc) ||
		videoSrc.includes("storage/v1/object/public");

	const maxUploadMB = Math.round(VIDEO_MAX_UPLOAD_BYTES / 1024 / 1024);

	async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > VIDEO_MAX_UPLOAD_BYTES) {
			setUploadError(
				`This video is ${(file.size / 1024 / 1024).toFixed(1)} MB. The direct upload limit is ${maxUploadMB} MB — paste a YouTube or Vimeo link instead.`,
			);
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		const controller = new AbortController();
		abortControllerRef.current = controller;
		setUploading(true);
		onUploadingChange?.(true);
		setUploadError(null);
		setCompressionNotice(null);
		setUploadProgress(0);
		setUploadedMB(0);
		setTotalMB(+(file.size / 1024 / 1024).toFixed(1));

		try {
			let fileToUpload = file;

			if (file.size >= VIDEO_COMPRESS_THRESHOLD_BYTES) {
				setUploadPhase("compressing");
				try {
					fileToUpload = await compressVideo(file, {
						signal: controller.signal,
						onProgress: setUploadProgress,
					});
				} catch (err) {
					if (controller.signal.aborted) throw err;
					console.warn("Browser video compression failed; uploading the original file.", err);
					setCompressionNotice(
						"Browser compression was unavailable, so the original video will be uploaded.",
					);
					fileToUpload = file;
				}
			}

			if (controller.signal.aborted) throw new UploadCancelledError();

			setUploadPhase("uploading");
			setUploadProgress(0);
			setUploadedMB(0);
			setTotalMB(+(fileToUpload.size / 1024 / 1024).toFixed(1));

			const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, "_");
			const uniqueSuffix = Math.random().toString(36).slice(2, 8);
			const filePath = `${Date.now()}-${uniqueSuffix}-${cleanName}`;

			const uploaded = await uploadFileWithProgress({
				bucket: "property-videos",
				path: filePath,
				file: fileToUpload,
				contentType: fileToUpload.type || "video/mp4",
				signal: controller.signal,
				onProgress: ({ percent, loaded, total }) => {
					setUploadProgress(percent);
					setUploadedMB(+(loaded / 1024 / 1024).toFixed(1));
					setTotalMB(+(total / 1024 / 1024).toFixed(1));
				},
			});

			onChange(uploaded.publicUrl);
		} catch (err: unknown) {
			const cancelled =
				controller.signal.aborted ||
				err instanceof UploadCancelledError ||
				(err instanceof Error && err.name === "AbortError");
			if (!cancelled) {
				setUploadError(err instanceof Error ? err.message : "Failed to upload video.");
			}
		} finally {
			abortControllerRef.current = null;
			setUploading(false);
			onUploadingChange?.(false);
			setUploadPhase("idle");
			setUploadProgress(0);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	function handleCancelUpload() {
		abortControllerRef.current?.abort();
	}

	return (
		<div className="space-y-3 rounded-2xl border border-black/10 bg-zinc-50/70 p-4">
			<input
				ref={fileInputRef}
				type="file"
				accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/*"
				className="hidden"
				onChange={handleFileSelect}
				disabled={!canEdit || uploading}
			/>

			{videoSrc ? (
				<div className="space-y-2">
					<div className="relative overflow-hidden rounded-xl border border-black/15 bg-black">
						{isDirectVideo ? (
							<video
								src={videoSrc}
								controls
								playsInline
								className="max-h-56 w-full object-contain"
								preload="metadata"
							/>
						) : isYouTube ? (
							<div className="aspect-video w-full">
								<iframe
									src={getYouTubeEmbedUrl(videoSrc)}
									className="h-full w-full"
									allowFullScreen
								/>
							</div>
						) : isVimeo ? (
							<div className="aspect-video w-full">
								<iframe
									src={getVimeoEmbedUrl(videoSrc)}
									className="h-full w-full"
									allowFullScreen
								/>
							</div>
						) : (
							<div className="flex h-36 flex-col items-center justify-center p-4 text-center text-white">
								<Video className="mb-2 h-8 w-8 text-white/70" />
								<p className="max-w-md truncate text-xs font-medium text-white/80">{videoSrc}</p>
								<a
									href={videoSrc}
									target="_blank"
									rel="noreferrer"
									className="mt-2 text-xs font-semibold text-white/90 underline hover:text-white"
								>
									Open video link ↗
								</a>
							</div>
						)}
					</div>

					{uploading && (
						<div className="space-y-1.5 rounded-xl border border-[#DE141C]/20 bg-white p-3">
							<div className="flex items-center justify-between text-xs font-semibold text-[#DE141C]">
								<span>
									{uploadPhase === "compressing"
										? "Optimizing video in your browser…"
										: "Uploading new video…"}
								</span>
								<span className="tabular-nums">{uploadProgress}%</span>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
								<div
									className="h-full rounded-full bg-[#DE141C] transition-all duration-200"
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
							<div className="flex items-center justify-between gap-2 text-[11px] text-black/50">
								<span>
									{uploadPhase === "compressing"
										? "Compressing before upload"
										: `${uploadedMB} / ${totalMB} MB`}
								</span>
								<button
									type="button"
									onClick={handleCancelUpload}
									className="font-semibold text-red-600 underline hover:text-red-700"
								>
									Cancel
								</button>
							</div>
						</div>
					)}

					<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
						<span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
							<Check className="h-3.5 w-3.5 text-emerald-600" />
							Video walkthrough attached
						</span>
						{canEdit && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploading}
									className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#111111] transition hover:bg-zinc-100 disabled:opacity-50"
								>
									<UploadCloud className="h-3 w-3 text-black/60" />
									Replace file
								</button>
								<button
									type="button"
									onClick={() => onChange("")}
									className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
								>
									<Trash2 className="h-3 w-3" />
									Remove
								</button>
							</div>
						)}
					</div>
				</div>
			) : (
				<div
					onClick={() => {
						if (canEdit && !uploading) fileInputRef.current?.click();
					}}
					className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 bg-white p-6 text-center transition ${
						canEdit && !uploading ? "cursor-pointer hover:border-black/30 hover:bg-zinc-50" : "opacity-60"
					}`}
				>
					<div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-[#DE141C]">
						{uploading ? (
							<span className="h-5 w-5 animate-spin rounded-full border-2 border-[#DE141C]/30 border-t-[#DE141C]" />
						) : (
							<Video className="h-5 w-5" />
						)}
					</div>
					<div className="text-sm font-semibold text-[#111111]">
						{uploadPhase === "compressing"
							? "Optimizing video walkthrough…"
							: uploading
								? "Uploading video walkthrough…"
								: "Upload Video Walkthrough"}
					</div>
					{uploading ? (
						<div className="mt-3 w-full max-w-xs space-y-1.5" onClick={(ev) => ev.stopPropagation()}>
							<div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
								<div
									className="h-full rounded-full bg-[#DE141C] transition-all duration-200"
									style={{ width: `${uploadProgress}%` }}
								/>
							</div>
							<p className="text-xs font-semibold tabular-nums text-[#DE141C]">
								{uploadProgress}%&nbsp;&nbsp;
								<span className="font-normal text-black/50">
									{uploadPhase === "compressing" ? "optimized" : `${uploadedMB} / ${totalMB} MB`}
								</span>
							</p>
							<button
								type="button"
								onClick={handleCancelUpload}
								className="text-xs font-semibold text-red-600 underline hover:text-red-700"
							>
								Cancel upload
							</button>
						</div>
					) : (
						<>
							<p className="mt-1 text-xs text-black/50">
								Click to upload an MP4, MOV, or WebM walkthrough file
							</p>
							<p className="mt-1 text-[11px] text-black/40">
								Videos over 15 MB are compressed in your browser first. Limit: {maxUploadMB} MB.
							</p>
							{canEdit && (
								<button
									type="button"
									className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80"
								>
									<UploadCloud className="h-3.5 w-3.5" />
									Choose video file
								</button>
							)}
						</>
					)}
				</div>
			)}

			{uploadError && (
				<div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
					{uploadError}
				</div>
			)}

			{compressionNotice && (
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
					{compressionNotice}
				</div>
			)}

			<div className="pt-1">
				<div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-black/50">
					<Link2 className="h-3 w-3" />
					<span>Or paste video URL directly (YouTube, Vimeo, external link)</span>
				</div>
				<input
					type="url"
					name="video_url"
					value={videoSrc}
					placeholder="https://www.youtube.com/watch?v=... or https://..."
					disabled={!canEdit || uploading}
					onChange={(e) => onChange(e.target.value)}
					className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs text-[#111111] outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-2 focus:ring-black/5 disabled:bg-zinc-100"
				/>
			</div>
		</div>
	);
}

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldInput({
	field,
	value,
	payload,
	canEdit,
	onChange,
	onVideoUploadingChange,
}: {
	field: FieldSpec;
	value: CmsPayload[string];
	payload: CmsPayload;
	canEdit: boolean;
	onChange: (name: string, val: string | boolean) => void;
	onVideoUploadingChange?: (uploading: boolean) => void;
}) {
	if (field.name === "video_url") {
		return (
			<VideoWalkthroughInput
				value={asText(value)}
				canEdit={canEdit}
				onChange={(val) => onChange("video_url", val)}
				onUploadingChange={onVideoUploadingChange}
			/>
		);
	}

	const commonClass =
		"mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-2 focus:ring-black/5 disabled:bg-zinc-50 disabled:text-black/45";

	if (field.type === "textarea" || field.type === "array") {
		return (
			<textarea
				name={field.name}
				rows={field.rows ?? 4}
				value={displayValue(field, value)}
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
				value={displayValue(field, value)}
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
					checked={Boolean(value)}
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
			value={displayValue(field, value)}
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
	saveBlocked = false,
	saveBlockedMessage,
}: PropertyWizardProps) {
	const [search, setSearch] = useState("");
	const [wizardOpen, setWizardOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [saving, setSaving] = useState(false);
	const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
	const [previewPayload, setPreviewPayload] = useState<CmsPayload | null>(null);
	const formRef = useRef<HTMLFormElement | null>(null);
	const sectionRef = useRef<HTMLElement | null>(null);

	const selectedRow = useMemo(
		() => rows.find((r) => asText(r.id) === asText(selectedId)) ?? null,
		[rows, selectedId],
	);

	const [payload, setPayload] = useState<CmsPayload>(() =>
		buildEmptyPayload(fields, defaultValues, selectedRow),
	);
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [geocodeFeedback, setGeocodeFeedback] = useState<string | null>(null);
	const [videoUploading, setVideoUploading] = useState(false);

	const saveIsBlocked = saveBlocked || videoUploading;
	const saveBlockedLabel = saveBlocked
		? saveBlockedMessage
		: videoUploading
			? "Wait for the video upload to finish before saving."
			: undefined;

	async function handleAutoGeocode() {
		const address = asText(payload.address);
		const city = asText(payload.city);
		const province = asText(payload.province);
		if (!city && !province && !address) {
			setGeocodeFeedback("Please enter City or Province first.");
			return;
		}
		setIsGeocoding(true);
		setGeocodeFeedback(null);
		try {
			const query = [address, city, province, "Philippines"].filter(Boolean).join(", ");
			const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query), {
				headers: { "User-Agent": "JewellzRealty/1.0" },
			});
			if (res.ok) {
				const data = (await res.json()) as { lat?: string; lon?: string }[];
				if (data[0]?.lat && data[0]?.lon) {
					const lat = Number(Number(data[0].lat).toFixed(6));
					const lng = Number(Number(data[0].lon).toFixed(6));
					setPayload((prev) => ({ ...prev, latitude: lat, longitude: lng }));
					setGeocodeFeedback("Coordinates detected: " + lat + ", " + lng);
				} else {
					setGeocodeFeedback("Could not locate exact coordinates. Please check city and province.");
				}
			}
		} catch {
			setGeocodeFeedback("Geocoding failed. Please check network connection.");
		} finally {
			setIsGeocoding(false);
		}
	}

	const prevSelectedIdRef = useRef<string | null>(selectedId);

	useEffect(() => {
		if (prevSelectedIdRef.current !== selectedId) {
			prevSelectedIdRef.current = selectedId;
			let initialData = buildEmptyPayload(fields, defaultValues, selectedRow);
			try {
				const draftKey = selectedId === "__new__" || !selectedId
					? "jewellz_property_wizard_draft_new"
					: `jewellz_property_wizard_draft_${selectedId}`;
				const saved = typeof window !== "undefined" ? localStorage.getItem(draftKey) : null;
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed && typeof parsed === "object") {
						initialData = { ...initialData, ...parsed };
					}
				}
			} catch {}
			setPayload(initialData);
			setCurrentStep(0);
			setStepErrors({});
		}
	}, [selectedId, selectedRow, fields, defaultValues]);

	// Autosave active draft to localStorage
	useEffect(() => {
		if (!wizardOpen) return;
		try {
			const draftKey = selectedId === "__new__" || !selectedId
				? "jewellz_property_wizard_draft_new"
				: `jewellz_property_wizard_draft_${selectedId}`;
			localStorage.setItem(draftKey, JSON.stringify(payload));
		} catch {}
	}, [payload, selectedId, wizardOpen]);

	function clearDraft() {
		try {
			const draftKey = selectedId === "__new__" || !selectedId
				? "jewellz_property_wizard_draft_new"
				: `jewellz_property_wizard_draft_${selectedId}`;
			localStorage.removeItem(draftKey);
		} catch {}
	}

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
		if (saveIsBlocked) {
			setStepErrors({
				[STEPS[STEPS.length - 1].id]:
					saveBlockedLabel ?? "Please wait for the current upload to finish.",
			});
			return;
		}

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
			const saved = await onSubmit(payload, selectedRow);
			if (saved !== true) return;
			clearDraft();
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
		setTimeout(() => {
			sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 50);
	}

	function openWizardForNew() {
		onCreateNew();
		setWizardOpen(true);
		setCurrentStep(0);
		setStepErrors({});
		setTimeout(() => {
			sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 50);
	}

	function closeWizard() {
		clearDraft();
		setWizardOpen(false);
		setPreviewPayload(null);
		setStepErrors({});
		onSelect(null);
	}

	const step = STEPS[currentStep];
	const stepFieldList = stepFields(step, fields);
	const isLastStep = currentStep === STEPS.length - 1;
	const isFirstStep = currentStep === 0;

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<>
			{/* Main Properties Section (Swaps cleanly between card browsing and inline wizard editor) */}
			<section
				ref={sectionRef}
				className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all"
			>
				{wizardOpen ? (
					/* Inline Wizard Editor */
					<div className="flex flex-col">
						{/* Header */}
						<div className="border-b border-black/10 bg-white px-5 py-4 sm:px-6 sm:py-5">
							<div className="flex items-center justify-between gap-3">
								<button
									type="button"
									onClick={closeWizard}
									className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100"
								>
									<ChevronLeft className="h-4 w-4 text-black/60" />
									Back to properties
								</button>

								<div className="flex items-center gap-2">
									<span className="hidden sm:inline-block rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-black/60">
										Step {currentStep + 1} of {STEPS.length}
									</span>
									<button
										type="button"
										onClick={closeWizard}
										title="Close editor"
										className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 text-black/50 transition hover:bg-zinc-100 hover:text-[#111111]"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
							</div>

							<div className="mt-4">
								<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/45">
									{selectedRow ? `Editing · ${rowLabel(selectedRow)}` : "Create New Property"}
								</div>
								<div className="mt-1 text-xl font-bold tracking-tight text-[#111111]">
									{step.label}
								</div>
								<p className="mt-0.5 text-xs text-black/50">{step.description}</p>
							</div>
						</div>

						{/* Step Rail */}
						<div className="flex items-center gap-1.5 border-b border-black/10 bg-zinc-50/60 px-4 py-2.5 sm:px-6 overflow-x-auto scrollbar-hide">
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
										className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
											isActive
												? "bg-[#111111] text-white shadow-sm"
												: hasError
												? "bg-red-50 text-red-700 hover:bg-red-100"
												: isDone
												? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
												: "text-black/60 hover:bg-zinc-200/70 hover:text-black/90"
										}`}
									>
										{isDone && !hasError && !isActive ? (
											<Check className="h-3.5 w-3.5 text-emerald-600" />
										) : (
											<Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "opacity-70"}`} />
										)}
										<span>{s.label}</span>
										{hasError && (
											<span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
												!
											</span>
										)}
									</button>
								);
							})}
						</div>

						{/* Step Form Content */}
						<div className="px-5 py-6 sm:px-8 sm:py-7">
							{stepErrors[step.id] && (
								<div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
									{stepErrors[step.id]}
								</div>
							)}

							<form
								ref={formRef}
								id="property-wizard-form"
								onSubmit={(e) => e.preventDefault()}
							>
								<div className="grid gap-5 sm:grid-cols-2">
									{step.id === "location" && (
										<div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-4">
											<div>
												<div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
													<MapPin className="h-3.5 w-3.5 text-blue-600" />
													<span>Automatic Map Coordinates</span>
												</div>
												<p className="mt-0.5 text-[11px] text-blue-800/80">
													Detect Latitude & Longitude from City, Province & Address automatically.
												</p>
											</div>
											<button
												type="button"
												onClick={handleAutoGeocode}
												disabled={isGeocoding}
												className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
											>
												{isGeocoding ? "Detecting coordinates…" : "Auto-detect coordinates"}
											</button>
										</div>
									)}
									{geocodeFeedback && step.id === "location" && (
										<div className="sm:col-span-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-800">
											{geocodeFeedback}
										</div>
									)}
									{stepFieldList.map((field) => {
										const val = payload[field.name] ?? "";
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
														onVideoUploadingChange={setVideoUploading}
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
								<div className="mt-8 border-t border-black/10 pt-6">{extra}</div>
							)}
						</div>

						{/* Footer */}
						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-zinc-50/70 px-5 py-4 sm:px-8">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={closeWizard}
									className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/10 px-3.5 text-xs font-medium text-black/60 transition hover:bg-zinc-100 hover:text-[#111111]"
								>
									Cancel
								</button>
								{!isFirstStep && (
									<button
										type="button"
										onClick={handlePrev}
										className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 px-4 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100"
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
										className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 px-4 text-xs font-semibold text-red-600 transition hover:bg-red-50"
									>
										<Trash2 className="h-3.5 w-3.5" />
										Delete
									</button>
								)}
							</div>

							<div className="flex items-center gap-2.5">
								<span className="text-xs text-black/45 sm:hidden">
									{currentStep + 1} / {STEPS.length}
								</span>

								{saveIsBlocked && saveBlockedLabel && (
									<span className="hidden max-w-[260px] text-right text-[11px] font-medium text-amber-700 sm:inline">
										{saveBlockedLabel}
									</span>
								)}

								{isLastStep && renderPreview && (
									<button
										type="button"
										disabled={!canEdit}
										onClick={() => setPreviewPayload({ ...payload })}
										className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-[#111111] transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										<Eye className="h-3.5 w-3.5" />
										Preview
									</button>
								)}

								{!isLastStep ? (
									<button
										type="button"
										onClick={handleNext}
										className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-5 text-xs font-semibold text-white transition hover:bg-black/80 shadow-sm"
									>
										Next
										<ChevronRight className="h-4 w-4" />
									</button>
								) : (
									<button
										type="button"
										disabled={!canEdit || saving || saveIsBlocked}
										onClick={handleSave}
										className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-5 text-xs font-semibold text-white transition hover:bg-black/80 shadow-sm disabled:cursor-not-allowed disabled:bg-black/20"
									>
										{saving ? (
											<>
												<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
												Saving…
											</>
										) : (
											<>
												<Check className="h-3.5 w-3.5" />
												{selectedRow ? "Save changes" : "Create listing"}
											</>
										)}
									</button>
								)}
							</div>
						</div>
					</div>
				) : (
					/* Browsing Panel (Cards Grid) */
					<div>
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
									className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black/80 shadow-sm"
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
									<p className="text-sm font-medium text-black/45">No properties found</p>
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
										const CategoryIcon = propertyCategoryIcon(asText(row.category));

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
													<CategoryIcon className="h-5 w-5 text-black/40" />
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
					</div>
				)}
			</section>

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
									disabled={!canEdit || saving || saveIsBlocked}
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
