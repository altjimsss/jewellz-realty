"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListingPerformanceChart } from "@/components/dashboard/ListingPerformanceChart";
import { supabaseBrowser } from "@/lib/supabase/client";

type TabKey = "overview" | "projects" | "inventory" | "inquiries" | "profile";

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
	notes?: string | null;
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

export default function DeveloperDashboard() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<TabKey>("overview");
	const [loading, setLoading] = useState(true);
	const [userEmail, setUserEmail] = useState("");
	const [developer, setDeveloper] = useState<DeveloperCompany | null>(null);
	const [projects, setProjects] = useState<ProjectItem[]>([]);
	const [properties, setProperties] = useState<PropertyItem[]>([]);
	const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
	const [performance, setPerformance] = useState<ListingPerformanceItem[]>([]);
	const [statusMessage, setStatusMessage] = useState("");

	// Profile Form
	const [profileForm, setProfileForm] = useState<Partial<DeveloperCompany>>({});
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileMessage, setProfileMessage] = useState("");

	// Inquiry Filter
	const [inquirySearch, setInquirySearch] = useState("");
	const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");

	// Inventory Filter
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

				if (isMounted) {
					setUserEmail(user.email ?? "");
				}

				// Find developer partner linked to this auth profile
				const { data: devRow, error: devError } = await supabaseBrowser
					.from("developer_partners")
					.select("*")
					.eq("profile_id", user.id)
					.maybeSingle();

				if (devError) {
					console.error("Developer fetch error:", devError);
				}

				let currentDev = devRow as DeveloperCompany | null;

				// Fallback: If not linked yet, check profile for organization or name
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
					setProfileForm(currentDev);

					// Fetch projects owned by this developer
					const { data: projectRows } = await supabaseBrowser
						.from("projects")
						.select("*")
						.eq("developer_id", currentDev.id)
						.order("created_at", { ascending: false });

					// Fetch properties under this developer
					const { data: propertyRows } = await supabaseBrowser
						.from("properties")
						.select("*")
						.eq("developer_id", currentDev.id)
						.order("created_at", { ascending: false });

					const propList = (propertyRows as PropertyItem[]) ?? [];
					const propertyIds = propList.map((p) => p.id);

					// Fetch inquiries for these properties
					let inquiryRows: InquiryItem[] = [];
					if (propertyIds.length > 0) {
						const { data: inqData } = await supabaseBrowser
							.from("inquiries")
							.select("*")
							.in("property_id", propertyIds)
							.order("created_at", { ascending: false });

						inquiryRows = ((inqData as InquiryItem[]) ?? []).map((inq) => {
							const matchingProp = propList.find((p) => p.id === inq.property_id);
							return {
								...inq,
								property_title: matchingProp?.title ?? "Project Unit",
							};
						});
					}

					// Fetch performance metrics from compatibility view
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

				setLoading(false);
			} catch (err) {
				console.error("Error loading developer portal:", err);
				if (isMounted) setLoading(false);
			}
		}

		void loadDeveloperData();

		return () => {
			isMounted = false;
		};
	}, [router]);

	async function handleSignOut() {
		await supabaseBrowser.auth.signOut();
		router.replace("/login");
	}

	async function handleSaveProfile(e: FormEvent) {
		e.preventDefault();
		if (!developer) return;
		setSavingProfile(true);
		setProfileMessage("Saving updates...");

		try {
			const { error } = await supabaseBrowser
				.from("developer_partners")
				.upsert({
					id: developer.id,
					profile_id: developer.profile_id,
					company_name: profileForm.company_name || developer.company_name,
					slug: profileForm.slug || developer.slug,
					logo_url: profileForm.logo_url || null,
					website_url: profileForm.website_url || null,
					description: profileForm.description || null,
					contact_email: profileForm.contact_email || null,
					contact_phone: profileForm.contact_phone || null,
				});

			if (error) {
				setProfileMessage(`Error: ${error.message}`);
			} else {
				setProfileMessage("Company profile updated successfully!");
				setDeveloper((prev) => (prev ? { ...prev, ...profileForm } : null));
			}
		} catch {
			setProfileMessage("Failed to save profile.");
		} finally {
			setSavingProfile(false);
			setTimeout(() => setProfileMessage(""), 4000);
		}
	}

	async function handleSendPasswordReset() {
		if (!userEmail) return;
		setStatusMessage("Sending password reset email...");
		const { error } = await supabaseBrowser.auth.resetPasswordForEmail(userEmail, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		if (error) {
			setStatusMessage(`Error: ${error.message}`);
		} else {
			setStatusMessage(`Password reset link sent to ${userEmail}`);
		}
		setTimeout(() => setStatusMessage(""), 5000);
	}

	// Filtered Inquiries
	const filteredInquiries = useMemo(() => {
		return inquiries.filter((inq) => {
			const matchesStatus =
				inquiryStatusFilter === "all" || inq.status === inquiryStatusFilter;
			const q = inquirySearch.toLowerCase().trim();
			const matchesQuery =
				!q ||
				(inq.buyer_name?.toLowerCase().includes(q) ?? false) ||
				(inq.buyer_email?.toLowerCase().includes(q) ?? false) ||
				(inq.property_title?.toLowerCase().includes(q) ?? false);
			return matchesStatus && matchesQuery;
		});
	}, [inquiries, inquirySearch, inquiryStatusFilter]);

	// Filtered Inventory
	const filteredProperties = useMemo(() => {
		return properties.filter((prop) => {
			const matchesCat =
				propertyCategoryFilter === "all" || prop.category === propertyCategoryFilter;
			const q = propertySearch.toLowerCase().trim();
			const matchesQuery =
				!q ||
				prop.title.toLowerCase().includes(q) ||
				(prop.city?.toLowerCase().includes(q) ?? false);
			return matchesCat && matchesQuery;
		});
	}, [properties, propertyCategoryFilter, propertySearch]);

	// Summary stats
	const totalViews = performance.reduce((acc, curr) => acc + (curr.total_views ?? 0), 0);
	const conversions = inquiries.filter((i) =>
		["reserved", "closed_won"].includes(i.status ?? "")
	).length;
	const conversionRate = inquiries.length > 0 ? ((conversions / inquiries.length) * 100).toFixed(1) : "0.0";

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-[#111111]">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-[#DE141C]" />
					<p className="text-sm font-medium text-black/60">Loading Developer Hub...</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#F8F9FA] pb-16 text-[#111111]">
			{/* Top Bar Header */}
			<header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link href="/" className="font-bold text-lg tracking-tight text-[#111111]">
							Jewellz<span className="text-[#DE141C]">.</span>
						</Link>
						<span className="h-4 w-px bg-black/15" />
						<div className="flex items-center gap-2">
							<span className="rounded-full bg-[#DE141C]/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#DE141C]">
								Developer Partner Hub
							</span>
							<span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
								Accredited Partner
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="hidden text-right sm:block">
							<div className="text-sm font-semibold text-[#111111]">{developer?.company_name}</div>
							<div className="text-xs text-black/50">{userEmail}</div>
						</div>
						{developer?.logo_url ? (
							<div className="relative h-9 w-9 overflow-hidden rounded-lg border border-black/10">
								<Image
									src={developer.logo_url}
									alt={developer.company_name}
									fill
									className="object-contain p-0.5"
								/>
							</div>
						) : (
							<div className="grid h-9 w-9 place-items-center rounded-lg bg-[#DE141C] text-xs font-bold text-white">
								{developer?.company_name?.charAt(0) ?? "D"}
							</div>
						)}
						<button
							onClick={handleSignOut}
							className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 transition hover:bg-black/5 hover:text-black"
						>
							Sign out
						</button>
					</div>
				</div>
			</header>

			{/* Main Content Container */}
			<div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
				{/* Status Message */}
				{statusMessage ? (
					<div className="mb-4 rounded-xl border border-black/10 bg-white p-3 text-xs font-medium text-[#DE141C] shadow-sm">
						{statusMessage}
					</div>
				) : null}

				{/* Welcome Banner */}
				<div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm md:flex-row md:items-center">
					<div>
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#DE141C]">
							<span>Developer Partner</span>
							<span>•</span>
							<span>{projects.length} Active Master Developments</span>
						</div>
						<h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">
							{developer?.company_name}
						</h1>
						<p className="mt-1 text-sm text-black/60">
							{developer?.description
								? developer.description.slice(0, 140) + "..."
								: "Partnered with Jewellz Realty for master-planned communities and property marketing."}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{developer?.website_url ? (
							<a
								href={developer.website_url}
								target="_blank"
								rel="noreferrer"
								className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#111111] transition hover:bg-black/5"
							>
								Visit Website ↗
							</a>
						) : null}
						<button
							onClick={() => setActiveTab("profile")}
							className="rounded-xl bg-[#DE141C] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15]"
						>
							Manage Profile
						</button>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="mb-6 flex border-b border-black/10">
					<button
						onClick={() => setActiveTab("overview")}
						className={`border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "overview"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						Overview & Analytics
					</button>
					<button
						onClick={() => setActiveTab("projects")}
						className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "projects"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						<span>Master Projects</span>
						<span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] text-black">
							{projects.length}
						</span>
					</button>
					<button
						onClick={() => setActiveTab("inventory")}
						className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "inventory"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						<span>Unit Inventory</span>
						<span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] text-black">
							{properties.length}
						</span>
					</button>
					<button
						onClick={() => setActiveTab("inquiries")}
						className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "inquiries"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						<span>Buyer Inquiries</span>
						<span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] text-black">
							{inquiries.length}
						</span>
					</button>
					<button
						onClick={() => setActiveTab("profile")}
						className={`border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "profile"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						Company Account
					</button>
				</div>

				{/* TAB 1: OVERVIEW & ANALYTICS */}
				{activeTab === "overview" ? (
					<div className="space-y-6">
						{/* 4 KPI Stat Cards */}
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Master Projects
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-[#111111]">
									{projects.length}
								</div>
								<p className="mt-1 text-xs text-black/50">Subdivisions & developments</p>
							</div>

							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Active Units
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-[#DE141C]">
									{properties.length}
								</div>
								<p className="mt-1 text-xs text-black/50">Connected property listings</p>
							</div>

							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Tracked Views
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
									{totalViews.toLocaleString()}
								</div>
								<p className="mt-1 text-xs text-black/50">Client listing views</p>
							</div>

							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Buyer Leads
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-[#DE141C]">
									{inquiries.length}
								</div>
								<p className="mt-1 text-xs text-black/50">Inquiry conversion: {conversionRate}%</p>
							</div>
						</div>

						{/* Listing Performance Interactive Chart */}
						<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
							<div className="mb-4">
								<h2 className="text-base font-bold text-[#111111]">Listing Engagement & Inquiries</h2>
								<p className="text-xs text-black/50">
									Tracked views, interactions, and conversion rate per property in your portfolio
								</p>
							</div>
							<ListingPerformanceChart rows={performance} />
						</div>

						{/* Recent Inquiries Snippet */}
						<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
							<div className="mb-4 flex items-center justify-between">
								<div>
									<h2 className="text-base font-bold text-[#111111]">Recent Buyer Inquiries</h2>
									<p className="text-xs text-black/50">
										Leads generated across your projects and properties
									</p>
								</div>
								<button
									onClick={() => setActiveTab("inquiries")}
									className="text-xs font-semibold text-[#DE141C] hover:underline"
								>
									View all ({inquiries.length}) →
								</button>
							</div>

							{inquiries.length === 0 ? (
								<div className="rounded-xl border border-dashed border-black/10 py-10 text-center text-xs text-black/40">
									No buyer inquiries recorded yet.
								</div>
							) : (
								<div className="divide-y divide-black/5">
									{inquiries.slice(0, 5).map((inq) => (
										<div key={inq.id} className="flex items-center justify-between py-3">
											<div>
												<div className="font-semibold text-sm text-[#111111]">
													{inq.buyer_name || "Interested Buyer"}
												</div>
												<div className="text-xs text-black/50">
													Property: {inq.property_title || "Project Unit"}
												</div>
											</div>
											<div className="flex items-center gap-3">
												<span
													className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
														inq.status === "closed_won" || inq.status === "reserved"
															? "bg-emerald-100 text-emerald-800"
															: "bg-blue-100 text-blue-800"
													}`}
												>
													{inq.status || "new"}
												</span>
												<span className="text-xs text-black/40">
													{inq.created_at ? inq.created_at.slice(0, 10) : "—"}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				) : null}

				{/* TAB 2: PROJECTS & SUBDIVISIONS */}
				{activeTab === "projects" ? (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-lg font-bold text-[#111111]">Master Projects & Developments</h2>
								<p className="text-xs text-black/50">
									Subdivisions, condominium towers, and estates under your portfolio
								</p>
							</div>
							<span className="text-xs font-semibold text-black/50">
								{projects.length} Total Projects
							</span>
						</div>

						{projects.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-black/15 bg-white py-16 text-center shadow-sm">
								<p className="text-sm font-semibold text-[#111111]">No master projects yet</p>
								<p className="mt-1 text-xs text-black/50">
									Contact the brokerage admin to link your development projects to this account.
								</p>
							</div>
						) : (
							<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{projects.map((proj) => {
									const unitCount = properties.filter((p) => p.project_id === proj.id).length;
									return (
										<div
											key={proj.id}
											className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"
										>
											<div className="relative aspect-[16/9] w-full bg-zinc-100">
												{proj.cover_image_url ? (
													<Image
														src={proj.cover_image_url}
														alt={proj.project_name}
														fill
														className="object-cover"
													/>
												) : (
													<div className="grid h-full w-full place-items-center text-xs text-black/40">
														No Project Cover
													</div>
												)}
												<span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
													{unitCount} {unitCount === 1 ? "Unit" : "Units"}
												</span>
											</div>

											<div className="flex flex-1 flex-col p-4">
												<h3 className="text-base font-bold tracking-tight text-[#111111]">
													{proj.project_name}
												</h3>
												{proj.tagline ? (
													<p className="mt-0.5 text-xs text-[#DE141C] font-medium">
														{proj.tagline}
													</p>
												) : null}
												<p className="mt-1 text-xs text-black/50">
													Location: {proj.location_city || "Batangas"},{" "}
													{proj.location_province || "Philippines"}
												</p>

												{proj.description ? (
													<p className="mt-3 text-xs leading-5 text-black/60 line-clamp-2">
														{proj.description}
													</p>
												) : null}

												<div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3">
													{proj.brochure_url ? (
														<a
															href={proj.brochure_url}
															target="_blank"
															rel="noreferrer"
															className="text-xs font-semibold text-[#DE141C] hover:underline"
														>
															View Brochure ↗
														</a>
													) : (
														<span className="text-xs text-black/40">No brochure</span>
													)}
													<button
														onClick={() => {
															setPropertySearch(proj.project_name);
															setActiveTab("inventory");
														}}
														className="text-xs font-semibold text-black/70 hover:text-[#DE141C]"
													>
														Filter Units →
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				) : null}

				{/* TAB 3: UNIT INVENTORY */}
				{activeTab === "inventory" ? (
					<div className="space-y-4">
						{/* Inventory Filters */}
						<div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
							<div className="relative flex-1">
								<input
									type="search"
									value={propertySearch}
									onChange={(e) => setPropertySearch(e.target.value)}
									placeholder="Search unit by title or city..."
									className="h-10 w-full rounded-xl border border-black/10 bg-zinc-50 pl-3 pr-4 text-xs text-[#111111] outline-none transition focus:border-black/30 focus:bg-white"
								/>
							</div>

							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-black/50">Category:</span>
								<select
									value={propertyCategoryFilter}
									onChange={(e) => setPropertyCategoryFilter(e.target.value)}
									className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none"
								>
									<option value="all">All Categories ({properties.length})</option>
									<option value="condo">Condo</option>
									<option value="house">House</option>
									<option value="lot">Lot</option>
									<option value="farm">Farm</option>
									<option value="memorial">Memorial</option>
								</select>
							</div>
						</div>

						{/* Inventory Table */}
						<div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-xs">
									<thead className="border-b border-black/10 bg-zinc-50 font-semibold uppercase tracking-[0.14em] text-black/50">
										<tr>
											<th className="px-4 py-3.5">Listing / Unit</th>
											<th className="px-4 py-3.5">Category</th>
											<th className="px-4 py-3.5">Location</th>
											<th className="px-4 py-3.5">Price</th>
											<th className="px-4 py-3.5">Status</th>
											<th className="px-4 py-3.5 text-right">View</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-black/5">
										{filteredProperties.length === 0 ? (
											<tr>
												<td colSpan={6} className="px-4 py-10 text-center text-black/45">
													No units found matching your search.
												</td>
											</tr>
										) : (
											filteredProperties.map((prop) => (
												<tr key={prop.id} className="transition hover:bg-zinc-50/70">
													<td className="px-4 py-3.5">
														<div className="font-semibold text-sm text-[#111111]">
															{prop.title}
														</div>
														<div className="text-black/45">
															{prop.bedrooms ? `${prop.bedrooms} Bed · ` : ""}
															{prop.lot_area_sqm ? `${prop.lot_area_sqm} sqm` : ""}
														</div>
													</td>
													<td className="px-4 py-3.5 uppercase tracking-wider text-[10px] font-semibold text-black/60">
														{prop.category || "Residential"}
													</td>
													<td className="px-4 py-3.5 text-black/70">
														{prop.city ?? "Batangas"}, {prop.province ?? "PH"}
													</td>
													<td className="px-4 py-3.5 font-semibold text-[#DE141C]">
														{prop.price ? `₱${prop.price.toLocaleString()}` : "Price upon request"}
													</td>
													<td className="px-4 py-3.5">
														<span
															className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
																prop.status === "sold"
																	? "bg-red-100 text-red-800"
																	: prop.status === "reserved"
																		? "bg-amber-100 text-amber-800"
																		: "bg-emerald-100 text-emerald-800"
															}`}
														>
															{prop.status || "Published"}
														</span>
													</td>
													<td className="px-4 py-3.5 text-right">
														<Link
															href={`/project-list/${prop.slug}`}
															target="_blank"
															className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-[#111111] transition hover:bg-black/5"
														>
															Public ↗
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
				) : null}

				{/* TAB 4: BUYER INQUIRIES */}
				{activeTab === "inquiries" ? (
					<div className="space-y-4">
						{/* Inquiries Filters */}
						<div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
							<div className="relative flex-1">
								<input
									type="search"
									value={inquirySearch}
									onChange={(e) => setInquirySearch(e.target.value)}
									placeholder="Search buyer name, email, or property..."
									className="h-10 w-full rounded-xl border border-black/10 bg-zinc-50 pl-3 pr-4 text-xs text-[#111111] outline-none transition focus:border-black/30 focus:bg-white"
								/>
							</div>

							<div className="flex items-center gap-2">
								<span className="text-xs font-medium text-black/50">Status:</span>
								<select
									value={inquiryStatusFilter}
									onChange={(e) => setInquiryStatusFilter(e.target.value)}
									className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none"
								>
									<option value="all">All Inquiries ({inquiries.length})</option>
									<option value="new">New</option>
									<option value="contacted">Contacted</option>
									<option value="viewing_scheduled">Viewing Scheduled</option>
									<option value="reserved">Reserved</option>
									<option value="closed_won">Closed Won</option>
								</select>
							</div>
						</div>

						{/* Inquiries Table */}
						<div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-xs">
									<thead className="border-b border-black/10 bg-zinc-50 font-semibold uppercase tracking-[0.14em] text-black/50">
										<tr>
											<th className="px-4 py-3.5">Buyer</th>
											<th className="px-4 py-3.5">Property Inquired</th>
											<th className="px-4 py-3.5">Contact Email / Phone</th>
											<th className="px-4 py-3.5">Status</th>
											<th className="px-4 py-3.5">Date</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-black/5">
										{filteredInquiries.length === 0 ? (
											<tr>
												<td colSpan={5} className="px-4 py-10 text-center text-black/45">
													No inquiries found.
												</td>
											</tr>
										) : (
											filteredInquiries.map((inq) => (
												<tr key={inq.id} className="transition hover:bg-zinc-50/70">
													<td className="px-4 py-3.5 font-semibold text-sm text-[#111111]">
														{inq.buyer_name || "Prospective Buyer"}
													</td>
													<td className="px-4 py-3.5 font-medium text-[#111111]">
														{inq.property_title || "Project Unit"}
													</td>
													<td className="px-4 py-3.5 text-black/60">
														{inq.buyer_email ? (
															<div>
																<a href={`mailto:${inq.buyer_email}`} className="text-[#DE141C] hover:underline">
																	{inq.buyer_email}
																</a>
															</div>
														) : null}
														{inq.buyer_phone ? (
															<div className="text-black/50">{inq.buyer_phone}</div>
														) : null}
													</td>
													<td className="px-4 py-3.5">
														<span
															className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
																inq.status === "closed_won" || inq.status === "reserved"
																	? "bg-emerald-100 text-emerald-800"
																	: inq.status === "new"
																		? "bg-blue-100 text-blue-800"
																		: "bg-zinc-100 text-black/70"
															}`}
														>
															{inq.status?.replace("_", " ") || "new"}
														</span>
													</td>
													<td className="px-4 py-3.5 text-black/50">
														{inq.created_at ? inq.created_at.slice(0, 10) : "—"}
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				) : null}

				{/* TAB 5: COMPANY ACCOUNT & SETTINGS */}
				{activeTab === "profile" ? (
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm lg:col-span-2">
							<div className="border-b border-black/10 pb-4">
								<h2 className="text-lg font-bold text-[#111111]">Developer Company Profile</h2>
								<p className="text-xs text-black/50">
									Manage your brand credentials, contact info, and company overview
								</p>
							</div>

							{profileMessage ? (
								<div className="mt-4 rounded-xl border border-black/10 bg-zinc-50 p-3 text-xs font-semibold text-[#DE141C]">
									{profileMessage}
								</div>
							) : null}

							<form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Company Name
										</label>
										<input
											type="text"
											required
											value={profileForm.company_name || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, company_name: e.target.value }))
											}
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Company Slug
										</label>
										<input
											type="text"
											value={profileForm.slug || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, slug: e.target.value }))
											}
											placeholder="e.g. megaworld-corporation"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Contact Email
										</label>
										<input
											type="email"
											value={profileForm.contact_email || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, contact_email: e.target.value }))
											}
											placeholder="inquiries@developer.com"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Contact Phone
										</label>
										<input
											type="text"
											value={profileForm.contact_phone || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, contact_phone: e.target.value }))
											}
											placeholder="+63 917 000 0000"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Official Website URL
										</label>
										<input
											type="url"
											value={profileForm.website_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, website_url: e.target.value }))
											}
											placeholder="https://company.com"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Company Logo URL
										</label>
										<input
											type="url"
											value={profileForm.logo_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, logo_url: e.target.value }))
											}
											placeholder="https://.../logo.png"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
										Company Description
									</label>
									<textarea
										rows={4}
										value={profileForm.description || ""}
										onChange={(e) =>
											setProfileForm((prev) => ({ ...prev, description: e.target.value }))
										}
										placeholder="Describe your master developments, real estate track record, and vision..."
										className="mt-1 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none transition focus:border-[#DE141C]"
									/>
								</div>

								<div className="pt-2">
									<button
										type="submit"
										disabled={savingProfile}
										className="inline-flex h-10 items-center justify-center rounded-xl bg-[#DE141C] px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15] disabled:opacity-50"
									>
										{savingProfile ? "Saving..." : "Save Company Profile"}
									</button>
								</div>
							</form>
						</div>

						{/* Security & Access */}
						<div className="space-y-6">
							<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
								<h2 className="text-base font-bold text-[#111111]">Account Credentials</h2>
								<p className="text-xs text-black/50">Your authentication credentials</p>

								<div className="mt-4 space-y-3">
									<div>
										<span className="text-[11px] font-semibold uppercase tracking-wider text-black/45">
											Login Email
										</span>
										<div className="mt-0.5 font-medium text-xs text-[#111111]">
											{userEmail || "—"}
										</div>
									</div>

									<div>
										<span className="text-[11px] font-semibold uppercase tracking-wider text-black/45">
											Account Type
										</span>
										<div className="mt-0.5 text-xs text-black/60">
											Accredited Developer Partner
										</div>
									</div>

									<div className="border-t border-black/10 pt-3">
										<button
											type="button"
											onClick={handleSendPasswordReset}
											className="w-full rounded-xl border border-black/10 bg-zinc-50 py-2.5 text-xs font-semibold text-[#111111] transition hover:bg-black/5"
										>
											Send Password Reset Email
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				) : null}
			</div>
		</main>
	);
}
