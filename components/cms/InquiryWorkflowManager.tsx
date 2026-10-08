"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertCircle,
	ArrowRight,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	LayoutGrid,
	List,
	Mail,
	MessageSquare,
	Phone,
	Search,
	Sparkles,
	User,
	UserPlus,
	X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { LeadScoreBadge } from "@/components/dashboard/LeadScoreBadge";
import { inquiryStatusOptions } from "./constants";
import type { CmsPayload, CmsRow, Role } from "./types";
import { asText } from "./utils";

export type InquiryViewMode = "inquiries" | "pipeline" | "timeline";

type InquiryWorkflowManagerProps = {
	activeView: InquiryViewMode;
	inquiries: CmsRow[];
	agents: CmsRow[];
	properties?: CmsRow[];
	currentRole: Role;
	currentUserId: string | null;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onReload: () => Promise<void>;
	canEdit: boolean;
	canReassign: boolean;
	onViewChange?: (view: InquiryViewMode) => void;
};

function hoursSince(value: unknown) {
	const timestamp = new Date(asText(value)).getTime();
	if (!Number.isFinite(timestamp)) return null;
	return (Date.now() - timestamp) / 36e5;
}

function relativeAge(value: unknown) {
	const hours = hoursSince(value);
	if (hours == null) return "No date";
	if (hours < 1) return "Just now";
	if (hours < 24) return `${Math.floor(hours)}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}


function toNullableNumber(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = parseFloat(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

const STAGE_CONFIGS: Record<
	string,
	{ label: string; color: string; bg: string; dot: string; order: number }
> = {
	new: { label: "New Leads", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500", order: 1 },
	assigned: { label: "Assigned", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", dot: "bg-purple-500", order: 2 },
	contacted: { label: "Contacted", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", order: 3 },
	viewing_scheduled: { label: "Viewing Scheduled", color: "text-teal-700", bg: "bg-teal-50 border-teal-200", dot: "bg-teal-500", order: 4 },
	negotiating: { label: "Negotiating", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", dot: "bg-indigo-500", order: 5 },
	reserved: { label: "Reserved", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", order: 6 },
	closed_won: { label: "Closed Won", color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-600", order: 7 },
	closed_lost: { label: "Closed Lost", color: "text-zinc-600", bg: "bg-zinc-50 border-zinc-200", dot: "bg-zinc-400", order: 8 },
};

const NEXT_STAGE_MAP: Record<string, string> = {
	new: "assigned",
	assigned: "contacted",
	contacted: "viewing_scheduled",
	viewing_scheduled: "negotiating",
	negotiating: "reserved",
	reserved: "closed_won",
};

export function InquiryWorkflowManager({
	activeView,
	inquiries,
	agents,
	properties = [],
	currentRole: _currentRole,
	currentUserId,
	selectedId,
	onSelect,
	onReload,
	canEdit,
	canReassign,
	onViewChange: _onViewChange,
}: InquiryWorkflowManagerProps) {
	const viewMode = activeView;

	// Filter & Search states
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [agentFilter, setAgentFilter] = useState("all");
	const [quickFilter, setQuickFilter] = useState<"all" | "high_intent" | "unassigned" | "stale">("all");
	const [sortBy, setSortBy] = useState<"newest" | "score" | "oldest">("newest");

	// Expanded stages state (for limiting to 5 leads by default with View All toggle)
	const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
	// Layout mode for All Inquiries (responsive cards by default vs table)
	const [inquiriesLayout, setInquiriesLayout] = useState<"table" | "cards">("cards");

	function toggleStageExpanded(stageKey: string) {
		setExpandedStages((prev) => ({
			...prev,
			[stageKey]: !prev[stageKey],
		}));
	}

	function setAllStagesExpanded(expand: boolean) {
		const next: Record<string, boolean> = {};
		for (const stage of inquiryStatusOptions) {
			next[stage.value] = expand;
		}
		setExpandedStages(next);
	}

	const areAllStagesExpanded = useMemo(() => {
		return inquiryStatusOptions.every((s) => expandedStages[s.value]);
	}, [expandedStages]);

	// Map of agents for fast lookup
	const agentMap = useMemo(() => {
		const map: Record<string, CmsRow> = {};
		for (const agent of agents) {
			map[asText(agent.id)] = agent;
		}
		return map;
	}, [agents]);

	// Map of properties for fast lookup
	const propertyMap = useMemo(() => {
		const map: Record<string, CmsRow> = {};
		for (const prop of properties) {
			map[asText(prop.id)] = prop;
		}
		return map;
	}, [properties]);

	// Dismissal state so the user can reliably collapse/exit the inspector drawer
	const [closedInquiryId, setClosedInquiryId] = useState<string | null>(null);

	// Currently selected inquiry (guards against dismissed id)
	const selectedInquiry = useMemo(() => {
		if (!selectedId || (closedInquiryId && asText(selectedId) === closedInquiryId)) {
			return null;
		}
		return inquiries.find((item) => asText(item.id) === asText(selectedId)) ?? null;
	}, [inquiries, selectedId, closedInquiryId]);

	const handleSelectInquiry = useCallback(
		(id: string | null) => {
			if (id === null) {
				if (selectedInquiry) {
					setClosedInquiryId(asText(selectedInquiry.id));
				}
				onSelect(null);
			} else {
				setClosedInquiryId(null);
				onSelect(id);
			}
		},
		[selectedInquiry, onSelect]
	);

	// Usability & Accessibility: Close inspector with Escape key
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && selectedInquiry) {
				handleSelectInquiry(null);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedInquiry, handleSelectInquiry]);

	// Timeline & Inspection states
	const [timeline, setTimeline] = useState<CmsRow[]>([]);
	const [globalTimeline, setGlobalTimeline] = useState<CmsRow[]>([]);
	const [loadingTimeline, setLoadingTimeline] = useState(false);
	const [visitorEvents, setVisitorEvents] = useState<CmsRow[]>([]);
	const [visitorSession, setVisitorSession] = useState<CmsRow | null>(null);

	// Note Composer states
	const [noteText, setNoteText] = useState("");
	const [noteActionType, setNoteActionType] = useState<"note" | "call" | "viewing" | "email">("note");
	const [targetStatus, setTargetStatus] = useState("");
	const [savingAction, setSavingAction] = useState(false);
	const [statusBanner, setStatusBanner] = useState("");


	// Load Global Timeline on mount or reload
	useEffect(() => {
		let isMounted = true;
		void (async () => {
			const { data } = await supabaseBrowser
				.from("inquiry_timeline")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(60);

			if (isMounted) {
				setGlobalTimeline(data ?? []);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, [inquiries]);

	// Live subscription for inquiry_timeline updates
	useEffect(() => {
		let isMounted = true;
		const channel = supabaseBrowser
			.channel("cms_inquiry_timeline_realtime")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "inquiry_timeline",
				},
				(payload) => {
					if (!isMounted) return;
					const newTimelineRow = payload.new as CmsRow;
					setGlobalTimeline((prev) => [newTimelineRow, ...prev]);
					if (selectedInquiry && asText(newTimelineRow.inquiry_id) === asText(selectedInquiry.id)) {
						setTimeline((prev) => [newTimelineRow, ...prev]);
					}
				}
			)
			.subscribe();

		return () => {
			isMounted = false;
			void supabaseBrowser.removeChannel(channel);
		};
	}, [selectedInquiry]);

	// Load Selected Inquiry's specific timeline and anonymous visitor history
	useEffect(() => {
		if (!selectedInquiry) {
			return;
		}

		let isMounted = true;
		void (async () => {
			setLoadingTimeline(true);
			const [timelineRes, eventsRes, sessionRes] = await Promise.all([
				supabaseBrowser
					.from("inquiry_timeline")
					.select("*")
					.eq("inquiry_id", selectedInquiry.id)
					.order("created_at", { ascending: false }),
				selectedInquiry.session_id
					? supabaseBrowser
							.from("analytics_events")
							.select("event_type, property_id, page_path, metadata, created_at")
							.eq("session_id", selectedInquiry.session_id)
							.order("created_at", { ascending: false })
							.limit(50)
					: Promise.resolve({ data: [] }),
				selectedInquiry.session_id
					? supabaseBrowser
							.from("sessions")
							.select("*")
							.eq("id", selectedInquiry.session_id)
							.maybeSingle()
					: Promise.resolve({ data: null }),
			]);

			if (isMounted) {
				setTimeline(timelineRes.data ?? []);
				setVisitorEvents(eventsRes.data ?? []);
				setVisitorSession(sessionRes.data ?? null);
				setLoadingTimeline(false);
				setTargetStatus(asText(selectedInquiry.status || "new"));
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [selectedInquiry]);

	// Filtered & Sorted Inquiries
	const filteredInquiries = useMemo(() => {
		return inquiries
			.filter((item) => {
				// Search text match
				if (searchQuery.trim()) {
					const q = searchQuery.toLowerCase();
					const buyerName = asText(item.buyer_name).toLowerCase();
					const buyerEmail = asText(item.buyer_email).toLowerCase();
					const buyerPhone = asText(item.buyer_phone).toLowerCase();
					const message = asText(item.buyer_message).toLowerCase();
					const propTitle = asText(propertyMap[asText(item.property_id)]?.title).toLowerCase();
					if (
						!buyerName.includes(q) &&
						!buyerEmail.includes(q) &&
						!buyerPhone.includes(q) &&
						!message.includes(q) &&
						!propTitle.includes(q)
					) {
						return false;
					}
				}

				// Status filter
				if (statusFilter !== "all") {
					if (statusFilter === "active") {
						if (["reserved", "closed_won", "closed_lost"].includes(asText(item.status))) return false;
					} else if (asText(item.status || "new") !== statusFilter) {
						return false;
					}
				}

				// Agent filter
				if (agentFilter !== "all") {
					if (agentFilter === "unassigned") {
						if (asText(item.assigned_agent_id)) return false;
					} else if (asText(item.assigned_agent_id) !== agentFilter) {
						return false;
					}
				}

				// Quick filters
				if (quickFilter === "high_intent") {
					const score = toNullableNumber(item.lead_score) ?? 0;
					const priority = asText(item.priority);
					if (score < 0.72 && priority !== "high") return false;
				} else if (quickFilter === "unassigned") {
					if (asText(item.assigned_agent_id)) return false;
				} else if (quickFilter === "stale") {
					const stale = !item.first_contacted_at && (hoursSince(item.created_at) ?? 0) >= 24;
					if (!stale) return false;
				}

				return true;
			})
			.sort((a, b) => {
				if (sortBy === "score") {
					return (toNullableNumber(b.lead_score) ?? 0) - (toNullableNumber(a.lead_score) ?? 0);
				}
				if (sortBy === "oldest") {
					return new Date(asText(a.created_at)).getTime() - new Date(asText(b.created_at)).getTime();
				}
				return new Date(asText(b.created_at)).getTime() - new Date(asText(a.created_at)).getTime();
			});
	}, [inquiries, searchQuery, statusFilter, agentFilter, quickFilter, sortBy, propertyMap]);

	// Counts by status for tabs
	const countsByStage = useMemo(() => {
		const map: Record<string, number> = {};
		for (const opt of inquiryStatusOptions) {
			map[opt.value] = 0;
		}
		for (const item of inquiries) {
			const st = asText(item.status || "new");
			map[st] = (map[st] ?? 0) + 1;
		}
		return map;
	}, [inquiries]);

	// Summary KPI counts
	const summaryStats = useMemo(() => {
		const total = inquiries.length;
		const unassigned = inquiries.filter((i) => !asText(i.assigned_agent_id)).length;
		const highIntent = inquiries.filter(
			(i) => (toNullableNumber(i.lead_score) ?? 0) >= 0.72 || asText(i.priority) === "high"
		).length;
		const overdue = inquiries.filter(
			(i) => !i.first_contacted_at && (hoursSince(i.created_at) ?? 0) >= 24
		).length;
		const won = inquiries.filter((i) => asText(i.status) === "closed_won" || asText(i.status) === "reserved").length;
		return { total, unassigned, highIntent, overdue, won };
	}, [inquiries]);

	// 1-Click Stage Transition Handler
	async function handleAdvanceStage(inquiryId: string, currentStatus: string, nextStage?: string) {
		const next = nextStage || NEXT_STAGE_MAP[currentStatus] || "contacted";
		setSavingAction(true);
		const now = new Date().toISOString();

		const payload: CmsPayload = {
			status: next,
			last_activity_at: now,
		};
		if (next === "contacted") {
			payload.first_contacted_at = now;
		}
		if (["reserved", "closed_won", "closed_lost"].includes(next)) {
			payload.closed_at = now;
		}

		const { error } = await supabaseBrowser.from("inquiries").update(payload).eq("id", inquiryId);
		if (error) {
			setStatusBanner(`Error: ${error.message}`);
			setSavingAction(false);
			return;
		}

		// Insert automatic timeline record
		await supabaseBrowser.from("inquiry_timeline").insert({
			inquiry_id: inquiryId,
			changed_by: currentUserId,
			old_status: currentStatus,
			new_status: next,
			note: `Stage transitioned from ${currentStatus.replace("_", " ")} to ${next.replace("_", " ")}.`,
		});

		setStatusBanner(`Lead moved to ${next.replace("_", " ")}.`);
		setTimeout(() => setStatusBanner(""), 3000);
		setSavingAction(false);
		await onReload();
	}

	// 1-Click Reassign Agent Handler
	async function handleAssignAgent(inquiryId: string, newAgentId: string) {
		setSavingAction(true);
		const now = new Date().toISOString();
		const targetInquiry = inquiries.find((i) => asText(i.id) === inquiryId) || selectedInquiry;

		const { error } = await supabaseBrowser
			.from("inquiries")
			.update({
				assigned_agent_id: newAgentId || null,
				last_activity_at: now,
				status: newAgentId && (asText(targetInquiry?.status) === "new" || !targetInquiry?.status) ? "assigned" : undefined,
			})
			.eq("id", inquiryId);

		if (error) {
			setStatusBanner(`Error: ${error.message}`);
			setSavingAction(false);
			return;
		}

		// Log to agent_assignments
		if (newAgentId) {
			await supabaseBrowser
				.from("agent_assignments")
				.update({ unassigned_at: now })
				.eq("inquiry_id", inquiryId)
				.is("unassigned_at", null);

			await supabaseBrowser.from("agent_assignments").insert({
				inquiry_id: inquiryId,
				agent_id: newAgentId,
				assigned_by: currentUserId,
				assigned_at: now,
			});
		}

		const agentName = agentMap[newAgentId]?.full_name || "Unassigned";
		await supabaseBrowser.from("inquiry_timeline").insert({
			inquiry_id: inquiryId,
			changed_by: currentUserId,
			old_status: targetInquiry?.status,
			new_status: newAgentId && asText(targetInquiry?.status) === "new" ? "assigned" : targetInquiry?.status,
			note: `Assigned agent set to ${agentName}.`,
		});

		setStatusBanner(`Assigned to ${agentName}.`);
		setTimeout(() => setStatusBanner(""), 3000);
		setSavingAction(false);
		await onReload();
	}

	// Add Activity Note Handler
	async function handleAddNote() {
		if (!selectedInquiry || !noteText.trim()) return;
		setSavingAction(true);
		const now = new Date().toISOString();

		const prefix =
			noteActionType === "call"
				? "📞 [Call Log]: "
				: noteActionType === "viewing"
					? "🏠 [Viewing Scheduled]: "
					: noteActionType === "email"
						? "✉️ [Email Sent]: "
						: "📝 [Note]: ";

		const fullNote = `${prefix}${noteText.trim()}`;

		const updatePayload: CmsPayload = {
			last_activity_at: now,
		};

		if (targetStatus && targetStatus !== selectedInquiry.status) {
			updatePayload.status = targetStatus;
			if (targetStatus === "contacted" && !selectedInquiry.first_contacted_at) {
				updatePayload.first_contacted_at = now;
			}
			if (["reserved", "closed_won", "closed_lost"].includes(targetStatus) && !selectedInquiry.closed_at) {
				updatePayload.closed_at = now;
			}
		}

		await Promise.all([
			supabaseBrowser.from("inquiries").update(updatePayload).eq("id", selectedInquiry.id),
			supabaseBrowser.from("inquiry_timeline").insert({
				inquiry_id: selectedInquiry.id,
				changed_by: currentUserId,
				old_status: selectedInquiry.status,
				new_status: targetStatus || selectedInquiry.status,
				note: fullNote,
			}),
		]);

		setNoteText("");
		setSavingAction(false);
		setStatusBanner("Activity note recorded.");
		setTimeout(() => setStatusBanner(""), 3000);
		await onReload();

		// Refresh timeline
		const { data } = await supabaseBrowser
			.from("inquiry_timeline")
			.select("*")
			.eq("inquiry_id", selectedInquiry.id)
			.order("created_at", { ascending: false });
		setTimeline(data ?? []);
	}

	return (
		<div className="space-y-4">

			{/* Status Banner */}
			{statusBanner ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
					✓ {statusBanner}
				</div>
			) : null}

			{/* KPI Summary Strip */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<div
					onClick={() => {
						setQuickFilter("all");
						setStatusFilter("all");
					}}
					className="cursor-pointer rounded-xl border border-black/10 bg-white p-3 transition hover:border-black/25 hover:shadow-sm"
				>
					<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">Total Leads</div>
					<div className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">{summaryStats.total}</div>
				</div>

				<div
					onClick={() => setQuickFilter("high_intent")}
					className={`cursor-pointer rounded-xl border p-3 transition ${
						quickFilter === "high_intent"
							? "border-[#DE141C] bg-red-50/50 shadow-sm"
							: "border-black/10 bg-white hover:border-black/25 hover:shadow-sm"
					}`}
				>
					<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">
						<span>High Intent</span>
						<Sparkles className="h-3.5 w-3.5" />
					</div>
					<div className="mt-1 text-2xl font-bold tracking-tight text-[#DE141C]">{summaryStats.highIntent}</div>
				</div>

				<div
					onClick={() => setQuickFilter("unassigned")}
					className={`cursor-pointer rounded-xl border p-3 transition ${
						quickFilter === "unassigned"
							? "border-amber-500 bg-amber-50/50 shadow-sm"
							: "border-black/10 bg-white hover:border-black/25 hover:shadow-sm"
					}`}
				>
					<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
						<span>Unassigned</span>
						<UserPlus className="h-3.5 w-3.5" />
					</div>
					<div className="mt-1 text-2xl font-bold tracking-tight text-amber-800">{summaryStats.unassigned}</div>
				</div>

				<div
					onClick={() => setQuickFilter("stale")}
					className={`cursor-pointer rounded-xl border p-3 transition ${
						quickFilter === "stale"
							? "border-red-600 bg-red-50/50 shadow-sm"
							: "border-black/10 bg-white hover:border-black/25 hover:shadow-sm"
					}`}
				>
					<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600">
						<span>Overdue (&gt;24h)</span>
						<AlertCircle className="h-3.5 w-3.5" />
					</div>
					<div className="mt-1 text-2xl font-bold tracking-tight text-red-700">{summaryStats.overdue}</div>
				</div>

				<div
					onClick={() => setStatusFilter("closed_won")}
					className="cursor-pointer rounded-xl border border-black/10 bg-white p-3 transition hover:border-black/25 hover:shadow-sm"
				>
					<div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
						<span>Won / Reserved</span>
						<CheckCircle2 className="h-3.5 w-3.5" />
					</div>
					<div className="mt-1 text-2xl font-bold tracking-tight text-emerald-800">{summaryStats.won}</div>
				</div>
			</div>

			{/* ========================================================================= */}
			{/* MODE 1: ALL INQUIRIES (FULL-WIDTH TABLE / RESPONSIVE CARDS VIEW) */}
			{/* ========================================================================= */}
			{viewMode === "inquiries" ? (
				<div className="space-y-3">
					{/* Search & Filter Toolbar */}
					<div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-black/10 bg-white p-3.5 shadow-sm">
						{/* Search Input */}
						<div className="flex h-9 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-black/10 bg-zinc-50 px-3 text-xs text-black/70 focus-within:border-black/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-black/10">
							<Search className="h-3.5 w-3.5 text-black/40" />
							<input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search buyer name, email, phone, property..."
								className="w-full bg-transparent outline-none placeholder:text-black/40"
								aria-label="Search inquiries"
							/>
							{searchQuery ? (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="text-black/40 hover:text-black"
									aria-label="Clear search"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							) : null}
						</div>

						{/* Filters & View Controls */}
						<div className="flex flex-wrap items-center gap-2">
							{/* Status Filter */}
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="h-9 rounded-xl border border-black/10 bg-white px-2.5 text-xs font-semibold text-black/75 outline-none hover:border-black/25"
								aria-label="Filter by stage"
							>
								<option value="all">All Stages ({inquiries.length})</option>
								<option value="active">Active Pipeline</option>
								{inquiryStatusOptions.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label} ({countsByStage[opt.value] ?? 0})
									</option>
								))}
							</select>

							{/* Agent Filter */}
							<select
								value={agentFilter}
								onChange={(e) => setAgentFilter(e.target.value)}
								className="h-9 rounded-xl border border-black/10 bg-white px-2.5 text-xs font-semibold text-black/75 outline-none hover:border-black/25"
								aria-label="Filter by assigned agent"
							>
								<option value="all">All Agents</option>
								<option value="unassigned">Unassigned Only</option>
								{agents.map((ag) => (
									<option key={asText(ag.id)} value={asText(ag.id)}>
										{ag.full_name || ag.email || ag.id}
									</option>
								))}
							</select>

							{/* Sort By */}
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as "newest" | "score" | "oldest")}
								className="h-9 rounded-xl border border-black/10 bg-white px-2.5 text-xs font-semibold text-black/75 outline-none hover:border-black/25"
								aria-label="Sort inquiries"
							>
								<option value="newest">Sort: Newest</option>
								<option value="score">Sort: Highest Score</option>
								<option value="oldest">Sort: Oldest</option>
							</select>

							{/* Layout Switcher (Table vs Responsive Cards) */}
							<div className="flex items-center rounded-xl border border-black/10 bg-zinc-100 p-0.5" role="group" aria-label="Layout style">
								<button
									type="button"
									onClick={() => setInquiriesLayout("table")}
									className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
										inquiriesLayout === "table"
											? "bg-white text-[#111111] shadow-xs"
											: "text-black/55 hover:text-black"
									}`}
									title="Table View"
									aria-pressed={inquiriesLayout === "table"}
								>
									<List className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Table</span>
								</button>
								<button
									type="button"
									onClick={() => setInquiriesLayout("cards")}
									className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
										inquiriesLayout === "cards"
											? "bg-white text-[#111111] shadow-xs"
											: "text-black/55 hover:text-black"
									}`}
									title="Cards Grid View"
									aria-pressed={inquiriesLayout === "cards"}
								>
									<LayoutGrid className="h-3.5 w-3.5" />
									<span className="hidden sm:inline">Cards</span>
								</button>
							</div>
						</div>
					</div>

					{/* View 1A: Table Layout */}
					{inquiriesLayout === "table" ? (
						<div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
							<div className="w-full overflow-x-auto">
								<table className="w-full text-left text-xs" role="table">
									<thead className="border-b border-black/10 bg-zinc-50 font-semibold uppercase tracking-wider text-black/50">
										<tr>
											<th scope="col" className="px-4 py-3">Buyer / Lead</th>
											<th scope="col" className="px-4 py-3">Interest / Property</th>
											<th scope="col" className="px-4 py-3">Lead Score</th>
											<th scope="col" className="px-4 py-3">Stage</th>
											<th scope="col" className="px-4 py-3">Assigned Agent</th>
											<th scope="col" className="px-4 py-3 text-right">Actions</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-black/5">
										{filteredInquiries.length === 0 ? (
											<tr>
												<td colSpan={6} className="px-4 py-12 text-center text-sm text-black/45">
													No inquiries found matching your filters.
												</td>
											</tr>
										) : null}

										{filteredInquiries.map((inquiry) => {
											const isSelected = asText(inquiry.id) === asText(selectedId);
											const prop = propertyMap[asText(inquiry.property_id)];
											const agent = agentMap[asText(inquiry.assigned_agent_id)];
											const score = toNullableNumber(inquiry.lead_score);
											const isOverdue = !inquiry.first_contacted_at && (hoursSince(inquiry.created_at) ?? 0) >= 24;
											const statusConfig = STAGE_CONFIGS[asText(inquiry.status || "new")] || STAGE_CONFIGS.new;

											return (
												<tr
													key={asText(inquiry.id)}
													role="button"
													tabIndex={0}
													onClick={() => handleSelectInquiry(asText(inquiry.id))}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															handleSelectInquiry(asText(inquiry.id));
														}
													}}
													className={`group cursor-pointer transition focus:bg-zinc-100 focus:outline-none ${
														isSelected ? "bg-zinc-100 font-medium" : "hover:bg-zinc-50/90"
													}`}
												>
													{/* Buyer Name & Contact */}
													<td className="px-4 py-3.5">
														<div className="flex items-center gap-2.5">
															<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-black/70">
																{asText(inquiry.buyer_name).slice(0, 1).toUpperCase() || "B"}
															</div>
															<div>
																<div className="font-semibold text-[#111111]">{inquiry.buyer_name || "Unnamed Buyer"}</div>
																<div className="text-[11px] text-black/55">{inquiry.buyer_email}</div>
																{inquiry.buyer_phone ? (
																	<div className="text-[10px] text-black/40">{inquiry.buyer_phone}</div>
																) : null}
															</div>
														</div>
													</td>

													{/* Interest / Property */}
													<td className="max-w-[220px] px-4 py-3.5">
														<div className="truncate font-medium text-[#111111]" title={asText(prop?.title) || undefined}>
															{prop?.title || (inquiry.property_id ? `Property #${asText(inquiry.property_id).slice(0, 8)}` : "General Inquiry")}
														</div>
														<div className="truncate text-[11px] text-black/50" title={asText(inquiry.buyer_message)}>
															{inquiry.buyer_message || "No message attached."}
														</div>
													</td>

													{/* Lead Score */}
													<td className="px-4 py-3.5">
														<div className="flex flex-col gap-1">
															<LeadScoreBadge score={score} />
															{isOverdue ? (
																<span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
																	<Clock className="h-3 w-3" /> Needs follow-up
																</span>
															) : (
																<span className="text-[10px] text-black/40">{relativeAge(inquiry.created_at)}</span>
															)}
														</div>
													</td>

													{/* Stage */}
													<td className="px-4 py-3.5">
														<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
															<span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
															{statusConfig.label}
														</span>
													</td>

													{/* Assigned Agent */}
													<td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
														{canReassign ? (
															<select
																value={asText(inquiry.assigned_agent_id)}
																onChange={(e) => void handleAssignAgent(asText(inquiry.id), e.target.value)}
																className="h-7 rounded-lg border border-black/10 bg-white px-2 text-[11px] font-medium text-black/75 outline-none hover:border-black/30"
																aria-label="Reassign agent"
															>
																<option value="">Unassigned</option>
																{agents.map((ag) => (
																	<option key={asText(ag.id)} value={asText(ag.id)}>
																		{ag.full_name || ag.email}
																	</option>
																))}
															</select>
														) : (
															<span className="text-black/60">{agent?.full_name || "Unassigned"}</span>
														)}
													</td>

													{/* Quick Actions */}
													<td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
														<div className="flex items-center justify-end gap-1">
															{inquiry.buyer_phone ? (
																<a
																	href={`tel:${inquiry.buyer_phone}`}
																	className="rounded-lg border border-black/10 p-1.5 text-black/60 transition hover:bg-zinc-100 hover:text-black"
																	title="Call Buyer"
																	aria-label="Call buyer"
																>
																	<Phone className="h-3.5 w-3.5" />
																</a>
															) : null}
															{inquiry.buyer_email ? (
																<a
																	href={`mailto:${inquiry.buyer_email}`}
																	className="rounded-lg border border-black/10 p-1.5 text-black/60 transition hover:bg-zinc-100 hover:text-black"
																	title="Email Buyer"
																	aria-label="Email buyer"
																>
																	<Mail className="h-3.5 w-3.5" />
																</a>
															) : null}
															{NEXT_STAGE_MAP[asText(inquiry.status || "new")] && canEdit ? (
																<button
																	type="button"
																	disabled={savingAction}
																	onClick={() =>
																		void handleAdvanceStage(
																			asText(inquiry.id),
																			asText(inquiry.status || "new")
																		)
																	}
																	className="inline-flex items-center gap-1 rounded-lg bg-[#111111] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-black/85"
																	title={`Advance to ${NEXT_STAGE_MAP[asText(inquiry.status || "new")].replace("_", " ")}`}
																>
																	<span>Advance</span>
																	<ArrowRight className="h-3 w-3" />
																</button>
															) : null}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					) : (
						/* View 1B: Responsive Cards Grid Layout (Zero horizontal scrolling on any screen) */
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
							{filteredInquiries.length === 0 ? (
								<div className="col-span-full rounded-2xl border border-dashed border-black/10 bg-white py-12 text-center text-sm text-black/45">
									No inquiries found matching your filters.
								</div>
							) : null}

							{filteredInquiries.map((inquiry) => {
								const isSelected = asText(inquiry.id) === asText(selectedId);
								const prop = propertyMap[asText(inquiry.property_id)];
								const agent = agentMap[asText(inquiry.assigned_agent_id)];
								const score = toNullableNumber(inquiry.lead_score);
								const isOverdue = !inquiry.first_contacted_at && (hoursSince(inquiry.created_at) ?? 0) >= 24;
								const statusConfig = STAGE_CONFIGS[asText(inquiry.status || "new")] || STAGE_CONFIGS.new;
								const nextStage = NEXT_STAGE_MAP[asText(inquiry.status || "new")];

								return (
									<div
										key={asText(inquiry.id)}
										role="button"
										tabIndex={0}
										onClick={() => handleSelectInquiry(asText(inquiry.id))}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleSelectInquiry(asText(inquiry.id));
											}
										}}
										className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition hover:border-black/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#111111] ${
											isSelected ? "border-[#111111] ring-1 ring-[#111111]" : "border-black/10"
										}`}
									>
										<div>
											{/* Top row: Name & Score */}
											<div className="flex items-start justify-between gap-2">
												<div className="min-w-0">
													<div className="font-bold text-[#111111] truncate">{inquiry.buyer_name || "Unnamed Buyer"}</div>
													<div className="text-xs text-black/55 truncate">{inquiry.buyer_email}</div>
												</div>
												<LeadScoreBadge score={score} />
											</div>

											{/* Property & Message */}
											<div className="mt-2.5 rounded-xl bg-zinc-50 p-2.5 text-xs">
												<div className="font-semibold text-[#111111] truncate" title={asText(prop?.title) || undefined}>
													{prop?.title || (inquiry.property_id ? `Property #${asText(inquiry.property_id).slice(0, 8)}` : "General Inquiry")}
												</div>
												<div className="mt-1 text-[11px] text-black/60 line-clamp-2">
													{inquiry.buyer_message || "No buyer note attached."}
												</div>
											</div>

											{/* Stage & Agent */}
											<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
												<span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusConfig.bg} ${statusConfig.color}`}>
													<span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
													{statusConfig.label}
												</span>
												<span className="text-black/40">{relativeAge(inquiry.created_at)}</span>
											</div>

											<div className="mt-2 flex items-center gap-1 text-[11px] text-black/70">
												<User className="h-3 w-3 text-black/40" />
												<span className="font-medium truncate">{agent?.full_name || "Unassigned"}</span>
												{isOverdue ? (
													<span className="ml-auto inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.2 text-[10px] font-bold text-red-600">
														<Clock className="h-2.5 w-2.5" /> Overdue
													</span>
												) : null}
											</div>
										</div>

										{/* Bottom Action buttons */}
										<div className="mt-3.5 flex items-center justify-between border-t border-black/5 pt-2.5" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center gap-1">
												{inquiry.buyer_phone ? (
													<a
														href={`tel:${inquiry.buyer_phone}`}
														className="rounded-lg border border-black/10 p-1.5 text-black/60 transition hover:bg-zinc-100 hover:text-black"
														title="Call"
													>
														<Phone className="h-3.5 w-3.5 text-emerald-600" />
													</a>
												) : null}
												{inquiry.buyer_email ? (
													<a
														href={`mailto:${inquiry.buyer_email}`}
														className="rounded-lg border border-black/10 p-1.5 text-black/60 transition hover:bg-zinc-100 hover:text-black"
														title="Email"
													>
														<Mail className="h-3.5 w-3.5 text-blue-600" />
													</a>
												) : null}
											</div>

											{nextStage && canEdit ? (
												<button
													type="button"
													disabled={savingAction}
													onClick={() => void handleAdvanceStage(asText(inquiry.id), asText(inquiry.status || "new"), nextStage)}
													className="inline-flex items-center gap-1 rounded-lg bg-[#111111] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-black/85"
												>
													<span>Move to {STAGE_CONFIGS[nextStage]?.label || nextStage}</span>
													<ArrowRight className="h-3 w-3" />
												</button>
											) : null}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			) : null}

			{/* ========================================================================= */}
			{/* MODE 2: LEAD STAGES (RESPONSIVE 3x3 PIPELINE GRID - ZERO HORIZONTAL SCROLL) */}
			{/* ========================================================================= */}
			{viewMode === "pipeline" ? (
				<div className="space-y-4">
					{/* Pipeline Subheader & Controls */}
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
						<div>
							<div className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
								<h2 className="text-sm font-bold tracking-tight text-[#111111]">
									Deal Pipeline (3x3 Grid)
								</h2>
								<span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-black/60">
									{inquiries.filter((i) => !["closed_won", "closed_lost"].includes(asText(i.status))).length} active leads
								</span>
							</div>
							<p className="mt-0.5 text-xs text-black/50">
								Showing top 5 leads per stage with quick advance. Click any lead to inspect details or log notes.
							</p>
						</div>

						{/* Global Expand / Collapse Control */}
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setAllStagesExpanded(!areAllStagesExpanded)}
								className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-black/10 bg-zinc-50 px-3 text-xs font-semibold text-black/75 transition hover:bg-zinc-100 hover:text-black"
								title={areAllStagesExpanded ? "Collapse all stages to top 5 leads" : "Expand all stages to show all leads"}
							>
								{areAllStagesExpanded ? (
									<>
										<ChevronUp className="h-3.5 w-3.5" />
										<span>Collapse All (Top 5)</span>
									</>
								) : (
									<>
										<ChevronDown className="h-3.5 w-3.5" />
										<span>Expand All Stages</span>
									</>
								)}
							</button>
						</div>
					</div>

					{/* 3x3 Responsive Grid - NO Horizontal Scroll */}
					<div
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
						role="region"
						aria-label="Lead Stages Pipeline"
					>
						{inquiryStatusOptions.map((stage) => {
							const stageKey = stage.value;
							const stageConfig = STAGE_CONFIGS[stageKey] || STAGE_CONFIGS.new;
							const stageLeads = filteredInquiries.filter(
								(item) => asText(item.status || "new") === stageKey
							);
							const isExpanded = !!expandedStages[stageKey];
							const displayedLeads = isExpanded ? stageLeads : stageLeads.slice(0, 5);
							const hasMore = stageLeads.length > 5;
							const remainingCount = stageLeads.length - 5;

							return (
								<div
									key={stageKey}
									className="flex flex-col justify-between rounded-2xl border border-black/10 bg-zinc-50/75 p-3.5 shadow-xs transition hover:border-black/25"
								>
									<div>
										{/* Stage Header */}
										<div className="flex items-center justify-between border-b border-black/5 pb-2.5">
											<div className="flex items-center gap-2">
												<span className={`h-2.5 w-2.5 rounded-full ${stageConfig.dot}`} />
												<span className="text-xs font-bold text-[#111111]">{stage.label}</span>
											</div>
											<div className="flex items-center gap-1.5">
												<span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-black/60 shadow-xs border border-black/5">
													{stageLeads.length}
												</span>
												{hasMore ? (
													<button
														type="button"
														onClick={() => toggleStageExpanded(stageKey)}
														className="rounded-md p-1 text-black/40 hover:bg-zinc-200 hover:text-black transition"
														title={isExpanded ? "Collapse to 5" : `View all ${stageLeads.length}`}
														aria-label={isExpanded ? `Collapse ${stage.label} to 5 leads` : `View all ${stageLeads.length} leads in ${stage.label}`}
													>
														{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
													</button>
												) : null}
											</div>
										</div>

										{/* Leads in this Stage (Limited to 5 by default) */}
										<div className="mt-3 flex flex-1 flex-col gap-2.5">
											{stageLeads.length === 0 ? (
												<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/10 py-7 text-center text-xs text-black/40">
													No leads in this stage
												</div>
											) : null}

											{displayedLeads.map((item) => {
												const isSelected = asText(item.id) === asText(selectedId);
												const prop = propertyMap[asText(item.property_id)];
												const agent = agentMap[asText(item.assigned_agent_id)];
												const score = toNullableNumber(item.lead_score);
												const nextStage = NEXT_STAGE_MAP[stageKey];

												return (
													<div
														key={asText(item.id)}
														role="button"
														tabIndex={0}
														onClick={() => handleSelectInquiry(asText(item.id))}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																handleSelectInquiry(asText(item.id));
															}
														}}
														className={`group cursor-pointer rounded-xl border bg-white p-3 shadow-xs transition hover:border-black/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#111111] ${
															isSelected ? "border-[#111111] ring-1 ring-[#111111]" : "border-black/10"
														}`}
													>
														{/* Buyer name and score */}
														<div className="flex items-start justify-between gap-2">
															<span className="font-semibold text-xs text-[#111111]">
																{item.buyer_name || "Unnamed Buyer"}
															</span>
															<LeadScoreBadge score={score} />
														</div>

														{/* Property interest */}
														<div className="mt-1 truncate text-[11px] text-black/60" title={asText(prop?.title) || undefined}>
															{prop?.title || (item.property_id ? `Property #${asText(item.property_id).slice(0, 8)}` : "General Inquiry")}
														</div>

														{/* Assigned Agent pill + Age */}
														<div className="mt-2 flex items-center justify-between text-[11px]">
															<span
																className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
																	agent
																		? "bg-zinc-100 text-black/70"
																		: "bg-amber-100/70 font-semibold text-amber-800"
																}`}
															>
																<User className="h-3 w-3" />
																<span className="max-w-[100px] truncate">{agent?.full_name || "Unassigned"}</span>
															</span>
															<span className="text-[10px] text-black/40">{relativeAge(item.created_at)}</span>
														</div>

														{/* Quick Progression Button */}
														{nextStage && canEdit ? (
															<div className="mt-2.5 border-t border-black/5 pt-2" onClick={(e) => e.stopPropagation()}>
																<button
																	type="button"
																	disabled={savingAction}
																	onClick={() => void handleAdvanceStage(asText(item.id), stageKey, nextStage)}
																	className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-zinc-100 py-1.5 text-[11px] font-semibold text-black/75 transition hover:bg-[#111111] hover:text-white"
																>
																	<span>Move to {STAGE_CONFIGS[nextStage]?.label || nextStage}</span>
																	<ArrowRight className="h-3 w-3" />
																</button>
															</div>
														) : null}
													</div>
												);
											})}
										</div>
									</div>

									{/* View All Option Button (If > 5 leads) */}
									{hasMore ? (
										<button
											type="button"
											onClick={() => toggleStageExpanded(stageKey)}
											className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/15 bg-white py-2 text-xs font-semibold text-black/75 shadow-xs transition hover:border-black/35 hover:bg-zinc-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20"
											aria-expanded={isExpanded}
										>
											{isExpanded ? (
												<>
													<span>Show less (first 5)</span>
													<ChevronUp className="h-3.5 w-3.5 text-black/50" />
												</>
											) : (
												<>
													<span>View all {stageLeads.length} leads (+{remainingCount} more)</span>
													<ChevronDown className="h-3.5 w-3.5 text-black/50" />
												</>
											)}
										</button>
									) : null}
								</div>
							);
						})}

						{/* 9th Slot in 3x3 Grid: Pipeline Intelligence & Performance Card */}
						<div className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
							<div>
								<div className="flex items-center justify-between border-b border-black/5 pb-2.5">
									<div className="flex items-center gap-2">
										<Sparkles className="h-4 w-4 text-[#DE141C]" />
										<span className="text-xs font-bold text-[#111111]">Pipeline Intelligence</span>
									</div>
									<span className="text-[10px] font-semibold uppercase tracking-wider text-black/40">Overview</span>
								</div>

								{/* Metrics Grid */}
								<div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
									<div className="rounded-xl border border-black/5 bg-zinc-50 p-2.5">
										<span className="text-[10px] font-medium text-black/45 block">Active Deals</span>
										<strong className="text-lg font-bold text-[#111111]">
											{inquiries.filter((i) => !["closed_won", "closed_lost"].includes(asText(i.status))).length}
										</strong>
									</div>

									<div className="rounded-xl border border-black/5 bg-zinc-50 p-2.5">
										<span className="text-[10px] font-medium text-black/45 block">Win Conversion</span>
										<strong className="text-lg font-bold text-emerald-700">
											{(() => {
												const won = summaryStats.won;
												const lost = countsByStage["closed_lost"] ?? 0;
												const closed = won + lost;
												return closed > 0 ? `${Math.round((won / closed) * 100)}%` : "N/A";
											})()}
										</strong>
									</div>

									<div className="rounded-xl border border-black/5 bg-zinc-50 p-2.5">
										<span className="text-[10px] font-medium text-black/45 block">High Intent</span>
										<strong className="text-lg font-bold text-[#DE141C]">
											{summaryStats.highIntent}
										</strong>
									</div>

									<div className="rounded-xl border border-black/5 bg-zinc-50 p-2.5">
										<span className="text-[10px] font-medium text-black/45 block">Unassigned</span>
										<strong className="text-lg font-bold text-amber-700">
											{summaryStats.unassigned}
										</strong>
									</div>
								</div>

								{/* Mini Funnel breakdown */}
								<div className="mt-3.5 space-y-1.5 text-[11px]">
									<div className="flex justify-between text-black/60">
										<span>Pipeline Velocity</span>
										<span className="font-semibold text-black/80">
											{summaryStats.overdue > 0 ? `${summaryStats.overdue} overdue follow-ups` : "All on track"}
										</span>
									</div>
									<div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 flex">
										<div
											style={{ width: `${Math.min(100, Math.round(((countsByStage["new"] ?? 0) / (inquiries.length || 1)) * 100))}%` }}
											className="bg-blue-500"
											title="New"
										/>
										<div
											style={{ width: `${Math.min(100, Math.round(((countsByStage["assigned"] ?? 0) / (inquiries.length || 1)) * 100))}%` }}
											className="bg-purple-500"
											title="Assigned"
										/>
										<div
											style={{ width: `${Math.min(100, Math.round(((countsByStage["contacted"] ?? 0) / (inquiries.length || 1)) * 100))}%` }}
											className="bg-amber-500"
											title="Contacted"
										/>
										<div
											style={{ width: `${Math.min(100, Math.round(((countsByStage["viewing_scheduled"] ?? 0) / (inquiries.length || 1)) * 100))}%` }}
											className="bg-teal-500"
											title="Viewing"
										/>
										<div
											style={{ width: `${Math.min(100, Math.round(((summaryStats.won) / (inquiries.length || 1)) * 100))}%` }}
											className="bg-emerald-500"
											title="Won"
										/>
									</div>
								</div>
							</div>

							{/* Quick Actions */}
							<div className="mt-4 flex flex-col gap-2 border-t border-black/5 pt-3">
								<button
									type="button"
									onClick={() => setAllStagesExpanded(!areAllStagesExpanded)}
									className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-zinc-50 py-2 text-xs font-semibold text-black/75 transition hover:bg-zinc-100 hover:text-black"
								>
									{areAllStagesExpanded ? (
										<>
											<ChevronUp className="h-3.5 w-3.5" />
											<span>Collapse All to Top 5</span>
										</>
									) : (
										<>
											<ChevronDown className="h-3.5 w-3.5" />
											<span>Expand All Stages</span>
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{/* ========================================================================= */}
			{/* MODE 3: ACTIVITY HISTORY (GLOBAL BROKERAGE AUDIT FEED + TIMELINE) */}
			{/* ========================================================================= */}
			{viewMode === "timeline" ? (
				<div className="space-y-3">
					{/* Activity Header */}
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
						<div>
							<h2 className="text-sm font-bold text-[#111111]">Brokerage Activity Feed</h2>
							<p className="mt-0.5 text-xs text-black/50">
								Audit trail of lead status transitions, client communications, viewing schedules, and notes.
							</p>
						</div>
						<span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-black/60">
							{globalTimeline.length} recorded events
						</span>
					</div>

					{/* Feed Stream */}
					<div className="space-y-2.5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
						{globalTimeline.length === 0 ? (
							<p className="py-8 text-center text-xs text-black/45">No activity logs recorded yet.</p>
						) : null}

						{globalTimeline.map((item, index) => {
							const matchingInquiry = inquiries.find((i) => asText(i.id) === asText(item.inquiry_id));
							const isSelected = matchingInquiry && asText(matchingInquiry.id) === asText(selectedId);
							const noteStr = asText(item.note);
							const isCall = noteStr.includes("[Call Log]");
							const isViewing = noteStr.includes("[Viewing Scheduled]");
							const isEmail = noteStr.includes("[Email Sent]");

							return (
								<div
									key={asText(item.id || index)}
									role="button"
									tabIndex={0}
									onClick={() => {
										if (matchingInquiry) onSelect(asText(matchingInquiry.id));
									}}
									onKeyDown={(e) => {
										if ((e.key === "Enter" || e.key === " ") && matchingInquiry) {
											e.preventDefault();
											onSelect(asText(matchingInquiry.id));
										}
									}}
									className={`flex items-start gap-3 rounded-xl border p-3.5 transition focus:outline-none focus:ring-2 focus:ring-[#111111] ${
										matchingInquiry ? "cursor-pointer hover:border-black/25 hover:bg-zinc-50" : ""
									} ${isSelected ? "border-[#111111] bg-zinc-50 ring-1 ring-[#111111]" : "border-black/5"}`}
								>
									{/* Event Icon */}
									<div
										className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${
											isCall
												? "bg-amber-100 text-amber-800"
												: isViewing
													? "bg-teal-100 text-teal-800"
													: isEmail
														? "bg-blue-100 text-blue-800"
														: "bg-zinc-100 text-black/70"
										}`}
									>
										{isCall ? (
											<Phone className="h-4 w-4" />
										) : isViewing ? (
											<Calendar className="h-4 w-4" />
										) : isEmail ? (
											<Mail className="h-4 w-4" />
										) : (
											<MessageSquare className="h-4 w-4" />
										)}
									</div>

									{/* Content */}
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												{matchingInquiry ? (
													<span className="font-semibold text-[#111111]">
														{matchingInquiry.buyer_name || "Lead"}
													</span>
												) : (
													<span className="font-semibold text-black/50">Lead #{asText(item.inquiry_id).slice(0, 8)}</span>
												)}
												{item.new_status ? (
													<span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-black/60">
														Stage: {asText(item.new_status).replace("_", " ")}
													</span>
												) : null}
											</div>
											<span className="text-[11px] text-black/40">{relativeAge(item.created_at)}</span>
										</div>

										<p className="mt-1 text-xs text-black/75 whitespace-pre-wrap">{noteStr || "Status change recorded."}</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			) : null}

			{/* ========================================================================= */}
			{/* SLIDE-OVER DRAWER FOR LEAD INSPECTION (ACCESSIBLE, ZERO HORIZONTAL OVERFLOW) */}
			{/* ========================================================================= */}
			{selectedInquiry ? (
				<div
					className="fixed inset-0 z-50 overflow-hidden"
					role="dialog"
					aria-modal="true"
					aria-label={`Lead Inspector - ${selectedInquiry.buyer_name || "Lead"}`}
				>
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
						onClick={() => handleSelectInquiry(null)}
						aria-hidden="true"
					/>

					{/* Slide-over panel container */}
					<div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
						<div className="w-screen max-w-lg md:max-w-xl bg-white shadow-2xl overflow-y-auto border-l border-black/10 focus:outline-none animate-in slide-in-from-right duration-200">
							<LeadInspectorDrawer
								selectedInquiry={selectedInquiry}
								agentMap={agentMap}
								propertyMap={propertyMap}
								agents={agents}
								timeline={timeline}
								loadingTimeline={loadingTimeline}
								visitorEvents={visitorEvents}
								visitorSession={visitorSession}
								canEdit={canEdit}
								canReassign={canReassign}
								onAdvanceStage={handleAdvanceStage}
								onAssignAgent={handleAssignAgent}
								noteText={noteText}
								setNoteText={setNoteText}
								noteActionType={noteActionType}
								setNoteActionType={setNoteActionType}
								targetStatus={targetStatus}
								setTargetStatus={setTargetStatus}
								onAddNote={handleAddNote}
								savingAction={savingAction}
								onClose={() => handleSelectInquiry(null)}
							/>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

// =========================================================================
// LEAD INSPECTOR DRAWER / WORKSPACE PANEL
// =========================================================================
function LeadInspectorDrawer({
	selectedInquiry,
	agentMap,
	propertyMap,
	agents,
	timeline,
	loadingTimeline = false,
	visitorEvents,
	visitorSession,
	canEdit,
	canReassign,
	onAdvanceStage,
	onAssignAgent,
	noteText,
	setNoteText,
	noteActionType,
	setNoteActionType,
	targetStatus,
	setTargetStatus,
	onAddNote,
	savingAction,
	onClose,
}: {
	selectedInquiry: CmsRow | null;
	agentMap: Record<string, CmsRow>;
	propertyMap: Record<string, CmsRow>;
	agents: CmsRow[];
	timeline: CmsRow[];
	loadingTimeline?: boolean;
	visitorEvents: CmsRow[];
	visitorSession: CmsRow | null;
	canEdit: boolean;
	canReassign: boolean;
	onAdvanceStage: (id: string, current: string, next?: string) => Promise<void>;
	onAssignAgent: (id: string, agentId: string) => Promise<void>;
	noteText: string;
	setNoteText: (val: string) => void;
	noteActionType: "note" | "call" | "viewing" | "email";
	setNoteActionType: (val: "note" | "call" | "viewing" | "email") => void;
	targetStatus: string;
	setTargetStatus: (val: string) => void;
	onAddNote: () => Promise<void>;
	savingAction: boolean;
	onClose: () => void;
}) {
	if (!selectedInquiry) {
		return (
			<div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center shadow-sm">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-black/40">
					<User className="h-6 w-6" />
				</div>
				<h3 className="mt-3 text-sm font-semibold text-[#111111]">No Lead Selected</h3>
				<p className="mt-1 max-w-xs text-xs text-black/50">
					Select any lead from the list or pipeline board to inspect full details, customer context, and post follow-ups.
				</p>
			</div>
		);
	}

	const prop = propertyMap[asText(selectedInquiry.property_id)];
	const assignedAgent = agentMap[asText(selectedInquiry.assigned_agent_id)];
	const score = toNullableNumber(selectedInquiry.lead_score);
	const currentStatus = asText(selectedInquiry.status || "new");
	const statusConfig = STAGE_CONFIGS[currentStatus] || STAGE_CONFIGS.new;

	// Visitor behavior summary
	const visitorViewCount = visitorEvents.filter((e) =>
		["property_view", "page_view", "view"].includes(asText(e.event_type))
	).length;
	const visitorInteractionCount = visitorEvents.filter((e) =>
		asText(e.event_type).includes("click") || asText(e.event_type).includes("open")
	).length;

	return (
		<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-5 animate-in fade-in">
			{/* Top Header: Buyer Identity */}
			<div className="flex items-start justify-between border-b border-black/5 pb-4">
				<div>
					<div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#DE141C]">
						Lead Inspection
					</div>
					<h3 className="mt-1 text-xl font-bold tracking-tight text-[#111111]">
						{selectedInquiry.buyer_name || "Unnamed Buyer"}
					</h3>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/60">
						{selectedInquiry.buyer_email ? (
							<a href={`mailto:${selectedInquiry.buyer_email}`} className="hover:underline">
								{selectedInquiry.buyer_email}
							</a>
						) : null}
						{selectedInquiry.buyer_phone ? (
							<>
								<span>•</span>
								<a href={`tel:${selectedInquiry.buyer_phone}`} className="hover:underline">
									{selectedInquiry.buyer_phone}
								</a>
							</>
						) : null}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onClose}
						className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-black/75 transition hover:bg-zinc-100 hover:text-black shadow-2xs"
						title="Close inspection (Esc)"
						aria-label="Close inspection panel"
					>
						<X className="h-4 w-4 text-black/60" />
						<span>Close (Esc)</span>
					</button>
				</div>
			</div>

			{/* Contact Action Buttons */}
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{selectedInquiry.buyer_phone ? (
					<a
						href={`tel:${selectedInquiry.buyer_phone}`}
						className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-zinc-50 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100"
					>
						<Phone className="h-3.5 w-3.5 text-emerald-600" />
						Call Buyer
					</a>
				) : null}
				{selectedInquiry.buyer_email ? (
					<a
						href={`mailto:${selectedInquiry.buyer_email}`}
						className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-zinc-50 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100"
					>
						<Mail className="h-3.5 w-3.5 text-blue-600" />
						Send Email
					</a>
				) : null}
				{selectedInquiry.buyer_phone ? (
					<a
						href={`https://wa.me/${asText(selectedInquiry.buyer_phone).replace(/\D/g, "")}`}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-zinc-50 text-xs font-semibold text-[#111111] transition hover:bg-zinc-100"
					>
						<MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
						WhatsApp
					</a>
				) : null}
			</div>

			{/* Stage Stepper Progress */}
			<div className="rounded-xl border border-black/10 bg-zinc-50 p-3.5">
				<div className="flex items-center justify-between text-xs">
					<span className="font-semibold text-black/55">Current Stage</span>
					<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusConfig.bg} ${statusConfig.color}`}>
						<span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
						{statusConfig.label}
					</span>
				</div>

				{/* 1-Click Stage Stepper Bar */}
				{canEdit ? (
					<div className="mt-3 flex flex-wrap gap-1">
						{inquiryStatusOptions.map((st) => {
							const isCurrent = st.value === currentStatus;
							return (
								<button
									key={st.value}
									type="button"
									disabled={savingAction}
									onClick={() => void onAdvanceStage(asText(selectedInquiry.id), currentStatus, st.value)}
									className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
										isCurrent
											? "bg-[#111111] text-white shadow-sm"
											: "bg-white text-black/60 hover:bg-zinc-200 border border-black/5"
									}`}
								>
									{st.label}
								</button>
							);
						})}
					</div>
				) : null}
			</div>

			{/* Lead Details & Assignment */}
			<div className="space-y-2 rounded-xl border border-black/10 p-3.5 text-xs">
				<div className="flex items-center justify-between">
					<span className="font-semibold text-black/50">Assigned Agent</span>
					{canReassign ? (
						<select
							value={asText(selectedInquiry.assigned_agent_id)}
							onChange={(e) => void onAssignAgent(asText(selectedInquiry.id), e.target.value)}
							className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-semibold text-[#111111] outline-none"
						>
							<option value="">Unassigned</option>
							{agents.map((ag) => (
								<option key={asText(ag.id)} value={asText(ag.id)}>
									{ag.full_name || ag.email}
								</option>
							))}
						</select>
					) : (
						<span className="font-semibold text-[#111111]">{assignedAgent?.full_name || "Unassigned"}</span>
					)}
				</div>

				<div className="flex items-center justify-between border-t border-black/5 pt-2">
					<span className="font-semibold text-black/50">Property</span>
					<span className="font-medium text-[#111111]">{prop?.title || "General / Not Specified"}</span>
				</div>

				<div className="flex items-center justify-between border-t border-black/5 pt-2">
					<span className="font-semibold text-black/50">Lead Score</span>
					<LeadScoreBadge score={score} />
				</div>

				<div className="border-t border-black/5 pt-2">
					<span className="font-semibold text-black/50">Message</span>
					<p className="mt-1 rounded-lg bg-zinc-50 p-2.5 text-black/75 whitespace-pre-wrap">
						{selectedInquiry.buyer_message || "No buyer note was provided with this submission."}
					</p>
				</div>
			</div>

			{/* Pre-Inquiry Browsing Intelligence */}
			{visitorEvents.length > 0 || visitorSession ? (
				<div className="rounded-xl border border-black/10 bg-zinc-50 p-3.5 text-xs space-y-2">
					<div className="flex items-center justify-between">
						<span className="font-bold uppercase tracking-wider text-black/50">Browsing Intelligence</span>
						<span className="text-[10px] text-black/40">Pre-submission session</span>
					</div>
					<div className="grid grid-cols-2 gap-2 text-[11px]">
						<div className="rounded-lg bg-white p-2 border border-black/5">
							<span className="text-black/45 block">Views Recorded</span>
							<strong className="text-sm text-[#111111]">{visitorViewCount}</strong>
						</div>
						<div className="rounded-lg bg-white p-2 border border-black/5">
							<span className="text-black/45 block">Interactions</span>
							<strong className="text-sm text-[#111111]">{visitorInteractionCount}</strong>
						</div>
					</div>
					{visitorSession ? (
						<div className="text-[11px] text-black/60 pt-1">
							Device: <strong>{visitorSession.device_type ?? "Desktop"}</strong> · OS: <strong>{visitorSession.os ?? "Unknown"}</strong> · Source: <strong>{visitorSession.utm_source ?? visitorSession.source ?? "Direct"}</strong>
						</div>
					) : null}
				</div>
			) : null}

			{/* Post Activity Note Form */}
			{canEdit ? (
				<div className="space-y-3 rounded-xl border border-black/10 bg-white p-3.5">
					<div className="flex items-center justify-between text-xs">
						<span className="font-bold text-[#111111]">Log Activity / Note</span>
						{/* Action Type Selector */}
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => setNoteActionType("note")}
								className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
									noteActionType === "note" ? "bg-[#111111] text-white" : "bg-zinc-100 text-black/60"
								}`}
							>
								Note
							</button>
							<button
								type="button"
								onClick={() => setNoteActionType("call")}
								className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
									noteActionType === "call" ? "bg-amber-600 text-white" : "bg-zinc-100 text-black/60"
								}`}
							>
								Call
							</button>
							<button
								type="button"
								onClick={() => setNoteActionType("viewing")}
								className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
									noteActionType === "viewing" ? "bg-teal-600 text-white" : "bg-zinc-100 text-black/60"
								}`}
							>
								Viewing
							</button>
							<button
								type="button"
								onClick={() => setNoteActionType("email")}
								className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
									noteActionType === "email" ? "bg-blue-600 text-white" : "bg-zinc-100 text-black/60"
								}`}
							>
								Email
							</button>
						</div>
					</div>

					<textarea
						value={noteText}
						onChange={(e) => setNoteText(e.target.value)}
						placeholder={
							noteActionType === "call"
								? "Log phone call discussion points and buyer feedback..."
								: noteActionType === "viewing"
									? "Enter site viewing details, date, and unit preferences..."
									: noteActionType === "email"
										? "Summarize email / quotation sent to buyer..."
										: "Enter follow-up note, meeting notes, or next steps..."
						}
						rows={3}
						className="w-full rounded-xl border border-black/10 p-2.5 text-xs text-[#111111] outline-none transition focus:border-black/40"
					/>

					<div className="flex items-center justify-between gap-2">
						<select
							value={targetStatus}
							onChange={(e) => setTargetStatus(e.target.value)}
							className="h-8 rounded-lg border border-black/10 bg-white px-2 text-xs font-medium text-black/75 outline-none"
						>
							{inquiryStatusOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									Set status: {opt.label}
								</option>
							))}
						</select>

						<button
							type="button"
							disabled={savingAction || !noteText.trim()}
							onClick={onAddNote}
							className="inline-flex h-8 items-center justify-center rounded-lg bg-[#DE141C] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{savingAction ? "Saving..." : "Post Activity"}
						</button>
					</div>
				</div>
			) : null}

			{/* Timeline Stream for this Lead */}
			<div className="space-y-3 pt-2">
				<div className="flex items-center justify-between text-xs">
					<span className="font-bold text-[#111111]">Lead Activity History</span>
					<span className="text-[11px] text-black/45">{timeline.length} events</span>
				</div>

				<div className="space-y-2 max-h-60 overflow-y-auto pr-1">
					{loadingTimeline ? (
						<p className="py-4 text-center text-xs text-black/40">Loading activity history...</p>
					) : timeline.length === 0 ? (
						<p className="py-4 text-center text-xs text-black/40">No activity logged for this lead yet.</p>
					) : null}

					{!loadingTimeline && timeline.map((entry, idx) => (
						<div key={asText(entry.id || idx)} className="rounded-xl border border-black/5 bg-zinc-50 p-2.5 text-xs">
							<div className="flex items-center justify-between text-[11px] text-black/45">
								<span className="font-semibold text-black/70">
									Stage: {asText(entry.new_status || "Update").replace("_", " ")}
								</span>
								<span>{relativeAge(entry.created_at)}</span>
							</div>
							<p className="mt-1 text-black/75 whitespace-pre-wrap">{entry.note || "Status change recorded."}</p>
						</div>
					))}
				</div>
			</div>

			{/* Bottom Close Action */}
			<div className="border-t border-black/10 pt-4">
				<button
					type="button"
					onClick={onClose}
					className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-zinc-50 py-2.5 text-xs font-semibold text-black/75 transition hover:bg-zinc-100 hover:text-black shadow-2xs"
				>
					<X className="h-4 w-4 text-black/50" />
					<span>Close Inspection Panel</span>
				</button>
			</div>
		</div>
	);
}
