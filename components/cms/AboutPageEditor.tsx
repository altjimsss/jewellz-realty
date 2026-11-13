"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { ABOUT_PAGE_CONTENT_KEY, parseAboutPageContent, type AboutHighlight, type AboutPageContent, type AboutStat, type AboutTeamMember } from "@/lib/about-page-content";
import type { CmsPayload, CmsRow } from "./types";

type AboutPageEditorProps = {
	row: CmsRow | null;
	canEdit: boolean;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<boolean | void>;
	onDelete: (row: CmsRow) => void;
};

const inputClass = "mt-1.5 w-full border border-black/10 bg-white px-3 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/45 focus:ring-2 focus:ring-[#DE141C]/10 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "block text-xs font-semibold text-black/65";

export function AboutPageEditor({ row, canEdit, onSubmit, onDelete }: AboutPageEditorProps) {
	const [content, setContent] = useState<AboutPageContent>(() => parseAboutPageContent(row?.value));
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	function updateContent<K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) {
		setContent((current) => ({ ...current, [key]: value }));
	}

	function updateStat(index: number, value: AboutStat) {
		setContent((current) => ({ ...current, stats: current.stats.map((item, itemIndex) => itemIndex === index ? value : item) }));
	}
	function updateHighlight(index: number, value: AboutHighlight) {
		setContent((current) => ({ ...current, highlights: current.highlights.map((item, itemIndex) => itemIndex === index ? value : item) }));
	}
	function updateTeamMember(index: number, value: AboutTeamMember) {
		setContent((current) => ({ ...current, teamMembers: current.teamMembers.map((item, itemIndex) => itemIndex === index ? value : item) }));
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!canEdit || saving) return;
		setSaving(true);
		setStatus("Saving About Us page...");
		try {
			const saved = await onSubmit({
				key: ABOUT_PAGE_CONTENT_KEY,
				value: JSON.stringify(content),
				description: "Editable content for the public About Us page",
			}, row);
			setStatus(saved === false ? "Could not save. Check the admin error message." : "About Us page saved.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="overflow-hidden border border-black/10 bg-white">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-4 sm:px-5">
				<div>
					<h2 className="text-base font-semibold text-[#111111]">About Us page</h2>
					<p className="mt-1 text-xs text-black/50">Edit the page copy, highlights, stats, and leadership cards shown to visitors.</p>
				</div>
				<div className="flex items-center gap-2">
					<a href="/about-us" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 transition hover:bg-zinc-50">
						<ExternalLink className="h-3.5 w-3.5" /> Preview page
					</a>
					{row && canEdit ? (
						<button type="button" onClick={() => onDelete(row)} className="inline-flex h-9 items-center gap-1.5 border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50">
							<Trash2 className="h-3.5 w-3.5" /> Reset page
						</button>
					) : null}
				</div>
			</header>

			<form className="space-y-6 p-4 sm:p-5" onSubmit={handleSubmit}>
				<EditorSection title="Intro section" description="The first section visitors see at the top of About Us.">
					<div className="grid gap-4 md:grid-cols-2">
						<TextField label="Small heading" value={content.eyebrow} disabled={!canEdit} onChange={(value) => updateContent("eyebrow", value)} />
						<TextField label="Subheading" value={content.subtitle} disabled={!canEdit} onChange={(value) => updateContent("subtitle", value)} />
						<TextField label="Main heading" value={content.title} disabled={!canEdit} onChange={(value) => updateContent("title", value)} />
						<TextField label="Button label" value={content.ctaLabel} disabled={!canEdit} onChange={(value) => updateContent("ctaLabel", value)} />
						<TextField label="Button link" value={content.ctaUrl} disabled={!canEdit} onChange={(value) => updateContent("ctaUrl", value)} placeholder="/contact" />
						<TextField label="Hero image URL" value={content.heroImageUrl} disabled={!canEdit} onChange={(value) => updateContent("heroImageUrl", value)} placeholder="/assets/about-banner.webp or https://..." />
						<div className="md:col-span-2"><TextArea label="Introduction" value={content.introduction} disabled={!canEdit} onChange={(value) => updateContent("introduction", value)} rows={4} /></div>
					</div>
				</EditorSection>

				<EditorSection title="Page statistics" description="Add or remove the number highlights shown below the introduction.">
					<div className="space-y-2">
						{content.stats.map((item, index) => (
							<div key={`stat-${index}`} className="grid gap-2 border border-black/[0.08] p-3 sm:grid-cols-[0.8fr_1.2fr_auto] sm:items-end">
								<TextField label="Value" value={item.value} disabled={!canEdit} onChange={(value) => updateStat(index, { ...item, value })} placeholder="25+" />
								<TextField label="Label" value={item.label} disabled={!canEdit} onChange={(value) => updateStat(index, { ...item, label: value })} placeholder="Years of experience" />
								<RemoveButton disabled={!canEdit} label={`Remove statistic ${item.label || index + 1}`} onClick={() => updateContent("stats", content.stats.filter((_, itemIndex) => itemIndex !== index))} />
							</div>
						))}
					</div>
					<AddButton disabled={!canEdit} onClick={() => updateContent("stats", [...content.stats, { value: "", label: "" }])}>Add statistic</AddButton>
				</EditorSection>

				<EditorSection title="Highlights" description="Edit the three information cards, or add and remove cards as needed.">
					<div className="grid gap-3 lg:grid-cols-2">
						{content.highlights.map((item, index) => (
							<div key={`highlight-${index}`} className="border border-black/[0.08] p-3">
								<div className="flex items-center justify-between gap-3">
									<p className="text-xs font-semibold text-black/50">Card {index + 1}</p>
									<RemoveButton disabled={!canEdit} label={`Remove highlight ${item.title || index + 1}`} onClick={() => updateContent("highlights", content.highlights.filter((_, itemIndex) => itemIndex !== index))} />
								</div>
								<div className="mt-2 space-y-3">
									<TextField label="Title" value={item.title} disabled={!canEdit} onChange={(value) => updateHighlight(index, { ...item, title: value })} />
									<TextArea label="Description" value={item.description} disabled={!canEdit} onChange={(value) => updateHighlight(index, { ...item, description: value })} rows={3} />
								</div>
							</div>
						))}
					</div>
					<AddButton disabled={!canEdit} onClick={() => updateContent("highlights", [...content.highlights, { title: "", description: "" }])}>Add highlight</AddButton>
				</EditorSection>

				<EditorSection title="Leadership section" description="Update the team section heading and member cards.">
					<div className="grid gap-4 md:grid-cols-2">
						<TextField label="Section heading" value={content.teamHeading} disabled={!canEdit} onChange={(value) => updateContent("teamHeading", value)} />
						<TextField label="Section description" value={content.teamDescription} disabled={!canEdit} onChange={(value) => updateContent("teamDescription", value)} />
					</div>
					<div className="mt-4 grid gap-3 lg:grid-cols-2">
						{content.teamMembers.map((member, index) => (
							<div key={`team-${index}`} className="border border-black/[0.08] p-3">
								<div className="flex items-center justify-between gap-3">
									<p className="text-xs font-semibold text-black/50">Member {index + 1}</p>
									<RemoveButton disabled={!canEdit} label={`Remove ${member.name || `member ${index + 1}`}`} onClick={() => updateContent("teamMembers", content.teamMembers.filter((_, itemIndex) => itemIndex !== index))} />
								</div>
								<div className="mt-2 grid gap-3">
									<TextField label="Name" value={member.name} disabled={!canEdit} onChange={(value) => updateTeamMember(index, { ...member, name: value })} />
									<TextField label="Role" value={member.role} disabled={!canEdit} onChange={(value) => updateTeamMember(index, { ...member, role: value })} />
									<TextField label="Photo URL" value={member.imageUrl} disabled={!canEdit} onChange={(value) => updateTeamMember(index, { ...member, imageUrl: value })} placeholder="/assets/team-member.webp or https://..." />
									<div className="grid gap-3 sm:grid-cols-3">
										<TextField label="X / Twitter profile" type="url" value={member.twitterUrl} disabled={!canEdit} onChange={(value) => updateTeamMember(index, { ...member, twitterUrl: value })} placeholder="https://x.com/username" />
										<TextField label="Instagram profile" type="url" value={member.instagramUrl} disabled={!canEdit} onChange={(value) => updateTeamMember(index, { ...member, instagramUrl: value })} placeholder="https://instagram.com/username" />
										<TextField label="LinkedIn profile" type="url" value={member.linkedinUrl} disabled={!canEdit} onChange={(value) => updateTeamMember(index, { ...member, linkedinUrl: value })} placeholder="https://linkedin.com/in/username" />
									</div>
								</div>
							</div>
						))}
					</div>
					<AddButton disabled={!canEdit} onClick={() => updateContent("teamMembers", [...content.teamMembers, { name: "", role: "", imageUrl: "", twitterUrl: "", instagramUrl: "", linkedinUrl: "" }])}>Add team member</AddButton>
				</EditorSection>

				<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
					<p role="status" className="text-xs text-black/45">{status || (canEdit ? "Changes appear on the public About Us page after saving." : "Read-only for this role.")}</p>
					<button type="submit" disabled={!canEdit || saving} className="inline-flex h-10 items-center gap-2 bg-[#111111] px-4 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50">
						<Save className="h-4 w-4" /> {saving ? "Saving..." : row ? "Save About Us page" : "Publish About Us page content"}
					</button>
				</footer>
			</form>
			{!row ? <p className="border-t border-black/[0.06] bg-zinc-50 px-4 py-3 text-xs text-black/45 sm:px-5">The page is currently using its built-in content. Save edits to make an editable CMS copy.</p> : null}
		</section>
	);
}

function EditorSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
	return (
		<section>
			<div className="mb-3 border-b border-black/[0.06] pb-2">
				<h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
				<p className="mt-0.5 text-xs text-black/45">{description}</p>
			</div>
			{children}
		</section>
	);
}

function TextField({ label, value, disabled, onChange, placeholder, type = "text" }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; placeholder?: string; type?: "text" | "url" }) {
	return <label className={labelClass}>{label}<input type={type} className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function TextArea({ label, value, disabled, onChange, rows }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; rows: number }) {
	return <label className={labelClass}>{label}<textarea className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={rows} /></label>;
}

function AddButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
	return <button type="button" disabled={disabled} onClick={onClick} className="mt-3 inline-flex h-9 items-center gap-1.5 border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{children}</button>;
}

function RemoveButton({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) {
	return <button type="button" disabled={disabled} aria-label={label} title="Remove" onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center border border-red-100 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>;
}
