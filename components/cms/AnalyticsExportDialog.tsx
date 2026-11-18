"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Download, FileSpreadsheet, Loader2, Mail, RefreshCw, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { DEFAULT_ANALYTICS_REPORT_SCHEDULE, type AnalyticsReportCategory, type AnalyticsReportPeriod, type AnalyticsReportSchedule, type AnalyticsReportSection } from "@/lib/analytics-report-schedule";
import type { CmsRow } from "./types";

export type AnalyticsExportOption = { label: string; description: string; filename: string; rows: CmsRow[]; columns: string[] };
export type AnalyticsPdfReport = {
	id: string;
	title: string;
	description: string;
	metrics: Array<{ label: string; value: string | number }>;
	charts: Array<{ title: string; subtitle?: string; type: "bar" | "line"; labels: string[]; series: Array<{ name: string; color: string; values: number[] }> }>;
	table?: { title: string; headers: string[]; rows: string[][] };
};

const categoryOptions: Array<{ id: AnalyticsReportCategory; label: string; description: string }> = [
	{ id: "traffic", label: "Visitor traffic", description: "Sessions, sources, and browsing activity" },
	{ id: "property", label: "Listing performance", description: "Listing interest and inquiry rates" },
	{ id: "engagement", label: "Visitor activity", description: "How visitors interact with listings" },
	{ id: "predictive", label: "Inquiries and estimates", description: "Lead trends, forecasts, and risks" },
];

const sectionOptions: Array<{ id: AnalyticsReportSection; label: string }> = [
	{ id: "executiveSummary", label: "Executive summary" },
	{ id: "descriptiveFindings", label: "Key findings" },
	{ id: "predictiveInsights", label: "Forecasts and estimates" },
	{ id: "riskFlags", label: "High-risk alerts" },
	{ id: "recommendedActions", label: "Recommended actions" },
];

const periodOptions: Array<{ id: AnalyticsReportPeriod; label: string; note: string }> = [
	{ id: "daily", label: "Daily", note: "Every day · 12:10 AM Philippine time" },
	{ id: "weekly", label: "Weekly", note: "Every Monday · 12:20 AM Philippine time" },
	{ id: "monthly", label: "Monthly", note: "Every 2nd · 12:30 AM Philippine time" },
];

