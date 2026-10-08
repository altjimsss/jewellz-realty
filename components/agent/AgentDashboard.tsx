"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Bell,
	Sparkles,
	X,
	CheckCheck,
	Clock,
	ExternalLink,
	ChevronRight,
	UserCheck,
	MessageSquare,
	Phone,
	Mail,
	CheckCircle2,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type TabKey = "overview" | "inquiries" | "properties" | "profile";

type InquiryRow = {
	id: string;
	buyer_name?: string | null;
	buyer_email?: string | null;
	buyer_phone?: string | null;
	property_id?: string | null;
	assigned_agent_id?: string | null;
	status?: string | null;
	priority?: string | null;
	message?: string | null;
	notes?: string | null;
	created_at?: string | null;
	last_activity_at?: string | null;
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

export type AgentNotification = {
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

function playNotificationChime() {
	if (typeof window === "undefined") return;
	try {
		const AudioContextClass =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();
		if (ctx.state === "suspended") {
			void ctx.resume();
		}
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

export default function AgentDashboard() {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<TabKey>("overview");
	const [loading, setLoading] = useState(true);
	const [userEmail, setUserEmail] = useState("");
	const [agent, setAgent] = useState<AgentProfile | null>(null);
	const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
	const [properties, setProperties] = useState<PropertyRow[]>([]);
	const [statusMessage, setStatusMessage] = useState("");

	// Live Notifications State
	const [notifications, setNotifications] = useState<AgentNotification[]>([]);
	const [showNotifications, setShowNotifications] = useState(false);
	const [toastNotification, setToastNotification] = useState<AgentNotification | null>(null);

	// Inquiry Filter & Search state
	const [inquirySearch, setInquirySearch] = useState("");
	const [inquiryStatusFilter, setInquiryStatusFilter] = useState("all");
	const [editingInquiry, setEditingInquiry] = useState<InquiryRow | null>(null);
	const [updatingInquiry, setUpdatingInquiry] = useState(false);

	// Profile Form State
	const [profileForm, setProfileForm] = useState<Partial<AgentProfile>>({});
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileMessage, setProfileMessage] = useState("");

	const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

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

				if (isMounted) {
					setUserEmail(user.email ?? "");
				}

				// Fetch agent profile
				const { data: agentRow, error: agentError } = await supabaseBrowser
					.from("agents")
					.select("*")
					.eq("profile_id", user.id)
					.maybeSingle();

				if (agentError) {
					console.error("Agent profile fetch error:", agentError);
				}

				let currentAgent = agentRow as AgentProfile | null;

				// Fallback: If not found by profile_id, check profiles table for full_name
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

				if (!isMounted) return;

				if (currentAgent) {
					setAgent(currentAgent);
					setProfileForm(currentAgent);

					// Fetch assigned inquiries
					const { data: inquiryData } = await supabaseBrowser
						.from("inquiries")
						.select("*, properties(title, slug, price, city)")
						.eq("assigned_agent_id", currentAgent.id)
						.order("created_at", { ascending: false });

					// Fetch assigned properties
					const { data: propertyData } = await supabaseBrowser
						.from("properties")
						.select("*")
						.eq("assigned_agent_id", currentAgent.id)
						.order("created_at", { ascending: false });

					if (isMounted) {
						const inqList = (inquiryData as InquiryRow[]) ?? [];
						setInquiries(inqList);
						setProperties((propertyData as PropertyRow[]) ?? []);

						// Load read notification IDs from localStorage
						const readKey = `agent_read_inquiries_${currentAgent.id}`;
						let readIds: string[] = [];
						try {
							readIds = JSON.parse(localStorage.getItem(readKey) || "[]");
						} catch {}

						// Generate notifications for assigned leads
						const initialNotifs: AgentNotification[] = inqList.map((inq) => ({
							id: `notif_${inq.id}`,
							inquiryId: inq.id,
							title: "Lead Assigned",
							message: `${inq.buyer_name || "A buyer"} was assigned to you by Admin.`,
							propertyTitle: inq.properties?.title || "Property Inquiry",
							buyerEmail: inq.buyer_email,
							buyerPhone: inq.buyer_phone,
							timestamp: inq.created_at || new Date().toISOString(),
							read: readIds.includes(inq.id) || !["new", "assigned"].includes(inq.status || ""),
						}));

						setNotifications(initialNotifs);
					}
				}

				setLoading(false);
			} catch (err) {
				console.error("Error loading agent dashboard:", err);
				if (isMounted) setLoading(false);
			}
		}

		void loadAgentData();

		return () => {
			isMounted = false;
		};
	}, [router]);

	// Auto-dismiss floating toast notification after 8 seconds
	useEffect(() => {
		if (!toastNotification) return;
		const timer = setTimeout(() => {
			setToastNotification(null);
		}, 8000);
		return () => clearTimeout(timer);
	}, [toastNotification]);

	// Real-time Supabase listener & fallback polling for newly assigned inquiries
	useEffect(() => {
		if (!agent?.id) return;
		let mounted = true;

		// 1. Supabase Realtime channel subscription on inquiries table
		const channel = supabaseBrowser
			.channel(`agent_inquiries_realtime_${agent.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "inquiries",
				},
				async (payload) => {
					if (!mounted) return;
					const newRow = payload.new as InquiryRow & { assigned_agent_id?: string | null };
					if (!newRow || !newRow.id) return;

					// Check if this inquiry was assigned to this agent
					if (newRow.assigned_agent_id === agent.id) {
						let propertyInfo = newRow.properties;
						if (!propertyInfo && newRow.property_id) {
							const { data: prop } = await supabaseBrowser
								.from("properties")
								.select("title, slug, price, city")
								.eq("id", newRow.property_id)
								.maybeSingle();
							propertyInfo = prop;
						}

						const fullInquiry: InquiryRow = {
							...newRow,
							properties: propertyInfo,
						};

						setInquiries((prev) => {
							const exists = prev.some((i) => i.id === fullInquiry.id);
							if (exists) {
								return prev.map((i) => (i.id === fullInquiry.id ? fullInquiry : i));
							}
							return [fullInquiry, ...prev];
						});

						const notif: AgentNotification = {
							id: `notif_${fullInquiry.id}_${Date.now()}`,
							inquiryId: fullInquiry.id,
							title: "New Lead Assigned!",
							message: `${fullInquiry.buyer_name || "A buyer"} was assigned to you by Admin.`,
							propertyTitle: fullInquiry.properties?.title || "Property Inquiry",
							buyerEmail: fullInquiry.buyer_email,
							buyerPhone: fullInquiry.buyer_phone,
							timestamp: new Date().toISOString(),
							read: false,
						};

						setNotifications((prev) => [notif, ...prev.filter((n) => n.inquiryId !== notif.inquiryId)]);
						setToastNotification(notif);
						playNotificationChime();
					}
				}
			)
			.subscribe();

		// 2. Periodic polling every 15s ensuring notification triggers even if socket drops
		const pollInterval = setInterval(async () => {
			if (!mounted) return;
			const { data: latestData } = await supabaseBrowser
				.from("inquiries")
				.select("*, properties(title, slug, price, city)")
				.eq("assigned_agent_id", agent.id)
				.order("created_at", { ascending: false });

			if (latestData && Array.isArray(latestData) && mounted) {
				setInquiries((prev) => {
					const existingIds = new Set(prev.map((i) => i.id));
					const brandNew = (latestData as InquiryRow[]).filter((item) => !existingIds.has(item.id));

					if (brandNew.length > 0) {
						const newest = brandNew[0];
						const notif: AgentNotification = {
							id: `notif_${newest.id}_${Date.now()}`,
							inquiryId: newest.id,
							title: "New Lead Assigned!",
							message: `${newest.buyer_name || "A buyer"} was assigned to you by Admin.`,
							propertyTitle: newest.properties?.title || "Property Inquiry",
							buyerEmail: newest.buyer_email,
							buyerPhone: newest.buyer_phone,
							timestamp: new Date().toISOString(),
							read: false,
						};
						setNotifications((prevNotifs) => [notif, ...prevNotifs.filter((n) => n.inquiryId !== notif.inquiryId)]);
						setToastNotification(notif);
						playNotificationChime();
					}

					return latestData as InquiryRow[];
				});
			}
		}, 15000);

		return () => {
			mounted = false;
			void supabaseBrowser.removeChannel(channel);
			clearInterval(pollInterval);
		};
	}, [agent?.id]);

	function handleOpenNotification(notif: AgentNotification) {
		// Mark as read
		setNotifications((prev) =>
			prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
		);
		setShowNotifications(false);
		setToastNotification(null);

		if (agent?.id) {
			const readKey = `agent_read_inquiries_${agent.id}`;
			try {
				const existing = JSON.parse(localStorage.getItem(readKey) || "[]");
				if (!existing.includes(notif.inquiryId)) {
					localStorage.setItem(readKey, JSON.stringify([...existing, notif.inquiryId]));
				}
			} catch {}
		}

		// Navigate to Inquiries tab & open inquiry details
		setActiveTab("inquiries");
		const targetInquiry = inquiries.find((i) => i.id === notif.inquiryId);
		if (targetInquiry) {
			setEditingInquiry(targetInquiry);
		}
	}

	function handleMarkAllAsRead() {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
		if (agent?.id) {
			const readKey = `agent_read_inquiries_${agent.id}`;
			try {
				const allIds = inquiries.map((i) => i.id);
				localStorage.setItem(readKey, JSON.stringify(allIds));
			} catch {}
		}
	}

	async function handleSignOut() {
		await supabaseBrowser.auth.signOut();
		router.replace("/login");
	}

	async function handleSaveProfile(e: FormEvent) {
		e.preventDefault();
		if (!agent) return;
		setSavingProfile(true);
		setProfileMessage("Saving updates...");

		try {
			const { error } = await supabaseBrowser
				.from("agents")
				.upsert({
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
				setProfileMessage("Profile updated successfully!");
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
			const targetInquiry = inquiries.find((i) => i.id === inquiryId);
			const oldStatus = targetInquiry?.status || "new";

			const { error } = await supabaseBrowser
				.from("inquiries")
				.update({
					status: newStatus,
					notes: notes,
					last_activity_at: now,
				})
				.eq("id", inquiryId);

			if (!error) {
				// Record into inquiry_timeline for admin pipeline tracking
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
					prev.map((inq) =>
						inq.id === inquiryId ? { ...inq, status: newStatus, notes, last_activity_at: now } : inq
					)
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
		const contactNote = inquiry.notes
			? `${inquiry.notes}\n[${new Date().toLocaleDateString()}] Reached out via ${methodText}`
			: `Reached out via ${methodText} on ${new Date().toLocaleDateString()}`;

		await handleUpdateInquiryStatus(inquiry.id, "contacted", contactNote);
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

	// Filtered inquiries calculation
	const filteredInquiries = useMemo(() => {
		return inquiries.filter((inq) => {
			const matchesStatus =
				inquiryStatusFilter === "all" || inq.status === inquiryStatusFilter;
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

	// KPI Stats
	const totalLeads = inquiries.length;
	const activeDeals = inquiries.filter((i) =>
		["assigned", "contacted", "viewing_scheduled", "negotiating"].includes(i.status ?? "")
	).length;
	const closedWon = inquiries.filter((i) =>
		["reserved", "closed_won"].includes(i.status ?? "")
	).length;
	const conversionRate = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : "0.0";

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-[#111111]">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-[#DE141C]" />
					<p className="text-sm font-medium text-black/60">Loading Agent Portal...</p>
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
								Agent Portal
							</span>
							{agent?.is_top_agent ? (
								<span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
									★ Top Agent
								</span>
							) : null}
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Notification Bell */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setShowNotifications((prev) => !prev)}
								className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:bg-black/5 hover:text-black focus:outline-none"
								title="Notifications"
								aria-label="View notifications"
							>
								<Bell className="h-4 w-4" />
								{unreadCount > 0 ? (
									<span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DE141C] px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
										{unreadCount}
									</span>
								) : null}
							</button>

							{/* Notification Dropdown Popover */}
							{showNotifications ? (
								<div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-black/10 bg-white p-4 shadow-xl text-left">
									<div className="flex items-center justify-between pb-3 border-b border-black/5">
										<div className="flex items-center gap-2">
											<div className="font-semibold text-sm text-[#111111]">Notifications</div>
											{unreadCount > 0 ? (
												<span className="rounded-full bg-[#DE141C]/10 px-2 py-0.5 text-[10px] font-bold text-[#DE141C]">
													{unreadCount} new
												</span>
											) : null}
										</div>
										{notifications.length > 0 ? (
											<button
												type="button"
												onClick={handleMarkAllAsRead}
												className="flex items-center gap-1 text-[11px] font-medium text-black/50 hover:text-black transition"
											>
												<CheckCheck className="h-3 w-3" />
												Mark all read
											</button>
										) : null}
									</div>

									{/* Notification Items List */}
									<div className="mt-2 max-h-80 overflow-y-auto divide-y divide-black/5">
										{notifications.length === 0 ? (
											<div className="py-8 text-center text-xs text-black/40">
												No notifications yet. New lead assignments will appear here.
											</div>
										) : (
											notifications.slice(0, 15).map((notif) => (
												<div
													key={notif.id}
													onClick={() => handleOpenNotification(notif)}
													className={`group flex items-start gap-3 p-2.5 rounded-xl transition cursor-pointer hover:bg-black/5 ${
														!notif.read ? "bg-red-50/40" : ""
													}`}
												>
													<div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
														!notif.read ? "bg-[#DE141C]/10 text-[#DE141C]" : "bg-black/5 text-black/40"
													}`}>
														<UserCheck className="h-3.5 w-3.5" />
													</div>
													<div className="flex-1 min-w-0">
														<div className="flex items-center justify-between gap-1">
															<span className={`text-xs font-semibold ${!notif.read ? "text-[#DE141C]" : "text-[#111111]"}`}>
																{notif.title}
															</span>
															<span className="text-[10px] text-black/40 whitespace-nowrap">
																{formatTimeAgo(notif.timestamp)}
															</span>
														</div>
														<p className="text-xs text-black/80 font-medium truncate mt-0.5">
															{notif.message}
														</p>
														{notif.propertyTitle ? (
															<p className="text-[11px] text-black/50 truncate">
																Property: {notif.propertyTitle}
															</p>
														) : null}
													</div>
													{!notif.read ? (
														<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#DE141C]" />
													) : null}
												</div>
											))
										)}
									</div>
								</div>
							) : null}
						</div>

						<div className="hidden text-right sm:block">
							<div className="text-sm font-semibold text-[#111111]">{agent?.full_name}</div>
							<div className="text-xs text-black/50">{userEmail}</div>
						</div>
						{agent?.photo_url ? (
							<div className="relative h-9 w-9 overflow-hidden rounded-full border border-black/10">
								<Image
									src={agent.photo_url}
									alt={agent.full_name}
									fill
									className="object-cover"
								/>
							</div>
						) : (
							<div className="grid h-9 w-9 place-items-center rounded-full bg-[#DE141C] text-xs font-bold text-white">
								{agent?.full_name?.charAt(0) ?? "A"}
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

			{/* Floating Live Assignment Notification Toast */}
			{toastNotification ? (
				<div className="fixed top-20 right-4 sm:right-8 z-50 flex max-w-sm sm:max-w-md items-start gap-3 rounded-2xl border border-[#DE141C]/25 bg-white p-4 shadow-2xl ring-1 ring-black/5 transition duration-200 animate-in slide-in-from-top-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DE141C]/10 text-[#DE141C]">
						<Sparkles className="h-5 w-5" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<p className="text-[11px] font-bold uppercase tracking-wider text-[#DE141C]">
								New Lead Assigned By Admin
							</p>
							<button
								type="button"
								onClick={() => setToastNotification(null)}
								className="text-black/40 hover:text-black p-0.5 rounded transition"
								title="Dismiss"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
						<p className="mt-1 text-sm font-semibold text-[#111111] leading-snug">
							{toastNotification.message}
						</p>
						{toastNotification.propertyTitle ? (
							<p className="text-xs text-black/55 mt-0.5 truncate">
								Listing: <span className="font-medium text-black/75">{toastNotification.propertyTitle}</span>
							</p>
						) : null}
						<div className="mt-3 flex items-center gap-2">
							<button
								type="button"
								onClick={() => handleOpenNotification(toastNotification)}
								className="inline-flex items-center gap-1.5 rounded-lg bg-[#DE141C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b51016]"
							>
								Review Lead Now
								<ChevronRight className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => setToastNotification(null)}
								className="rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 hover:bg-black/5 transition"
							>
								Dismiss
							</button>
						</div>
					</div>
				</div>
			) : null}

			{/* Main Content Area */}
			<div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
				{/* Status Alert */}
				{statusMessage ? (
					<div className="mb-4 rounded-xl border border-black/10 bg-white p-3 text-xs font-medium text-[#DE141C] shadow-sm">
						{statusMessage}
					</div>
				) : null}

				{/* Unread Assigned Leads Alert Banner */}
				{unreadCount > 0 ? (
					<div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#DE141C]/30 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-sm">
						<div className="flex items-center gap-3.5">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#DE141C] text-white shadow-sm">
								<Bell className="h-5 w-5" />
							</div>
							<div>
								<div className="text-xs font-bold uppercase tracking-wider text-[#DE141C]">
									Action Required
								</div>
								<div className="font-semibold text-sm text-[#111111]">
									You have {unreadCount} new lead{unreadCount > 1 ? "s" : ""} assigned by Admin!
								</div>
								<div className="text-xs text-black/55">
									Review client details and reach out to initiate conversations.
								</div>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setActiveTab("inquiries")}
							className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#111111] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black"
						>
							View Assigned Leads ({unreadCount})
							<ChevronRight className="h-3.5 w-3.5" />
						</button>
					</div>
				) : null}

				{/* Agent Welcome Banner */}
				<div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-black/10 bg-white p-6 shadow-sm md:flex-row md:items-center">
					<div>
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#DE141C]">
							<span>Welcome back</span>
							<span>•</span>
							<span>PRC: {agent?.license_number || "Verified"}</span>
						</div>
						<h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">
							{agent?.full_name}
						</h1>
						<p className="mt-1 text-sm text-black/60">
							{agent?.specialization || "Licensed Real Estate Specialist"} · Jewellz Realty Group
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							onClick={() => setActiveTab("inquiries")}
							className="rounded-xl bg-[#DE141C] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15]"
						>
							View Inquiries ({inquiries.length})
						</button>
						<button
							onClick={() => setActiveTab("profile")}
							className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#111111] transition hover:bg-black/5"
						>
							Edit Profile
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
						Overview
					</button>
					<button
						onClick={() => setActiveTab("inquiries")}
						className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "inquiries"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						<span>Assigned Inquiries</span>
						<span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] text-black">
							{inquiries.length}
						</span>
						{unreadCount > 0 ? (
							<span className="rounded-full bg-[#DE141C] px-1.5 py-0.2 text-[10px] font-bold text-white">
								{unreadCount} new
							</span>
						) : null}
					</button>
					<button
						onClick={() => setActiveTab("properties")}
						className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
							activeTab === "properties"
								? "border-[#DE141C] text-[#DE141C]"
								: "border-transparent text-black/50 hover:text-black"
						}`}
					>
						<span>My Listings</span>
						<span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] text-black">
							{properties.length}
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
						Account & Profile
					</button>
				</div>

				{/* TAB 1: OVERVIEW */}
				{activeTab === "overview" ? (
					<div className="space-y-6">
						{/* KPI Stat Cards */}
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Total Leads
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-[#111111]">
									{totalLeads}
								</div>
								<p className="mt-1 text-xs text-black/50">Buyer inquiries assigned to you</p>
							</div>

							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Active Pipeline
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-[#DE141C]">
									{activeDeals}
								</div>
								<p className="mt-1 text-xs text-black/50">Contacted, viewing or negotiating</p>
							</div>

							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Reserved / Closed
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
									{closedWon}
								</div>
								<p className="mt-1 text-xs text-black/50">Successful deals closed</p>
							</div>

							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
									Conversion Rate
								</div>
								<div className="mt-2 text-3xl font-bold tracking-tight text-[#DE141C]">
									{conversionRate}%
								</div>
								<p className="mt-1 text-xs text-black/50">Lead to closing ratio</p>
							</div>
						</div>

						{/* Quick Follow-ups & Recent Inquiries */}
						<div className="grid gap-6 lg:grid-cols-3">
							{/* Recent Inquiries List */}
							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm lg:col-span-2">
								<div className="mb-4 flex items-center justify-between">
									<div>
										<h2 className="text-base font-semibold text-[#111111]">Recent Leads</h2>
										<p className="text-xs text-black/50">Latest buyer inquiries needing attention</p>
									</div>
									<button
										onClick={() => setActiveTab("inquiries")}
										className="text-xs font-semibold text-[#DE141C] hover:underline"
									>
										View all →
									</button>
								</div>

								{inquiries.length === 0 ? (
									<div className="rounded-xl border border-dashed border-black/10 py-10 text-center text-xs text-black/40">
										No inquiries assigned yet. New leads from property pages will appear here.
									</div>
								) : (
									<div className="divide-y divide-black/5">
										{inquiries.slice(0, 5).map((inq) => (
											<div key={inq.id} className="flex items-center justify-between py-3">
												<div>
													<div className="font-medium text-sm text-[#111111]">
														{inq.buyer_name || "Anonymous Buyer"}
													</div>
													<div className="text-xs text-black/50">
														{inq.properties?.title ? (
															<span>Interested in: {inq.properties.title}</span>
														) : (
															<span>General Inquiry</span>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<span
														className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
															inq.status === "closed_won" || inq.status === "reserved"
																? "bg-emerald-100 text-emerald-800"
																: inq.status === "new"
																	? "bg-blue-100 text-blue-800"
																	: "bg-zinc-100 text-black/70"
														}`}
													>
														{inq.status || "new"}
													</span>
													<button
														onClick={() => {
															setEditingInquiry(inq);
															setActiveTab("inquiries");
														}}
														className="rounded-lg border border-black/10 px-2 py-1 text-xs font-medium text-black/70 hover:bg-black/5"
													>
														Update
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Agent Profile Summary Card */}
							<div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
								<h2 className="text-base font-semibold text-[#111111]">Agent Card Preview</h2>
								<p className="text-xs text-black/50">How clients see you on Jewellz Realty</p>

								<div className="mt-4 flex flex-col items-center text-center">
									{agent?.photo_url ? (
										<div className="relative h-20 w-20 overflow-hidden rounded-full border border-black/10 shadow-sm">
											<Image
												src={agent.photo_url}
												alt={agent.full_name}
												fill
												className="object-cover"
											/>
										</div>
									) : (
										<div className="grid h-20 w-20 place-items-center rounded-full bg-[#DE141C] text-xl font-bold text-white shadow-sm">
											{agent?.full_name?.charAt(0) ?? "A"}
										</div>
									)}

									<div className="mt-3 font-semibold text-base text-[#111111]">
										{agent?.full_name}
									</div>
									<div className="text-xs text-[#DE141C] font-medium">
										{agent?.specialization || "Licensed Broker / Agent"}
									</div>
									<div className="mt-1 text-[11px] text-black/45">
										License: {agent?.license_number || "PRC Accredited"}
									</div>

									{agent?.bio ? (
										<p className="mt-3 text-xs leading-5 text-black/60 line-clamp-3">
											"{agent.bio}"
										</p>
									) : null}

									<button
										onClick={() => setActiveTab("profile")}
										className="mt-4 w-full rounded-xl border border-black/10 py-2 text-xs font-semibold text-[#111111] transition hover:bg-black/5"
									>
										Edit Public Details
									</button>
								</div>
							</div>
						</div>
					</div>
				) : null}

				{/* TAB 2: INQUIRIES & LEADS */}
				{activeTab === "inquiries" ? (
					<div className="space-y-4">
						{/* Inquiries Control Toolbar */}
						<div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
							<div className="relative flex-1">
								<input
									type="search"
									value={inquirySearch}
									onChange={(e) => setInquirySearch(e.target.value)}
									placeholder="Search by buyer name, email, phone, or property..."
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
									<option value="all">All Statuses ({inquiries.length})</option>
									<option value="new">New</option>
									<option value="assigned">Assigned</option>
									<option value="contacted">Contacted</option>
									<option value="viewing_scheduled">Viewing Scheduled</option>
									<option value="negotiating">Negotiating</option>
									<option value="reserved">Reserved</option>
									<option value="closed_won">Closed Won</option>
									<option value="closed_lost">Closed Lost</option>
								</select>
							</div>
						</div>

						{/* Inquiry Edit Modal / Drawer */}
						{editingInquiry ? (
							<div className="rounded-2xl border-2 border-[#DE141C]/30 bg-white p-5 shadow-md">
								<div className="flex items-center justify-between border-b border-black/10 pb-3">
									<div>
										<span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">
											Updating Lead Status
										</span>
										<h3 className="text-base font-bold text-[#111111]">
											{editingInquiry.buyer_name || "Lead Details"}
										</h3>
									</div>
									<button
										onClick={() => setEditingInquiry(null)}
										className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-black/60 hover:bg-black/5"
									>
										Cancel
									</button>
								</div>

								<div className="mt-4 grid gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Buyer Contact
										</label>
										<div className="mt-1 text-sm font-medium text-[#111111]">
											{editingInquiry.buyer_name || "—"}
										</div>
										<div className="text-xs text-black/50">
											Email:{" "}
											{editingInquiry.buyer_email ? (
												<a
													href={`mailto:${editingInquiry.buyer_email}`}
													className="text-[#DE141C] hover:underline"
												>
													{editingInquiry.buyer_email}
												</a>
											) : (
												"—"
											)}
										</div>
										<div className="text-xs text-black/50">
											Phone:{" "}
											{editingInquiry.buyer_phone ? (
												<a
													href={`tel:${editingInquiry.buyer_phone}`}
													className="text-[#DE141C] hover:underline"
												>
													{editingInquiry.buyer_phone}
												</a>
											) : (
												"—"
											)}
										</div>
										{editingInquiry.properties?.title ? (
											<div className="mt-2 text-xs font-medium text-black/70">
												Property: {editingInquiry.properties.title} (
												{editingInquiry.properties.city ?? "Batangas"})
											</div>
										) : null}

										{/* Quick Contact & Advance Stage Actions */}
										<div className="mt-3 flex flex-wrap items-center gap-2">
											{editingInquiry.buyer_phone ? (
												<a
													href={`tel:${editingInquiry.buyer_phone}`}
													onClick={() => {
														if (editingInquiry.status === "new" || editingInquiry.status === "assigned") {
															void handleQuickContact(editingInquiry, "call");
														}
													}}
													className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm hover:border-black/30 transition"
													title="Call client & advance status to Contacted"
												>
													<Phone className="h-3.5 w-3.5 text-emerald-600" />
													Call Buyer
												</a>
											) : null}
											{editingInquiry.buyer_email ? (
												<a
													href={`mailto:${editingInquiry.buyer_email}`}
													onClick={() => {
														if (editingInquiry.status === "new" || editingInquiry.status === "assigned") {
															void handleQuickContact(editingInquiry, "email");
														}
													}}
													className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] shadow-sm hover:border-black/30 transition"
													title="Email client & advance status to Contacted"
												>
													<Mail className="h-3.5 w-3.5 text-blue-600" />
													Email Buyer
												</a>
											) : null}
											{editingInquiry.status !== "contacted" && !["viewing_scheduled", "negotiating", "reserved", "closed_won"].includes(editingInquiry.status || "") ? (
												<button
													type="button"
													onClick={() => void handleQuickContact(editingInquiry, "manual")}
													className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
												>
													<CheckCircle2 className="h-3.5 w-3.5" />
													Mark Contacted
												</button>
											) : null}
										</div>
									</div>

									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Update Pipeline Stage
										</label>
										<select
											defaultValue={editingInquiry.status || "new"}
											id="update-status-select"
											className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-xs font-medium text-[#111111] outline-none"
										>
											<option value="new">New</option>
											<option value="assigned">Assigned</option>
											<option value="contacted">Contacted</option>
											<option value="viewing_scheduled">Viewing Scheduled</option>
											<option value="negotiating">Negotiating</option>
											<option value="reserved">Reserved</option>
											<option value="closed_won">Closed Won</option>
											<option value="closed_lost">Closed Lost</option>
										</select>

										<label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-black/60">
											Agent Follow-up Notes
										</label>
										<textarea
											defaultValue={editingInquiry.notes || ""}
											id="update-notes-textarea"
											rows={3}
											placeholder="Add notes (e.g., Scheduled site visit for Saturday 2PM...)"
											className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 text-xs text-[#111111] outline-none"
										/>

										<button
											disabled={updatingInquiry}
											onClick={() => {
												const sel = document.getElementById(
													"update-status-select"
												) as HTMLSelectElement;
												const txt = document.getElementById(
													"update-notes-textarea"
												) as HTMLTextAreaElement;
												void handleUpdateInquiryStatus(
													editingInquiry.id,
													sel.value,
													txt.value
												);
											}}
											className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-[#DE141C] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#b80f15] disabled:opacity-50"
										>
											{updatingInquiry ? "Saving..." : "Save Status & Notes"}
										</button>
									</div>
								</div>
							</div>
						) : null}

						{/* Inquiries Table */}
						<div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
							<div className="overflow-x-auto">
								<table className="min-w-full text-left text-xs">
									<thead className="border-b border-black/10 bg-zinc-50 font-semibold uppercase tracking-[0.14em] text-black/50">
										<tr>
											<th className="px-4 py-3.5">Buyer</th>
											<th className="px-4 py-3.5">Property of Interest</th>
											<th className="px-4 py-3.5">Status</th>
											<th className="px-4 py-3.5">Priority</th>
											<th className="px-4 py-3.5">Date</th>
											<th className="px-4 py-3.5 text-right">Action</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-black/5">
										{filteredInquiries.length === 0 ? (
											<tr>
												<td colSpan={6} className="px-4 py-10 text-center text-black/45">
													No inquiries found matching your filters.
												</td>
											</tr>
										) : (
											filteredInquiries.map((inq) => (
												<tr key={inq.id} className="transition hover:bg-zinc-50/70">
													<td className="px-4 py-3.5">
														<div className="font-semibold text-sm text-[#111111]">
															{inq.buyer_name || "—"}
														</div>
														<div className="text-black/50">{inq.buyer_email || inq.buyer_phone}</div>
													</td>
													<td className="px-4 py-3.5">
														{inq.properties?.title ? (
															<div>
																<div className="font-medium text-[#111111]">
																	{inq.properties.title}
																</div>
																<div className="text-black/45">
																	{inq.properties.city ?? "Batangas"}
																</div>
															</div>
														) : (
															<span className="text-black/40">General inquiry</span>
														)}
													</td>
													<td className="px-4 py-3.5">
														<span
															className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
																inq.status === "closed_won" || inq.status === "reserved"
																	? "bg-emerald-100 text-emerald-800"
																	: inq.status === "new"
																		? "bg-blue-100 text-blue-800"
																		: inq.status === "viewing_scheduled"
																			? "bg-purple-100 text-purple-800"
																			: "bg-zinc-100 text-black/70"
															}`}
														>
															{inq.status?.replace("_", " ") || "new"}
														</span>
													</td>
													<td className="px-4 py-3.5 uppercase tracking-wider text-[10px] font-semibold text-black/60">
														{inq.priority || "medium"}
													</td>
													<td className="px-4 py-3.5 text-black/50">
														{inq.created_at ? inq.created_at.slice(0, 10) : "—"}
													</td>
													<td className="px-4 py-3.5 text-right whitespace-nowrap">
														<div className="inline-flex items-center gap-1.5 justify-end">
															{inq.status === "new" || inq.status === "assigned" ? (
																<button
																	type="button"
																	onClick={() => void handleQuickContact(inq, "manual")}
																	className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
																	title="Mark customer as contacted"
																>
																	Mark Contacted
																</button>
															) : null}
															<button
																onClick={() => setEditingInquiry(inq)}
																className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold text-[#111111] transition hover:bg-black/5"
															>
																Update
															</button>
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

				{/* TAB 3: PROPERTIES / MY LISTINGS */}
				{activeTab === "properties" ? (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-lg font-bold text-[#111111]">My Assigned Listings</h2>
								<p className="text-xs text-black/50">Properties assigned to your agent profile</p>
							</div>
							<span className="text-xs font-semibold text-black/50">
								{properties.length} Total Properties
							</span>
						</div>

						{properties.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-black/15 bg-white py-16 text-center shadow-sm">
								<p className="text-sm font-semibold text-[#111111]">No properties assigned yet</p>
								<p className="mt-1 text-xs text-black/50">
									The brokerage admin can assign property listings to your account in the CMS.
								</p>
							</div>
						) : (
							<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{properties.map((prop) => (
									<div
										key={prop.id}
										className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:shadow-md"
									>
										<div className="relative aspect-[16/10] w-full bg-zinc-100">
											{prop.featured_image_url || prop.images?.[0] ? (
												<Image
													src={prop.featured_image_url || prop.images![0]}
													alt={prop.title}
													fill
													className="object-cover transition duration-300 group-hover:scale-105"
												/>
											) : (
												<div className="grid h-full w-full place-items-center text-xs text-black/40">
													No photo
												</div>
											)}
											<span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
												{prop.status || "Published"}
											</span>
										</div>

										<div className="flex flex-1 flex-col p-4">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-[#DE141C]">
												{prop.category || "Residential"}
											</div>
											<h3 className="mt-1 text-base font-semibold tracking-tight text-[#111111] line-clamp-1">
												{prop.title}
											</h3>
											<p className="text-xs text-black/50">
												{prop.city ?? "Batangas"}, {prop.province ?? "Philippines"}
											</p>

											<div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-2 text-xs text-black/60">
												{prop.bedrooms ? <span>{prop.bedrooms} Beds</span> : null}
												{prop.bathrooms ? <span>{prop.bathrooms} Baths</span> : null}
												{prop.lot_area_sqm ? <span>{prop.lot_area_sqm} sqm</span> : null}
											</div>

											<div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3">
												<div className="font-bold text-sm text-[#DE141C]">
													{prop.price ? `₱${prop.price.toLocaleString()}` : "Price upon request"}
												</div>
												<Link
													href={`/project-list/${prop.slug}`}
													target="_blank"
													className="text-xs font-semibold text-black/70 hover:text-[#DE141C]"
												>
													View Public →
												</Link>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				) : null}

				{/* TAB 4: ACCOUNT & PROFILE SETTINGS */}
				{activeTab === "profile" ? (
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm lg:col-span-2">
							<div className="border-b border-black/10 pb-4">
								<h2 className="text-lg font-bold text-[#111111]">Agent Profile Settings</h2>
								<p className="text-xs text-black/50">
									Manage your public credentials, biography, and contact details
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
											Full Name
										</label>
										<input
											type="text"
											required
											value={profileForm.full_name || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
											}
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											PRC License Number
										</label>
										<input
											type="text"
											value={profileForm.license_number || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, license_number: e.target.value }))
											}
											placeholder="e.g. PRC-0012345"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Specialization
										</label>
										<input
											type="text"
											value={profileForm.specialization || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, specialization: e.target.value }))
											}
											placeholder="e.g. Residential & Condominium"
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
									<div>
										<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
											Photo URL
										</label>
										<input
											type="url"
											value={profileForm.photo_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, photo_url: e.target.value }))
											}
											placeholder="https://..."
											className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#DE141C]"
										/>
									</div>
								</div>

								<div>
									<label className="block text-xs font-semibold uppercase tracking-wider text-black/60">
										Agent Biography
									</label>
									<textarea
										rows={4}
										value={profileForm.bio || ""}
										onChange={(e) =>
											setProfileForm((prev) => ({ ...prev, bio: e.target.value }))
										}
										placeholder="Introduce your experience, focus areas, and commitment to clients..."
										className="mt-1 w-full rounded-xl border border-black/10 bg-white p-3 text-sm outline-none transition focus:border-[#DE141C]"
									/>
								</div>

								<div className="border-t border-black/10 pt-4">
									<h3 className="text-xs font-bold uppercase tracking-wider text-black/60">
										Social & Communication Links
									</h3>
									<div className="mt-3 grid gap-3 sm:grid-cols-2">
										<input
											type="url"
											placeholder="Facebook Profile URL"
											value={profileForm.facebook_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, facebook_url: e.target.value }))
											}
											className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#DE141C]"
										/>
										<input
											type="url"
											placeholder="Instagram Profile URL"
											value={profileForm.instagram_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, instagram_url: e.target.value }))
											}
											className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#DE141C]"
										/>
										<input
											type="url"
											placeholder="LinkedIn Profile URL"
											value={profileForm.linkedin_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, linkedin_url: e.target.value }))
											}
											className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#DE141C]"
										/>
										<input
											type="url"
											placeholder="Twitter / X Profile URL"
											value={profileForm.twitter_url || ""}
											onChange={(e) =>
												setProfileForm((prev) => ({ ...prev, twitter_url: e.target.value }))
											}
											className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#DE141C]"
										/>
									</div>
								</div>

								<div className="pt-2">
									<button
										type="submit"
										disabled={savingProfile}
										className="inline-flex h-10 items-center justify-center rounded-xl bg-[#DE141C] px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15] disabled:opacity-50"
									>
										{savingProfile ? "Saving..." : "Save Profile Details"}
									</button>
								</div>
							</form>
						</div>

						{/* Account & Security Card */}
						<div className="space-y-6">
							<div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
								<h2 className="text-base font-bold text-[#111111]">Account Security</h2>
								<p className="text-xs text-black/50">Your authentication credentials</p>

								<div className="mt-4 space-y-3">
									<div>
										<span className="text-[11px] font-semibold uppercase tracking-wider text-black/45">
											Sign-in Email
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
											Licensed Real Estate Agent
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
