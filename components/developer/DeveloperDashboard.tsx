"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	BarChart3,
	Building,
	Building2,
	ChevronRight,
	ExternalLink,
	Inbox,
	LayoutDashboard,
	LogOut,
	Mail,
	MapPin,
	PanelLeftClose,
	PanelLeftOpen,
	RefreshCw,
	Search,
	ShieldCheck,
	TrendingUp,
	UserCircle,
} from "lucide-react";
import { ListingPerformanceChart } from "@/components/dashboard/ListingPerformanceChart";
import { DashboardBarChart, DashboardDonut, DashboardTrendChart, type DashboardChartRow } from "@/components/dashboard/DashboardCharts";
import { supabaseBrowser } from "@/lib/supabase/client";

type SectionId = "overview" | "properties" | "projects" | "performance" | "inquiries" | "profile" | "security";

const DEVELOPER_SECTIONS: SectionId[] = ["overview", "properties", "projects", "performance", "inquiries", "profile", "security"];

function isDeveloperSection(value: string | undefined): value is SectionId {
	return DEVELOPER_SECTIONS.includes(value as SectionId);
}

/* Keep the active tab in the URL so a refresh or bookmark restores it. */
function syncSectionUrl(section: SectionId) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.set("section", section);
	window.history.replaceState(null, "", url);
}

type DeveloperCompany = {
	id: string;
	profile_id: string;
	company_name: string;
	slug?: string | null;
	logo_url?: string | null;
	website_url?: string | null;
	description?: string | null;
	contact_email?: string | null;
	contact_phone?: string | null;
	is_active?: boolean | null;
};

type ProjectItem = {
	id: string;
	developer_id: string;
	project_name: string;
	slug?: string | null;
	tagline?: string | null;
	description?: string | null;
	location_city?: string | null;
	location_province?: string | null;
	cover_image_url?: string | null;
	brochure_url?: string | null;
	is_active?: boolean | null;
	created_at?: string | null;
};

type PropertyItem = {
	id: string;
	developer_id?: string | null;
	project_id?: string | null;
	title: string;
	slug: string;
	category?: string | null;
	status?: string | null;
	price?: number | null;
	city?: string | null;
	province?: string | null;
	bedrooms?: number | null;
	bathrooms?: number | null;
	lot_area_sqm?: number | null;
	floor_area_sqm?: number | null;
	featured_image_url?: string | null;
	images?: string[] | null;
	created_at?: string | null;
};

type InquiryItem = {
	id: string;
	property_id?: string | null;
	buyer_name?: string | null;
	buyer_email?: string | null;
	buyer_phone?: string | null;
	status?: string | null;
	priority?: string | null;
	message?: string | null;
	created_at?: string | null;
	property_title?: string | null;
};

type ListingPerformanceItem = {
	property_id?: string;
	title?: string;
	total_views?: number;
	detail_opens?: number;
	total_interactions?: number;
	avg_dwell_seconds?: number;
	total_inquiries?: number;
	inquiry_rate_pct?: number;
};

const SECTION_META: Record<SectionId, { title: string; subtitle: string }> = {
	overview: { title: "Overview", subtitle: "A read-only snapshot of your portfolio performance." },
	properties: { title: "Properties", subtitle: "Every unit linked to your developer account." },
	projects: { title: "Master Projects", subtitle: "Developments your company is marketing with Jewellz Realty." },
	performance: { title: "Performance", subtitle: "Listing views, engagement, and inquiry conversion." },
	inquiries: { title: "Buyer Inquiries", subtitle: "Leads generated across your listings." },
	profile: { title: "Company Profile", subtitle: "Your public partner profile details." },
	security: { title: "Security", subtitle: "Sign-in details and account access." },
};

const STAGE_COLORS: Record<string, string> = {
	new: "#111111",
	assigned: "#4f46e5",
	contacted: "#0891b2",
	viewing_scheduled: "#d97706",
	negotiating: "#7c3aed",
	reserved: "#059669",
	closed_won: "#16a34a",
	closed_lost: "#DE141C",
};

const CATEGORY_COLORS: Record<string, string> = {
	condo: "#111111",
	house: "#DE141C",
	lot: "#4f46e5",
	farm: "#059669",
	memorial: "#d97706",
};

const PROPERTY_STATUS_COLORS: Record<string, string> = {
	published: "#111111",
	available: "#059669",
	reserved: "#d97706",
	sold: "#DE141C",
	pending: "#4f46e5",
};

const STAGE_ORDER = ["new", "assigned", "contacted", "viewing_scheduled", "negotiating", "reserved", "closed_won", "closed_lost"];

function formatCurrency(value?: number | null) {
	if (value == null) return "Price upon request";
	return `₱${Number(value).toLocaleString()}`;
}