function escapeHtml(value: unknown) {
	return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function renderPdfChart(chart: AnalyticsPdfReport["charts"][number]) {
	if (!chart.labels.length || !chart.series.length) return `<article class="chart-card"><h2>${escapeHtml(chart.title)}</h2>${chart.subtitle ? `<p>${escapeHtml(chart.subtitle)}</p>` : ""}<div class="empty-chart">No tracked data is available for this chart yet.</div></article>`;
	const width = 900;
	const height = 310;
	const left = 58;
	const top = 28;
	const plotWidth = 810;
	const plotHeight = 210;
	const values = chart.series.flatMap((series) => series.values).filter(Number.isFinite);
	const maxValue = Math.max(1, ...values) * 1.12;
	const y = (value: number) => top + plotHeight - (Math.max(0, value) / maxValue) * plotHeight;
	const grids = Array.from({ length: 5 }, (_, index) => {
		const value = maxValue * (index / 4);
		const lineY = y(value);
		return `<line x1="${left}" y1="${lineY}" x2="${left + plotWidth}" y2="${lineY}" stroke="#e7e7e7"/><text x="${left - 10}" y="${lineY + 4}" text-anchor="end" fill="#7a7a7a" font-size="11">${escapeHtml(Math.round(value).toLocaleString())}</text>`;
	}).join("");
	const categoryWidth = plotWidth / Math.max(1, chart.labels.length);
	const xLabelInterval = Math.max(1, Math.ceil(chart.labels.length / 10));
	const labels = chart.labels.map((label, index) => index % xLabelInterval === 0 || index === chart.labels.length - 1
		? `<text x="${left + categoryWidth * (index + 0.5)}" y="${top + plotHeight + 22}" text-anchor="middle" fill="#666" font-size="10">${escapeHtml(label.length > 13 ? `${label.slice(0, 12)}…` : label)}</text>`
		: "").join("");
	const marks = chart.type === "line"
		? chart.series.map((series) => {
			const points = series.values.map((value, index) => `${left + categoryWidth * (index + 0.5)},${y(value)}`).join(" ");
			const circles = series.values.map((value, index) => `<circle cx="${left + categoryWidth * (index + 0.5)}" cy="${y(value)}" r="3" fill="${series.color}"/>`).join("");
			return `<polyline points="${points}" fill="none" stroke="${series.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}`;
		}).join("")
		: chart.series.map((series, seriesIndex) => {
			const groupWidth = categoryWidth * 0.72;
			const barWidth = Math.max(4, groupWidth / Math.max(1, chart.series.length));
			return series.values.map((value, index) => {
				const barHeight = top + plotHeight - y(value);
				const barX = left + categoryWidth * index + (categoryWidth - groupWidth) / 2 + seriesIndex * barWidth;
				return `<rect x="${barX}" y="${y(value)}" width="${Math.max(3, barWidth - 3)}" height="${barHeight}" rx="3" fill="${series.color}"/>`;
			}).join("");
		}).join("");
	const legend = chart.series.map((series) => `<span class="legend-item"><i style="background:${series.color}"></i>${escapeHtml(series.name)}</span>`).join("");
	return `<article class="chart-card"><h2>${escapeHtml(chart.title)}</h2>${chart.subtitle ? `<p>${escapeHtml(chart.subtitle)}</p>` : ""}<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(chart.title)} chart">${grids}${marks}${labels}</svg><div class="legend">${legend}</div></article>`;
}

function createPdfHtml(report: AnalyticsPdfReport) {
	const generated = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date());
	const metrics = report.metrics.map((item) => `<div class="metric"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("");
	const charts = report.charts.map(renderPdfChart).join("");
	const table = report.table ? `<section class="table-section"><h2>${escapeHtml(report.table.title)}</h2><table><thead><tr>${report.table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${report.table.rows.length ? report.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${report.table.headers.length}" class="empty">No report data is available for this table.</td></tr>`}</tbody></table></section>` : "";
	return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)} · J'WELLZ REALTY</title><style>
@page{size:A4;margin:14mm 13mm 17mm}*{box-sizing:border-box}body{margin:0;color:#171717;font:11px/1.5 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.topline{height:6px;background:#DE141C;margin-bottom:24px}.brand{font-size:10px;letter-spacing:.19em;text-transform:uppercase;color:#DE141C;font-weight:700}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #dedede;padding-bottom:15px}.head h1{font-size:25px;line-height:1.15;letter-spacing:-.04em;margin:7px 0 4px}.head p{margin:0;color:#666;font-size:11px}.date{text-align:right;color:#666;font-size:10px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.metric{border:1px solid #e4e4e4;border-top:2px solid #DE141C;padding:10px 11px;min-height:58px}.metric span{display:block;color:#737373;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;margin-top:4px;font-size:18px;line-height:1.1}.charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.chart-card{border:1px solid #e5e5e5;padding:11px 10px;break-inside:avoid}.chart-card h2,.table-section h2{font-size:12px;margin:0;font-weight:700}.chart-card p{margin:2px 0 4px;color:#777;font-size:9px}.chart-card svg{display:block;width:100%;height:auto;max-height:205px}.empty-chart{display:grid;min-height:120px;place-items:center;margin-top:8px;padding:14px;border:1px dashed #ddd;background:#fafafa;color:#777;text-align:center;font-size:10px}.legend{display:flex;flex-wrap:wrap;gap:10px;margin:2px 0 0;color:#555;font-size:9px}.legend-item{display:inline-flex;align-items:center;gap:4px}.legend-item i{width:8px;height:8px;border-radius:2px}.table-section{margin-top:18px;break-inside:avoid}.table-section h2{margin-bottom:7px}.table-section table{width:100%;border-collapse:collapse;font-size:9px}.table-section th{background:#f3f3f3;text-align:left;color:#444;font-weight:700}.table-section th,.table-section td{border-bottom:1px solid #e6e6e6;padding:6px 7px;vertical-align:top}.table-section .empty{text-align:center;color:#888;padding:16px}.foot{margin-top:18px;border-top:1px solid #e5e5e5;padding-top:8px;color:#888;font-size:9px;display:flex;justify-content:space-between}.note{margin-top:13px;color:#777;font-size:9px}@media print{.chart-card{break-inside:avoid}.table-section{break-before:auto}}
</style></head><body><div class="topline"></div><header class="head"><div><div class="brand">J'WELLZ REALTY · ANALYTICS REPORT</div><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.description)}</p></div><div class="date">Generated<br><strong>${escapeHtml(generated)}</strong><br><span>Philippine Time</span></div></header><section class="metrics">${metrics}</section><section class="charts">${charts}</section>${table}<p class="note">Figures reflect the analytics data available when this report was generated. Forecasts are estimates and may differ from actual results.</p><footer class="foot"><span>Internal management report · J'WELLZ REALTY</span><span>${escapeHtml(report.id)} · ${escapeHtml(generated)}</span></footer></body></html>`;
}

export function AnalyticsExportDialog({ open, onClose, options, reports, onExport }: { open: boolean; onClose: () => void; options: AnalyticsExportOption[]; reports: AnalyticsPdfReport[]; onExport: (filename: string, rows: CmsRow[], columns: string[]) => void }) {
	const [tab, setTab] = useState<"download" | "schedule">("download");
	const [selectedReportId, setSelectedReportId] = useState("");
	const [schedule, setSchedule] = useState<AnalyticsReportSchedule>(DEFAULT_ANALYTICS_REPORT_SCHEDULE);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	useEffect(() => {
		if (!selectedReportId && reports.length) setSelectedReportId(reports[0].id);
	}, [reports, selectedReportId]);

	useEffect(() => {
		if (!open || tab !== "schedule") return;
		let active = true;
		setLoading(true);
		(async () => {
			try {
				const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
				const response = await fetch("/api/admin/analytics-report-schedule", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
				const data = await response.json().catch(() => null) as { schedule?: AnalyticsReportSchedule; error?: string } | null;
				if (!response.ok) throw new Error(data?.error || "Could not load report schedule.");
				if (active && data?.schedule) setSchedule(data.schedule);
			} catch (error) {
				if (active) setStatus(error instanceof Error ? error.message : "Could not load report schedule.");
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => { active = false; };
	}, [open, tab]);

	if (!open) return null;
	const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0];

	function exportPdf() {
		if (!selectedReport) return;
		const printWindow = window.open("", "_blank");
		if (!printWindow) {
			setStatus("Allow pop-ups for this site to export a PDF report.");
			return;
		}
		printWindow.document.open();
		printWindow.document.write(createPdfHtml(selectedReport));
		printWindow.document.close();
		printWindow.focus();
		printWindow.setTimeout(() => printWindow.print(), 400);
	}

	function updatePeriod(period: AnalyticsReportPeriod, updater: (current: AnalyticsReportSchedule["schedules"][AnalyticsReportPeriod]) => AnalyticsReportSchedule["schedules"][AnalyticsReportPeriod]) {
		setSchedule((current) => ({ ...current, schedules: { ...current.schedules, [period]: updater(current.schedules[period]) } }));
	}

	function toggleCategory(period: AnalyticsReportPeriod, category: AnalyticsReportCategory) {
		updatePeriod(period, (current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((item) => item !== category) : [...current.categories, category] }));
	}

	async function saveSchedule() {
		setSaving(true);
		setStatus("");
		try {
			const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
			const response = await fetch("/api/admin/analytics-report-schedule", { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ schedule }) });
			const data = await response.json().catch(() => null) as { error?: string } | null;
			if (!response.ok) throw new Error(data?.error || "Could not save scheduled reports.");
			setStatus("Schedule saved. Vercel will generate reports at the selected frequency.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Could not save scheduled reports.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
			<section role="dialog" aria-modal="true" aria-labelledby="analytics-export-title" className="flex max-h-[min(90dvh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl">
				<header className="flex items-start justify-between gap-4 border-b border-black/[0.08] px-5 py-4 sm:px-6">
					<div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center bg-[#DE141C] text-white"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 id="analytics-export-title" className="text-lg font-semibold tracking-tight text-[#111111]">Reports & exports</h2><p className="mt-1 text-sm text-black/55">Download a dataset now or configure an automatic AI report.</p></div></div>
					<button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-black/50 transition hover:bg-zinc-100 hover:text-black" aria-label="Close reports and exports"><X className="h-4 w-4" /></button>
				</header>
				<div className="flex border-b border-black/[0.08] px-5 sm:px-6" role="tablist" aria-label="Report actions">
					<button type="button" role="tab" aria-selected={tab === "download"} onClick={() => { setTab("download"); setStatus(""); }} className={`border-b-2 px-1 py-3 text-sm font-semibold ${tab === "download" ? "border-[#DE141C] text-[#DE141C]" : "border-transparent text-black/50 hover:text-black"}`}><span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Download data</span></button>
					<button type="button" role="tab" aria-selected={tab === "schedule"} onClick={() => { setTab("schedule"); setStatus(""); }} className={`ml-6 border-b-2 px-1 py-3 text-sm font-semibold ${tab === "schedule" ? "border-[#DE141C] text-[#DE141C]" : "border-transparent text-black/50 hover:text-black"}`}><span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Scheduled reports</span></button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
					{tab === "download" ? <>
						<section className="mb-6 rounded-lg border border-[#DE141C]/20 bg-red-50/35 p-4 sm:p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div><div className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111]"><FileSpreadsheet className="h-4 w-4 text-[#DE141C]" /> Export a formatted PDF report</div><p className="mt-1 text-xs leading-5 text-black/55">Choose an Analytics tab. The report includes KPI cards, charts, and a supporting data table where available.</p></div>
								<button type="button" onClick={exportPdf} disabled={!selectedReport} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#DE141C] px-3.5 text-xs font-semibold text-white transition hover:bg-[#bd1118] disabled:opacity-50"><Download className="h-3.5 w-3.5" />Export selected tab as PDF</button>
							</div>
							<label className="mt-4 block max-w-lg text-xs font-semibold text-black/65">Analytics tab
								<select value={selectedReport?.id ?? ""} onChange={(event) => setSelectedReportId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-2 focus:ring-[#DE141C]/10">
									{reports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
								</select>
							</label>
							{selectedReport ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-black/50"><span>{selectedReport.metrics.length} summary metrics</span><span>{selectedReport.charts.length} charts</span><span>{selectedReport.table ? "Supporting data table included" : "No supporting table"}</span><span className="text-black/40">PDF opens in print preview; choose “Save as PDF”.</span></div> : <p className="mt-3 text-xs text-black/50">No Analytics tabs are available to export.</p>}
						</section>
						<div className="mb-4"><h3 className="text-sm font-semibold text-[#111111]">Download a spreadsheet dataset</h3><p className="mt-1 text-xs text-black/50">CSV files open in Excel or Google Sheets. The row count helps you confirm the selection.</p></div>
						<div className="grid gap-2 sm:grid-cols-2">
							{options.map((option) => (
								<button key={option.filename} type="button" onClick={() => onExport(option.filename, option.rows, option.columns)} className="group flex min-h-[90px] items-start gap-3 rounded-lg border border-black/[0.09] p-3.5 text-left transition hover:border-[#DE141C]/45 hover:bg-red-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30">
									<span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-zinc-100 text-black/65 transition group-hover:bg-[#DE141C] group-hover:text-white"><Download className="h-4 w-4" /></span>
									<span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-[#111111]">{option.label}</span><span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-black/55">{option.rows.length.toLocaleString()} rows</span></span><span className="mt-1 block text-xs leading-5 text-black/50">{option.description}</span></span>
								</button>
							))}
						</div>
					</> : <>
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/[0.08] bg-zinc-50 p-4">
							<div><h3 className="text-sm font-semibold text-[#111111]">Automatic report schedule</h3><p className="mt-1 text-xs text-black/50">Vercel checks the selected schedules at its scheduled runs.</p></div>
							<button type="button" role="switch" aria-checked={schedule.enabled} onClick={() => setSchedule((current) => ({ ...current, enabled: !current.enabled }))} className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/35 focus-visible:ring-offset-2 ${schedule.enabled ? "bg-[#DE141C]" : "bg-zinc-300"}`} aria-label="Enable scheduled reports"><span className={`pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${schedule.enabled ? "translate-x-5" : "translate-x-0"}`} /></button>
						</div>
						{loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-black/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved schedule...</div> : <>
							<div className="mt-4 space-y-3">
								{periodOptions.map((period) => <div key={period.id} className={`rounded-lg border p-4 ${schedule.schedules[period.id].enabled && schedule.enabled ? "border-black/[0.09] bg-white" : "border-black/[0.06] bg-zinc-50/70"}`}>
									<div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-semibold text-[#111111]">{period.label} report</div><div className="mt-0.5 text-xs text-black/45">{period.note}</div></div><button type="button" role="switch" aria-checked={schedule.schedules[period.id].enabled} disabled={!schedule.enabled} onClick={() => updatePeriod(period.id, (current) => ({ ...current, enabled: !current.enabled }))} className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${schedule.schedules[period.id].enabled ? "bg-[#DE141C]" : "bg-zinc-300"}`} aria-label={`Enable ${period.label.toLowerCase()} reports`}><span className={`pointer-events-none absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${schedule.schedules[period.id].enabled ? "translate-x-4" : "translate-x-0"}`} /></button></div>
									<div className="mt-3 grid gap-2 sm:grid-cols-2">{categoryOptions.map((category) => { const checked = schedule.schedules[period.id].categories.includes(category.id); return <label key={category.id} className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 ${checked ? "border-[#DE141C]/25 bg-red-50/40" : "border-black/[0.07] bg-white"}`}><input type="checkbox" className="mt-0.5 accent-[#DE141C]" checked={checked} disabled={!schedule.enabled || !schedule.schedules[period.id].enabled} onChange={() => toggleCategory(period.id, category.id)} /><span><span className="block text-xs font-semibold text-[#111111]">{category.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-black/45">{category.description}</span></span></label>; })}</div>
								</div>)}
							</div>
							<div className="mt-4 rounded-lg border border-black/[0.08] p-4">
								<div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-zinc-100 text-black/65"><Mail className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h4 className="text-sm font-semibold text-[#111111]">Email delivery</h4><p className="mt-0.5 text-xs text-black/50">Send the report to active admin accounts on each scheduled run.</p></div><input type="checkbox" className="mt-1 h-4 w-4 accent-[#DE141C]" checked={schedule.sendEmail} disabled={!schedule.enabled} onChange={(event) => setSchedule((current) => ({ ...current, sendEmail: event.target.checked }))} aria-label="Email scheduled reports to active admins" /></div>
								<div className="mt-4 border-t border-black/[0.07] pt-3"><p className="text-xs font-semibold text-black/65">Sections to include</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{sectionOptions.map((section) => <label key={section.id} className="inline-flex items-center gap-2 text-xs text-black/60"><input type="checkbox" className="accent-[#DE141C]" checked={schedule.sections[section.id]} disabled={!schedule.enabled || !schedule.sendEmail} onChange={(event) => setSchedule((current) => ({ ...current, sections: { ...current.sections, [section.id]: event.target.checked } }))} />{section.label}</label>)}</div></div>
							</div>
						</>}
					</>}
				</div>
				<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.08] bg-zinc-50 px-5 py-3.5 sm:px-6">
					<p role="status" aria-live="polite" className="min-w-0 text-xs text-black/55">{status || (tab === "schedule" ? "Reports are delivered based on your selected frequency and categories." : "Choose a report to download it as a CSV file.")}</p>
					{tab === "schedule" ? <button type="button" onClick={() => void saveSchedule()} disabled={saving || loading} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#DE141C] px-3.5 text-xs font-semibold text-white transition hover:bg-[#bd1118] disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status.includes("saved") ? <Check className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}{saving ? "Saving..." : "Save schedule"}</button> : <button type="button" onClick={onClose} className="h-9 shrink-0 rounded-md border border-black/10 bg-white px-3.5 text-xs font-semibold text-black/65 transition hover:bg-zinc-100">Done</button>}
				</footer>
			</section>
		</div>
	);
}
