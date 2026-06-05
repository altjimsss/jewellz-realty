import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Role = "admin" | "agent" | "developer_partner" | "buyer" | null;
export type FieldType = "text" | "textarea" | "number" | "checkbox" | "select" | "datetime-local" | "email" | "url" | "array";

export type FieldOption = { label: string; value: string; meta?: Record<string, string> };
export type CmsValue = string | number | null | undefined;
export type CmsRow = Record<string, CmsValue>;
export type CmsPayload = Record<string, CmsValue | boolean | string[]>;

export type FieldSpec = {
	name: string;
	label: string;
	type: FieldType;
	section?: string;
	placeholder?: string;
	rows?: number;
	options?: FieldOption[];
	dependsOn?: string;
	optionParentKey?: string;
	help?: string;
};

export type SectionProps = {
	title: string;
	description: string;
	children: ReactNode;
};

export type EditorProps = {
	title: string;
	description: string;
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
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
	renderPreview?: (payload: CmsPayload, currentRow: CmsRow | null) => ReactNode;
	guidance?: ReactNode;
	extra?: ReactNode;
	idKey?: string;
};

export type Workspace = {
	properties: CmsRow[];
	projects: CmsRow[];
	developers: CmsRow[];
	agents: CmsRow[];
	inquiries: CmsRow[];
	cmsPages: CmsRow[];
	galleryItems: CmsRow[];
	testimonials: CmsRow[];
	heroBanners: CmsRow[];
	partnerLogos: CmsRow[];
	siteStats: CmsRow[];
	settings: CmsRow[];
	listingPerformance: CmsRow[];
	dailyInquiryVolume: CmsRow[];
	trafficSources: CmsRow[];
	agentPerformance: CmsRow[];
	developerPortfolio: CmsRow[];
	recommendations: CmsRow[];
	engagementEvents: CmsRow[];
	profiles: CmsRow[];
	activityLogs: CmsRow[];
};

export type SelectionState = {
	properties: string | null;
	projects: string | null;
	developers: string | null;
	agents: string | null;
	inquiries: string | null;
	cmsPages: string | null;
	galleryItems: string | null;
	testimonials: string | null;
	heroBanners: string | null;
	partnerLogos: string | null;
	siteStats: string | null;
	settings: string | null;
};

export type CmsSection =
	| "overview"
	| "properties"
	| "projects"
	| "inquiries"
	| "pipeline"
	| "timeline"
	| "analytics"
	| "trafficBehavior"
	| "propertyPerformance"
	| "predictiveAnalytics"
	| "userEngagement"
	| "traffic"
	| "agentPerformance"
	| "developerPortfolio"
	| "agents"
	| "developers"
	| "profiles"
	| "hero"
	| "gallery"
	| "testimonials"
	| "logos"
	| "stats"
	| "pages"
	| "settings"
	| "activityLogs";

export type CmsPrimary = "dashboard" | "listings" | "inquiries" | "analytics" | "people" | "content" | "settings";

export type CmsNavGroup = {
	id: CmsPrimary;
	label: string;
	icon: LucideIcon;
	items: { id: CmsSection; label: string; hint: string; icon: LucideIcon }[];
};