function titleCase(value?: string | null) {
	if (!value) return "—";
	return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupCount<T>(items: T[], keyFn: (item: T) => string | null | undefined, colorMap?: Record<string, string>): DashboardChartRow[] {
	const map = new Map<string, number>();
	items.forEach((item) => {
		const key = (keyFn(item) || "unknown").toLowerCase();
		map.set(key, (map.get(key) || 0) + 1);
	});
	return Array.from(map.entries())
		.sort((a, b) => b[1] - a[1])
		.map(([label, value]) => ({ label, value, color: colorMap?.[label] }));
}

function stageRows(items: { status?: string | null }[]): DashboardChartRow[] {
	return STAGE_ORDER.map((stage) => ({
		label: stage,
		value: items.filter((item) => (item.status ?? "new") === stage).length,
		color: STAGE_COLORS[stage],
	})).filter((row) => row.value > 0);
}

function buildDailyTrend(rows: InquiryItem[], days: number): DashboardChartRow[] {
	const buckets: DashboardChartRow[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	for (let i = days - 1; i >= 0; i -= 1) {
		const day = new Date(today);
		day.setDate(today.getDate() - i);
		buckets.push({ label: `${day.getMonth() + 1}/${day.getDate()}`, value: 0 });
	}
	rows.forEach((row) => {
		if (!row.created_at) return;
		const day = new Date(row.created_at);
		day.setHours(0, 0, 0, 0);
		const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
		if (diff >= 0 && diff < days) {
			const index = days - 1 - diff;
			if (buckets[index]) buckets[index].value += 1;
		}
	});
	return buckets;
}

function StatCard({ label, value, hint, accent }: { label: string; value: string | number; hint: string; accent?: boolean }) {
	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">{label}</div>
			<div className={`mt-2 text-2xl font-semibold tracking-[-0.03em] ${accent ? "text-[#DE141C]" : "text-[#111111]"}`}>{value}</div>
			<p className="mt-1 text-xs text-black/45">{hint}</p>
		</div>
	);
}

function StatusPill({ status, tone }: { status?: string | null; tone: "stage" | "property" }) {
	const value = status ?? "new";
	const stageTone = value === "closed_won" || value === "reserved" ? "bg-emerald-50 text-emerald-700" : value === "closed_lost" ? "bg-red-50 text-red-700" : value === "new" ? "bg-zinc-100 text-black/70" : "bg-indigo-50 text-indigo-700";
	const propertyTone = value === "sold" ? "bg-red-50 text-red-700" : value === "reserved" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
	return (
		<span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone === "stage" ? stageTone : propertyTone}`}>
			{titleCase(value)}
		</span>
	);
}

export default function DeveloperDashboard({ initialSection }: { initialSection?: string }) {
	const router = useRouter();
	const [activeSection, setActiveSection] = useState<SectionId>(() => (isDeveloperSection(initialSection) ? initialSection : "overview"));
	const [showSidebar, setShowSidebar] = useState(true);
	const [refreshKey, setRefreshKey] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [userEmail, setUserEmail] = useState("");
	const [developer, setDeveloper] = useState<DeveloperCompany | null>(null);
	const [projects, setProjects] = useState<ProjectItem[]>([]);
	const [properties, setProperties] = useState<PropertyItem[]>([]);
	const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
	const [performance, setPerformance] = useState<ListingPerformanceItem[]>([]);
	const [statusMessage, setStatusMessage] = useState("");
	const [showAccountMenu, setShowAccountMenu] = useState(false);

	const [inquirySearch, setInquirySearch] = useState("");
	const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
	const [propertySearch, setPropertySearch] = useState("");
	const [propertyCategoryFilter, setPropertyCategoryFilter] = useState("all");

	useEffect(() => {
		let isMounted = true;

		async function loadDeveloperData() {
			try {
				const { data: sessionResult } = await supabaseBrowser.auth.getSession();
				const user = sessionResult.session?.user;

				if (!user) {
					router.replace("/login?next=/developer");
					return;
				}

				if (isMounted) setUserEmail(user.email ?? "");

				const { data: devRow } = await supabaseBrowser
					.from("developer_partners")
					.select("*")
					.eq("profile_id", user.id)
					.maybeSingle();

				let currentDev = devRow as DeveloperCompany | null;

				if (!currentDev) {
					const { data: userProfile } = await supabaseBrowser
						.from("profiles")
						.select("full_name, role")
						.eq("id", user.id)
						.maybeSingle();

					if (userProfile) {
						currentDev = {
							id: user.id,
							profile_id: user.id,
							company_name: userProfile.full_name || "Developer Partner",
							contact_email: user.email,
						};
					}
				}

				if (!isMounted) return;

				if (currentDev) {
					setDeveloper(currentDev);

					const { data: projectRows } = await supabaseBrowser
						.from("projects")
						.select("*")
						.eq("developer_id", currentDev.id)
						.order("created_at", { ascending: false });

					const { data: propertyRows } = await supabaseBrowser
						.from("properties")
						.select("*")
						.eq("developer_id", currentDev.id)
						.order("created_at", { ascending: false });

					const propList = (propertyRows as PropertyItem[]) ?? [];
					const propertyIds = propList.map((property) => property.id);

					let inquiryRows: InquiryItem[] = [];
					if (propertyIds.length > 0) {
						const { data: inqData } = await supabaseBrowser
							.from("inquiries")
							.select("*")
							.in("property_id", propertyIds)
							.order("created_at", { ascending: false });

						inquiryRows = ((inqData as InquiryItem[]) ?? []).map((inq) => {
							const matchingProp = propList.find((property) => property.id === inq.property_id);
							return { ...inq, property_title: matchingProp?.title ?? "Project Unit" };
						});
					}

					let perfRows: ListingPerformanceItem[] = [];
					if (propertyIds.length > 0) {
						const { data: perfData } = await supabaseBrowser
							.from("mv_listing_performance")
							.select("*")
							.in("property_id", propertyIds);

						perfRows = (perfData as ListingPerformanceItem[]) ?? [];
					}

					if (isMounted) {
						setProjects((projectRows as ProjectItem[]) ?? []);
						setProperties(propList);
						setInquiries(inquiryRows);
						setPerformance(perfRows);
					}
				}

				if (isMounted) {
					setLoading(false);
					setRefreshing(false);
				}
			} catch (error) {
				console.error("Error loading developer portal:", error);
				if (isMounted) {
					setLoading(false);
					setRefreshing(false);
				}
			}
		}

		void loadDeveloperData();

		return () => {
			isMounted = false;
		};
	}, [router, refreshKey]);

	async function handleSignOut() {
		await supabaseBrowser.auth.signOut();
		window.location.href = "/";
	}

	async function handleSendPasswordReset() {
		if (!userEmail) return;
		setStatusMessage("Sending password reset email...");
		const { error } = await supabaseBrowser.auth.resetPasswordForEmail(userEmail, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		setStatusMessage(error ? `Error: ${error.message}` : `Password reset link sent to ${userEmail}`);
		setTimeout(() => setStatusMessage(""), 5000);
	}

	function handleRefresh() {
		setRefreshing(true);
		setRefreshKey((current) => current + 1);
	}

	function openSection(section: SectionId) {
		setActiveSection(section);
		setShowAccountMenu(false);
		syncSectionUrl(section);
	}

	const navGroups = [
		{
			id: "dashboard",
			label: "Dashboard",
			icon: LayoutDashboard,
			items: [{ id: "overview" as SectionId, label: "Overview", hint: "Performance snapshot", icon: LayoutDashboard }],
		},
		{
			id: "portfolio",
			label: "Portfolio",
			icon: Building2,
			items: [
				{ id: "properties" as SectionId, label: "Properties", hint: `${properties.length} units`, icon: Building2 },
				{ id: "projects" as SectionId, label: "Master Projects", hint: `${projects.length} developments`, icon: Building },
			],
		},
		{
			id: "analytics",
			label: "Analytics",
			icon: BarChart3,
			items: [
				{ id: "performance" as SectionId, label: "Performance", hint: "Views & engagement", icon: TrendingUp },
				{ id: "inquiries" as SectionId, label: "Buyer Inquiries", hint: `${inquiries.length} leads`, icon: Inbox },
			],
		},
		{
			id: "account",
			label: "Account",
			icon: UserCircle,
			items: [
				{ id: "profile" as SectionId, label: "Company Profile", hint: "Brand details", icon: Building },
				{ id: "security" as SectionId, label: "Security", hint: "Login & access", icon: ShieldCheck },
			],
		},
	];

	const activeGroup = navGroups.find((group) => group.items.some((item) => item.id === activeSection)) ?? navGroups[0];
	const activeItem = activeGroup.items.find((item) => item.id === activeSection) ?? activeGroup.items[0];

	const filteredInquiries = inquiries.filter((inq) => {
		const matchesStatus = inquiryStatusFilter === "all" || (inq.status ?? "new") === inquiryStatusFilter;
		const query = inquirySearch.toLowerCase().trim();
		const matchesQuery =
			!query ||
			(inq.buyer_name?.toLowerCase().includes(query) ?? false) ||
			(inq.buyer_email?.toLowerCase().includes(query) ?? false) ||
			(inq.property_title?.toLowerCase().includes(query) ?? false);
		return matchesStatus && matchesQuery;
	});

	const filteredProperties = properties.filter((property) => {
		const matchesCategory = propertyCategoryFilter === "all" || (property.category ?? "").toLowerCase() === propertyCategoryFilter;
		const query = propertySearch.toLowerCase().trim();
		const matchesQuery =
			!query ||
			property.title.toLowerCase().includes(query) ||
			(property.city?.toLowerCase().includes(query) ?? false) ||
			(property.province?.toLowerCase().includes(query) ?? false);
		return matchesCategory && matchesQuery;
	});

	const totalViews = performance.reduce((sum, row) => sum + (row.total_views ?? 0), 0);
	const totalInteractions = performance.reduce((sum, row) => sum + (row.total_interactions ?? 0), 0);
	const conversions = inquiries.filter((inq) => ["reserved", "closed_won"].includes(inq.status ?? "")).length;
	const conversionRate = inquiries.length > 0 ? ((conversions / inquiries.length) * 100).toFixed(1) : "0.0";
	const categoryRows = groupCount(properties, (property) => property.category ?? "residential", CATEGORY_COLORS);
	const propertyStatusRows = groupCount(properties, (property) => property.status ?? "published", PROPERTY_STATUS_COLORS);
	const inquiryStageRows = stageRows(inquiries);
	const trendRows = buildDailyTrend(inquiries, 14);
	const topListings = [...performance].sort((a, b) => (b.total_views ?? 0) - (a.total_views ?? 0)).slice(0, 5);
	const recentInquiries = inquiries.slice(0, 6);
	const availableCategories = Array.from(new Set(properties.map((property) => (property.category ?? "").toLowerCase()).filter(Boolean)));

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#f2f2ef] p-6 text-[#111111]">
				<div className="skeleton-delayed flex w-full max-w-6xl flex-col gap-3">
					<div className="skeleton-shimmer h-16 rounded-lg bg-black/5" />
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{[0, 1, 2, 3].map((key) => <div key={key} className="skeleton-shimmer h-28 rounded-lg bg-black/5" />)}
					</div>
					<div className="skeleton-shimmer h-64 rounded-lg bg-black/5" />
				</div>
			</main>
		);
	}

	if (!developer) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#f2f2ef] p-6 text-[#111111]">
				<div className="w-full max-w-md rounded-lg border border-black/10 bg-white p-8 text-center shadow-sm">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-black/10 bg-zinc-50">
						<Building2 className="h-6 w-6 text-black/50" />
					</div>
					<h1 className="mt-4 text-lg font-semibold text-[#111111]">No developer profile linked</h1>
					<p className="mt-2 text-xs leading-relaxed text-black/55">
						Your account is not yet connected to a developer partner record. Please contact the Jewellz Realty admin to link your company.
					</p>
					<button type="button" onClick={handleSignOut} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#111111] px-5 text-xs font-semibold text-white transition hover:bg-black/85">
						Sign out
					</button>
				</div>
			</main>
		);
	}

	function renderOverview() {
		return (
			<div className="flex flex-col gap-3">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard label="Active Units" value={properties.length} hint="Connected property listings" accent />
					<StatCard label="Master Projects" value={projects.length} hint="Subdivisions & developments" />
					<StatCard label="Buyer Leads" value={inquiries.length} hint={`Conversion rate: ${conversionRate}%`} />
					<StatCard label="Tracked Views" value={totalViews.toLocaleString()} hint="Client listing views" />
				</div>

				<div className="grid gap-3 xl:grid-cols-3">
					<div className="rounded-lg border border-black/10 bg-white p-4 xl:col-span-2">
						<div className="text-sm font-semibold text-[#111111]">Inquiry trend</div>
						<p className="mt-1 text-xs text-black/45">Buyer leads received over the last 14 days.</p>
						<div className="mt-3">
							<DashboardTrendChart rows={trendRows} name="Inquiries" />
						</div>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-sm font-semibold text-[#111111]">Lead stages</div>
						<p className="mt-1 text-xs text-black/45">Current pipeline of your inquiries.</p>
						<div className="mt-3">
							<DashboardDonut rows={inquiryStageRows} centerLabel="Leads" centerValue={inquiries.length} emptyLabel="No leads yet" emptyHint="Buyer inquiries will appear here." />
						</div>
					</div>
				</div>

				<div className="grid gap-3 xl:grid-cols-3">
					<div className="rounded-lg border border-black/10 bg-white p-4 xl:col-span-2">
						<div className="flex items-center justify-between gap-3">
							<div>
								<div className="text-sm font-semibold text-[#111111]">Recent buyer inquiries</div>
								<p className="mt-1 text-xs text-black/45">Leads generated across your projects and units.</p>
							</div>
							<button type="button" onClick={() => openSection("inquiries")} className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE141C] hover:underline">
								View all <ChevronRight className="h-3.5 w-3.5" />
							</button>
						</div>
						<div className="mt-3">
							{recentInquiries.length === 0 ? (
								<p className="rounded-lg border border-dashed border-black/10 py-8 text-center text-xs text-black/40">No buyer inquiries recorded yet.</p>
							) : (
								<div className="divide-y divide-black/5">
									{recentInquiries.map((inq) => (
										<div key={inq.id} className="flex items-center justify-between gap-3 py-2.5">
											<div className="min-w-0">
												<div className="truncate text-sm font-medium text-[#111111]">{inq.buyer_name || "Interested Buyer"}</div>
												<div className="truncate text-xs text-black/50">{inq.property_title || "Project Unit"}</div>
											</div>
											<div className="flex shrink-0 items-center gap-3">
												<StatusPill status={inq.status} tone="stage" />
												<span className="hidden text-xs text-black/40 sm:block">{inq.created_at ? inq.created_at.slice(0, 10) : "—"}</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-sm font-semibold text-[#111111]">Top performing units</div>
						<p className="mt-1 text-xs text-black/45">By tracked views.</p>
						<div className="mt-3">
							{topListings.length === 0 ? (
								<p className="rounded-lg border border-dashed border-black/10 py-8 text-center text-xs text-black/40">No engagement data yet.</p>
							) : (
								<ol className="space-y-2.5">
									{topListings.map((row, index) => (
										<li key={row.property_id ?? index} className="flex items-center gap-3 text-xs">
											<span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-black/5 font-semibold text-black/50">{index + 1}</span>
											<span className="min-w-0 flex-1 truncate text-black/70">{row.title ?? "Untitled unit"}</span>
											<span className="shrink-0 font-semibold text-[#111111]">{(row.total_views ?? 0).toLocaleString()}</span>
										</li>
									))}
								</ol>
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	function renderProperties() {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-black/10 bg-zinc-50 px-3">
						<Search className="h-4 w-4 text-black/40" />
						<input
							value={propertySearch}
							onChange={(event) => setPropertySearch(event.target.value)}
							placeholder="Search unit by title, city, or province..."
							className="w-full bg-transparent text-sm outline-none placeholder:text-black/35"
						/>
					</div>
					<select
						value={propertyCategoryFilter}
						onChange={(event) => setPropertyCategoryFilter(event.target.value)}
						className="h-9 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none"
					>
						<option value="all">All categories ({properties.length})</option>
						{availableCategories.map((category) => (
							<option key={category} value={category}>{titleCase(category)}</option>
						))}
					</select>
				</div>

				<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
					<div className="overflow-x-auto">
						<table className="min-w-full text-left text-xs">
							<thead className="border-b border-black/10 bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
								<tr>
									<th className="px-4 py-3">Listing / Unit</th>
									<th className="px-4 py-3">Category</th>
									<th className="px-4 py-3">Location</th>
									<th className="px-4 py-3">Price</th>
									<th className="px-4 py-3">Status</th>
									<th className="px-4 py-3 text-right">Public</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-black/5">
								{filteredProperties.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-10 text-center text-black/45">No units found matching your search.</td>
									</tr>
								) : (
									filteredProperties.map((property) => (
										<tr key={property.id} className="transition hover:bg-zinc-50/70">
											<td className="px-4 py-3">
												<div className="text-sm font-medium text-[#111111]">{property.title}</div>
												<div className="text-black/45">
													{property.bedrooms ? `${property.bedrooms} Bed · ` : ""}
													{property.lot_area_sqm ? `${property.lot_area_sqm} sqm` : ""}
												</div>
											</td>
											<td className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-black/55">{titleCase(property.category ?? "residential")}</td>
											<td className="px-4 py-3 text-black/70">{property.city ?? "—"}, {property.province ?? "PH"}</td>
											<td className="px-4 py-3 font-semibold text-[#111111]">{formatCurrency(property.price)}</td>
											<td className="px-4 py-3"><StatusPill status={property.status ?? "published"} tone="property" /></td>
											<td className="px-4 py-3 text-right">
												<Link href={`/project-list/${property.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border border-black/10 px-2.5 py-1 text-xs font-medium text-[#111111] transition hover:bg-black/5">
													View <ExternalLink className="h-3 w-3" />
												</Link>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}

	function renderProjects() {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h2 className="text-sm font-semibold text-[#111111]">Master Projects & Developments</h2>
						<p className="mt-0.5 text-xs text-black/45">Subdivisions, towers, and estates under your portfolio.</p>
					</div>
					<span className="text-xs font-medium text-black/45">{projects.length} total</span>
				</div>

				{projects.length === 0 ? (
					<div className="rounded-lg border border-dashed border-black/15 bg-white py-16 text-center">
						<p className="text-sm font-semibold text-[#111111]">No master projects yet</p>
						<p className="mt-1 text-xs text-black/50">Contact the brokerage admin to link your development projects to this account.</p>
					</div>
				) : (
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{projects.map((project) => {
							const unitCount = properties.filter((property) => property.project_id === project.id).length;
							return (
								<div key={project.id} className="group flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white">
									<div className="relative aspect-[16/9] w-full bg-zinc-100">
										{project.cover_image_url ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={project.cover_image_url} alt={project.project_name} className="h-full w-full object-cover" />
										) : (
											<div className="grid h-full w-full place-items-center text-xs text-black/40">No cover image</div>
										)}
										<span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
											{unitCount} {unitCount === 1 ? "Unit" : "Units"}
										</span>
									</div>
									<div className="flex flex-1 flex-col p-4">
										<h3 className="text-sm font-semibold text-[#111111]">{project.project_name}</h3>
										{project.tagline ? <p className="mt-0.5 text-xs font-medium text-[#DE141C]">{project.tagline}</p> : null}
										<p className="mt-1 inline-flex items-center gap-1 text-xs text-black/50">
											<MapPin className="h-3 w-3" />
											{project.location_city || "Batangas"}, {project.location_province || "Philippines"}
										</p>
										{project.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-black/60">{project.description}</p> : null}
										<div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3">
											{project.brochure_url ? (
												<a href={project.brochure_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE141C] hover:underline">
													Brochure <ExternalLink className="h-3 w-3" />
												</a>
											) : (
												<span className="text-xs text-black/40">No brochure</span>
											)}
											<button
												type="button"
												onClick={() => { setPropertySearch(project.project_name); openSection("properties"); }}
												className="inline-flex items-center gap-1 text-xs font-semibold text-black/70 hover:text-[#DE141C]"
											>
												View units <ChevronRight className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	}

	function renderPerformance() {
		return (
			<div className="flex flex-col gap-3">
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard label="Tracked Views" value={totalViews.toLocaleString()} hint="Across all your units" />
					<StatCard label="Interactions" value={totalInteractions.toLocaleString()} hint="Detail opens & clicks" />
					<StatCard label="Buyer Leads" value={inquiries.length} hint="Total inquiries received" />
					<StatCard label="Conversion" value={`${conversionRate}%`} hint="Reserved or closed won" accent />
				</div>

				<ListingPerformanceChart rows={performance} />

				<div className="grid gap-3 xl:grid-cols-2">
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-sm font-semibold text-[#111111]">Portfolio by category</div>
						<p className="mt-1 text-xs text-black/45">How your units are distributed by property type.</p>
						<div className="mt-3">
							<DashboardDonut rows={categoryRows} centerLabel="Units" centerValue={properties.length} emptyLabel="No units yet" emptyHint="Linked listings will appear here." />
						</div>
					</div>
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-sm font-semibold text-[#111111]">Units by status</div>
						<p className="mt-1 text-xs text-black/45">Current availability across your portfolio.</p>
						<div className="mt-3">
							<DashboardBarChart rows={propertyStatusRows} name="Units" horizontal />
						</div>
					</div>
				</div>
			</div>
		);
	}

	function renderInquiries() {
		return (
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex h-9 flex-1 items-center gap-2 rounded-md border border-black/10 bg-zinc-50 px-3">
						<Search className="h-4 w-4 text-black/40" />
						<input
							value={inquirySearch}
							onChange={(event) => setInquirySearch(event.target.value)}
							placeholder="Search buyer name, email, or property..."
							className="w-full bg-transparent text-sm outline-none placeholder:text-black/35"
						/>
					</div>
					<select
						value={inquiryStatusFilter}
						onChange={(event) => setInquiryStatusFilter(event.target.value)}
						className="h-9 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none"
					>
						<option value="all">All statuses ({inquiries.length})</option>
						{STAGE_ORDER.map((stage) => <option key={stage} value={stage}>{titleCase(stage)}</option>)}
					</select>
				</div>

				<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
					<div className="overflow-x-auto">
						<table className="min-w-full text-left text-xs">
							<thead className="border-b border-black/10 bg-zinc-50 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">
								<tr>
									<th className="px-4 py-3">Buyer</th>
									<th className="px-4 py-3">Property Inquired</th>
									<th className="px-4 py-3">Contact</th>
									<th className="px-4 py-3">Status</th>
									<th className="px-4 py-3">Date</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-black/5">
								{filteredInquiries.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-10 text-center text-black/45">No inquiries found.</td>
									</tr>
								) : (
									filteredInquiries.map((inq) => (
										<tr key={inq.id} className="transition hover:bg-zinc-50/70">
											<td className="px-4 py-3 text-sm font-medium text-[#111111]">{inq.buyer_name || "Prospective Buyer"}</td>
											<td className="px-4 py-3 text-black/70">{inq.property_title || "Project Unit"}</td>
											<td className="px-4 py-3 text-black/60">
												{inq.buyer_email ? <a href={`mailto:${inq.buyer_email}`} className="block text-[#DE141C] hover:underline">{inq.buyer_email}</a> : null}
												{inq.buyer_phone ? <span className="block text-black/50">{inq.buyer_phone}</span> : null}
											</td>
											<td className="px-4 py-3"><StatusPill status={inq.status} tone="stage" /></td>
											<td className="px-4 py-3 text-black/50">{inq.created_at ? inq.created_at.slice(0, 10) : "—"}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
	}

	function renderProfile() {
		const rows: Array<{ label: string; value?: string | null; href?: string | null }> = [
			{ label: "Company Name", value: developer?.company_name },
			{ label: "Company Slug", value: developer?.slug },
			{ label: "Contact Email", value: developer?.contact_email, href: developer?.contact_email ? `mailto:${developer.contact_email}` : null },
			{ label: "Contact Phone", value: developer?.contact_phone, href: developer?.contact_phone ? `tel:${developer.contact_phone}` : null },
			{ label: "Website", value: developer?.website_url, href: developer?.website_url },
		];
		return (
			<div className="grid gap-3 lg:grid-cols-3">
				<div className="rounded-lg border border-black/10 bg-white p-5 lg:col-span-2">
					<div className="flex items-center gap-4">
						{developer?.logo_url ? (
							<div className="relative h-16 w-16 overflow-hidden rounded-lg border border-black/10 bg-white">
								<Image src={developer.logo_url} alt={developer.company_name} fill className="object-contain p-1" />
							</div>
						) : (
							<div className="grid h-16 w-16 place-items-center rounded-lg bg-[#DE141C] text-xl font-bold text-white">
								{developer?.company_name?.charAt(0) ?? "D"}
							</div>
						)}
						<div className="min-w-0">
							<h2 className="truncate text-base font-semibold text-[#111111]">{developer?.company_name}</h2>
							<span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Accredited Partner</span>
						</div>
					</div>

					<div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
						{rows.map((row) => (
							<div key={row.label}>
								<div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">{row.label}</div>
								<div className="mt-1 text-sm text-[#111111]">
									{row.value ? (
										row.href ? <a href={row.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#DE141C] hover:underline">{row.value} <ExternalLink className="h-3 w-3" /></a> : row.value
									) : (
										<span className="text-black/40">Not provided</span>
									)}
								</div>
							</div>
						))}
					</div>

					<div className="mt-5 border-t border-black/10 pt-4">
						<div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">Company Description</div>
						<p className="mt-1 text-sm leading-relaxed text-black/65">{developer?.description || "No company description on file."}</p>
					</div>

					<p className="mt-5 rounded-lg border border-dashed border-black/10 bg-zinc-50 p-3 text-xs text-black/50">
						Your partner profile is managed by the Jewellz Realty admin team. Contact them to request any updates.
					</p>
				</div>

				<div className="space-y-3">
					<div className="rounded-lg border border-black/10 bg-white p-4">
						<div className="text-sm font-semibold text-[#111111]">Portfolio summary</div>
						<div className="mt-3 space-y-2.5 text-xs">
							<div className="flex items-center justify-between"><span className="text-black/55">Master projects</span><span className="font-semibold text-[#111111]">{projects.length}</span></div>
							<div className="flex items-center justify-between"><span className="text-black/55">Active units</span><span className="font-semibold text-[#111111]">{properties.length}</span></div>
							<div className="flex items-center justify-between"><span className="text-black/55">Buyer inquiries</span><span className="font-semibold text-[#111111]">{inquiries.length}</span></div>
							<div className="flex items-center justify-between"><span className="text-black/55">Tracked views</span><span className="font-semibold text-[#111111]">{totalViews.toLocaleString()}</span></div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	function renderSecurity() {
		return (
			<div className="grid gap-3 lg:grid-cols-2">
				<div className="rounded-lg border border-black/10 bg-white p-5">
					<h2 className="text-sm font-semibold text-[#111111]">Account Credentials</h2>
					<p className="mt-1 text-xs text-black/45">Your sign-in details for the developer portal.</p>
					<div className="mt-4 space-y-4">
						<div>
							<div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">Login Email</div>
							<div className="mt-1 text-sm text-[#111111]">{userEmail || "—"}</div>
						</div>
						<div>
							<div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">Account Type</div>
							<div className="mt-1 text-sm text-[#111111]">Accredited Developer Partner</div>
						</div>
						<div className="border-t border-black/10 pt-4">
							{statusMessage ? <div className="mb-3 rounded-md border border-black/10 bg-zinc-50 p-2.5 text-xs font-medium text-[#DE141C]">{statusMessage}</div> : null}
							<button type="button" onClick={() => void handleSendPasswordReset()} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black/85">
								<Mail className="h-3.5 w-3.5" />
								Send Password Reset Email
							</button>
						</div>
					</div>
				</div>

				<div className="rounded-lg border border-black/10 bg-white p-5">
					<h2 className="text-sm font-semibold text-[#111111]">Session</h2>
					<p className="mt-1 text-xs text-black/45">Sign out of the developer portal on this device.</p>
					<button type="button" onClick={() => void handleSignOut()} className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-black/10 bg-white px-4 text-xs font-semibold text-[#111111] transition hover:bg-black/5">
						<LogOut className="h-3.5 w-3.5" />
						Sign out
					</button>
				</div>
			</div>
		);
	}

	const sectionRenderers: Record<SectionId, () => ReactNode> = {
		overview: renderOverview,
		properties: renderProperties,
		projects: renderProjects,
		performance: renderPerformance,
		inquiries: renderInquiries,
		profile: renderProfile,
		security: renderSecurity,
	};

	return (
		<main className="min-h-screen bg-[#f2f2ef] text-[#111111]">
			<div className={`grid min-h-screen w-full transition-[grid-template-columns] duration-200 ${showSidebar ? "lg:grid-cols-[56px_220px_1fr]" : "lg:grid-cols-[56px_0px_1fr]"}`}>
				{/* Primary icon rail */}
				<aside className="hidden border-r border-black/10 bg-[#fbfbfa] py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<Link href="/" className="flex h-10 w-10 items-center justify-center rounded-md bg-white ring-1 ring-black/10" title="Jewellz Realty">
							<Image src="/assets/logo-icon.png" alt="Jewellz Realty" width={32} height={32} className="h-8 w-8 object-contain" />
						</Link>
						<div className="flex flex-col gap-2">
							{navGroups.map((group) => {
								const Icon = group.icon;
								const active = activeGroup.id === group.id;
								return (
									<button
										key={group.id}
										type="button"
										onClick={() => openSection(group.items[0].id)}
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
						<button type="button" onClick={handleRefresh} className="flex h-9 w-9 items-center justify-center rounded-md text-black/55 transition hover:bg-white hover:text-[#111111]" title="Refresh">
							<RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
						</button>
						<button type="button" onClick={() => void handleSignOut()} className="flex h-9 w-9 items-center justify-center rounded-md text-black/55 transition hover:bg-white hover:text-[#111111]" title="Sign out">
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</aside>

				{/* Secondary navigation */}
				<aside className={`${showSidebar ? "block" : "hidden lg:block lg:w-0 lg:overflow-hidden"} border-b border-black/10 bg-[#fbfbfa] lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0 lg:border-r`}>
					<nav className="flex max-h-[60vh] flex-col overflow-auto px-2 py-3 lg:max-h-[calc(100vh-120px)]">
						<div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-black/40">{activeGroup.label}</div>
						<div className="space-y-1">
							{activeGroup.items.map((item) => {
								const Icon = item.icon;
								const active = activeSection === item.id;
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => openSection(item.id)}
										className={`relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition ${active ? "bg-white text-[#111111] shadow-sm before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#111111]" : "text-black/65 hover:bg-white hover:text-[#111111]"}`}
									>
										<Icon className="h-4 w-4 shrink-0" />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium">{item.label}</span>
											<span className="block truncate text-[11px] text-black/45">{item.hint}</span>
										</span>
									</button>
								);
							})}
						</div>
					</nav>

					{/* Company summary */}
					<div className="border-t border-black/10 px-3 py-3">
						<div className="flex items-center gap-2.5">
							{developer?.logo_url ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={developer.logo_url} alt={developer.company_name} className="h-9 w-9 rounded-md border border-black/10 bg-white object-contain p-0.5" />
							) : (
								<div className="grid h-9 w-9 place-items-center rounded-md bg-[#DE141C] text-xs font-bold text-white">{developer?.company_name?.charAt(0) ?? "D"}</div>
							)}
							<div className="min-w-0">
								<div className="truncate text-xs font-semibold text-[#111111]">{developer?.company_name}</div>
								<div className="truncate text-[11px] text-black/45">Accredited Partner</div>
							</div>
						</div>
						<div className="mt-3 flex gap-2 lg:hidden">
							<button type="button" onClick={handleRefresh} className="flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-medium">Refresh</button>
							<button type="button" onClick={() => void handleSignOut()} className="flex-1 rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white">Sign out</button>
						</div>
					</div>
				</aside>

				{/* Main column */}
				<section className="flex min-w-0 flex-col bg-[#f2f2ef]">
					<header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-black/10 bg-[#fbfbfa] px-4">
						<button type="button" onClick={() => setShowSidebar((current) => !current)} className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 bg-white text-black/60 transition hover:text-[#111111]" title={showSidebar ? "Hide sidebar" : "Show sidebar"}>
							{showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
						</button>
						<div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-black/45 md:flex">
							<span>Developer Hub</span>
							<span>/</span>
							<strong className="truncate text-[#111111]">{activeItem.label}</strong>
						</div>
						<span className="ml-auto hidden items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/55 sm:inline-flex">
							View-only access
						</span>
						<div className="relative">
							<button type="button" onClick={() => setShowAccountMenu((current) => !current)} className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white pl-2 pr-2.5 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
								<span className="grid h-5 w-5 place-items-center rounded-full bg-[#DE141C] text-[10px] font-bold text-white">{developer?.company_name?.charAt(0) ?? "D"}</span>
								<span className="hidden max-w-28 truncate sm:block">{developer?.company_name}</span>
								<ChevronRight className={`h-3.5 w-3.5 text-black/40 transition ${showAccountMenu ? "rotate-90" : ""}`} />
							</button>
							{showAccountMenu ? (
								<div className="absolute right-0 top-10 z-30 w-64 rounded-lg border border-black/10 bg-white p-3 text-sm shadow-xl">
									<div className="font-medium text-[#111111]">{developer?.company_name}</div>
									<div className="mt-1 truncate text-xs text-black/45">{userEmail}</div>
									<div className="mt-2 inline-flex rounded-full bg-black/5 px-3 py-1 text-[11px] text-black/60">Accredited Developer Partner</div>
									<button type="button" onClick={() => { setShowAccountMenu(false); openSection("security"); }} className="mt-3 w-full rounded-md border border-black/10 px-3 py-2 text-left text-xs font-medium text-[#111111] transition hover:bg-black/5">Account security</button>
									<button type="button" onClick={() => void handleSignOut()} className="mt-2 w-full rounded-md bg-[#111111] px-3 py-2 text-xs font-medium text-white">Sign out</button>
								</div>
							) : null}
						</div>
					</header>

					<div className="flex-1 overflow-auto bg-[#f2f2ef] px-3 py-3 sm:px-4 lg:px-5">
						<div className="mx-auto flex max-w-7xl flex-col gap-3">
							<div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
								{navGroups.map((group) => {
									const Icon = group.icon;
									const active = activeGroup.id === group.id;
									return (
										<button
											key={group.id}
											type="button"
											onClick={() => openSection(group.items[0].id)}
											className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-[#111111] bg-[#111111] text-white" : "border-black/10 bg-white text-black/65"}`}
										>
											<Icon className="h-3.5 w-3.5" />
											{group.label}
										</button>
									);
								})}
							</div>

							<div className="flex flex-wrap items-end justify-between gap-3">
								<div>
									<h1 className="text-lg font-semibold tracking-[-0.02em] text-[#111111]">{SECTION_META[activeSection].title}</h1>
									<p className="mt-0.5 text-xs text-black/50">{SECTION_META[activeSection].subtitle}</p>
								</div>
								<button type="button" onClick={handleRefresh} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
									<RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
									Refresh
								</button>
							</div>

							{statusMessage && activeSection !== "security" ? (
								<div className="rounded-lg border border-black/10 bg-white p-3 text-xs font-medium text-[#DE141C]">{statusMessage}</div>
							) : null}

							{sectionRenderers[activeSection]()}
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
