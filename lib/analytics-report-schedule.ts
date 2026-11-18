export const ANALYTICS_REPORT_SCHEDULE_KEY = "analytics_report_schedule";

export type AnalyticsReportPeriod = "daily" | "weekly" | "monthly";
export type AnalyticsReportCategory = "traffic" | "property" | "engagement" | "predictive";
export type AnalyticsReportSection = "executiveSummary" | "descriptiveFindings" | "predictiveInsights" | "riskFlags" | "recommendedActions";

export type AnalyticsReportSchedule = {
	enabled: boolean;
	sendEmail: boolean;
	schedules: Record<AnalyticsReportPeriod, { enabled: boolean; categories: AnalyticsReportCategory[] }>;
	sections: Record<AnalyticsReportSection, boolean>;
};

export const DEFAULT_ANALYTICS_REPORT_SCHEDULE: AnalyticsReportSchedule = {
	enabled: true,
	sendEmail: false,
	schedules: {
		daily: { enabled: true, categories: ["predictive"] },
		weekly: { enabled: true, categories: ["predictive"] },
		monthly: { enabled: true, categories: ["predictive"] },
	},
	sections: {
		executiveSummary: true,
		descriptiveFindings: true,
		predictiveInsights: true,
		riskFlags: true,
		recommendedActions: true,
	},
};

const periods: AnalyticsReportPeriod[] = ["daily", "weekly", "monthly"];
const categories: AnalyticsReportCategory[] = ["traffic", "property", "engagement", "predictive"];
const sectionKeys: AnalyticsReportSection[] = ["executiveSummary", "descriptiveFindings", "predictiveInsights", "riskFlags", "recommendedActions"];

export function parseAnalyticsReportSchedule(value: unknown): AnalyticsReportSchedule {
	let parsed = value;
	if (typeof parsed === "string") {
		try { parsed = JSON.parse(parsed) as unknown; } catch { return DEFAULT_ANALYTICS_REPORT_SCHEDULE; }
	}
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_ANALYTICS_REPORT_SCHEDULE;
	const source = parsed as Partial<AnalyticsReportSchedule>;
	const schedules = {} as AnalyticsReportSchedule["schedules"];
	for (const period of periods) {
		const config = source.schedules?.[period];
		schedules[period] = {
			enabled: typeof config?.enabled === "boolean" ? config.enabled : DEFAULT_ANALYTICS_REPORT_SCHEDULE.schedules[period].enabled,
			categories: Array.isArray(config?.categories) ? config.categories.filter((item): item is AnalyticsReportCategory => categories.includes(item)) : DEFAULT_ANALYTICS_REPORT_SCHEDULE.schedules[period].categories,
		};
	}
	const sections = {} as AnalyticsReportSchedule["sections"];
	for (const section of sectionKeys) sections[section] = typeof source.sections?.[section] === "boolean" ? source.sections[section] : true;
	return {
		enabled: typeof source.enabled === "boolean" ? source.enabled : true,
		sendEmail: source.sendEmail === true,
		schedules,
		sections,
	};
}
