"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
	Activity,
	ArrowUpRight,
	BarChart3,
	Bell,
	Building2,
	Building,
	Camera,
	CheckCheck,
	ChevronRight,
	Clock,
	Globe,
	Inbox,
	LayoutDashboard,
	Loader2,
	LogOut,
	Mail,
	MapPin,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Phone,
	RefreshCw,
	Search,
	Settings,
	ShieldCheck,
	Sparkles,
	Star,
	Target,
	Trash2,
	TrendingUp,
	Upload,
	UserCircle,
	Users,
	Wallet,
	X,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SafeImage } from "@/components/ui/SafeImage";
import { AgentBarChart, AgentDonut, AgentFunnel, AgentTrendChart, type AgentChartRow } from "./AgentCharts";

type SectionId =
	| "overview"
	| "inquiries"
	| "pipeline"
	| "activity"
	| "listings"
	| "listingInsights"
	| "performance"
	| "trends"
	| "profile"
	| "security";

const AGENT_SECTIONS: SectionId[] = ["overview", "inquiries", "pipeline", "activity", "listings", "listingInsights", "performance", "trends", "profile", "security"];

function isAgentSection(value: string | undefined): value is SectionId {
	return AGENT_SECTIONS.includes(value as SectionId);
}

/* Keep the active tab in the URL so a refresh or bookmark restores it. */
function syncSectionUrl(section: SectionId) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.set("section", section);
	window.history.replaceState(null, "", url);
}

type InquiryRow = {
	id: string;
	buyer_name?: string | null;
	buyer_email?: string | null;
	buyer_phone?: string | null;
	property_id?: string | null;
	assigned_agent_id?: string | null;
	status?: string | null;
	priority?: string | null;
	lead_score?: number | null;
	buyer_message?: string | null;
	created_at?: string | null;
	last_activity_at?: string | null;
	first_contacted_at?: string | null;
	closed_at?: string | null;
	properties?: {
		title?: string | null;
		slug?: string | null;
		price?: number | null;
		city?: string | null;
	} | null;
};

