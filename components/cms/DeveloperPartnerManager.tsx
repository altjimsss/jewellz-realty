"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Upload, Globe, Mail, Shield, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CmsRow } from "./types";
import { asText } from "./utils";

type DeveloperPartnerManagerProps = {
	developer: CmsRow | null;
	onUpdated: () => Promise<void>;
};

export function DeveloperPartnerManager({ developer, onUpdated }: DeveloperPartnerManagerProps) {
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const [logoMessage, setLogoMessage] = useState("");
	const [customLogoUrl, setCustomLogoUrl] = useState("");
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviting, setInviting] = useState(false);
	const [inviteMessage, setInviteMessage] = useState("");
	const [resettingPassword, setResettingPassword] = useState(false);

	if (!developer) {
		return null;
	}

	const devId = asText(developer.id);
	const companyName = asText(developer.company_name || "Unnamed Developer");
	const profileId = asText(developer.profile_id);
	const contactEmail = asText(developer.contact_email);
	const currentLogoUrl = asText(developer.logo_url);
	const websiteUrl = asText(developer.website_url);
	const hasAccount = Boolean(profileId && profileId.trim().length > 0);

	async function handleUploadLogo(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		setUploadingLogo(true);
		setLogoMessage("Uploading developer logo...");

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", "developer-logos");

			const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token;
			const response = await fetch("/api/upload", {
				method: "POST",
				headers: token ? { Authorization: `Bearer ${token}` } : {},
				body: formData,
			});

			const data = await response.json();
			if (!response.ok || !data?.url) {
				setLogoMessage(data?.error || "Failed to upload logo.");
				setUploadingLogo(false);
				return;
			}

			// Update database with new logo URL
			const { error: dbError } = await supabaseBrowser
				.from("developer_partners")
				.update({ logo_url: data.url })
				.eq("id", devId);

			if (dbError) {
				setLogoMessage(`Uploaded, but failed to save to database: ${dbError.message}`);
			} else {
				setLogoMessage("Logo updated successfully! This logo will appear in the website marquee.");
				await onUpdated();
			}
		} catch {
			setLogoMessage("Network error while uploading logo.");
		} finally {
			setUploadingLogo(false);
		}
	}

	async function handleSaveCustomLogoUrl() {
		if (!customLogoUrl.trim()) return;
		setUploadingLogo(true);
		setLogoMessage("Saving logo URL...");

		try {
			const { error } = await supabaseBrowser
				.from("developer_partners")
				.update({ logo_url: customLogoUrl.trim() })
				.eq("id", devId);

			if (error) {
				setLogoMessage(`Error: ${error.message}`);
			} else {
				setLogoMessage("Logo URL saved! The marquee will display this logo.");
				setCustomLogoUrl("");
				await onUpdated();
			}
		} catch {
			setLogoMessage("Failed to save logo URL.");
		} finally {
			setUploadingLogo(false);
		}
	}

	async function handleRemoveLogo() {
		if (!confirm(`Remove logo for ${companyName}?`)) return;
		setUploadingLogo(true);
		setLogoMessage("Removing logo...");

		try {
			const { error } = await supabaseBrowser
				.from("developer_partners")
				.update({ logo_url: null })
				.eq("id", devId);

			if (error) {
				setLogoMessage(`Error: ${error.message}`);
			} else {
				setLogoMessage("Logo removed. Company name text will be used in the marquee.");
				await onUpdated();
			}
		} catch {
			setLogoMessage("Failed to remove logo.");
		} finally {
			setUploadingLogo(false);
		}
	}

	async function handleCreateAccount() {
		const targetEmail = (inviteEmail || contactEmail).trim().toLowerCase();
		if (!targetEmail) {
			setInviteMessage("Please enter an email address for the developer account.");
			return;
		}

		setInviting(true);
		setInviteMessage(`Creating developer account and sending invite to ${targetEmail}...`);

		try {
			const { data: sessionData } = await supabaseBrowser.auth.getSession();
			const token = sessionData.session?.access_token;

			const response = await fetch("/api/admin/developers", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					developerId: devId,
					email: targetEmail,
					companyName,
				}),
			});

			const data = await response.json();
			if (!response.ok || !data?.ok) {
				setInviteMessage(data?.error || "Failed to create account.");
				setInviting(false);
				return;
			}

			setInviteMessage(`Success! Developer partner account created and invitation sent to ${targetEmail}. Their logo is now live on the homepage marquee.`);
			setInviteEmail("");
			await onUpdated();
		} catch {
			setInviteMessage("Network error while creating account.");
		} finally {
			setInviting(false);
		}
	}

	async function handleSendPasswordReset() {
		const targetEmail = contactEmail.trim().toLowerCase();
		if (!targetEmail) {
			setInviteMessage("No contact email found for password reset.");
			return;
		}

		setResettingPassword(true);
		setInviteMessage(`Sending password reset link to ${targetEmail}...`);

		try {
			const { error } = await supabaseBrowser.auth.resetPasswordForEmail(targetEmail, {
				redirectTo: `${window.location.origin}/reset-password?next=/developer`,
			});

			if (error) {
				setInviteMessage(`Error: ${error.message}`);
			} else {
				setInviteMessage(`Password reset email sent to ${targetEmail}.`);
			}
		} catch {
			setInviteMessage("Failed to send password reset.");
		} finally {
			setResettingPassword(false);
		}
	}

	return (
		<div className="space-y-5 rounded-xl border border-black/10 bg-zinc-50/70 p-5">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
				<div>
					<div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/50">
						Partner Branding & Access Management
					</div>
					<h3 className="text-base font-bold text-[#111111]">
						{companyName}
					</h3>
				</div>

				<div className="flex items-center gap-2">
					{hasAccount ? (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
							<CheckCircle2 className="h-3.5 w-3.5" />
							Account Active • Marquee Enabled
						</span>
					) : (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
							<AlertCircle className="h-3.5 w-3.5" />
							No Account Linked • Not In Marquee
						</span>
					)}
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* 1. Logo Management */}
				<div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="text-sm font-semibold text-[#111111]">Company Logo</h4>
							<p className="text-xs text-black/50">
								Shown in the homepage marquee loop when this partner has an account.
							</p>
						</div>
						{currentLogoUrl ? (
							<button
								type="button"
								onClick={handleRemoveLogo}
								disabled={uploadingLogo}
								className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 inline-flex items-center gap-1"
							>
								<Trash2 className="h-3 w-3" />
								Remove
							</button>
						) : null}
					</div>

					{/* Logo Preview Box */}
					<div className="mt-3 flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-black/15 bg-zinc-50 p-4">
						{currentLogoUrl ? (
							<div className="flex flex-col items-center gap-2">
								<Image
									src={currentLogoUrl}
									alt={companyName}
									width={200}
									height={50}
									unoptimized
									className="max-h-12 w-auto object-contain"
								/>
								<span className="text-[11px] text-black/45 truncate max-w-[280px]">
									{currentLogoUrl}
								</span>
							</div>
						) : (
							<div className="flex flex-col items-center gap-1 text-center">
								<div className="rounded border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#181A20]">
									{companyName}
								</div>
								<span className="text-[11px] text-black/40">
									(Using text badge fallback until logo is uploaded)
								</span>
							</div>
						)}
					</div>

					{/* Upload / URL Input */}
					<div className="mt-4 space-y-3">
						<label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/15 bg-white py-2 px-3 text-xs font-semibold text-[#111111] transition hover:bg-black/5">
							<Upload className="h-3.5 w-3.5 text-black/60" />
							<span>{uploadingLogo ? "Uploading..." : "Upload Logo Image (PNG / SVG / JPG)"}</span>
							<input
								type="file"
								accept="image/png,image/jpeg,image/svg+xml,image/webp"
								onChange={handleUploadLogo}
								disabled={uploadingLogo}
								className="hidden"
							/>
						</label>

						<div className="flex items-center gap-2">
							<input
								type="url"
								value={customLogoUrl}
								onChange={(e) => setCustomLogoUrl(e.target.value)}
								placeholder="Or paste image URL (https://...)"
								className="h-8 w-full rounded-md border border-black/10 bg-zinc-50 px-2.5 text-xs text-[#111111] outline-none transition focus:border-black/30 focus:bg-white"
							/>
							<button
								type="button"
								onClick={handleSaveCustomLogoUrl}
								disabled={uploadingLogo || !customLogoUrl.trim()}
								className="h-8 shrink-0 rounded-md bg-[#111111] px-3 text-xs font-medium text-white transition hover:bg-black/80 disabled:opacity-40"
							>
								Save
							</button>
						</div>

						{logoMessage ? (
							<p className="text-[11px] text-black/60">{logoMessage}</p>
						) : null}
					</div>
				</div>

				{/* 2. Account & Marquee Access */}
				<div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
					<div>
						<h4 className="text-sm font-semibold text-[#111111]">Developer Partner Account</h4>
						<p className="text-xs text-black/50">
							Required for partner self-service and to display their logo on the website.
						</p>
					</div>

					{hasAccount ? (
						<div className="mt-4 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
							<div className="flex items-center justify-between">
								<span className="font-medium text-emerald-900">Auth Status:</span>
								<span className="font-semibold text-emerald-800">Linked Profile</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-emerald-900/70">Login Email:</span>
								<span className="font-mono text-emerald-950 font-medium">
									{contactEmail || "—"}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-emerald-900/70">Profile ID:</span>
								<span className="font-mono text-[10px] text-emerald-950 truncate max-w-[160px]">
									{profileId}
								</span>
							</div>
							<div className="border-t border-emerald-200/60 pt-3 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={handleSendPasswordReset}
									disabled={resettingPassword}
									className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-xs hover:bg-emerald-50 disabled:opacity-50"
								>
									<RefreshCw className="h-3 w-3" />
									{resettingPassword ? "Sending..." : "Send Password Reset Link"}
								</button>
							</div>
						</div>
					) : (
						<div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3.5 text-xs">
							<p className="text-amber-900 leading-relaxed font-medium">
								⚠️ This developer partner does not have an account yet.
							</p>
							<p className="text-amber-800/80 leading-relaxed">
								To show their logo in the public website marquee, create and link a Supabase login account below.
							</p>

							<div className="space-y-2 pt-1">
								<label className="block">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/70">
										Account Login Email
									</span>
									<input
										type="email"
										value={inviteEmail || contactEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="developer@partner.com"
										className="mt-1 h-8 w-full rounded-md border border-amber-300 bg-white px-2.5 text-xs text-[#111111] outline-none transition focus:border-amber-500"
									/>
								</label>

								<button
									type="button"
									onClick={handleCreateAccount}
									disabled={inviting || !(inviteEmail || contactEmail).trim()}
									className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] py-2 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-black/80 disabled:opacity-50"
								>
									<Shield className="h-3.5 w-3.5" />
									{inviting ? "Creating Account..." : "Create Developer Account & Invite"}
								</button>
							</div>
						</div>
					)}

					{inviteMessage ? (
						<p className="mt-3 text-[11px] text-black/65">{inviteMessage}</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

export default DeveloperPartnerManager;
