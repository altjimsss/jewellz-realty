"use client";

import { useEffect, useState } from "react";
import {
	AlertCircle,
	Bot,
	Check,
	CheckCircle2,
	Eye,
	EyeOff,
	Key,
	Mail,
	Plus,
	RefreshCw,
	Search,
	Send,
	Settings as SettingsIcon,
	Sparkles,
	Trash2,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CmsPayload, CmsRow } from "./types";
import { asText } from "./utils";

const inputClass =
	"mt-2 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10 disabled:bg-zinc-50 disabled:text-black/45";
const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-black/60";
const primaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#DE141C] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-[#B8101A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#DE141C]/20 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
	"inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-semibold text-[#111111] shadow-xs transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-50";

type ValueKind = "boolean" | "number" | "text";

function valueKind(key: string, value: string): ValueKind {
	const normalizedKey = key.trim().toLowerCase();
	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "true" || normalizedValue === "false") return "boolean";
	if (/(enabled$|_enabled$|auto_assign|_flag$|is_[a-z])/.test(normalizedKey)) return "boolean";
	if (/(secs|seconds|hours|minutes|days|count|threshold|percent|_pct|rate|limit|size|_min$|_max$)/.test(normalizedKey)) return "number";
	if (value.trim() !== "" && !Number.isNaN(Number(value))) return "number";
	return "text";
}

const kindLabel: Record<ValueKind, string> = { boolean: "Toggle", number: "Number", text: "Text" };

function settingName(key: string) {
	return key.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "New setting";
}

function ValueChip({ kind, value }: { kind: ValueKind; value: string }) {
	if (kind === "boolean") {
		const on = value.trim().toLowerCase() === "true";
		return (
			<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/10 bg-zinc-100 text-black/50"}`}>
				<span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-black/25"}`} />
				{on ? "On" : "Off"}
			</span>
		);
	}
	return <span className="inline-flex max-w-[136px] items-center truncate rounded-full border border-black/10 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] font-medium text-black/60">{value.trim() || "—"}</span>;
}

type WorkspaceProps = {
	rows: CmsRow[];
	selectedId: string | null;
	canEdit: boolean;
	onSelect: (row: CmsRow | null) => void;
	onCreateNew: () => void;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
	onReload?: () => Promise<void> | void;
};

type ActiveTab = "email" | "ai" | "variables";

