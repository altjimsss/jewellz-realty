"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import { FOOTER_CONTENT_KEY, type FooterContent, type FooterLink, parseFooterContent } from "@/lib/footer-content";
import type { CmsPayload, CmsRow } from "./types";

type Props = {
	row: CmsRow | null;
	canEdit: boolean;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<boolean | void>;
	onDelete: (row: CmsRow) => void;
};

const inputClass = "mt-1.5 w-full border border-black/10 bg-white px-3 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/45 focus:ring-2 focus:ring-[#DE141C]/10 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "block text-xs font-semibold text-black/65";

export function FooterEditor({ row, canEdit, onSubmit, onDelete }: Props) {
	const [content, setContent] = useState<FooterContent>(() => parseFooterContent(row?.value));
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	function update<K extends keyof FooterContent>(key: K, value: FooterContent[K]) {
		setContent((current) => ({ ...current, [key]: value }));
	}

	function updateLinkList(key: "quickLinks" | "socialLinks" | "legalLinks", index: number, link: FooterLink) {
		update(key, content[key].map((item, itemIndex) => itemIndex === index ? link : item));
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!canEdit || saving) return;
		setSaving(true);
		setStatus("Saving footer...");
		try {
			const saved = await onSubmit({ key: FOOTER_CONTENT_KEY, value: JSON.stringify(content), description: "Editable public website footer content" }, row);
			setStatus(saved === false ? "Could not save. Check the admin error message." : "Footer saved. The public site may take a few seconds to refresh.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="overflow-hidden border border-black/10 bg-white">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-4 sm:px-5">
				<div>
					<h2 className="text-base font-semibold text-[#111111]">Website footer</h2>
					<p className="mt-1 text-xs text-black/50">Edit the company details, contact information, links, and social accounts shown at the bottom of public pages.</p>
				</div>
				<div className="flex items-center gap-2">
					<a href="/" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 transition hover:bg-zinc-50"><ExternalLink className="h-3.5 w-3.5" /> Preview site</a>
					{row && canEdit ? <button type="button" onClick={() => onDelete(row)} className="inline-flex h-9 items-center gap-1.5 border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Reset footer</button> : null}
				</div>
			</header>
			<form onSubmit={submit} className="space-y-6 p-4 sm:p-5">
				<Section title="Company information" description="The brand and short description in the first footer column.">
					<div className="grid gap-4 md:grid-cols-2">
						<Field label="Company name" value={content.companyName} disabled={!canEdit} onChange={(value) => update("companyName", value)} />
						<Field label="Tagline" value={content.tagline} disabled={!canEdit} onChange={(value) => update("tagline", value)} />
						<Area className="md:col-span-2" label="Description" value={content.description} disabled={!canEdit} onChange={(value) => update("description", value)} />
						<Field label="Credential / short label" value={content.credential} disabled={!canEdit} onChange={(value) => update("credential", value)} />
					</div>
				</Section>

				<Section title="Quick links" description="Edit, add, or remove navigation links in the footer.">
					<LinkList links={content.quickLinks} disabled={!canEdit} onChange={(links) => update("quickLinks", links)} />
					<AddButton disabled={!canEdit} onClick={() => update("quickLinks", [...content.quickLinks, { label: "", href: "/" }])}>Add quick link</AddButton>
				</Section>

				<Section title="Contact details" description="These details appear in the Contact column.">
					<div className="grid gap-4 md:grid-cols-2">
						<Field label="Column heading" value={content.contactHeading} disabled={!canEdit} onChange={(value) => update("contactHeading", value)} />
						<Field label="Phone number" value={content.phone} disabled={!canEdit} onChange={(value) => update("phone", value)} />
						<Area className="md:col-span-2" label="Address" value={content.address} disabled={!canEdit} onChange={(value) => update("address", value)} rows={2} />
						<Field label="Email address" type="email" value={content.email} disabled={!canEdit} onChange={(value) => update("email", value)} />
					</div>
				</Section>

				<Section title="Social accounts" description="Social icon URLs and the caption below them.">
					<div className="grid gap-4 md:grid-cols-2">
						<Field label="Column heading" value={content.socialHeading} disabled={!canEdit} onChange={(value) => update("socialHeading", value)} />
						<Field label="Caption" value={content.socialCaption} disabled={!canEdit} onChange={(value) => update("socialCaption", value)} />
					</div>
					<div className="mt-3"><LinkList links={content.socialLinks} disabled={!canEdit} onChange={(links) => update("socialLinks", links)} urlLabel="Profile URL" /></div>
					<AddButton disabled={!canEdit} onClick={() => update("socialLinks", [...content.socialLinks, { label: "", href: "https://" }])}>Add social account</AddButton>
				</Section>

				<Section title="Bottom bar" description="Portal access label and copyright / legal links.">
					<Field label="Portal access heading" value={content.accessHeading} disabled={!canEdit} onChange={(value) => update("accessHeading", value)} />
					<div className="mt-4 grid gap-4 md:grid-cols-2">
						<Field label="Copyright ending" value={content.copyright} disabled={!canEdit} onChange={(value) => update("copyright", value)} />
					</div>
					<div className="mt-3"><LinkList links={content.legalLinks} disabled={!canEdit} onChange={(links) => update("legalLinks", links)} /></div>
					<AddButton disabled={!canEdit} onClick={() => update("legalLinks", [...content.legalLinks, { label: "", href: "/" }])}>Add legal link</AddButton>
				</Section>

				<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
					<p role="status" className="text-xs text-black/45">{status || (canEdit ? "Save to publish footer updates across the public website." : "Read-only for this role.")}</p>
					<button type="submit" disabled={!canEdit || saving} className="inline-flex h-10 items-center gap-2 bg-[#111111] px-4 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Saving..." : row ? "Save footer" : "Publish footer"}</button>
				</footer>
			</form>
			{!row ? <p className="border-t border-black/[0.06] bg-zinc-50 px-4 py-3 text-xs text-black/45 sm:px-5">The website is currently using its built-in footer. Saving creates an editable CMS version.</p> : null}
		</section>
	);
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
	return <section><div className="mb-3 border-b border-black/[0.06] pb-2"><h3 className="text-sm font-semibold text-[#111111]">{title}</h3><p className="mt-0.5 text-xs text-black/45">{description}</p></div>{children}</section>;
}

function Field({ label, value, disabled, onChange, type = "text" }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; type?: "text" | "email" }) {
	return <label className={labelClass}>{label}<input type={type} className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Area({ label, value, disabled, onChange, rows = 3, className = "" }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; rows?: number; className?: string }) {
	return <label className={`${labelClass} ${className}`}>{label}<textarea className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={rows} /></label>;
}

function LinkList({ links, disabled, onChange, urlLabel = "Link URL" }: { links: FooterLink[]; disabled: boolean; onChange: (links: FooterLink[]) => void; urlLabel?: string }) {
	return <div className="space-y-2">{links.map((link, index) => <div key={`${index}-${link.label}`} className="grid gap-2 border border-black/[0.08] p-3 sm:grid-cols-[0.7fr_1.3fr_auto] sm:items-end">
		<label className={labelClass}>Label<input className={inputClass} value={link.label} disabled={disabled} onChange={(event) => onChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /></label>
		<label className={labelClass}>{urlLabel}<input className={inputClass} value={link.href} disabled={disabled} onChange={(event) => onChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, href: event.target.value } : item))} /></label>
		<button type="button" disabled={disabled} aria-label={`Remove ${link.label || "link"}`} title="Remove link" onClick={() => onChange(links.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex h-9 w-9 items-center justify-center border border-red-100 text-red-700 transition hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
	</div>)}</div>;
}

function AddButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
	return <button type="button" disabled={disabled} onClick={onClick} className="mt-3 inline-flex h-9 items-center gap-1.5 border border-black/10 bg-white px-3 text-xs font-semibold text-black/65 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{children}</button>;
}
