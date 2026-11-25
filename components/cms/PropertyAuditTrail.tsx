"use client";

import { Clock3, History, Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import type { CmsRevision, CmsRow } from "./types";
import { asText } from "./utils";

type PropertyAuditTrailProps = {
	revisions: CmsRevision[];
	profiles: CmsRow[];
	error?: string;
};

function readableValue(value: unknown) {
	if (value == null || value === "") return "—";
	const text = typeof value === "string" ? value : JSON.stringify(value);
	return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

function changedFields(revision: CmsRevision) {
	const before = revision.old_data ?? {};
	const after = revision.new_data ?? {};
	const ignored = new Set(["id", "created_at", "updated_at", "created_by", "updated_by", "embedding", "embedding_text", "embedding_updated_at"]);
	return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
		.filter((key) => !ignored.has(key) && JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
		.map((key) => ({ key, before: before[key], after: after[key] }));
}

function actionPresentation(revision: CmsRevision) {
	const isPhoto = revision.table_name === "property_images";
	if (revision.action === "insert") return { label: isPhoto ? "Photo added" : "Property added", icon: Plus, className: "bg-emerald-50 text-emerald-700" };
	if (revision.action === "delete") return { label: isPhoto ? "Photo removed" : "Property deleted", icon: Trash2, className: "bg-red-50 text-[#DE141C]" };
	return { label: isPhoto ? "Photo updated" : "Property edited", icon: isPhoto ? ImageIcon : Pencil, className: "bg-amber-50 text-amber-700" };
}

export function PropertyAuditTrail({ revisions, profiles, error }: PropertyAuditTrailProps) {
	const visibleRevisions = revisions.filter((revision) => {
		if (revision.table_name !== "properties" || revision.action !== "update") return true;
		// Embedding generation updates internal AI fields using the service role.
		// Those are system maintenance, not edits made to the listing itself.
		return changedFields(revision).length > 0;
	});
	const previousTitles = new Map(visibleRevisions
		.filter((row) => row.table_name === "properties")
		.map((row) => [row.row_id, asText(row.new_data?.title ?? row.old_data?.title)])
		.filter(([, title]) => Boolean(title)) as Array<[string, string]>);

	return (
		<section className="overflow-hidden border border-black/10 bg-white">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.07] bg-zinc-50/70 px-4 py-3 sm:px-5">
				<div className="flex items-center gap-2.5">
					<span className="grid h-8 w-8 place-items-center bg-[#DE141C] text-white"><History className="h-4 w-4" /></span>
					<div>
						<h2 className="text-sm font-semibold text-[#111111]">Property audit trail</h2>
						<p className="mt-0.5 text-xs text-black/50">Property and photo additions, edits, and deletions.</p>
					</div>
				</div>
				<span className="text-xs tabular-nums text-black/45">{visibleRevisions.length} recent changes</span>
			</header>
			{error ? (
				<div className="m-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:m-5">
					<p className="font-semibold">Audit history isn’t available yet.</p>
					<p className="mt-1 text-xs leading-5">Run <code className="rounded bg-white px-1.5 py-0.5">supabase/property-audit-trail.sql</code> in the Supabase SQL Editor, then refresh this page. {error}</p>
				</div>
			) : visibleRevisions.length === 0 ? (
				<div className="px-5 py-12 text-center">
					<Clock3 className="mx-auto h-6 w-6 text-black/30" />
					<p className="mt-3 text-sm font-medium text-black/65">No property changes recorded yet.</p>
					<p className="mt-1 text-xs text-black/40">Changes made after the audit trigger is installed will appear here.</p>
				</div>
			) : (
				<div className="divide-y divide-black/[0.06]">
					{visibleRevisions.map((revision) => {
						const presentation = actionPresentation(revision);
						const ActionIcon = presentation.icon;
						const snapshot = revision.new_data ?? revision.old_data ?? {};
						const propertyId = revision.table_name === "properties" ? revision.row_id : asText(snapshot.property_id ?? revision.row_id);
						const title = asText(snapshot.title ?? previousTitles.get(propertyId) ?? snapshot.caption) || "Untitled property";
						const actor = profiles.find((profile) => asText(profile.id) === asText(revision.changed_by));
						const actorLabel = asText(actor?.full_name ?? actor?.display_name ?? actor?.email) || "System or unknown user";
						const fields = revision.action === "update" ? changedFields(revision) : [];
						return (
							<details key={revision.id} className="group px-4 py-3.5 sm:px-5">
								<summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/40">
									<div className="flex min-w-0 items-center gap-3">
										<span className={`grid h-8 w-8 shrink-0 place-items-center ${presentation.className}`}><ActionIcon className="h-4 w-4" /></span>
										<span className="min-w-0">
											<span className="block truncate text-sm font-semibold text-[#111111]">{title}</span>
											<span className="mt-0.5 block text-xs text-black/50">{presentation.label} <span aria-hidden="true">·</span> {actorLabel}</span>
										</span>
									</div>
									<span className="shrink-0 text-xs text-black/45">{revision.created_at ? new Date(revision.created_at).toLocaleString() : "Date unavailable"}</span>
								</summary>
								<div className="ml-11 mt-3 border-l-2 border-black/[0.07] pl-3">
									{revision.action === "insert" ? <p className="text-xs text-black/60">New record created{revision.table_name === "property_images" ? " for this property" : " in the property catalog"}.</p> : null}
									{revision.action === "delete" ? <p className="text-xs text-black/60">Record removed from the property catalog. Its prior details are retained in this audit entry.</p> : null}
									{revision.action === "update" ? fields.length ? <div className="space-y-2">
										{fields.map((field) => <div key={field.key} className="grid gap-1 text-xs sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3"><span className="font-semibold text-black/60">{field.key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</span><span className="break-words text-black/50"><span className="line-through decoration-black/30">{readableValue(field.before)}</span><span className="mx-2 text-black/30">→</span><span className="font-medium text-[#111111]">{readableValue(field.after)}</span></span></div>)}
									</div> : <p className="text-xs text-black/50">The record was saved; no content field differences were detected.</p> : null}
								</div>
							</details>
						);
					})}
				</div>
			)}
		</section>
	);
}