export function SettingsWorkspace({ rows, selectedId, canEdit, onSelect, onCreateNew, onDelete, onSubmit, onReload }: WorkspaceProps) {
	const [activeTab, setActiveTab] = useState<ActiveTab>("email");
	const [search, setSearch] = useState("");

	// State for dynamic settings loaded via /api/admin/system-settings
	const [loadingSettings, setLoadingSettings] = useState(true);
	const [emailForm, setEmailForm] = useState({
		gmailUser: "",
		gmailAppPassword: "",
		emailFrom: "",
		resendApiKey: "",
		hasAppPassword: false,
		isDbConfigured: false,
	});
	const [aiForm, setAiForm] = useState({
		primaryProvider: "groq" as "groq" | "gemini" | "openrouter",
		groqKey: "",
		groqModel: "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b",
		hasGroqKey: false,
		geminiKey: "",
		geminiModel: "gemini-1.5-flash",
		hasGeminiKey: false,
		openRouterKey: "",
		openRouterModel: "openrouter/free",
		hasOpenRouterKey: false,
		isDbConfigured: false,
	});

	// UI helper states
	const [showGmailPassword, setShowGmailPassword] = useState(false);
	const [showGroqKey, setShowGroqKey] = useState(false);
	const [showGeminiKey, setShowGeminiKey] = useState(false);
	const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

	const [emailSaving, setEmailSaving] = useState(false);
	const [emailStatus, setEmailStatus] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
	const [emailTesting, setEmailTesting] = useState(false);
	const [sendTestEmailBox, setSendTestEmailBox] = useState(false);

	const [aiSaving, setAiSaving] = useState(false);
	const [aiStatus, setAiStatus] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
	const [aiTesting, setAiTesting] = useState<string | null>(null);

	// Load dynamic settings from API on mount
	useEffect(() => {
		let isMounted = true;
		async function fetchSettings() {
			try {
				const { data: { session } } = await supabaseBrowser.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					if (isMounted) setLoadingSettings(false);
					return;
				}

				const res = await fetch("/api/admin/system-settings", {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (!res.ok) {
					if (isMounted) setLoadingSettings(false);
					return;
				}

				const data = await res.json();
				if (!isMounted) return;

				if (data.email) {
					setEmailForm((prev) => ({
						...prev,
						gmailUser: data.email.gmailUser || "",
						emailFrom: data.email.emailFrom || "",
						hasAppPassword: Boolean(data.email.hasAppPassword),
						isDbConfigured: Boolean(data.email.isDbConfigured),
					}));
				}

				if (data.ai) {
					setAiForm((prev) => ({
						...prev,
						primaryProvider: data.ai.primaryProvider || "groq",
						groqModel: data.ai.groqModel || prev.groqModel,
						hasGroqKey: Boolean(data.ai.hasGroqKey),
						geminiModel: data.ai.geminiModel || prev.geminiModel,
						hasGeminiKey: Boolean(data.ai.hasGeminiKey),
						openRouterModel: data.ai.openRouterModel || prev.openRouterModel,
						hasOpenRouterKey: Boolean(data.ai.hasOpenRouterKey),
						isDbConfigured: Boolean(data.ai.isDbConfigured),
					}));
				}
			} catch (err) {
				console.warn("Failed to load admin system settings:", err);
			} finally {
				if (isMounted) setLoadingSettings(false);
			}
		}

		void fetchSettings();
		return () => {
			isMounted = false;
		};
	}, []);

	// Save Email Settings
	async function handleSaveEmail() {
		setEmailSaving(true);
		setEmailStatus(null);
		try {
			const { data: { session } } = await supabaseBrowser.auth.getSession();
			const token = session?.access_token;
			if (!token) throw new Error("Admin session expired. Please sign in again.");

			const settingsPayload: Record<string, string> = {
				gmail_user: emailForm.gmailUser.trim(),
				email_from: emailForm.emailFrom.trim() || `J'WELLZ REALTY <${emailForm.gmailUser.trim()}>`,
			};

			// Only update app password if changed
			if (emailForm.gmailAppPassword.trim()) {
				settingsPayload.gmail_app_password = emailForm.gmailAppPassword.trim().replace(/\s/g, "");
			}
			if (emailForm.resendApiKey.trim()) {
				settingsPayload.resend_api_key = emailForm.resendApiKey.trim();
			}

			const res = await fetch("/api/admin/system-settings", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "save",
					settings: settingsPayload,
				}),
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || "Failed to save email settings.");

			setEmailStatus({ tone: "success", text: "Gmail settings saved successfully! New emails will use these credentials." });
			setEmailForm((prev) => ({
				...prev,
				hasAppPassword: prev.hasAppPassword || Boolean(emailForm.gmailAppPassword.trim()),
				isDbConfigured: true,
				gmailAppPassword: "", // clear raw input after save
			}));

			await onReload?.();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setEmailStatus({ tone: "error", text: msg });
		} finally {
			setEmailSaving(false);
		}
	}

	// Test Gmail Connection
	async function handleTestGmail() {
		setEmailTesting(true);
		setEmailStatus({ tone: "info", text: "Connecting to Gmail SMTP servers (smtp.gmail.com:465)..." });
		try {
			const { data: { session } } = await supabaseBrowser.auth.getSession();
			const token = session?.access_token;
			if (!token) throw new Error("Admin session expired.");

			const res = await fetch("/api/admin/system-settings", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "test-gmail",
					gmailUser: emailForm.gmailUser.trim() || undefined,
					gmailAppPassword: emailForm.gmailAppPassword.trim() || undefined,
					sendTestEmail: sendTestEmailBox,
				}),
			});

			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.error || "Gmail verification failed.");

			setEmailStatus({ tone: "success", text: result.message || "Gmail connection verified successfully!" });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setEmailStatus({ tone: "error", text: `Connection test failed: ${msg}` });
		} finally {
			setEmailTesting(false);
		}
	}

	// Save AI Settings
	async function handleSaveAi() {
		setAiSaving(true);
		setAiStatus(null);
		try {
			const { data: { session } } = await supabaseBrowser.auth.getSession();
			const token = session?.access_token;
			if (!token) throw new Error("Admin session expired.");

			const settingsPayload: Record<string, string> = {
				primary_ai_provider: aiForm.primaryProvider,
				groq_model: aiForm.groqModel.trim(),
				gemini_model: aiForm.geminiModel.trim(),
				openrouter_model: aiForm.openRouterModel.trim(),
			};

			if (aiForm.groqKey.trim()) settingsPayload.groq_api_key = aiForm.groqKey.trim();
			if (aiForm.geminiKey.trim()) settingsPayload.gemini_api_key = aiForm.geminiKey.trim();
			if (aiForm.openRouterKey.trim()) settingsPayload.openrouter_api_key = aiForm.openRouterKey.trim();

			const res = await fetch("/api/admin/system-settings", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "save",
					settings: settingsPayload,
				}),
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || "Failed to save AI settings.");

			setAiStatus({ tone: "success", text: "AI credentials saved successfully! Dynamic API routing is updated." });
			setAiForm((prev) => ({
				...prev,
				hasGroqKey: prev.hasGroqKey || Boolean(aiForm.groqKey.trim()),
				hasGeminiKey: prev.hasGeminiKey || Boolean(aiForm.geminiKey.trim()),
				hasOpenRouterKey: prev.hasOpenRouterKey || Boolean(aiForm.openRouterKey.trim()),
				isDbConfigured: true,
				groqKey: "",
				geminiKey: "",
				openRouterKey: "",
			}));

			await onReload?.();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setAiStatus({ tone: "error", text: msg });
		} finally {
			setAiSaving(false);
		}
	}

	// Test AI Provider Connection
	async function handleTestAi(provider: "groq" | "gemini" | "openrouter") {
		setAiTesting(provider);
		setAiStatus({ tone: "info", text: `Testing ${provider.toUpperCase()} API connection...` });
		try {
			const { data: { session } } = await supabaseBrowser.auth.getSession();
			const token = session?.access_token;
			if (!token) throw new Error("Admin session expired.");

			const apiKey = provider === "groq" ? aiForm.groqKey.trim() : provider === "gemini" ? aiForm.geminiKey.trim() : aiForm.openRouterKey.trim();
			const model = provider === "groq" ? aiForm.groqModel.split(",")[0] : provider === "gemini" ? aiForm.geminiModel : aiForm.openRouterModel.split(",")[0];

			const res = await fetch("/api/admin/system-settings", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					action: "test-ai",
					provider,
					apiKey: apiKey || undefined,
					model: model?.trim() || undefined,
				}),
			});

			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.error || `${provider.toUpperCase()} verification failed.`);

			setAiStatus({ tone: "success", text: result.message || "AI test passed successfully!" });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setAiStatus({ tone: "error", text: msg });
		} finally {
			setAiTesting(null);
		}
	}

	const selectedRow = rows.find((row) => asText(row.key) === asText(selectedId)) ?? null;
	const isCreating = !selectedRow;
	const editorKey = selectedRow ? asText(selectedRow.key) : "__new__";

	const query = search.trim().toLowerCase();
	const filtered = rows.filter((row) => {
		if (!query) return true;
		return [asText(row.key), asText(row.description), asText(row.value)].join(" ").toLowerCase().includes(query);
	});

	return (
		<section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-sm shadow-black/[0.025]">
			{/* Top Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.07] bg-zinc-50/70 px-5 py-5 sm:px-6">
				<div className="flex min-w-0 items-start gap-3.5">
					<div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#DE141C]/[0.08] text-[#DE141C] ring-1 ring-inset ring-[#DE141C]/10">
						<SettingsIcon className="h-5 w-5" />
					</div>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-base font-semibold tracking-tight text-[#111111]">Platform & Integration Settings</h2>
							<span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-black/55">
								Admin Console
							</span>
						</div>
						<p className="mt-1 max-w-2xl text-xs leading-5 text-black/50">
							Dynamically configure Gmail notifications, AI model credentials, and system platform parameters without editing environment files.
						</p>
					</div>
				</div>

				{activeTab === "variables" && canEdit ? (
					<button type="button" onClick={onCreateNew} className={primaryButton}>
						<Plus className="h-4 w-4" />
						Add variable
					</button>
				) : null}
			</div>

			{/* Sub-Navigation Tabs */}
			<div className="flex border-b border-black/[0.07] bg-white px-5 sm:px-6">
				<button
					type="button"
					onClick={() => setActiveTab("email")}
					className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition ${
						activeTab === "email"
							? "border-[#DE141C] text-[#DE141C]"
							: "border-transparent text-black/55 hover:text-[#111111]"
					}`}
				>
					<Mail className="h-4 w-4" />
					<span>Gmail & Email Delivery</span>
					{emailForm.hasAppPassword ? (
						<span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
							Active
						</span>
					) : (
						<span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-inset ring-amber-500/20">
							Config Needed
						</span>
					)}
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("ai")}
					className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition ${
						activeTab === "ai"
							? "border-[#DE141C] text-[#DE141C]"
							: "border-transparent text-black/55 hover:text-[#111111]"
					}`}
				>
					<Bot className="h-4 w-4" />
					<span>AI Intelligence & APIs</span>
					<span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/60">
						{aiForm.primaryProvider}
					</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveTab("variables")}
					className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-xs font-semibold transition ${
						activeTab === "variables"
							? "border-[#DE141C] text-[#DE141C]"
							: "border-transparent text-black/55 hover:text-[#111111]"
					}`}
				>
					<SettingsIcon className="h-4 w-4" />
					<span>System Variables</span>
					<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-black/55">
						{rows.length}
					</span>
				</button>
			</div>

			{/* TAB 1: GMAIL & EMAIL INTEGRATION */}
			{activeTab === "email" ? (
				<div className="p-5 sm:p-7">
					<div className="max-w-3xl space-y-7">
						<div>
							<h3 className="text-base font-semibold text-[#111111]">Gmail SMTP Delivery Configuration</h3>
							<p className="mt-1 text-xs leading-5 text-black/55">
								Configure the Gmail address and 16-character Google App Password used to deliver inquiry notifications, appointment alerts, and password resets to agents and clients.
							</p>
						</div>

						{/* Status banner */}
						{emailStatus ? (
							<div
								className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
									emailStatus.tone === "success"
										? "border-emerald-200 bg-emerald-50 text-emerald-800"
										: emailStatus.tone === "error"
										? "border-red-200 bg-red-50 text-red-800"
										: "border-blue-200 bg-blue-50 text-blue-800"
								}`}
							>
								{emailStatus.tone === "success" ? (
									<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
								) : emailStatus.tone === "error" ? (
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
								) : (
									<RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-600" />
								)}
								<p className="leading-5">{emailStatus.text}</p>
							</div>
						) : null}

						{/* Form inputs */}
						<div className="grid gap-5 sm:grid-cols-2">
							<div className="sm:col-span-2">
								<label className="block">
									<span className={labelClass}>Gmail Address / User</span>
									<input
										type="email"
										value={emailForm.gmailUser}
										onChange={(e) => setEmailForm((prev) => ({ ...prev, gmailUser: e.target.value }))}
										placeholder="e.g. company@gmail.com"
										disabled={!canEdit || loadingSettings}
										className={inputClass}
									/>
									<span className="mt-1 block text-[11px] text-black/45">
										The primary Gmail account sending client confirmations and inquiry alerts.
									</span>
								</label>
							</div>

							<div className="sm:col-span-2">
								<label className="block">
									<div className="flex items-center justify-between">
										<span className={labelClass}>Gmail 16-Character App Password</span>
										{emailForm.hasAppPassword ? (
											<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
												<Check className="h-3 w-3" /> Password is currently saved
											</span>
										) : null}
									</div>
									<div className="relative mt-2">
										<input
											type={showGmailPassword ? "text" : "password"}
											value={emailForm.gmailAppPassword}
											onChange={(e) => setEmailForm((prev) => ({ ...prev, gmailAppPassword: e.target.value }))}
											placeholder={emailForm.hasAppPassword ? "•••••••••••••••• (Leave blank to keep current)" : "16-character App Password (e.g. abcd efgh ijkl mnop)"}
											disabled={!canEdit || loadingSettings}
											className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 pr-11 font-mono text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10 disabled:bg-zinc-50"
										/>
										<button
											type="button"
											onClick={() => setShowGmailPassword((prev) => !prev)}
											aria-label={showGmailPassword ? "Hide password" : "Show password"}
											className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black"
										>
											{showGmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
										</button>
									</div>
								</label>
							</div>

							<div className="sm:col-span-2">
								<label className="block">
									<span className={labelClass}>Sender Display Header (EMAIL_FROM)</span>
									<input
										type="text"
										value={emailForm.emailFrom}
										onChange={(e) => setEmailForm((prev) => ({ ...prev, emailFrom: e.target.value }))}
										placeholder="e.g. J'WELLZ REALTY <company@gmail.com>"
										disabled={!canEdit || loadingSettings}
										className={inputClass}
									/>
									<span className="mt-1 block text-[11px] text-black/45">
										The display name appearing in the recipient&apos;s email client. Must contain your Gmail address.
									</span>
								</label>
							</div>
						</div>

						{/* Step-by-step Gmail App Password guide */}
						<div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-xs text-amber-900">
							<p className="font-semibold text-amber-950 flex items-center gap-1.5">
								<Key className="h-4 w-4 text-amber-700" />
								How to generate a Gmail App Password:
							</p>
							<ol className="mt-2 list-decimal space-y-1.5 pl-4 text-amber-900/90 leading-5">
								<li>Open your Google Account at <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="font-semibold underline">myaccount.google.com/security</a>.</li>
								<li>Ensure <strong>2-Step Verification</strong> is turned ON.</li>
								<li>Search or go to <strong>App passwords</strong> (<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="font-semibold underline">myaccount.google.com/apppasswords</a>).</li>
								<li>Create an app named &ldquo;Jewellz Realty CMS&rdquo; and copy the 16-letter code into the field above.</li>
							</ol>
						</div>

						{/* Testing & Actions */}
						<div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.07] pt-5">
							<div className="flex items-center gap-2">
								<label className="flex items-center gap-2 cursor-pointer text-xs text-black/70">
									<input
										type="checkbox"
										checked={sendTestEmailBox}
										onChange={(e) => setSendTestEmailBox(e.target.checked)}
										className="h-4 w-4 rounded accent-[#DE141C]"
									/>
									Send verification email to my admin inbox
								</label>
							</div>

							<div className="flex items-center gap-2.5">
								<button
									type="button"
									onClick={handleTestGmail}
									disabled={emailTesting || loadingSettings}
									className={secondaryButton}
								>
									{emailTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
									{emailTesting ? "Testing Connection..." : "Test Connection"}
								</button>

								{canEdit ? (
									<button
										type="button"
										onClick={handleSaveEmail}
										disabled={emailSaving || loadingSettings}
										className={primaryButton}
									>
										{emailSaving ? "Saving..." : "Save Gmail Settings"}
									</button>
								) : null}
							</div>
						</div>
					</div>
				</div>
			) : null}

			{/* TAB 2: AI INTELLIGENCE & APIS */}
			{activeTab === "ai" ? (
				<div className="p-5 sm:p-7">
					<div className="max-w-3xl space-y-7">
						<div>
							<h3 className="text-base font-semibold text-[#111111]">AI Intelligence & API Configuration</h3>
							<p className="mt-1 text-xs leading-5 text-black/55">
								Configure the AI inference providers used for property recommendations, natural language search parsing, analytics copilot chat, and property listing copy generation.
							</p>
						</div>

						{/* Status banner */}
						{aiStatus ? (
							<div
								className={`flex items-start gap-3 rounded-xl border p-4 text-xs ${
									aiStatus.tone === "success"
										? "border-emerald-200 bg-emerald-50 text-emerald-800"
										: aiStatus.tone === "error"
										? "border-red-200 bg-red-50 text-red-800"
										: "border-blue-200 bg-blue-50 text-blue-800"
								}`}
							>
								{aiStatus.tone === "success" ? (
									<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
								) : aiStatus.tone === "error" ? (
									<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
								) : (
									<RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-600" />
								)}
								<p className="leading-5">{aiStatus.text}</p>
							</div>
						) : null}

						{/* Primary Provider Selection */}
						<div>
							<span className={labelClass}>Primary AI Provider</span>
							<div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
								{[
									{ id: "groq", name: "Groq", desc: "Ultra-fast inference (Llama, Qwen, GPT-OSS)" },
									{ id: "gemini", name: "Google Gemini", desc: "Google AI (Gemini 1.5 & 2.0 Flash)" },
									{ id: "openrouter", name: "OpenRouter", desc: "Multi-provider aggregator & free models" },
								].map((provider) => {
									const isSelected = aiForm.primaryProvider === provider.id;
									return (
										<button
											key={provider.id}
											type="button"
											onClick={() => setAiForm((prev) => ({ ...prev, primaryProvider: provider.id as "groq" | "gemini" | "openrouter" }))}
											className={`flex flex-col rounded-xl border p-3.5 text-left transition ${
												isSelected
													? "border-[#DE141C] bg-red-50/20 ring-2 ring-[#DE141C]"
													: "border-black/10 bg-white hover:border-black/20"
											}`}
										>
											<div className="flex items-center justify-between">
												<span className="font-semibold text-sm text-[#111111]">{provider.name}</span>
												<span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#DE141C]" : "bg-black/20"}`} />
											</div>
											<p className="mt-1 text-xs text-black/50 leading-4">{provider.desc}</p>
										</button>
									);
								})}
							</div>
						</div>

						{/* Provider 1: Groq */}
						<div className="rounded-xl border border-black/[0.08] bg-zinc-50/50 p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="font-semibold text-sm text-[#111111]">1. Groq Cloud API</span>
									{aiForm.hasGroqKey ? (
										<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Key Saved</span>
									) : (
										<span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-black/50">Unset</span>
									)}
								</div>
								<button
									type="button"
									onClick={() => handleTestAi("groq")}
									disabled={aiTesting === "groq"}
									className="text-xs font-semibold text-[#DE141C] hover:underline"
								>
									{aiTesting === "groq" ? "Testing..." : "Test Groq Key"}
								</button>
							</div>

							<div className="mt-4 space-y-3">
								<label className="block">
									<span className="text-[11px] font-medium text-black/60">Groq API Key (gsk_...)</span>
									<div className="relative mt-1">
										<input
											type={showGroqKey ? "text" : "password"}
											value={aiForm.groqKey}
											onChange={(e) => setAiForm((prev) => ({ ...prev, groqKey: e.target.value }))}
											placeholder={aiForm.hasGroqKey ? "•••••••••••••••••••••••• (Leave blank to keep current)" : "gsk_..."}
											disabled={!canEdit || loadingSettings}
											className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 pr-11 font-mono text-xs text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10"
										/>
										<button
											type="button"
											onClick={() => setShowGroqKey((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black"
										>
											{showGroqKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</button>
									</div>
								</label>

								<label className="block">
									<span className="text-[11px] font-medium text-black/60">Groq Model(s)</span>
									<input
										type="text"
										value={aiForm.groqModel}
										onChange={(e) => setAiForm((prev) => ({ ...prev, groqModel: e.target.value }))}
										placeholder="e.g. openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
										disabled={!canEdit || loadingSettings}
										className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 font-mono text-xs text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10"
									/>
								</label>
							</div>
						</div>

						{/* Provider 2: Google Gemini */}
						<div className="rounded-xl border border-black/[0.08] bg-zinc-50/50 p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="font-semibold text-sm text-[#111111]">2. Google Gemini API</span>
									{aiForm.hasGeminiKey ? (
										<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Key Saved</span>
									) : (
										<span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-black/50">Unset</span>
									)}
								</div>
								<button
									type="button"
									onClick={() => handleTestAi("gemini")}
									disabled={aiTesting === "gemini"}
									className="text-xs font-semibold text-[#DE141C] hover:underline"
								>
									{aiTesting === "gemini" ? "Testing..." : "Test Gemini Key"}
								</button>
							</div>

							<div className="mt-4 space-y-3">
								<label className="block">
									<span className="text-[11px] font-medium text-black/60">Gemini API Key (AIza...)</span>
									<div className="relative mt-1">
										<input
											type={showGeminiKey ? "text" : "password"}
											value={aiForm.geminiKey}
											onChange={(e) => setAiForm((prev) => ({ ...prev, geminiKey: e.target.value }))}
											placeholder={aiForm.hasGeminiKey ? "•••••••••••••••••••••••• (Leave blank to keep current)" : "AIzaSy..."}
											disabled={!canEdit || loadingSettings}
											className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 pr-11 font-mono text-xs text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10"
										/>
										<button
											type="button"
											onClick={() => setShowGeminiKey((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black"
										>
											{showGeminiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</button>
									</div>
								</label>

								<label className="block">
									<span className="text-[11px] font-medium text-black/60">Gemini Model</span>
									<input
										type="text"
										value={aiForm.geminiModel}
										onChange={(e) => setAiForm((prev) => ({ ...prev, geminiModel: e.target.value }))}
										placeholder="e.g. gemini-1.5-flash, gemini-2.0-flash"
										disabled={!canEdit || loadingSettings}
										className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 font-mono text-xs text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10"
									/>
								</label>
							</div>
						</div>

						{/* Provider 3: OpenRouter */}
						<div className="rounded-xl border border-black/[0.08] bg-zinc-50/50 p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="font-semibold text-sm text-[#111111]">3. OpenRouter API (Fallback)</span>
									{aiForm.hasOpenRouterKey ? (
										<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Key Saved</span>
									) : (
										<span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-black/50">Unset</span>
									)}
								</div>
								<button
									type="button"
									onClick={() => handleTestAi("openrouter")}
									disabled={aiTesting === "openrouter"}
									className="text-xs font-semibold text-[#DE141C] hover:underline"
								>
									{aiTesting === "openrouter" ? "Testing..." : "Test OpenRouter Key"}
								</button>
							</div>

							<div className="mt-4 space-y-3">
								<label className="block">
									<span className="text-[11px] font-medium text-black/60">OpenRouter API Key (sk-or-v1-...)</span>
									<div className="relative mt-1">
										<input
											type={showOpenRouterKey ? "text" : "password"}
											value={aiForm.openRouterKey}
											onChange={(e) => setAiForm((prev) => ({ ...prev, openRouterKey: e.target.value }))}
											placeholder={aiForm.hasOpenRouterKey ? "•••••••••••••••••••••••• (Leave blank to keep current)" : "sk-or-..."}
											disabled={!canEdit || loadingSettings}
											className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 pr-11 font-mono text-xs text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10"
										/>
										<button
											type="button"
											onClick={() => setShowOpenRouterKey((prev) => !prev)}
											className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black"
										>
											{showOpenRouterKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</button>
									</div>
								</label>

								<label className="block">
									<span className="text-[11px] font-medium text-black/60">OpenRouter Model</span>
									<input
										type="text"
										value={aiForm.openRouterModel}
										onChange={(e) => setAiForm((prev) => ({ ...prev, openRouterModel: e.target.value }))}
										placeholder="e.g. openrouter/free"
										disabled={!canEdit || loadingSettings}
										className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 font-mono text-xs text-[#111111] outline-none focus:border-[#DE141C]/50 focus:ring-4 focus:ring-[#DE141C]/10"
									/>
								</label>
							</div>
						</div>

						{/* Actions */}
						<div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/[0.07] pt-5">
							{canEdit ? (
								<button
									type="button"
									onClick={handleSaveAi}
									disabled={aiSaving || loadingSettings}
									className={primaryButton}
								>
									{aiSaving ? "Saving..." : "Save AI Configuration"}
								</button>
							) : null}
						</div>
					</div>
				</div>
			) : null}

			{/* TAB 3: GENERAL SYSTEM VARIABLES */}
			{activeTab === "variables" ? (
				<div className="grid gap-4 p-4 sm:gap-5 sm:p-5 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.5fr)] xl:items-start">
					<aside className="overflow-hidden rounded-2xl border border-black/[0.08] bg-zinc-50/65">
						<div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4">
							<div>
								<div className="text-sm font-semibold text-[#111111]">Setting directory</div>
								<div className="mt-0.5 text-xs text-black/45">Choose a variable to edit</div>
							</div>
							<span className="rounded-lg border border-black/[0.07] bg-white px-2 py-1 text-xs font-semibold tabular-nums text-black/55">{filtered.length}</span>
						</div>
						<label className="relative mx-3 mb-3 block">
							<span className="sr-only">Search settings</span>
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
							<input
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search settings..."
								className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-sm text-[#111111] outline-none transition placeholder:text-black/35 focus:border-[#DE141C]/40 focus:ring-4 focus:ring-[#DE141C]/[0.08]"
							/>
						</label>
						<div className="max-h-[680px] min-h-40 space-y-1.5 overflow-auto px-2 pb-2 xl:max-h-[calc(100vh-340px)]">
							{rows.length === 0 ? <p className="rounded-xl px-3 py-5 text-sm text-black/45">No settings yet. Add one to get started.</p> : null}
							{rows.length > 0 && filtered.length === 0 ? <p className="rounded-xl px-3 py-5 text-sm text-black/45">No settings match your search.</p> : null}
							{filtered.map((row) => {
								const key = asText(row.key);
								const value = asText(row.value);
								const active = key === asText(selectedId);
								const kind = valueKind(key, value);
								return (
									<button
										key={key}
										type="button"
										onClick={() => onSelect(row)}
										className={`group w-full rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]/30 ${active ? "border-[#DE141C]/20 bg-white shadow-sm shadow-black/[0.04] ring-1 ring-inset ring-[#DE141C]/10" : "border-transparent bg-transparent hover:border-black/[0.06] hover:bg-white/80"}`}
									>
										<div className="flex items-center gap-2">
											<span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? "bg-[#DE141C]" : "bg-black/15 group-hover:bg-black/30"}`} />
											<span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#111111]">{settingName(key)}</span>
											<ValueChip kind={kind} value={value} />
										</div>
										<div className="mt-1.5 truncate pl-3.5 text-xs text-black/45">{kindLabel[kind]} setting</div>
									</button>
								);
							})}
						</div>
					</aside>

					<div className="min-w-0 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm shadow-black/[0.025] sm:p-6">
						{selectedRow || isCreating ? (
							<SettingEditor
								key={editorKey}
								row={selectedRow}
								isCreating={isCreating}
								canEdit={canEdit}
								onDelete={onDelete}
								onSubmit={onSubmit}
							/>
						) : (
							<div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-zinc-50/70 p-8 text-center">
								<div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black/35 shadow-sm ring-1 ring-black/[0.06]">
									<SettingsIcon className="h-5 w-5" />
								</div>
								<p className="text-sm font-medium text-[#111111]">Select a setting to edit</p>
								<p className="max-w-sm text-xs leading-5 text-black/50">Choose a key from the list, or create a new one.</p>
							</div>
						)}
					</div>
				</div>
			) : null}
		</section>
	);
}

type EditorProps = {
	row: CmsRow | null;
	isCreating: boolean;
	canEdit: boolean;
	onDelete: (row: CmsRow) => void;
	onSubmit: (payload: CmsPayload, currentRow: CmsRow | null) => Promise<void>;
};

function SettingEditor({ row, isCreating, canEdit, onDelete, onSubmit }: EditorProps) {
	const [key, setKey] = useState(asText(row?.key));
	const [value, setValue] = useState(asText(row?.value));
	const [description, setDescription] = useState(asText(row?.description));
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	const kind = valueKind(key, value);
	const canSave = canEdit && Boolean(key.trim()) && !saving;

	async function handleSubmit() {
		if (!key.trim()) {
			setStatus("Key is required.");
			return;
		}

		setSaving(true);
		setStatus("Saving setting...");

		const payload: CmsPayload = {
			key: key.trim(),
			value: value.trim(),
			description: description.trim() || null,
		};

		await onSubmit(payload, row);
		setSaving(false);

		if (isCreating) {
			setKey("");
			setValue("");
			setDescription("");
			setStatus("Setting created.");
		} else {
			setStatus("Changes saved.");
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.07] pb-5">
				<div className="min-w-0">
					<div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DE141C]">{isCreating ? "Add a setting" : "Edit setting"}</div>
					<div className="mt-1.5 truncate text-xl font-semibold tracking-[-0.03em] text-[#111111]">{settingName(key)}</div>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/45">
						<span className="rounded-full border border-black/[0.08] bg-zinc-50 px-2.5 py-1 font-medium text-black/60">{kindLabel[kind]}</span>
						<span>{isCreating ? "Give this setting a name and choose its value." : "Change the value below and save."}</span>
					</div>
				</div>
				{!isCreating && row && canEdit ? (
					<button
						type="button"
						onClick={() => onDelete(row)}
						className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200/80 bg-white px-3.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/10"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Delete
					</button>
				) : null}
			</div>

			<div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
				<div className="md:col-span-2">
					<div className={labelClass}>{settingName(key)} value</div>
					{kind === "boolean" ? (
						<label className={`mt-2 flex items-center justify-between gap-3 rounded-xl border border-black/[0.08] bg-zinc-50/60 px-4 py-4 transition ${canEdit ? "cursor-pointer hover:border-black/15 hover:bg-zinc-50" : ""}`}>
							<span>
								<span className="block text-sm font-medium text-[#111111]">{value.trim().toLowerCase() === "true" ? "Enabled" : "Disabled"}</span>
								<span className="mt-0.5 block text-xs text-black/50">Switch this setting on or off.</span>
							</span>
							<input
								type="checkbox"
								checked={value.trim().toLowerCase() === "true"}
								onChange={(event) => {
									setValue(event.target.checked ? "true" : "false");
									setStatus("");
								}}
								disabled={!canEdit}
								className="h-5 w-5 shrink-0 accent-[#DE141C]"
							/>
						</label>
					) : (
						<input
							type={kind === "number" ? "number" : "text"}
							value={value}
							onChange={(event) => {
								setValue(event.target.value);
								setStatus("");
							}}
							placeholder={kind === "number" ? "0" : "Value"}
							disabled={!canEdit}
							className={inputClass}
						/>
					)}
				</div>

				<details className="md:col-span-2 rounded-xl border border-black/[0.08] bg-zinc-50/60 px-4 py-3" open={isCreating ? true : undefined}>
					<summary className="cursor-pointer text-sm font-medium text-black/65">Advanced details</summary>
					<div className="mt-4 grid gap-4">
						<label className="block">
							<div className={labelClass}>Setting identifier</div>
							<input type="text" value={key} onChange={(event) => { setKey(event.target.value); setStatus(""); }} placeholder="e.g. hot_picks_count" disabled={!canEdit || !isCreating} className={`${inputClass} font-mono`} />
							<p className="mt-1 text-[11px] text-black/45">Used internally by the system. Leave unchanged when editing.</p>
						</label>
						<label className="block">
							<div className={labelClass}>Internal note <span className="font-normal text-black/40">(optional)</span></div>
							<textarea rows={2} value={description} onChange={(event) => { setDescription(event.target.value); setStatus(""); }} placeholder="Add a note for other administrators" disabled={!canEdit} className={`${inputClass} resize-y leading-6`} />
						</label>
					</div>
				</details>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] pt-5">
				<p className={`text-xs ${status.includes("saved") || status.includes("created") ? "text-emerald-700" : status.includes("required") ? "text-red-600" : "text-black/45"}`} aria-live="polite">{status || (isCreating ? "Complete the setting details above to create it." : "Changes take effect after you save.")}</p>
				<button type="button" onClick={handleSubmit} disabled={!canSave} className={primaryButton}>
					{saving ? "Saving..." : isCreating ? "Create setting" : "Save changes"}
				</button>
			</div>
		</div>
	);
}

export default SettingsWorkspace;
