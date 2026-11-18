"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Download, FileSpreadsheet, FileText, Loader2, Mail, RefreshCw, Sheet, X } from "lucide-react";
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

type ReportFormat = "pdf" | "xlsx" | "csv";

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
	const metrics = `<div class="section-kicker">Executive summary | Key indicators</div>${report.metrics.map((item) => `<div class="metric"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("")}`;
	const charts = `<div class="section-kicker">Visual analysis | ${report.charts.length} charts</div>${report.charts.map(renderPdfChart).join("")}`;
	const table = report.table ? `<section class="table-section"><h2>${escapeHtml(report.table.title)}</h2><table><thead><tr>${report.table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${report.table.rows.length ? report.table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${report.table.headers.length}" class="empty">No report data is available for this table.</td></tr>`}</tbody></table></section>` : "";
	return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)} · J'WELLZ REALTY</title><style>
@page{size:A4;margin:14mm 13mm 17mm}*{box-sizing:border-box}body{margin:0;color:#171717;font:11px/1.5 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.topline{height:6px;background:#DE141C;margin-bottom:24px}.brand{font-size:10px;letter-spacing:.19em;text-transform:uppercase;color:#DE141C;font-weight:700}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #dedede;padding-bottom:15px}.head h1{font-size:25px;line-height:1.15;letter-spacing:-.04em;margin:7px 0 4px}.head p{margin:0;color:#666;font-size:11px}.date{text-align:right;color:#666;font-size:10px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.section-kicker{grid-column:1/-1;margin-top:3px;color:#6f6f6f;font-size:9px;font-weight:700;letter-spacing:.15em;text-transform:uppercase}.metric{border:1px solid #e4e4e4;border-top:2px solid #DE141C;padding:10px 11px;min-height:58px}.metric span{display:block;color:#737373;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;margin-top:4px;font-size:18px;line-height:1.1}.charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.chart-card{border:1px solid #e5e5e5;padding:11px 10px;break-inside:avoid}.chart-card h2,.table-section h2{font-size:12px;margin:0;font-weight:700}.chart-card p{margin:2px 0 4px;color:#777;font-size:9px}.chart-card svg{display:block;width:100%;height:auto;max-height:205px}.empty-chart{display:grid;min-height:120px;place-items:center;margin-top:8px;padding:14px;border:1px dashed #ddd;background:#fafafa;color:#777;text-align:center;font-size:10px}.legend{display:flex;flex-wrap:wrap;gap:10px;margin:2px 0 0;color:#555;font-size:9px}.legend-item{display:inline-flex;align-items:center;gap:4px}.legend-item i{width:8px;height:8px;border-radius:2px}.table-section{margin-top:18px;break-inside:avoid}.table-section h2{margin-bottom:7px}.table-section table{width:100%;border-collapse:collapse;font-size:9px;border:1px solid #dedede}.table-section th{background:#f1f1f1;text-align:left;color:#222;font-weight:700}.table-section th,.table-section td{border:1px solid #dedede;padding:8px 9px;vertical-align:top}.table-section tbody tr:nth-child(even){background:#fafafa}.table-section tr{break-inside:avoid}.table-section .empty{text-align:center;color:#888;padding:16px}.foot{margin-top:18px;border-top:1px solid #e5e5e5;padding-top:8px;color:#888;font-size:9px;display:flex;justify-content:space-between}.note{margin-top:13px;color:#777;font-size:9px}@media print{.chart-card{break-inside:avoid}.table-section{break-before:auto}}
</style></head><body><div class="topline"></div><header class="head"><div><div class="brand">J'WELLZ REALTY · ANALYTICS REPORT</div><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.description)}</p></div><div class="date">Generated<br><strong>${escapeHtml(generated)}</strong><br><span>Philippine Time</span></div></header><section class="metrics">${metrics}</section><section class="charts">${charts}</section>${table}<p class="note">Figures reflect the analytics data available when this report was generated. Forecasts are estimates and may differ from actual results.</p><footer class="foot"><span>Internal management report · J'WELLZ REALTY</span><span>${escapeHtml(report.id)} · ${escapeHtml(generated)}</span></footer></body></html>`;
}

function reportSheetRows(report: AnalyticsPdfReport) {
	const generated = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date());
	const summary: Array<Array<string | number>> = [
		["J'WELLZ REALTY | ANALYTICS REPORT"], ["Report", report.title], ["Description", report.description], ["Generated (Philippine Time)", generated], [], ["Executive summary"], [report.description], [], ["Summary metrics"], ["Metric", "Value"],
		...report.metrics.map((metric) => [metric.label, metric.value]),
	];
	const chartRows: Array<Array<string | number>> = [["Chart", "Series", "Category", "Value"]];
	for (const chart of report.charts) for (const series of chart.series) chart.labels.forEach((label, index) => chartRows.push([chart.title, series.name, label, series.values[index] ?? ""]));
	const details: Array<Array<string | number>> = report.table ? [[report.table.title], report.table.headers, ...report.table.rows] : [["No supporting table is available for this report."]];
	return { summary, chartRows, details };
}

function chartSheetData(report: AnalyticsPdfReport) {
	const rows: Array<Array<string | number>> = [];
	const blocks: Array<{ chart: AnalyticsPdfReport["charts"][number]; titleRow: number; headerRow: number; firstDataRow: number; lastDataRow: number }> = [];
	for (const chart of report.charts) {
		if (!chart.labels.length || !chart.series.length) continue;
		const titleRow = rows.length + 1;
		rows.push([chart.title]);
		const headerRow = rows.length + 1;
		rows.push(["Category", ...chart.series.map((series) => series.name)]);
		const firstDataRow = rows.length + 1;
		chart.labels.forEach((label, index) => rows.push([label, ...chart.series.map((series) => series.values[index] ?? 0)]));
		const lastDataRow = rows.length;
		blocks.push({ chart, titleRow, headerRow, firstDataRow, lastDataRow });
		rows.push([]);
	}
	return { rows: rows.length ? rows : [["No chart data is available for this report."]], blocks };
}

function csvCell(value: unknown) {
	const text = String(value ?? "");
	const safe = /^[=+@\t\r]/.test(text) || /^-[^0-9.]/.test(text) ? `'${text}` : text;
	return `"${safe.replace(/"/g, '""')}"`;
}

