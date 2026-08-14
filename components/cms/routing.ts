import type { CmsPrimary, CmsSection } from "./types";

const sections = [
	"overview",
	"properties",
	"projects",
	"inquiries",
	"pipeline",
	"timeline",
	"analytics",
	"trafficBehavior",
	"propertyPerformance",
	"predictiveAnalytics",
	"userEngagement",
	"traffic",
	"agentPerformance",
	"developerPortfolio",
	"agents",
	"developers",
	"profiles",
	"gallery",
	"logos",
	"stats",
	"settings",
	"activityLogs",
] satisfies CmsSection[];

const propertyCategories = ["all", "condo", "house", "lot", "farm", "memorial"];

export type CmsSearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export function sectionFromParam(value: string | string[] | undefined, fallback: CmsSection): CmsSection {
	const section = firstParam(value);
	return sections.includes(section as CmsSection) ? (section as CmsSection) : fallback;
}

export function categoryFromParam(value: string | string[] | undefined) {
	const category = firstParam(value);
	return propertyCategories.includes(category ?? "") ? category ?? "all" : "all";
}

export function primaryForSection(section: CmsSection): CmsPrimary {
	if (section === "properties" || section === "projects") return "listings";
	if (section === "inquiries" || section === "pipeline" || section === "timeline") return "inquiries";
	if (section === "analytics" || section === "trafficBehavior" || section === "propertyPerformance" || section === "predictiveAnalytics" || section === "userEngagement" || section === "traffic" || section === "agentPerformance" || section === "developerPortfolio") return "analytics";
	if (section === "agents" || section === "developers" || section === "profiles") return "people";
	if (section === "gallery" || section === "logos" || section === "stats") return "content";
	if (section === "settings" || section === "activityLogs") return "settings";
	return "dashboard";
}