type PropertyRow = {
	id: string;
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

type AgentProfile = {
	id: string;
	profile_id: string;
	full_name: string;
	license_number?: string | null;
	specialization?: string | null;
	bio?: string | null;
	photo_url?: string | null;
	phone?: string | null;
	facebook_url?: string | null;
	instagram_url?: string | null;
	twitter_url?: string | null;
	linkedin_url?: string | null;
	is_top_agent?: boolean | null;
};

type TimelineRow = {
	id?: string | null;
	inquiry_id?: string | null;
	old_status?: string | null;
	new_status?: string | null;
	note?: string | null;
	created_at?: string | null;
};

type AgentNotification = {
	id: string;
	inquiryId: string;
	title: string;
	message: string;
	propertyTitle?: string | null;
	buyerEmail?: string | null;
	buyerPhone?: string | null;
	timestamp: string;
	read: boolean;
};

type NavItem = { id: SectionId; label: string; hint: string; icon: typeof LayoutDashboard };
type NavGroup = { id: string; label: string; icon: typeof LayoutDashboard; items: NavItem[] };

const STATUS_ORDER = ["new", "assigned", "contacted", "viewing_scheduled", "negotiating", "reserved", "closed_won", "closed_lost"] as const;

const STATUS_META: Record<string, { label: string; pill: string; dot: string }> = {
	new: { label: "New", pill: "border-blue-200 bg-blue-50 text-blue-700", dot: "#2563eb" },
	assigned: { label: "Assigned", pill: "border-black/10 bg-zinc-100 text-black/70", dot: "#52525b" },
	contacted: { label: "Contacted", pill: "border-amber-200 bg-amber-50 text-amber-700", dot: "#d97706" },
	viewing_scheduled: { label: "Viewing", pill: "border-purple-200 bg-purple-50 text-purple-700", dot: "#7c3aed" },
	negotiating: { label: "Negotiating", pill: "border-indigo-200 bg-indigo-50 text-indigo-700", dot: "#4f46e5" },
	reserved: { label: "Reserved", pill: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "#059669" },
	closed_won: { label: "Closed Won", pill: "border-emerald-300 bg-emerald-600 text-white", dot: "#047857" },
	closed_lost: { label: "Closed Lost", pill: "border-red-200 bg-red-50 text-red-600", dot: "#dc2626" },
};

const PRIORITY_META: Record<string, string> = {
	low: "border-black/10 bg-zinc-100 text-black/55",
	medium: "border-black/10 bg-white text-black/65",
	high: "border-amber-200 bg-amber-50 text-amber-700",
	urgent: "border-red-200 bg-red-50 text-red-600",
};

function statusMeta(status?: string | null) {
	return STATUS_META[status ?? "new"] ?? STATUS_META.new;
}

function formatCurrency(value?: number | null) {
	if (value == null) return "Price on request";
	return `₱${Number(value).toLocaleString()}`;
}

function formatDate(value?: string | null) {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeAgo(isoString?: string | null) {
	if (!isoString) return "Recently";
	const diff = Date.now() - new Date(isoString).getTime();
	if (Number.isNaN(diff) || diff < 0) return "Just now";
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function buildDailyTrend(rows: InquiryRow[], days: number): AgentChartRow[] {
	const buckets: AgentChartRow[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	for (let offset = days - 1; offset >= 0; offset -= 1) {
		const day = new Date(today);
		day.setDate(today.getDate() - offset);
		buckets.push({ label: `${day.getMonth() + 1}/${day.getDate()}`, value: 0 });
	}
	rows.forEach((row) => {
		if (!row.created_at) return;
		const created = new Date(row.created_at);
		if (Number.isNaN(created.getTime())) return;
		const key = `${created.getMonth() + 1}/${created.getDate()}`;
		const index = buckets.findIndex((bucket) => bucket.label === key);
		if (index >= 0) buckets[index].value += 1;
	});
	return buckets;
}

function playNotificationChime() {
	if (typeof window === "undefined") return;
	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();
		if (ctx.state === "suspended") void ctx.resume();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(587.33, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
		gain.gain.setValueAtTime(0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.35);
	} catch {
		// Audio policy safely handled
	}
}

function StatusPill({ status }: { status?: string | null }) {
	const meta = statusMeta(status);
	return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.pill}`}>{meta.label}</span>;
}

function PriorityPill({ priority }: { priority?: string | null }) {
	const tone = PRIORITY_META[priority ?? "medium"] ?? PRIORITY_META.medium;
	return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{priority ?? "medium"}</span>;
}

function StatCard({ label, value, hint, accent = false, icon: Icon }: { label: string; value: ReactNode; hint: string; accent?: boolean; icon?: typeof LayoutDashboard }) {
	return (
		<div className="rounded-lg border border-black/10 bg-white p-4">
			<div className="flex items-center justify-between gap-2">
				<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">{label}</div>
				{Icon ? <Icon className="h-4 w-4 text-black/30" /> : null}
			</div>
			<div className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${accent ? "text-[#DE141C]" : "text-[#111111]"}`}>{value}</div>
			<p className="mt-2 text-xs text-black/50">{hint}</p>
		</div>
	);
}

export default function AgentDashboard({ initialSection }: { initialSection?: string }) {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [userEmail, setUserEmail] = useState("");
	const [agent, setAgent] = useState<AgentProfile | null>(null);
	const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
	const [properties, setProperties] = useState<PropertyRow[]>([]);
	const [timeline, setTimeline] = useState<TimelineRow[]>([]);
	const [statusMessage, setStatusMessage] = useState("");

	const [activeSection, setActiveSection] = useState<SectionId>(() => (isAgentSection(initialSection) ? initialSection : "overview"));
	const [showSidebar, setShowSidebar] = useState(true);
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [headerSearch, setHeaderSearch] = useState("");

	const [notifications, setNotifications] = useState<AgentNotification[]>([]);
	const [showNotifications, setShowNotifications] = useState(false);
	const [toastNotification, setToastNotification] = useState<AgentNotification | null>(null);

	const [inquirySearch, setInquirySearch] = useState("");
	const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
	const [editingInquiry, setEditingInquiry] = useState<InquiryRow | null>(null);
	const [editStatus, setEditStatus] = useState("new");
	const [editNotes, setEditNotes] = useState("");
	const [updatingInquiry, setUpdatingInquiry] = useState(false);
	const selfUpdatedInquiriesRef = useRef<Map<string, number>>(new Map());
	const knownInquiryIdsRef = useRef<Set<string>>(new Set());

	const [profileForm, setProfileForm] = useState<Partial<AgentProfile>>({});
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileMessage, setProfileMessage] = useState("");
	const [uploadingAgentPhoto, setUploadingAgentPhoto] = useState(false);
	const [agentPhotoError, setAgentPhotoError] = useState("");
	const agentPhotoInputRef = useRef<HTMLInputElement>(null);

	const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

	useEffect(() => {
		let isMounted = true;

		async function loadAgentData() {
			try {
				const { data: sessionResult } = await supabaseBrowser.auth.getSession();
				const user = sessionResult.session?.user;
				if (!user) {
					router.replace("/login?next=/agent");
					return;
				}

				// A browser only holds one Supabase session. If it was replaced by an
				// admin/developer sign-in in another tab, do not render the agent
				// workspace with the wrong account.
				const { data: accountProfile } = await supabaseBrowser
					.from("profiles")
					.select("role, is_active")
					.eq("id", user.id)
					.maybeSingle();

				if (accountProfile && accountProfile.is_active === false) {
					router.replace("/login?next=/agent");
					return;
				}
				if (accountProfile?.role === "admin") {
					router.replace("/admin");
					return;
				}
				if (accountProfile?.role === "developer_partner") {
					router.replace("/developer");
					return;
				}
				if (accountProfile?.role && accountProfile.role !== "agent") {
					router.replace("/login?next=/agent");
					return;
				}

				if (isMounted) setUserEmail(user.email ?? "");

				const { data: agentRow } = await supabaseBrowser
					.from("agents")
					.select("*")
					.eq("profile_id", user.id)
					.maybeSingle();

				let currentAgent = agentRow as AgentProfile | null;

				if (!currentAgent) {
					const { data: userProfile } = await supabaseBrowser
						.from("profiles")
						.select("full_name, role")
						.eq("id", user.id)
						.maybeSingle();
					if (userProfile) {
						currentAgent = {
							id: user.id,
							profile_id: user.id,
							full_name: userProfile.full_name || "Licensed Agent",
						};
					}
				}

				if (!isMounted || !currentAgent) {
					if (isMounted) setLoading(false);
					return;
				}

				setAgent(currentAgent);
				setProfileForm(currentAgent);

				const [{ data: inquiryData }, { data: propertyData }] = await Promise.all([
					supabaseBrowser
						.from("inquiries")
						.select("*, properties(title, slug, price, city)")
						.eq("assigned_agent_id", currentAgent.id)
						.order("created_at", { ascending: false }),
					supabaseBrowser
						.from("properties")
						.select("*")
						.eq("assigned_agent_id", currentAgent.id)
						.order("created_at", { ascending: false }),
				]);

				if (!isMounted) return;

				const inqList = (inquiryData as InquiryRow[]) ?? [];
				setInquiries(inqList);
				setProperties((propertyData as PropertyRow[]) ?? []);

				const inquiryIds = inqList.map((item) => item.id);
				if (inquiryIds.length) {
					const { data: timelineData } = await supabaseBrowser
						.from("inquiry_timeline")
						.select("id, inquiry_id, old_status, new_status, note, created_at")
						.in("inquiry_id", inquiryIds)
						.order("created_at", { ascending: false })
						.limit(120);
					if (isMounted) setTimeline((timelineData as TimelineRow[]) ?? []);
				}

				const readKey = `agent_read_inquiries_${currentAgent.id}`;
				let readIds: string[] = [];
				try {
					readIds = JSON.parse(localStorage.getItem(readKey) || "[]");
				} catch {
					readIds = [];
				}

				inqList.forEach((inq) => knownInquiryIdsRef.current.add(inq.id));

				const initialNotifs: AgentNotification[] = inqList.map((inq) => ({
					id: `notif_${inq.id}`,
					inquiryId: inq.id,
					title: "Lead Assigned",
					message: `${inq.buyer_name || "A buyer"} was assigned to you.`,
					propertyTitle: inq.properties?.title || "Property Inquiry",
					buyerEmail: inq.buyer_email,
					buyerPhone: inq.buyer_phone,
					timestamp: inq.created_at || new Date().toISOString(),
					read: readIds.includes(inq.id) || !["new", "assigned"].includes(inq.status || ""),
				}));
				setNotifications(initialNotifs);

				setLoading(false);
			} catch (error) {
				console.error("Error loading agent dashboard:", error);
				if (isMounted) setLoading(false);
			}
		}

		void loadAgentData();

		return () => {
			isMounted = false;
		};
	}, [router]);

	useEffect(() => {
		if (!toastNotification) return;
		const timer = setTimeout(() => setToastNotification(null), 8000);
		return () => clearTimeout(timer);
	}, [toastNotification]);

	useEffect(() => {
		if (!agent?.id) return;
		let mounted = true;

		const channel = supabaseBrowser
			.channel(`agent_inquiries_realtime_${agent.id}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "inquiries" },
				async (payload) => {
					if (!mounted) return;
					const newRow = payload.new as InquiryRow & { assigned_agent_id?: string | null };
					if (!newRow || !newRow.id) return;

					// If this lead is no longer assigned to this agent, remove it
					if (newRow.assigned_agent_id !== agent.id) {
						setInquiries((prev) => prev.filter((item) => item.id !== newRow.id));
						knownInquiryIdsRef.current.delete(newRow.id);
						return;
					}

					// Suppress ANY notification if the agent updated this inquiry themselves locally
					const selfUpdatedTime = selfUpdatedInquiriesRef.current.get(newRow.id);
					if (selfUpdatedTime && Date.now() - selfUpdatedTime < 30000) {
						selfUpdatedInquiriesRef.current.delete(newRow.id);
						// Silently merge the update into state — no toast, no chime
						setInquiries((prev) =>
							prev.map((item) => (item.id === newRow.id ? { ...item, ...newRow } : item)),
						);
						return;
					}

					let propertyInfo = newRow.properties;
					if (!propertyInfo && newRow.property_id) {
						const { data: prop } = await supabaseBrowser
							.from("properties")
							.select("title, slug, price, city")
							.eq("id", newRow.property_id)
							.maybeSingle();
						propertyInfo = prop;
					}

					const fullInquiry: InquiryRow = { ...newRow, properties: propertyInfo };

					// Check if this inquiry was already known to the agent
					const isGenuinelyNew = !knownInquiryIdsRef.current.has(fullInquiry.id);
					knownInquiryIdsRef.current.add(fullInquiry.id);

					// Merge into local list
					setInquiries((prev) => {
						const exists = prev.some((item) => item.id === fullInquiry.id);
						if (exists) {
							return prev.map((item) => (item.id === fullInquiry.id ? { ...item, ...fullInquiry } : item));
						}
						return [fullInquiry, ...prev];
					});

					// If event is UPDATE on an existing lead: NEVER show any toast
					if (payload.eventType === "UPDATE") {
						return;
					}

					// ONLY notify "New Lead Assigned" for genuinely new leads (INSERT)
					if (payload.eventType === "INSERT" && isGenuinelyNew) {
						const notif: AgentNotification = {
							id: `notif_${fullInquiry.id}_${Date.now()}`,
							inquiryId: fullInquiry.id,
							title: "New Lead Assigned!",
							message: `${fullInquiry.buyer_name || "A buyer"} was assigned to you.`,
							propertyTitle: fullInquiry.properties?.title || "Property Inquiry",
							buyerEmail: fullInquiry.buyer_email,
							buyerPhone: fullInquiry.buyer_phone,
							timestamp: new Date().toISOString(),
							read: false,
						};
						setNotifications((prev) => [notif, ...prev.filter((item) => item.inquiryId !== notif.inquiryId)]);
						setToastNotification(notif);
						playNotificationChime();
					}
				},
			)
			.subscribe();

		// Poll every 30 s as a fallback for missed realtime events.
		// ONLY notify if a genuinely brand-new lead appears that wasn't
		// present when the page loaded or known previously.
		const pollInterval = setInterval(async () => {
			if (!mounted) return;
			const { data: latestData } = await supabaseBrowser
				.from("inquiries")
				.select("*, properties(title, slug, price, city)")
				.eq("assigned_agent_id", agent.id)
				.order("created_at", { ascending: false });

			if (!latestData || !Array.isArray(latestData) || !mounted) return;

			// Brand new leads that have NEVER been seen in this session
			const brandNew = (latestData as InquiryRow[]).filter(
				(item) => !knownInquiryIdsRef.current.has(item.id),
			);

			// Mark all fetched rows as known now
			latestData.forEach((item) => knownInquiryIdsRef.current.add(item.id));

			// Among brand-new, only notify for those created in the last 2 minutes
			const recentNew = brandNew.filter((item) => {
				if (!item.created_at) return false;
				return Date.now() - new Date(item.created_at).getTime() < 120000;
			});

			if (recentNew.length > 0) {
				const newest = recentNew[0];
				const notif: AgentNotification = {
					id: `notif_poll_${newest.id}_${Date.now()}`,
					inquiryId: newest.id,
					title: "New Lead Assigned!",
					message: `${newest.buyer_name || "A buyer"} was assigned to you.`,
					propertyTitle: newest.properties?.title || "Property Inquiry",
					buyerEmail: newest.buyer_email,
					buyerPhone: newest.buyer_phone,
					timestamp: new Date().toISOString(),
					read: false,
				};
				setNotifications((prevNotifs) => [notif, ...prevNotifs.filter((item) => item.inquiryId !== notif.inquiryId)]);
				setToastNotification(notif);
				playNotificationChime();
			}

			// Merge all: keep existing rows with any fresh data applied on top
			const latestById = new Map((latestData as InquiryRow[]).map((item) => [item.id, item]));
			setInquiries((prev) => {
				return prev
					.map((item) => (latestById.has(item.id) ? { ...item, ...latestById.get(item.id) } : item))
					.concat(brandNew);
			});
		}, 30000);

		return () => {
			mounted = false;
			void supabaseBrowser.removeChannel(channel);
			clearInterval(pollInterval);
		};
	}, [agent?.id]);

	function markInquiriesRead(ids: string[]) {
		if (!agent?.id) return;
		const readKey = `agent_read_inquiries_${agent.id}`;
		try {
			const existing = JSON.parse(localStorage.getItem(readKey) || "[]") as string[];
			const merged = Array.from(new Set([...existing, ...ids]));
			localStorage.setItem(readKey, JSON.stringify(merged));
		} catch {
			// ignore storage errors
		}
	}

	function openInquiryEditor(inquiry: InquiryRow) {
		setEditingInquiry(inquiry);
		setEditStatus(inquiry.status || "new");
		setEditNotes(inquiry.buyer_message || "");
		setActiveSection("inquiries");
		syncSectionUrl("inquiries");
	}

	function handleOpenNotification(notif: AgentNotification) {
		setNotifications((prev) => prev.map((item) => (item.id === notif.id ? { ...item, read: true } : item)));
		setShowNotifications(false);
		setToastNotification(null);
		markInquiriesRead([notif.inquiryId]);
		const target = inquiries.find((item) => item.id === notif.inquiryId);
		if (target) openInquiryEditor(target);
		else {
			setActiveSection("inquiries");
			syncSectionUrl("inquiries");
		}
	}

	function handleMarkAllAsRead() {
		setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
		markInquiriesRead(inquiries.map((item) => item.id));
	}

	async function handleSignOut() {
		await supabaseBrowser.auth.signOut();
		window.location.href = "/";
	}

	async function reloadInquiries() {
		if (!agent?.id) return;
		const { data } = await supabaseBrowser
			.from("inquiries")
			.select("*, properties(title, slug, price, city)")
			.eq("assigned_agent_id", agent.id)
			.order("created_at", { ascending: false });
		if (data) setInquiries(data as InquiryRow[]);
	}

	async function handleAgentPhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setAgentPhotoError("Please select a valid image file (PNG, JPG, WebP).");
			return;
		}

		setUploadingAgentPhoto(true);
		setAgentPhotoError("");

		try {
			const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
			const filePath = `agent-photos/${Date.now()}-${cleanName}`;

			// Try direct Supabase storage upload
			const { error: uploadErr } = await supabaseBrowser.storage
				.from("property-images")
				.upload(filePath, file, {
					contentType: file.type || "image/jpeg",
					upsert: true,
				});

			if (!uploadErr) {
				const { data: publicUrlData } = supabaseBrowser.storage
					.from("property-images")
					.getPublicUrl(filePath);
				setProfileForm((prev) => ({ ...prev, photo_url: publicUrlData.publicUrl }));
				return;
			}

			// Fallback to /api/upload
			const session = (await supabaseBrowser.auth.getSession()).data.session;
			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", "agent-photos");

			const res = await fetch("/api/upload", {
				method: "POST",
				headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
				body: formData,
			});

			const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
			if (res.ok && data?.url) {
				setProfileForm((prev) => ({ ...prev, photo_url: data.url }));
			} else {
				setAgentPhotoError(data?.error || uploadErr.message || "Failed to upload photo.");
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Network error while uploading photo.";
			setAgentPhotoError(msg);
		} finally {
			setUploadingAgentPhoto(false);
			if (agentPhotoInputRef.current) agentPhotoInputRef.current.value = "";
		}
	}

	async function handleSaveProfile(event: FormEvent) {
		event.preventDefault();
		if (!agent) return;
		setSavingProfile(true);
		setProfileMessage("Saving updates...");
		try {
			const { error } = await supabaseBrowser.from("agents").upsert({
				id: agent.id,
				profile_id: agent.profile_id,
				full_name: profileForm.full_name || agent.full_name,
				license_number: profileForm.license_number || null,
				specialization: profileForm.specialization || null,
				bio: profileForm.bio || null,
				photo_url: profileForm.photo_url || null,
				facebook_url: profileForm.facebook_url || null,
				instagram_url: profileForm.instagram_url || null,
				twitter_url: profileForm.twitter_url || null,
				linkedin_url: profileForm.linkedin_url || null,
			});
			if (error) {
				setProfileMessage(`Error: ${error.message}`);
			} else {
				setProfileMessage("Profile updated successfully.");
				setAgent((prev) => (prev ? { ...prev, ...profileForm } : null));
			}
		} catch {
			setProfileMessage("Failed to save profile.");
		} finally {
			setSavingProfile(false);
			setTimeout(() => setProfileMessage(""), 4000);
		}
	}

	async function handleUpdateInquiryStatus(inquiryId: string, newStatus: string, notes: string) {
		setUpdatingInquiry(true);
		try {
			const now = new Date().toISOString();
			const target = inquiries.find((item) => item.id === inquiryId);
			const oldStatus = target?.status || "new";

			const payload: {
				status: string;
				last_activity_at: string;
				first_contacted_at?: string;
				closed_at?: string;
			} = { status: newStatus, last_activity_at: now };
			if (newStatus === "contacted" && !target?.first_contacted_at) {
				payload.first_contacted_at = now;
			}
			if (["reserved", "closed_won", "closed_lost"].includes(newStatus) && !target?.closed_at) {
				payload.closed_at = now;
			}

			selfUpdatedInquiriesRef.current.set(inquiryId, Date.now());
			knownInquiryIdsRef.current.add(inquiryId);

			const { error } = await supabaseBrowser
				.from("inquiries")
				.update(payload)
				.eq("id", inquiryId);

			if (!error) {
				await supabaseBrowser.from("inquiry_timeline").insert({
					inquiry_id: inquiryId,
					changed_by: agent?.profile_id || agent?.id,
					old_status: oldStatus,
					new_status: newStatus,
					note: notes
						? `Agent ${agent?.full_name || ""} updated status to ${newStatus.replace("_", " ")}: ${notes}`
						: `Agent ${agent?.full_name || ""} moved lead to ${newStatus.replace("_", " ")}.`,
				});
				setInquiries((prev) =>
					prev.map((item) =>
						item.id === inquiryId
							? { ...item, ...payload }
							: item,
					),
				);
				setEditingInquiry(null);
				setStatusMessage(`Lead moved to ${newStatus.replace("_", " ")}.`);
			} else {
				setStatusMessage(`Update failed: ${error.message}`);
			}
		} catch {
			setStatusMessage("Network error updating inquiry.");
		} finally {
			setUpdatingInquiry(false);
			setTimeout(() => setStatusMessage(""), 3500);
		}
	}

	async function handleQuickContact(inquiry: InquiryRow, method: "call" | "email" | "manual") {
		const methodText = method === "call" ? "Phone call" : method === "email" ? "Email" : "Agent contact";
		const contactNote = inquiry.buyer_message
			? `${inquiry.buyer_message}\n[${new Date().toLocaleDateString()}] Reached out via ${methodText}`
			: `Reached out via ${methodText} on ${new Date().toLocaleDateString()}`;
		await handleUpdateInquiryStatus(inquiry.id, "contacted", contactNote);
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

	const filteredInquiries = useMemo(() => {
		return inquiries.filter((inq) => {
			const matchesStatus = inquiryStatusFilter === "all" || inq.status === inquiryStatusFilter;
			const query = inquirySearch.toLowerCase().trim();
			const matchesQuery =
				!query ||
				(inq.buyer_name?.toLowerCase().includes(query) ?? false) ||
				(inq.buyer_email?.toLowerCase().includes(query) ?? false) ||
				(inq.buyer_phone?.toLowerCase().includes(query) ?? false) ||
				(inq.properties?.title?.toLowerCase().includes(query) ?? false);
			return matchesStatus && matchesQuery;
		});
	}, [inquiries, inquirySearch, inquiryStatusFilter]);

	const stats = useMemo(() => {
		const total = inquiries.length;
		const open = inquiries.filter((item) => !["reserved", "closed_won", "closed_lost"].includes(item.status ?? "")).length;
		const active = inquiries.filter((item) => ["assigned", "contacted", "viewing_scheduled", "negotiating"].includes(item.status ?? "")).length;
		const won = inquiries.filter((item) => ["reserved", "closed_won"].includes(item.status ?? "")).length;
		const lost = inquiries.filter((item) => item.status === "closed_lost").length;
		const newLeads = inquiries.filter((item) => ["new", "assigned"].includes(item.status ?? "")).length;
		const responded = inquiries.filter((item) => !["new", "assigned"].includes(item.status ?? "")).length;
		const conversion = total > 0 ? ((won / total) * 100).toFixed(1) : "0.0";
		const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
		const pipelineValue = inquiries
			.filter((item) => !["closed_lost"].includes(item.status ?? ""))
			.reduce((sum, item) => sum + (Number(item.properties?.price) || 0), 0);
		const publishedListings = properties.filter((item) => (item.status ?? "published") === "published").length;
		return { total, open, active, won, lost, newLeads, responded, conversion, responseRate, pipelineValue, publishedListings };
	}, [inquiries, properties]);

	const statusRows: AgentChartRow[] = useMemo(
		() =>
			STATUS_ORDER.map((status) => ({
				label: statusMeta(status).label,
				value: inquiries.filter((item) => (item.status ?? "new") === status).length,
				color: statusMeta(status).dot,
			})).filter((row) => row.value > 0),
		[inquiries],
	);

	const priorityRows: AgentChartRow[] = useMemo(() => {
		const order = ["urgent", "high", "medium", "low"];
		return order
			.map((priority) => ({
				label: priority,
				value: inquiries.filter((item) => (item.priority ?? "medium") === priority).length,
				color: priority === "urgent" ? "#dc2626" : priority === "high" ? "#d97706" : priority === "medium" ? "#111111" : "#d4d4d8",
			}))
			.filter((row) => row.value > 0);
	}, [inquiries]);

	const trendRows = useMemo(() => buildDailyTrend(inquiries, 14), [inquiries]);
	const monthTrendRows = useMemo(() => buildDailyTrend(inquiries, 30), [inquiries]);

	const weekdayRows: AgentChartRow[] = useMemo(() => {
		const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const counts = new Array(7).fill(0) as number[];
		inquiries.forEach((item) => {
			if (!item.created_at) return;
			const date = new Date(item.created_at);
			if (!Number.isNaN(date.getTime())) counts[date.getDay()] += 1;
		});
		return names.map((name, index) => ({ label: name, value: counts[index] }));
	}, [inquiries]);

	const categoryRows: AgentChartRow[] = useMemo(() => {
		const counts = new Map<string, number>();
		properties.forEach((item) => {
			const key = (item.category ?? "other").toLowerCase();
			counts.set(key, (counts.get(key) ?? 0) + 1);
		});
		return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
	}, [properties]);

	const listingStatusRows: AgentChartRow[] = useMemo(() => {
		const counts = new Map<string, number>();
		properties.forEach((item) => {
			const key = (item.status ?? "published").toLowerCase();
			counts.set(key, (counts.get(key) ?? 0) + 1);
		});
		return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
	}, [properties]);

	const listingValue = properties.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

	const funnelRows: AgentChartRow[] = useMemo(
		() => [
			{ label: "Leads", value: inquiries.length, color: "#111111" },
			{ label: "Engaged", value: inquiries.filter((item) => !["new", "assigned"].includes(item.status ?? "")).length, color: "#d97706" },
			{ label: "Viewing", value: inquiries.filter((item) => ["viewing_scheduled", "negotiating", "reserved", "closed_won"].includes(item.status ?? "")).length, color: "#7c3aed" },
			{ label: "Negotiating", value: inquiries.filter((item) => ["negotiating", "reserved", "closed_won"].includes(item.status ?? "")).length, color: "#4f46e5" },
			{ label: "Closed", value: inquiries.filter((item) => ["reserved", "closed_won"].includes(item.status ?? "")).length, color: "#059669" },
		],
		[inquiries],
	);

	const headerSearchResults = useMemo(() => {
		const query = headerSearch.toLowerCase().trim();
		if (!query) return [];
		return inquiries
			.filter((inq) =>
				[inq.buyer_name, inq.buyer_email, inq.buyer_phone, inq.properties?.title]
					.some((value) => (value ?? "").toLowerCase().includes(query)),
			)
			.slice(0, 6);
	}, [headerSearch, inquiries]);

	const navGroups: NavGroup[] = useMemo(
		() => [
			{
				id: "dashboard",
				label: "Dashboard",
				icon: LayoutDashboard,
				items: [{ id: "overview", label: "Overview", hint: "KPIs & activity", icon: LayoutDashboard }],
			},
			{
				id: "leads",
				label: "Leads",
				icon: MessageSquare,
				items: [
					{ id: "inquiries", label: "Assigned Inquiries", hint: `${inquiries.length} total`, icon: Inbox },
					{ id: "pipeline", label: "Pipeline", hint: `${stats.active} active`, icon: Target },
					{ id: "activity", label: "Activity History", hint: `${timeline.length} events`, icon: Activity },
				],
			},
			{
				id: "listings",
				label: "Listings",
				icon: Building2,
				items: [
					{ id: "listings", label: "My Listings", hint: `${properties.length} listings`, icon: Building },
					{ id: "listingInsights", label: "Listing Insights", hint: "Portfolio mix", icon: MapPin },
				],
			},
			{
				id: "analytics",
				label: "Analytics",
				icon: BarChart3,
				items: [
					{ id: "performance", label: "Performance", hint: "Conversion & funnel", icon: BarChart3 },
					{ id: "trends", label: "Lead Trends", hint: "Volume over time", icon: TrendingUp },
				],
			},
			{
				id: "account",
				label: "Account",
				icon: Settings,
				items: [
					{ id: "profile", label: "Profile & Credentials", hint: "Public details", icon: UserCircle },
					{ id: "security", label: "Account Security", hint: "Sign-in & password", icon: ShieldCheck },
				],
			},
		],
		[inquiries.length, properties.length, stats.active, timeline.length],
	);

	const activeGroup = useMemo(() => navGroups.find((group) => group.items.some((item) => item.id === activeSection)) ?? navGroups[0], [navGroups, activeSection]);
	const activeItem = activeGroup.items.find((item) => item.id === activeSection) ?? activeGroup.items[0];

	const badgeFor = (id: SectionId) => {
		if (id === "inquiries") return inquiries.length ? String(inquiries.length) : null;
		if (id === "listings") return properties.length ? String(properties.length) : null;
		if (id === "activity") return timeline.length ? String(timeline.length) : null;
		return null;
	};

	const openSection = useCallback((section: SectionId) => {
		setActiveSection(section);
		setShowSidebar(true);
		setShowNotifications(false);
		setShowProfileMenu(false);
		syncSectionUrl(section);
	}, []);

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6 text-[#0f172a]">
				<div className="skeleton-delayed flex w-full max-w-6xl flex-col gap-3">
					<div className="skeleton-shimmer h-16 rounded-xl bg-slate-200/60" />
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						{[0, 1, 2, 3].map((key) => <div key={key} className="skeleton-shimmer h-28 rounded-xl bg-slate-200/60" />)}
					</div>
					<div className="skeleton-shimmer h-64 rounded-xl bg-slate-200/60" />
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(222,20,28,0.035),rgba(248,250,252,1))] text-[#0f172a] selection:bg-[#DE141C]/15">
			<div className={`grid min-h-screen w-full transition-[grid-template-columns] duration-200 ${showSidebar ? "lg:grid-cols-[56px_220px_1fr]" : "lg:grid-cols-[56px_0px_1fr]"}`}>
				{/* Primary icon rail */}
				<aside className="hidden border-r border-slate-200/80 bg-white/95 backdrop-blur-md py-3 shadow-[1px_0_3px_rgba(15,23,42,0.02)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:justify-between">
					<div className="flex flex-col items-center gap-4">
						<Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs ring-1 ring-slate-200 transition hover:ring-black/20" title="Jewellz Realty — Go to website">
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
										className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition ${active ? "bg-[#111111] text-white shadow-xs" : "text-slate-500 hover:bg-slate-100 hover:text-[#0f172a]"}`}
										title={group.label}
									>
										<Icon className="h-4 w-4" />
										{group.id === "leads" && unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#DE141C]" /> : null}
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-2">
						<Link href="/" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#0f172a]" title="Visit customer website">
							<Globe className="h-4 w-4" />
						</Link>
						<button type="button" onClick={() => void reloadInquiries()} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-[#0f172a]" title="Refresh">
							<RefreshCw className="h-4 w-4" />
						</button>
						<button type="button" onClick={handleSignOut} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Sign out to customer website">
							<LogOut className="h-4 w-4" />
						</button>
					</div>
				</aside>

				{/* Secondary navigation */}
				<aside className={`${showSidebar ? "block" : "hidden lg:block lg:w-0 lg:overflow-hidden"} border-b border-slate-200/80 bg-white/90 backdrop-blur-md lg:sticky lg:top-0 lg:block lg:h-screen lg:border-b-0 lg:border-r shadow-[1px_0_3px_rgba(15,23,42,0.02)]`}>
					<nav className="flex max-h-[60vh] flex-col overflow-auto px-2 py-3 lg:max-h-[calc(100vh-96px)]">
						<div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{activeGroup.label}</div>
						<div className="space-y-1">
							{activeGroup.items.map((item) => {
								const Icon = item.icon;
								const active = activeSection === item.id;
								const badge = badgeFor(item.id);
								return (
									<button
										key={item.id}
										type="button"
										onClick={() => openSection(item.id)}
										className={`relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${active ? "bg-slate-100/90 font-semibold text-[#0f172a] shadow-xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-[#DE141C]" : "text-slate-600 hover:bg-slate-50 hover:text-[#0f172a]"}`}
									>
										<Icon className="h-4 w-4 shrink-0" />
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm">{item.label}</span>
											<span className="block truncate text-[11px] text-slate-400 font-normal">{item.hint}</span>
										</span>
										{badge ? <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{badge}</span> : null}
									</button>
								);
							})}
						</div>
					</nav>

					{/* Agent summary */}
					<div className="border-t border-slate-200/80 px-3 py-3">
						<div className="flex items-center gap-2.5">
							{agent?.photo_url ? (
								<SafeImage src={agent.photo_url} alt={agent.full_name} width={36} height={36} className="h-9 w-9 rounded-full border border-slate-200 object-cover shadow-2xs" fallbackContent={<div className="grid h-9 w-9 place-items-center rounded-full bg-[#111111] text-xs font-bold text-white">{agent.full_name?.charAt(0) ?? "A"}</div>} />
							) : (
								<div className="grid h-9 w-9 place-items-center rounded-full bg-[#111111] text-xs font-bold text-white">{agent?.full_name?.charAt(0) ?? "A"}</div>
							)}
							<div className="min-w-0">
								<div className="truncate text-xs font-semibold text-[#0f172a]">{agent?.full_name}</div>
								<div className="truncate text-[11px] text-slate-400">{agent?.license_number || "PRC Accredited"}</div>
							</div>
						</div>
						<div className="mt-3 flex gap-2 lg:hidden">
							<button type="button" onClick={() => void reloadInquiries()} className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Refresh</button>
							<button type="button" onClick={handleSignOut} className="flex-1 rounded-lg bg-[#111111] px-3 py-2 text-xs font-semibold text-white">Sign out</button>
						</div>
					</div>
				</aside>

				{/* Main column */}
				<section className="flex min-w-0 flex-col bg-transparent">
					<header className="sticky top-0 z-20 flex h-13 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md shadow-2xs md:px-6">
						<button type="button" onClick={() => setShowSidebar((current) => !current)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-[#0f172a] hover:bg-slate-50" title={showSidebar ? "Hide sidebar" : "Show sidebar"}>
							{showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
						</button>
						<div className="hidden min-w-0 flex-1 items-center gap-2 text-xs text-slate-400 md:flex">
							<span>{activeGroup.label}</span>
							<span>/</span>
							<strong className="truncate font-semibold text-[#0f172a]">{activeItem.label}</strong>
						</div>
						<div className="relative ml-auto hidden w-full max-w-xs md:block">
							<div className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 text-sm text-slate-600 transition focus-within:border-slate-400 focus-within:bg-white shadow-2xs">
								<Search className="h-4 w-4 text-slate-400" />
								<input
									aria-label="Search leads"
									value={headerSearch}
									onChange={(event) => setHeaderSearch(event.target.value)}
									placeholder="Search leads..."
									className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
								/>
							</div>
							{headerSearch.trim() ? (
								<div className="absolute right-0 top-10 z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
									{headerSearchResults.length === 0 ? <div className="px-3 py-3 text-xs text-slate-400">No matching leads.</div> : null}
									{headerSearchResults.map((inq) => (
										<button
											key={inq.id}
											type="button"
											onClick={() => {
												openInquiryEditor(inq);
												setHeaderSearch("");
											}}
											className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
										>
											<span className="font-medium text-[#0f172a]">{inq.buyer_name || inq.buyer_email || "Lead"}</span>
											<span className="ml-2 text-xs text-slate-400">{inq.properties?.title ?? "General inquiry"}</span>
										</button>
									))}
								</div>
							) : null}
						</div>
						<div className="relative ml-auto flex items-center gap-2 text-slate-600 md:ml-1">
							<Link
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-white hover:text-[#0f172a] hover:border-slate-300"
								title="Open public customer website in a new tab"
							>
								<Globe className="h-3.5 w-3.5 text-slate-500" />
								<span>Website</span>
								<ArrowUpRight className="h-3 w-3 text-slate-400" />
							</Link>

							<button type="button" onClick={() => { setShowNotifications((current) => !current); setShowProfileMenu(false); }} className="relative rounded-lg border border-slate-200 bg-white p-1.5 transition hover:bg-slate-50 shadow-2xs" title="Notifications">
								<Bell className="h-4 w-4" />
								{unreadCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DE141C] px-1 text-[10px] font-bold text-white ring-2 ring-white">{unreadCount}</span> : null}
							</button>
							<button type="button" onClick={() => { setShowProfileMenu((current) => !current); setShowNotifications(false); }} className="rounded-lg border border-slate-200 bg-white p-1.5 transition hover:bg-slate-50 shadow-2xs" title={agent?.full_name}>
								<UserCircle className="h-5 w-5" />
							</button>

							{showNotifications ? (
								<div className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl sm:w-96">
									<div className="flex items-center justify-between border-b border-slate-100 pb-2">
										<div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Notifications</div>
										{notifications.length > 0 ? (
											<button type="button" onClick={handleMarkAllAsRead} className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition hover:text-black">
												<CheckCheck className="h-3 w-3" />
												Mark all read
											</button>
										) : null}
									</div>
									<div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
										{notifications.length === 0 ? (
											<div className="py-8 text-center text-xs text-slate-400">No notifications yet. New lead assignments appear here.</div>
										) : (
											notifications.slice(0, 15).map((notif) => (
												<button
													key={notif.id}
													type="button"
													onClick={() => handleOpenNotification(notif)}
													className={`flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition hover:bg-slate-50 ${!notif.read ? "bg-red-50/50" : ""}`}
												>
													<span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${!notif.read ? "bg-[#DE141C]/10 text-[#DE141C]" : "bg-slate-100 text-slate-400"}`}>
														<Users className="h-3.5 w-3.5" />
													</span>
													<span className="min-w-0 flex-1">
														<span className="flex items-center justify-between gap-2">
															<span className={`text-xs font-semibold ${!notif.read ? "text-[#DE141C]" : "text-[#0f172a]"}`}>{notif.title}</span>
															<span className="shrink-0 text-[10px] text-slate-400">{formatTimeAgo(notif.timestamp)}</span>
														</span>
														<span className="mt-0.5 block truncate text-xs font-medium text-slate-700">{notif.message}</span>
														{notif.propertyTitle ? <span className="block truncate text-[11px] text-slate-400">{notif.propertyTitle}</span> : null}
													</span>
												</button>
											))
										)}
									</div>
								</div>
							) : null}

							{showProfileMenu ? (
								<div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl">
									<div className="font-semibold text-[#0f172a]">{agent?.full_name ?? "Agent"}</div>
									<div className="mt-0.5 truncate text-xs text-slate-500">{userEmail}</div>
									<div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">{agent?.license_number || "Licensed Agent"}</div>
									<div className="mt-3 border-t border-slate-100 pt-2 flex flex-col gap-1.5">
										<Link href="/" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50 hover:text-black">
											<span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-slate-400" />Customer Website</span>
											<ArrowUpRight className="h-3 w-3 text-slate-400" />
										</Link>
										<button type="button" onClick={handleSignOut} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#111111] px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/85">
											<LogOut className="h-3.5 w-3.5" />
											Sign out
										</button>
									</div>
								</div>
							) : null}
						</div>
					</header>

					<div className="flex-1 overflow-auto bg-transparent px-3 py-4 sm:px-5 lg:px-6">
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
									<div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
										<span>Agent Workspace</span>
										{agent?.is_top_agent ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"><Star className="h-3 w-3" />Top Agent</span> : null}
									</div>
									<h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#111111]">
										{activeSection === "overview" ? `Welcome back, ${agent?.full_name?.split(" ")[0] || "Agent"}` : activeItem.label}
									</h1>
								</div>
								<div className="flex items-center gap-2">
									<button type="button" onClick={() => openSection("inquiries")} className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
										<Inbox className="h-3.5 w-3.5" />
										Leads ({inquiries.length})
									</button>
									<button type="button" onClick={() => void reloadInquiries()} className="inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] transition hover:bg-zinc-50">
										<RefreshCw className="h-3.5 w-3.5" />
										Refresh
									</button>
								</div>
							</div>

							{statusMessage ? <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-[#111111] shadow-sm">{statusMessage}</div> : null}

							{/* ── OVERVIEW ───────────────────────────────────────────── */}
							{activeSection === "overview" ? (
								<>
									{unreadCount > 0 ? (
										<div className="flex flex-col gap-3 rounded-lg border border-[#DE141C]/25 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
											<div className="flex items-center gap-3">
												<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#DE141C] text-white"><Bell className="h-5 w-5" /></span>
												<div>
													<div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#DE141C]">Action required</div>
													<div className="text-sm font-semibold text-[#111111]">You have {unreadCount} new lead{unreadCount > 1 ? "s" : ""} assigned by Admin.</div>
													<div className="text-xs text-black/55">Review client details and reach out to start the conversation.</div>
												</div>
											</div>
											<button type="button" onClick={() => openSection("inquiries")} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/80">
												View leads
												<ChevronRight className="h-3.5 w-3.5" />
											</button>
										</div>
									) : null}

									<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
										<StatCard label="Total leads" value={stats.total} hint={`${stats.newLeads} awaiting first contact`} icon={Inbox} />
										<StatCard label="Active pipeline" value={stats.active} hint="Contacted, viewing or negotiating" accent icon={Target} />
										<StatCard label="Reserved / closed" value={stats.won} hint={`${stats.lost} lost deals`} icon={CheckCheck} />
										<StatCard label="Conversion rate" value={`${stats.conversion}%`} hint={`${stats.responseRate}% response rate`} icon={TrendingUp} />
									</div>

									<div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="text-sm font-semibold text-[#111111]">Lead volume (last 14 days)</div>
													<p className="mt-1 text-xs text-black/45">Buyer inquiries assigned to you over time.</p>
												</div>
												<button type="button" onClick={() => openSection("trends")} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">View report</button>
											</div>
											<div className="mt-3"><AgentTrendChart rows={trendRows} name="Leads" /></div>
										</div>
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Pipeline distribution</div>
											<p className="mt-1 text-xs text-black/45">Leads by current stage.</p>
											<div className="mt-3"><AgentDonut rows={statusRows} centerLabel="Leads" centerValue={stats.total} emptyLabel="No leads assigned yet" emptyHint="Your pipeline fills up as Admin assigns leads to you." /></div>
										</div>
									</div>

									<div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="flex items-center justify-between gap-3">
												<div>
													<div className="text-sm font-semibold text-[#111111]">Recent leads</div>
													<p className="mt-1 text-xs text-black/45">Newest buyer inquiries needing attention.</p>
												</div>
												<button type="button" onClick={() => openSection("inquiries")} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-zinc-50">Open queue</button>
											</div>
											<div className="mt-3 space-y-2">
												{inquiries.length === 0 ? <p className="rounded-md bg-zinc-50 px-3 py-4 text-sm text-black/50">No inquiries assigned yet.</p> : null}
												{inquiries.slice(0, 5).map((inq) => (
													<button key={inq.id} type="button" onClick={() => openInquiryEditor(inq)} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-left transition hover:bg-zinc-50">
														<div className="flex items-start justify-between gap-3">
															<div className="min-w-0">
																<div className="truncate text-sm font-semibold text-[#111111]">{inq.buyer_name || "Anonymous buyer"}</div>
																<div className="mt-1 truncate text-xs text-black/50">{inq.properties?.title ?? "General inquiry"} · {formatTimeAgo(inq.created_at)}</div>
															</div>
															<StatusPill status={inq.status} />
														</div>
													</button>
												))}
											</div>
										</div>

										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Agent card preview</div>
											<p className="mt-1 text-xs text-black/45">How clients see you on the public site.</p>
											<div className="mt-4 flex flex-col items-center text-center">
												{agent?.photo_url ? (
													<SafeImage src={agent.photo_url} alt={agent.full_name} width={80} height={80} className="h-20 w-20 rounded-full border border-black/10 object-cover" fallbackContent={<div className="grid h-20 w-20 place-items-center rounded-full bg-[#111111] text-xl font-bold text-white">{agent.full_name?.charAt(0) ?? "A"}</div>} />
												) : (
													<div className="grid h-20 w-20 place-items-center rounded-full bg-[#111111] text-xl font-bold text-white">{agent?.full_name?.charAt(0) ?? "A"}</div>
												)}
												<div className="mt-3 text-base font-semibold text-[#111111]">{agent?.full_name}</div>
												<div className="text-xs font-medium text-[#DE141C]">{agent?.specialization || "Licensed Real Estate Agent"}</div>
												<div className="mt-1 text-[11px] text-black/45">License: {agent?.license_number || "PRC Accredited"}</div>
												{agent?.bio ? <p className="mt-3 line-clamp-3 text-xs leading-5 text-black/60">{agent.bio}</p> : null}
												<button type="button" onClick={() => openSection("profile")} className="mt-4 w-full rounded-md border border-black/10 py-2 text-xs font-semibold text-[#111111] transition hover:bg-black/5">Edit public details</button>
											</div>
										</div>
									</div>
								</>
							) : null}

							{/* ── INQUIRIES ──────────────────────────────────────────── */}
							{activeSection === "inquiries" ? (
								<div className="space-y-3">
									<div className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
										<input
											type="search"
											value={inquirySearch}
											onChange={(event) => setInquirySearch(event.target.value)}
											placeholder="Search by buyer name, email, phone, or property..."
											className="h-9 flex-1 rounded-md border border-black/10 bg-zinc-50 px-3 text-xs text-[#111111] outline-none transition focus:border-black/30 focus:bg-white"
										/>
										<div className="flex items-center gap-2">
											<span className="text-xs font-medium text-black/50">Status</span>
											<select value={inquiryStatusFilter} onChange={(event) => setInquiryStatusFilter(event.target.value)} className="h-9 rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none">
												<option value="all">All ({inquiries.length})</option>
												{STATUS_ORDER.map((status) => (
													<option key={status} value={status}>{statusMeta(status).label}</option>
												))}
											</select>
										</div>
									</div>

									{editingInquiry ? (
										<div className="rounded-lg border border-[#DE141C]/30 bg-white p-4">
											<div className="flex items-center justify-between border-b border-black/10 pb-3">
												<div>
													<div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">Updating lead status</div>
													<h3 className="text-base font-bold text-[#111111]">{editingInquiry.buyer_name || "Lead details"}</h3>
												</div>
												<button type="button" onClick={() => setEditingInquiry(null)} className="rounded-md border border-black/10 px-2.5 py-1 text-xs font-medium text-black/60 hover:bg-black/5">Cancel</button>
											</div>
											<div className="mt-4 grid gap-4 sm:grid-cols-2">
												<div>
													<div className="text-xs font-semibold uppercase tracking-wider text-black/60">Buyer contact</div>
													<div className="mt-1 text-sm font-medium text-[#111111]">{editingInquiry.buyer_name || "—"}</div>
													<div className="text-xs text-black/50">
														Email:{" "}
														{editingInquiry.buyer_email ? <a href={`mailto:${editingInquiry.buyer_email}`} className="break-all text-[#DE141C] hover:underline">{editingInquiry.buyer_email}</a> : "—"}
													</div>
													<div className="text-xs text-black/50">
														Phone:{" "}
														{editingInquiry.buyer_phone ? <a href={`tel:${editingInquiry.buyer_phone}`} className="text-[#DE141C] hover:underline">{editingInquiry.buyer_phone}</a> : "—"}
													</div>
													{editingInquiry.buyer_message ? <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-black/60">{editingInquiry.buyer_message}</p> : null}
													{editingInquiry.properties?.title ? (
														<div className="mt-2 text-xs font-medium text-black/70">
															Property: {editingInquiry.properties.title} ({editingInquiry.properties.city ?? "Batangas"})
														</div>
													) : null}
													<div className="mt-3 flex flex-wrap items-center gap-2">
														{editingInquiry.buyer_phone ? (
															<a href={`tel:${editingInquiry.buyer_phone}`} onClick={() => { if (["new", "assigned"].includes(editingInquiry.status ?? "")) void handleQuickContact(editingInquiry, "call"); }} className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm transition hover:border-black/30" title="Call buyer & mark contacted">
																<Phone className="h-3.5 w-3.5 text-emerald-600" />Call
															</a>
														) : null}
														{editingInquiry.buyer_email ? (
															<a href={`mailto:${editingInquiry.buyer_email}`} onClick={() => { if (["new", "assigned"].includes(editingInquiry.status ?? "")) void handleQuickContact(editingInquiry, "email"); }} className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm transition hover:border-black/30" title="Email buyer & mark contacted">
																<Mail className="h-3.5 w-3.5 text-blue-600" />Email
															</a>
														) : null}
														{!["contacted", "viewing_scheduled", "negotiating", "reserved", "closed_won"].includes(editingInquiry.status ?? "") ? (
															<button type="button" onClick={() => void handleQuickContact(editingInquiry, "manual")} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700">
																Mark contacted
															</button>
														) : null}
													</div>
												</div>
												<div>
													<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">Pipeline stage</label>
													<select value={editStatus} onChange={(event) => setEditStatus(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none">
														{STATUS_ORDER.map((status) => (
															<option key={status} value={status}>{statusMeta(status).label}</option>
														))}
													</select>
													<label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-black/60">Follow-up notes</label>
													<textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={3} placeholder="e.g. Scheduled site visit Saturday 2PM..." className="mt-1 w-full rounded-md border border-black/10 bg-white p-2.5 text-xs text-[#111111] outline-none focus:border-black/30" />
													<button type="button" disabled={updatingInquiry} onClick={() => void handleUpdateInquiryStatus(editingInquiry.id, editStatus, editNotes)} className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-[#111111] px-4 text-xs font-semibold text-white transition hover:bg-black/80 disabled:opacity-50">
														{updatingInquiry ? "Saving..." : "Save status & notes"}
													</button>
												</div>
											</div>
										</div>
									) : null}

									<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
										<div className="overflow-x-auto">
											<table className="min-w-full text-left text-xs">
												<thead className="border-b border-black/10 bg-zinc-50 font-semibold uppercase tracking-[0.12em] text-black/50">
													<tr>
														<th className="px-4 py-3">Buyer</th>
														<th className="px-4 py-3">Property</th>
														<th className="px-4 py-3">Status</th>
														<th className="px-4 py-3">Priority</th>
														<th className="px-4 py-3">Date</th>
														<th className="px-4 py-3 text-right">Action</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-black/5">
													{filteredInquiries.length === 0 ? (
														<tr><td colSpan={6} className="px-4 py-10 text-center text-black/45">No inquiries match your filters.</td></tr>
													) : (
														filteredInquiries.map((inq) => (
															<tr key={inq.id} className="transition hover:bg-zinc-50/70">
																<td className="px-4 py-3">
																	<div className="text-sm font-semibold text-[#111111]">{inq.buyer_name || "—"}</div>
																	<div className="break-all text-black/50">{inq.buyer_email || inq.buyer_phone}</div>
																</td>
																<td className="px-4 py-3">
																	{inq.properties?.title ? (
																		<>
																			<div className="font-medium text-[#111111]">{inq.properties.title}</div>
																			<div className="text-black/45">{inq.properties.city ?? "Batangas"}</div>
																		</>
																	) : (
																		<span className="text-black/40">General inquiry</span>
																	)}
																</td>
																<td className="px-4 py-3"><StatusPill status={inq.status} /></td>
																<td className="px-4 py-3"><PriorityPill priority={inq.priority} /></td>
																<td className="px-4 py-3 text-black/50">{formatDate(inq.created_at)}</td>
																<td className="px-4 py-3 text-right">
																	<div className="inline-flex items-center justify-end gap-1.5">
																		{["new", "assigned"].includes(inq.status ?? "") ? (
																			<button type="button" onClick={() => void handleQuickContact(inq, "manual")} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100">Mark contacted</button>
																		) : null}
																		<button type="button" onClick={() => openInquiryEditor(inq)} className="rounded-md border border-black/10 px-3 py-1 text-xs font-semibold text-[#111111] transition hover:bg-black/5">Update</button>
																	</div>
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

							{/* ── PIPELINE ───────────────────────────────────────────── */}
							{activeSection === "pipeline" ? (
								<div className="space-y-3">
									<div className="grid gap-3 sm:grid-cols-3">
										<StatCard label="Active deals" value={stats.active} hint="In active conversation" accent />
										<StatCard label="Open leads" value={stats.open} hint="Not yet closed" />
										<StatCard label="Pipeline value" value={formatCurrency(stats.pipelineValue)} hint="Sum of lead listing prices" />
									</div>
									<div className="flex gap-3 overflow-x-auto pb-2">
										{STATUS_ORDER.map((status) => {
											const meta = statusMeta(status);
											const items = inquiries.filter((inq) => (inq.status ?? "new") === status);
											return (
												<div key={status} className="flex w-72 shrink-0 flex-col rounded-lg border border-black/10 bg-white">
													<div className="flex items-center justify-between gap-2 border-b border-black/10 px-3 py-2.5">
														<div className="flex items-center gap-2">
															<span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dot }} />
															<span className="text-xs font-semibold uppercase tracking-wider text-black/65">{meta.label}</span>
														</div>
														<span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/55">{items.length}</span>
													</div>
													<div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto p-2">
														{items.length === 0 ? <p className="px-2 py-4 text-center text-xs text-black/35">No leads</p> : null}
														{items.map((inq) => (
															<button key={inq.id} type="button" onClick={() => openInquiryEditor(inq)} className="rounded-md border border-black/10 bg-white p-2.5 text-left transition hover:border-black/25 hover:bg-zinc-50">
																<div className="truncate text-xs font-semibold text-[#111111]">{inq.buyer_name || "Anonymous buyer"}</div>
																<div className="mt-1 truncate text-[11px] text-black/50">{inq.properties?.title ?? "General inquiry"}</div>
																<div className="mt-2 flex items-center justify-between gap-2">
																	<PriorityPill priority={inq.priority} />
																	<span className="text-[10px] text-black/40">{formatTimeAgo(inq.created_at)}</span>
																</div>
															</button>
														))}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							) : null}

							{/* ── ACTIVITY ───────────────────────────────────────────── */}
							{activeSection === "activity" ? (
								<div className="rounded-lg border border-black/10 bg-white p-4">
									<div className="text-sm font-semibold text-[#111111]">Activity history</div>
									<p className="mt-1 text-xs text-black/45">Status changes recorded across your assigned leads.</p>
									<div className="mt-4 space-y-3">
										{timeline.length === 0 ? <p className="rounded-md bg-zinc-50 px-3 py-6 text-center text-sm text-black/50">No activity recorded yet.</p> : null}
										{timeline.map((event, index) => {
											const related = inquiries.find((inq) => inq.id === event.inquiry_id);
											return (
												<div key={event.id ?? `${event.inquiry_id}-${index}`} className="flex gap-3">
													<div className="flex flex-col items-center">
														<span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: statusMeta(event.new_status).dot }} />
														<span className="mt-1 w-px flex-1 bg-black/10" />
													</div>
													<div className="min-w-0 flex-1 pb-3">
														<div className="flex flex-wrap items-center gap-2">
															<span className="text-xs font-semibold text-[#111111]">{related?.buyer_name || "Lead"}</span>
															<StatusPill status={event.old_status} />
															<ChevronRight className="h-3 w-3 text-black/30" />
															<StatusPill status={event.new_status} />
															<span className="ml-auto text-[10px] text-black/40">{formatTimeAgo(event.created_at)}</span>
														</div>
														{event.note ? <p className="mt-1 text-xs leading-5 text-black/60">{event.note}</p> : null}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							) : null}

							{/* ── LISTINGS ───────────────────────────────────────────── */}
							{activeSection === "listings" ? (
								<div className="space-y-3">
									<div className="grid gap-3 sm:grid-cols-3">
										<StatCard label="Assigned listings" value={properties.length} hint="Properties tagged to you" icon={Building2} />
										<StatCard label="Published" value={stats.publishedListings} hint="Live on the public site" />
										<StatCard label="Portfolio value" value={formatCurrency(listingValue)} hint="Combined asking price" />
									</div>
									{properties.length === 0 ? (
										<div className="rounded-lg border border-dashed border-black/15 bg-white py-16 text-center">
											<p className="text-sm font-semibold text-[#111111]">No listings assigned yet</p>
											<p className="mt-1 text-xs text-black/50">The brokerage admin can assign property listings to your account in the CMS.</p>
										</div>
									) : (
										<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
											{properties.map((prop) => (
												<div key={prop.id} className="group flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white transition hover:shadow-md">
													<div className="relative aspect-[16/10] w-full bg-zinc-100">
														<SafeImage src={prop.featured_image_url || prop.images?.[0]} alt={prop.title} fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" fallbackContent={<div className="grid h-full w-full place-items-center text-xs text-black/40">No photo</div>} />
														<span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">{prop.status || "Published"}</span>
													</div>
													<div className="flex flex-1 flex-col p-4">
														<div className="text-[11px] font-semibold uppercase tracking-wider text-[#DE141C]">{prop.category || "Residential"}</div>
														<h3 className="mt-1 line-clamp-1 text-base font-semibold tracking-tight text-[#111111]">{prop.title}</h3>
														<p className="flex items-center gap-1 text-xs text-black/50"><MapPin className="h-3 w-3" />{prop.city ?? "Batangas"}, {prop.province ?? "Philippines"}</p>
														<div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-2 text-xs text-black/60">
															{prop.bedrooms ? <span>{prop.bedrooms} beds</span> : null}
															{prop.bathrooms ? <span>{prop.bathrooms} baths</span> : null}
															{prop.lot_area_sqm ? <span>{prop.lot_area_sqm} sqm</span> : null}
														</div>
														<div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3">
															<div className="text-sm font-bold text-[#111111]">{formatCurrency(prop.price)}</div>
															<Link href={`/project-list/${prop.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-black/70 hover:text-[#DE141C]">
																View<ArrowUpRight className="h-3.5 w-3.5" />
															</Link>
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							) : null}

							{/* ── LISTING INSIGHTS ───────────────────────────────────── */}
							{activeSection === "listingInsights" ? (
								<div className="space-y-3">
									<div className="grid gap-3 sm:grid-cols-4">
										<StatCard label="Listings" value={properties.length} hint="Total assigned" />
										<StatCard label="Published" value={stats.publishedListings} hint="Publicly visible" />
										<StatCard label="Avg price" value={formatCurrency(properties.length ? Math.round(listingValue / properties.length) : 0)} hint="Across your listings" />
										<StatCard label="Portfolio value" value={formatCurrency(listingValue)} hint="Combined asking price" />
									</div>
									<div className="grid gap-3 xl:grid-cols-2">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Portfolio by category</div>
											<p className="mt-1 text-xs text-black/45">How your listings break down by category.</p>
											<div className="mt-3"><AgentDonut rows={categoryRows} centerLabel="Listings" centerValue={properties.length} emptyLabel="No listings to show" emptyHint="Assigned listings will break down here by category." /></div>
										</div>
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Listings by status</div>
											<p className="mt-1 text-xs text-black/45">Publication status of your portfolio.</p>
											<div className="mt-3"><AgentBarChart rows={listingStatusRows} name="Listings" horizontal /></div>
										</div>
									</div>
									<div className="overflow-hidden rounded-lg border border-black/10 bg-white">
										<div className="border-b border-black/10 px-4 py-3 text-sm font-semibold text-[#111111]">Listing breakdown</div>
										<div className="overflow-x-auto">
											<table className="min-w-full text-left text-xs">
												<thead className="border-b border-black/10 bg-zinc-50 font-semibold uppercase tracking-[0.12em] text-black/50">
													<tr>
														<th className="px-4 py-3">Listing</th>
														<th className="px-4 py-3">Category</th>
														<th className="px-4 py-3">Status</th>
														<th className="px-4 py-3 text-right">Price</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-black/5">
													{properties.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-black/45">No listings assigned.</td></tr> : null}
													{properties.map((prop) => (
														<tr key={prop.id} className="transition hover:bg-zinc-50/70">
															<td className="px-4 py-3 font-medium text-[#111111]">{prop.title}</td>
															<td className="px-4 py-3 capitalize text-black/55">{prop.category ?? "—"}</td>
															<td className="px-4 py-3"><span className="rounded-full border border-black/10 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black/60">{prop.status ?? "published"}</span></td>
															<td className="px-4 py-3 text-right font-medium text-[#111111]">{formatCurrency(prop.price)}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								</div>
							) : null}

							{/* ── PERFORMANCE ────────────────────────────────────────── */}
							{activeSection === "performance" ? (
								<div className="space-y-3">
									<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
										<StatCard label="Total leads" value={stats.total} hint="All-time assigned" icon={Inbox} />
										<StatCard label="Response rate" value={`${stats.responseRate}%`} hint="Leads you engaged with" />
										<StatCard label="Conversion rate" value={`${stats.conversion}%`} hint="Lead to closed ratio" icon={TrendingUp} />
										<StatCard label="Closed deals" value={stats.won} hint={`${stats.lost} lost`} icon={CheckCheck} />
									</div>
									<div className="grid gap-3 xl:grid-cols-2">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Engagement funnel</div>
											<p className="mt-1 text-xs text-black/45">How leads progress through your pipeline.</p>
											<div className="mt-4"><AgentFunnel rows={funnelRows} /></div>
										</div>
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Leads by stage</div>
											<p className="mt-1 text-xs text-black/45">Current distribution of your pipeline.</p>
											<div className="mt-3"><AgentBarChart rows={statusRows} name="Leads" horizontal /></div>
										</div>
									</div>
									<div className="grid gap-3 xl:grid-cols-2">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Leads by priority</div>
											<p className="mt-1 text-xs text-black/45">Focus on high and urgent leads first.</p>
											<div className="mt-3"><AgentBarChart rows={priorityRows} name="Leads" horizontal /></div>
										</div>
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Weekly lead rhythm</div>
											<p className="mt-1 text-xs text-black/45">Which weekdays generate the most leads.</p>
											<div className="mt-3"><AgentBarChart rows={weekdayRows} name="Leads" /></div>
										</div>
									</div>
								</div>
							) : null}

							{/* ── TRENDS ─────────────────────────────────────────────── */}
							{activeSection === "trends" ? (
								<div className="space-y-3">
									<div className="grid gap-3 sm:grid-cols-3">
										<StatCard label="Leads (14 days)" value={trendRows.reduce((sum, row) => sum + row.value, 0)} hint="Recent lead flow" icon={TrendingUp} />
										<StatCard label="Leads (30 days)" value={monthTrendRows.reduce((sum, row) => sum + row.value, 0)} hint="Last month" />
										<StatCard label="Avg per day" value={(monthTrendRows.reduce((sum, row) => sum + row.value, 0) / 30).toFixed(1)} hint="30-day average" />
									</div>
									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="text-sm font-semibold text-[#111111]">Lead volume (last 30 days)</div>
										<p className="mt-1 text-xs text-black/45">Daily count of inquiries assigned to you.</p>
										<div className="mt-3"><AgentTrendChart rows={monthTrendRows} name="Leads" /></div>
									</div>
									<div className="grid gap-3 xl:grid-cols-2">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Leads by weekday</div>
											<p className="mt-1 text-xs text-black/45">All-time distribution across the week.</p>
											<div className="mt-3"><AgentBarChart rows={weekdayRows} name="Leads" /></div>
										</div>
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<div className="text-sm font-semibold text-[#111111]">Stage mix</div>
											<p className="mt-1 text-xs text-black/45">Share of leads in each pipeline stage.</p>
											<div className="mt-3"><AgentDonut rows={statusRows} centerLabel="Leads" centerValue={stats.total} emptyLabel="No leads assigned yet" emptyHint="Your pipeline fills up as Admin assigns leads to you." /></div>
										</div>
									</div>
								</div>
							) : null}

							{/* ── PROFILE ────────────────────────────────────────────── */}
							{activeSection === "profile" ? (
								<div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
									<div className="rounded-lg border border-black/10 bg-white p-4">
										<div className="border-b border-black/10 pb-3">
											<h2 className="text-sm font-semibold text-[#111111]">Profile & credentials</h2>
											<p className="mt-1 text-xs text-black/50">Manage your public credentials, biography, and contact links.</p>
										</div>
										{profileMessage ? <div className="mt-3 rounded-md border border-black/10 bg-zinc-50 p-3 text-xs font-semibold text-[#DE141C]">{profileMessage}</div> : null}
										<form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
											<div className="grid gap-4 sm:grid-cols-2">
												<label className="block">
													<span className="text-xs font-semibold uppercase tracking-wider text-black/60">Full name</span>
													<input type="text" required value={profileForm.full_name || ""} onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30" />
												</label>
												<label className="block">
													<span className="text-xs font-semibold uppercase tracking-wider text-black/60">PRC license number</span>
													<input type="text" value={profileForm.license_number || ""} onChange={(event) => setProfileForm((prev) => ({ ...prev, license_number: event.target.value }))} placeholder="e.g. PRC-0012345" className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30" />
												</label>
												<label className="block">
													<span className="text-xs font-semibold uppercase tracking-wider text-black/60">Specialization</span>
													<input type="text" value={profileForm.specialization || ""} onChange={(event) => setProfileForm((prev) => ({ ...prev, specialization: event.target.value }))} placeholder="e.g. Residential & Condominium" className="mt-1 h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30" />
												</label>
											</div>

											{/* Agent Photo Upload Card */}
											<div className="rounded-lg border border-black/10 bg-zinc-50/70 p-4">
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div>
														<span className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Profile Photo (PNG/JPG)</span>
														<p className="mt-0.5 text-xs text-black/50">Upload a picture for your public agent profile and agent cards.</p>
													</div>
													{profileForm.photo_url ? (
														<button
															type="button"
															onClick={() => setProfileForm((prev) => ({ ...prev, photo_url: "" }))}
															disabled={uploadingAgentPhoto}
															className="inline-flex items-center gap-1 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
														>
															<Trash2 className="h-3 w-3" />
															Remove photo
														</button>
													) : null}
												</div>

												<div className="mt-3 flex flex-wrap items-center gap-4">
													{profileForm.photo_url ? (
														<SafeImage
															src={profileForm.photo_url}
															alt={profileForm.full_name || "Agent"}
															width={64}
															height={64}
															className="h-16 w-16 rounded-full border border-black/15 object-cover shadow-sm"
															fallbackContent={
																<div className="grid h-16 w-16 place-items-center rounded-full bg-[#111111] text-base font-bold text-white">
																	{(profileForm.full_name || agent?.full_name)?.charAt(0) ?? "A"}
																</div>
															}
														/>
													) : (
														<div className="grid h-16 w-16 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40 shadow-sm">
															<Camera className="h-6 w-6" />
														</div>
													)}

													<div className="flex flex-1 flex-col gap-2 min-w-[220px]">
														<div className="flex items-center gap-2">
															<input
																ref={agentPhotoInputRef}
																type="file"
																accept="image/png,image/jpeg,image/jpg,image/webp"
																onChange={handleAgentPhotoUpload}
																disabled={uploadingAgentPhoto}
																className="hidden"
																id="agent-self-photo-upload"
															/>
															<label
																htmlFor="agent-self-photo-upload"
																className={`inline-flex items-center gap-2 rounded-md border border-black/15 bg-white px-3.5 py-2 text-xs font-semibold text-[#111111] shadow-sm transition hover:bg-zinc-100 cursor-pointer ${
																	uploadingAgentPhoto ? "pointer-events-none opacity-50" : ""
																}`}
															>
																{uploadingAgentPhoto ? (
																	<>
																		<Loader2 className="h-3.5 w-3.5 animate-spin text-black/60" />
																		<span>Uploading...</span>
																	</>
																) : (
																	<>
																		<Upload className="h-3.5 w-3.5 text-black/60" />
																		<span>{profileForm.photo_url ? "Change photo (PNG/JPG)" : "Upload photo (PNG/JPG)"}</span>
																	</>
																)}
															</label>
															<span className="text-[11px] text-black/45">or paste URL below</span>
														</div>

														<input
															type="url"
															value={profileForm.photo_url || ""}
															onChange={(event) => setProfileForm((prev) => ({ ...prev, photo_url: event.target.value }))}
															placeholder="https://..."
															disabled={uploadingAgentPhoto}
															className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs outline-none transition focus:border-black/30"
														/>
														{agentPhotoError ? <p className="text-xs text-red-600">{agentPhotoError}</p> : null}
													</div>
												</div>
											</div>
											<label className="block">
												<span className="text-xs font-semibold uppercase tracking-wider text-black/60">Biography</span>
												<textarea rows={4} value={profileForm.bio || ""} onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))} placeholder="Introduce your experience, focus areas, and commitment to clients..." className="mt-1 w-full rounded-md border border-black/10 bg-white p-3 text-sm outline-none transition focus:border-black/30" />
											</label>
											<div className="border-t border-black/10 pt-4">
												<h3 className="text-xs font-bold uppercase tracking-wider text-black/60">Social links</h3>
												<div className="mt-3 grid gap-3 sm:grid-cols-2">
													{([
														["facebook_url", "Facebook profile URL"],
														["instagram_url", "Instagram profile URL"],
														["linkedin_url", "LinkedIn profile URL"],
														["twitter_url", "Twitter / X profile URL"],
													] as const).map(([key, placeholder]) => (
														<input key={key} type="url" placeholder={placeholder} value={(profileForm[key] as string) || ""} onChange={(event) => setProfileForm((prev) => ({ ...prev, [key]: event.target.value }))} className="h-9 rounded-md border border-black/10 bg-white px-3 text-xs outline-none focus:border-black/30" />
													))}
												</div>
											</div>
											<button type="submit" disabled={savingProfile} className="inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-6 text-xs font-semibold text-white transition hover:bg-black/80 disabled:opacity-50">
												{savingProfile ? "Saving..." : "Save profile details"}
											</button>
										</form>
									</div>
									<div className="space-y-3">
										<div className="rounded-lg border border-black/10 bg-white p-4">
											<h2 className="text-sm font-semibold text-[#111111]">Public preview</h2>
											<div className="mt-4 flex flex-col items-center text-center">
												{(profileForm.photo_url || agent?.photo_url) ? (
													<SafeImage src={(profileForm.photo_url || agent?.photo_url)!} alt={profileForm.full_name || agent?.full_name || "Agent"} width={80} height={80} className="h-20 w-20 rounded-full border border-black/10 object-cover" fallbackContent={<div className="grid h-20 w-20 place-items-center rounded-full bg-[#111111] text-xl font-bold text-white">{(profileForm.full_name || agent?.full_name)?.charAt(0) ?? "A"}</div>} />
												) : (
													<div className="grid h-20 w-20 place-items-center rounded-full bg-[#111111] text-xl font-bold text-white">{(profileForm.full_name || agent?.full_name)?.charAt(0) ?? "A"}</div>
												)}
												<div className="mt-3 text-base font-semibold text-[#111111]">{profileForm.full_name || agent?.full_name}</div>
												<div className="text-xs font-medium text-[#DE141C]">{profileForm.specialization || agent?.specialization || "Licensed Real Estate Agent"}</div>
												<div className="mt-1 text-[11px] text-black/45">{profileForm.license_number || agent?.license_number || "PRC Accredited"}</div>
											</div>
										</div>
									</div>
								</div>
							) : null}

							{/* ── SECURITY ───────────────────────────────────────────── */}
							{activeSection === "security" ? (
								<div className="grid gap-3 xl:grid-cols-2">
									<div className="rounded-lg border border-black/10 bg-white p-4">
										<h2 className="text-sm font-semibold text-[#111111]">Account security</h2>
										<p className="mt-1 text-xs text-black/50">Your authentication credentials and access.</p>
										<div className="mt-4 space-y-3">
											<div>
												<span className="text-[11px] font-semibold uppercase tracking-wider text-black/45">Sign-in email</span>
												<div className="mt-0.5 break-all text-xs font-medium text-[#111111]">{userEmail || "—"}</div>
											</div>
											<div>
												<span className="text-[11px] font-semibold uppercase tracking-wider text-black/45">Account type</span>
												<div className="mt-0.5 text-xs text-black/60">Licensed Real Estate Agent</div>
											</div>
											<div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-black/55">
												<ShieldCheck className="h-4 w-4 text-emerald-600" />
												Session secured by Supabase Auth.
											</div>
											<button type="button" onClick={handleSendPasswordReset} className="w-full rounded-md border border-black/10 bg-zinc-50 py-2.5 text-xs font-semibold text-[#111111] transition hover:bg-black/5">Send password reset email</button>
											<button type="button" onClick={handleSignOut} className="w-full rounded-md bg-[#111111] py-2.5 text-xs font-semibold text-white transition hover:bg-black/80">Sign out</button>
										</div>
									</div>
									<div className="rounded-lg border border-black/10 bg-white p-4">
										<h2 className="text-sm font-semibold text-[#111111]">Workspace at a glance</h2>
										<p className="mt-1 text-xs text-black/50">Your current workload.</p>
										<div className="mt-4 space-y-3">
											<div className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2.5">
												<span className="flex items-center gap-2 text-xs text-black/60"><Inbox className="h-4 w-4" />Assigned leads</span>
												<span className="text-sm font-semibold text-[#111111]">{stats.total}</span>
											</div>
											<div className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2.5">
												<span className="flex items-center gap-2 text-xs text-black/60"><Building2 className="h-4 w-4" />Assigned listings</span>
												<span className="text-sm font-semibold text-[#111111]">{properties.length}</span>
											</div>
											<div className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2.5">
												<span className="flex items-center gap-2 text-xs text-black/60"><Wallet className="h-4 w-4" />Pipeline value</span>
												<span className="text-sm font-semibold text-[#111111]">{formatCurrency(stats.pipelineValue)}</span>
											</div>
											<div className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2.5">
												<span className="flex items-center gap-2 text-xs text-black/60"><Clock className="h-4 w-4" />Last activity</span>
												<span className="text-sm font-semibold text-[#111111]">{formatTimeAgo(inquiries[0]?.last_activity_at ?? inquiries[0]?.created_at)}</span>
											</div>
										</div>
									</div>
								</div>
							) : null}
						</div>
					</div>
				</section>
			</div>

			{/* Floating live assignment toast */}
			{toastNotification ? (
				<div className="fixed right-4 top-20 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-[#DE141C]/25 bg-white p-4 shadow-2xl sm:right-8 sm:max-w-md">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DE141C]/10 text-[#DE141C]"><Sparkles className="h-5 w-5" /></div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-2">
							<p className="text-[11px] font-bold uppercase tracking-wider text-[#DE141C]">{toastNotification.title || "Lead Update"}</p>
							<button type="button" onClick={() => setToastNotification(null)} className="rounded p-0.5 text-black/40 transition hover:text-black" title="Dismiss"><X className="h-3.5 w-3.5" /></button>
						</div>
						<p className="mt-1 text-sm font-semibold leading-snug text-[#111111]">{toastNotification.message}</p>
						{toastNotification.propertyTitle ? <p className="mt-0.5 truncate text-xs text-black/55">Listing: <span className="font-medium text-black/75">{toastNotification.propertyTitle}</span></p> : null}
						<div className="mt-3 flex items-center gap-2">
							<button type="button" onClick={() => handleOpenNotification(toastNotification)} className="inline-flex items-center gap-1.5 rounded-md bg-[#DE141C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b51016]">
								Review lead now<ChevronRight className="h-3.5 w-3.5" />
							</button>
							<button type="button" onClick={() => setToastNotification(null)} className="rounded-md border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-black/5">Dismiss</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	);
}