function createReportCsv(report: AnalyticsPdfReport) {
	const { summary, chartRows, details } = reportSheetRows(report);
	const rows: Array<Array<string | number>> = [...summary, [], ["Chart data"], ...chartRows, [], ["Supporting table"], ...details];
	return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

function xmlEscape(value: unknown) {
	return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] ?? char);
}

function columnName(index: number) {
	let name = "";
	for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
	return name;
}

function workbookStylesXml() {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Arial"/><color rgb="FF202020"/></font><font><b/><sz val="17"/><name val="Arial"/><color rgb="FFDE141C"/></font><font><b/><sz val="10"/><name val="Arial"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="10"/><name val="Arial"/><color rgb="FF222222"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDE141C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F1F1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFCEDEE"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFDE141C"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

type WorksheetOptions = { hasDrawing?: boolean; titleRows?: number[]; sectionRows?: number[]; headerRows?: number[]; wrapRows?: number[]; mergeRanges?: string[]; widths?: number[]; freezeRows?: number; autoFilter?: string; mode?: "summary" | "table" | "chart" | "plain" };

function worksheetXml(rows: Array<Array<string | number>>, options: WorksheetOptions = {}) {
	const maxColumns = Math.max(1, ...rows.map((row) => row.length));
	const titleRows = new Set(options.titleRows ?? []); const sectionRows = new Set(options.sectionRows ?? []); const headerRows = new Set(options.headerRows ?? []); const wrapRows = new Set(options.wrapRows ?? []);
	const body = rows.map((row, rowIndex) => {
		const excelRow = rowIndex + 1; const isTitle = titleRows.has(excelRow); const isSection = sectionRows.has(excelRow); const isHeader = headerRows.has(excelRow);
		const height = isTitle ? 32 : isSection || isHeader ? 25 : wrapRows.has(excelRow) ? 44 : 22;
		const cells = row.map((value, columnIndex) => {
			const ref = `${columnName(columnIndex)}${excelRow}`;
			let style = isTitle ? 1 : isSection ? 2 : isHeader ? 3 : options.mode === "table" || options.mode === "chart" ? 4 : options.mode === "summary" && (excelRow >= 2 && excelRow <= 4) ? columnIndex === 0 ? 5 : 4 : options.mode === "summary" && excelRow >= 11 ? columnIndex === 0 ? 5 : 4 : 0;
			if (wrapRows.has(excelRow)) style = 6;
			return typeof value === "number" && Number.isFinite(value) ? `<c r="${ref}" s="${style}"><v>${value}</v></c>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
		}).join("");
		return `<row r="${excelRow}" ht="${height}" customHeight="1">${cells}</row>`;
	}).join("");
	const cols = options.widths?.length ? `<cols>${options.widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}${options.widths.length < maxColumns ? `<col min="${options.widths.length + 1}" max="${maxColumns}" width="18" customWidth="1"/>` : ""}</cols>` : "";
	const pane = options.freezeRows ? `<pane ySplit="${options.freezeRows}" topLeftCell="A${options.freezeRows + 1}" activePane="bottomLeft" state="frozen"/>` : "";
	const sheetView = `<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>`;
	const merges = options.mergeRanges?.length ? `<mergeCells count="${options.mergeRanges.length}">${options.mergeRanges.map((range) => `<mergeCell ref="${range}"/>`).join("")}</mergeCells>` : "";
	const autoFilter = options.autoFilter ? `<autoFilter ref="${options.autoFilter}"/>` : "";
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${sheetView}<sheetFormatPr defaultRowHeight="22"/>${cols}<sheetData>${body}</sheetData>${autoFilter}${merges}${options.hasDrawing ? '<drawing r:id="rId1"/>' : ""}</worksheet>`;
}

function crc32(bytes: Uint8Array) {
	let crc = 0xffffffff;
	for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
	return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(files: Array<{ name: string; text: string }>) {
	const encoder = new TextEncoder();
	const chunks: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;
	const u16 = (view: DataView, index: number, value: number) => view.setUint16(index, value, true);
	const u32 = (view: DataView, index: number, value: number) => view.setUint32(index, value, true);
	for (const file of files) {
		const name = encoder.encode(file.name); const data = encoder.encode(file.text); const checksum = crc32(data);
		const local = new Uint8Array(30); const localView = new DataView(local.buffer);
		u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0x0800); u16(localView, 8, 0); u16(localView, 10, 0); u16(localView, 12, 0x21); u32(localView, 14, checksum); u32(localView, 18, data.length); u32(localView, 22, data.length); u16(localView, 26, name.length); u16(localView, 28, 0);
		chunks.push(local, name, data);
		const header = new Uint8Array(46); const headerView = new DataView(header.buffer);
		u32(headerView, 0, 0x02014b50); u16(headerView, 4, 20); u16(headerView, 6, 20); u16(headerView, 8, 0x0800); u16(headerView, 10, 0); u16(headerView, 12, 0); u16(headerView, 14, 0x21); u32(headerView, 16, checksum); u32(headerView, 20, data.length); u32(headerView, 24, data.length); u16(headerView, 28, name.length); u16(headerView, 30, 0); u16(headerView, 32, 0); u16(headerView, 34, 0); u16(headerView, 36, 0); u32(headerView, 38, 0); u32(headerView, 42, offset);
		central.push(header, name); offset += local.length + name.length + data.length;
	}
	const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0); const end = new Uint8Array(22); const endView = new DataView(end.buffer);
	u32(endView, 0, 0x06054b50); u16(endView, 4, 0); u16(endView, 6, 0); u16(endView, 8, files.length); u16(endView, 10, files.length); u32(endView, 12, centralSize); u32(endView, 16, offset); u16(endView, 20, 0);
	const all = [...chunks, ...central, end]; const result = new Uint8Array(all.reduce((sum, chunk) => sum + chunk.length, 0)); let cursor = 0;
	for (const chunk of all) { result.set(chunk, cursor); cursor += chunk.length; }
	return result;
}

function excelChartXml(chart: AnalyticsPdfReport["charts"][number], block: ReturnType<typeof chartSheetData>["blocks"][number], index: number) {
	const catAxis = 500000 + index * 2; const valAxis = catAxis + 1;
	const series = chart.series.map((item, seriesIndex) => {
		const col = columnName(seriesIndex + 1); const color = item.color.replace(/^#/, "");
		const titleRef = `'Chart Data'!$${col}$${block.headerRow}`;
		const categoryRef = `'Chart Data'!$A$${block.firstDataRow}:$A$${block.lastDataRow}`;
		const valuesRef = `'Chart Data'!$${col}$${block.firstDataRow}:$${col}$${block.lastDataRow}`;
		const style = chart.type === "line"
			? `<a:ln w="28575"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>`
			: `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln>`;
		const marker = chart.type === "line" ? `<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:marker>` : "";
		return `<c:ser><c:idx val="${seriesIndex}"/><c:order val="${seriesIndex}"/><c:tx><c:strRef><c:f>${titleRef}</c:f></c:strRef></c:tx><c:spPr>${style}</c:spPr>${marker}<c:cat><c:strRef><c:f>${categoryRef}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>${valuesRef}</c:f></c:numRef></c:val></c:ser>`;
	}).join("");
	const chartType = chart.type === "line"
		? `<c:lineChart><c:grouping val="standard"/>${series}<c:marker val="1"/><c:smooth val="0"/><c:axId val="${catAxis}"/><c:axId val="${valAxis}"/></c:lineChart>`
		: `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:overlap val="0"/><c:gapWidth val="65"/><c:axId val="${catAxis}"/><c:axId val="${valAxis}"/></c:barChart>`;
	const axes = `<c:catAx><c:axId val="${catAxis}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="${valAxis}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="${valAxis}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="E7E7E7"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="General" sourceLinked="1"/><c:tickLblPos val="nextTo"/><c:crossAx val="${catAxis}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:lang val="en-US"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1400" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1400" b="1"/><a:t>${xmlEscape(chart.title)}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/>${chartType}${axes}</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings></c:chartSpace>`;
}

function createReportXlsx(report: AnalyticsPdfReport) {
	const rows = reportSheetRows(report); const chartData = chartSheetData(report);
	const names = ["Summary", "Chart Data", "Supporting Table", "Charts"];
	const sheets = [rows.summary, chartData.rows, rows.details, []];
	const chartParts = chartData.blocks.map((block, index) => ({ name: `xl/charts/chart${index + 1}.xml`, text: excelChartXml(block.chart, block, index) }));
	const drawingAnchors = chartData.blocks.map((_, index) => `<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${index * 20}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="11239500" cy="5200000"/><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${index + 2}" name="Chart ${index + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${index + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:oneCellAnchor>`).join("");
	const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${drawingAnchors}</xdr:wsDr>`;
	const drawingRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${chartData.blocks.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${index + 1}.xml"/>`).join("")}</Relationships>`;
	const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>${chartParts.map((chart) => `<Override PartName="/${chart.name}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("")}</Types>`;
	const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`;
	const relationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
	const maxTableColumns = report.table?.headers.length ?? 1;
	const summaryOptions: WorksheetOptions = { titleRows: [1], sectionRows: [6, 9], headerRows: [10], wrapRows: [7], mergeRanges: ["A1:B1", "A6:B6", "A7:B7", "A9:B9"], widths: [34, 78], mode: "summary" };
	const chartOptions: WorksheetOptions = { sectionRows: chartData.blocks.map((block) => block.titleRow), headerRows: chartData.blocks.map((block) => block.headerRow), mergeRanges: chartData.blocks.map((block) => `A${block.titleRow}:D${block.titleRow}`), widths: [38, 22, 30, 18], mode: "chart" };
	const tableOptions: WorksheetOptions = { titleRows: [1], headerRows: [2], mergeRanges: [`A1:${columnName(maxTableColumns - 1)}1`], widths: [42, ...Array(Math.max(0, maxTableColumns - 1)).fill(20)], freezeRows: 2, autoFilter: `A2:${columnName(maxTableColumns - 1)}${Math.max(2, rows.details.length)}`, mode: "table" };
	const chartVisualOptions: WorksheetOptions = { hasDrawing: true, widths: [18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18] };
	const files = [
		{ name: "[Content_Types].xml", text: contentTypes },
		{ name: "_rels/.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
		{ name: "xl/workbook.xml", text: workbook }, { name: "xl/_rels/workbook.xml.rels", text: relationships }, { name: "xl/styles.xml", text: workbookStylesXml() },
		{ name: "xl/worksheets/sheet1.xml", text: worksheetXml(sheets[0], summaryOptions) },
		{ name: "xl/worksheets/sheet2.xml", text: worksheetXml(sheets[1], chartOptions) },
		{ name: "xl/worksheets/sheet3.xml", text: worksheetXml(sheets[2], tableOptions) },
		{ name: "xl/worksheets/sheet4.xml", text: worksheetXml(sheets[3], chartVisualOptions) },
		{ name: "xl/worksheets/_rels/sheet4.xml.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>` },
		{ name: "xl/drawings/drawing1.xml", text: drawing },
		{ name: "xl/drawings/_rels/drawing1.xml.rels", text: drawingRelationships },
		...chartParts,
	];
	return createStoredZip(files);
}

function downloadBlob(filename: string, blob: Blob) {
	const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AnalyticsExportDialog({ open, onClose, options, reports, onExport }: { open: boolean; onClose: () => void; options: AnalyticsExportOption[]; reports: AnalyticsPdfReport[]; onExport: (filename: string, rows: CmsRow[], columns: string[]) => void }) {
	const [tab, setTab] = useState<"download" | "schedule">("download");
	const [format, setFormat] = useState<ReportFormat>("pdf");
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

	function exportReport() {
		if (!selectedReport) return;
		setStatus("");
		const date = new Date().toISOString().slice(0, 10);
		const filename = `jwellz-${selectedReport.id}-${date}`;
		if (format === "pdf") { exportPdf(); return; }
		if (format === "csv") {
			downloadBlob(`${filename}.csv`, new Blob([createReportCsv(selectedReport)], { type: "text/csv;charset=utf-8" }));
			setStatus("Analytics report CSV downloaded.");
			return;
		}
		const bytes = createReportXlsx(selectedReport);
		const buffer = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(buffer).set(bytes);
		downloadBlob(`${filename}.xlsx`, new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
		setStatus("Excel workbook downloaded with native charts and separate Summary, Chart Data, Supporting Table, and Charts sheets.");
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
					<div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center bg-[#DE141C] text-white"><FileSpreadsheet className="h-5 w-5" /></span><div><h2 id="analytics-export-title" className="text-lg font-semibold tracking-tight text-[#111111]">Reports & exports</h2><p className="mt-1 text-sm text-black/55">Export a polished report, download raw data, or configure scheduled AI reports.</p></div></div>
					<button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-black/50 transition hover:bg-zinc-100 hover:text-black" aria-label="Close reports and exports"><X className="h-4 w-4" /></button>
				</header>
				<div className="flex border-b border-black/[0.08] px-5 sm:px-6" role="tablist" aria-label="Report actions">
					<button type="button" role="tab" aria-selected={tab === "download"} onClick={() => { setTab("download"); setStatus(""); }} className={`border-b-2 px-1 py-3 text-sm font-semibold ${tab === "download" ? "border-[#DE141C] text-[#DE141C]" : "border-transparent text-black/50 hover:text-black"}`}><span className="inline-flex items-center gap-2"><Download className="h-4 w-4" /> Export report</span></button>
					<button type="button" role="tab" aria-selected={tab === "schedule"} onClick={() => { setTab("schedule"); setStatus(""); }} className={`ml-6 border-b-2 px-1 py-3 text-sm font-semibold ${tab === "schedule" ? "border-[#DE141C] text-[#DE141C]" : "border-transparent text-black/50 hover:text-black"}`}><span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Scheduled reports</span></button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
					{tab === "download" ? <>
						<section className="mb-6 rounded-lg border border-[#DE141C]/20 bg-red-50/35 p-4 sm:p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div><div className="inline-flex items-center gap-2 text-sm font-semibold text-[#111111]"><FileSpreadsheet className="h-4 w-4 text-[#DE141C]" /> Build an Analytics report</div><p className="mt-1 text-xs leading-5 text-black/55">Choose an Analytics tab and file format. Reports include a summary, charts, and the tab's supporting table.</p></div>
							</div>
							<label className="mt-4 block max-w-lg text-xs font-semibold text-black/65">Analytics tab
								<select value={selectedReport?.id ?? ""} onChange={(event) => setSelectedReportId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm font-medium text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-2 focus:ring-[#DE141C]/10">
									{reports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
								</select>
							</label>
							<div className="mt-4 grid gap-2 sm:grid-cols-3" role="group" aria-label="Report file format">
				{([{ id: "pdf", label: "PDF report", description: "Print-ready pages with charts and tables", icon: FileText }, { id: "xlsx", label: "Excel workbook", description: "Styled tables and native charts", icon: FileSpreadsheet }, { id: "csv", label: "CSV data", description: "Plain data only; no chart graphics or borders", icon: Download }] as const).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" aria-pressed={format === item.id} onClick={() => { setFormat(item.id); setStatus(""); }} className={`flex min-h-[72px] items-start gap-2.5 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30 ${format === item.id ? "border-[#DE141C]/50 bg-red-50/50" : "border-black/[0.08] bg-white hover:border-black/20 hover:bg-zinc-50"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${format === item.id ? "bg-[#DE141C] text-white" : "bg-zinc-100 text-black/65"}`}><Icon className="h-4 w-4" /></span><span><span className="block text-xs font-semibold text-[#111111]">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-black/50">{item.description}</span></span></button>; })}
							</div>
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] pt-4">
								<div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/50">{selectedReport ? <><span>{selectedReport.metrics.length} summary metrics</span><span>{selectedReport.charts.length} charts</span><span>{selectedReport.table ? "Supporting table included" : "No supporting table"}</span></> : <span>No Analytics tabs are available to export.</span>}</div>
								<button type="button" onClick={exportReport} disabled={!selectedReport} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#DE141C] px-3.5 text-xs font-semibold text-white transition hover:bg-[#bd1118] disabled:opacity-50"><Download className="h-3.5 w-3.5" />Export {format.toUpperCase()}</button>
							</div>
							<p className="mt-2 text-[10px] leading-4 text-black/40">{format === "pdf" ? "PDF opens in print preview. Choose Save as PDF; enable background graphics to include brand colors." : format === "xlsx" ? "The workbook includes native charts, bordered tables, readable column widths, and separate Summary, Chart Data, Supporting Table, and Charts sheets." : "CSV is plain text data. Choose Excel or PDF when you need charts, borders, spacing, or print-ready layout."}</p>
							{status ? <p role="status" className="mt-2 text-xs font-medium text-emerald-700">{status}</p> : null}
						</section>
						<div className="mb-4"><h3 className="text-sm font-semibold text-[#111111]">Raw data exports</h3><p className="mt-1 text-xs text-black/50">Download an individual dataset as CSV for filtering or further analysis.</p></div>
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
					<p role="status" aria-live="polite" className="min-w-0 text-xs text-black/55">{status || (tab === "schedule" ? "Reports are delivered based on your selected frequency and categories." : "Choose an Analytics tab and format, or download a raw dataset as CSV.")}</p>
					{tab === "schedule" ? <button type="button" onClick={() => void saveSchedule()} disabled={saving || loading} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-[#DE141C] px-3.5 text-xs font-semibold text-white transition hover:bg-[#bd1118] disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status.includes("saved") ? <Check className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}{saving ? "Saving..." : "Save schedule"}</button> : <button type="button" onClick={onClose} className="h-9 shrink-0 rounded-md border border-black/10 bg-white px-3.5 text-xs font-semibold text-black/65 transition hover:bg-zinc-100">Done</button>}
				</footer>
			</section>
		</div>
	);
}
