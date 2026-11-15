"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ReCaptcha } from "@/components/security/ReCaptcha";
import { supabaseBrowser } from "@/lib/supabase/client";

export type PortalRole = "agent" | "developer" | "admin";

export const PORTAL_ROLE_MAP: Record<
	PortalRole,
	{ title: string; subtitle: string; destination: string; placeholder: string; allowedRoles: string[]; portalName: string }
> = {
	agent: {
		title: "Agent Portal",
		subtitle: "Sign in to access your assigned buyer leads, property listings, and sales pipeline.",
		destination: "/agent",
		placeholder: "agent@jewellzrealty.com",
		allowedRoles: ["agent"],
		portalName: "Agent Portal",
	},
	developer: {
		title: "Developer Partner Hub",
		subtitle: "Sign in to manage your master developments, unit inventory, and track buyer analytics.",
		destination: "/developer",
		placeholder: "partner@developer.com",
		allowedRoles: ["developer_partner", "developer"],
		portalName: "Developer Partner Hub",
	},
	admin: {
		title: "Admin CMS",
		subtitle: "Brokerage management, site settings, agent registrations, and full analytics.",
		destination: "/admin",
		placeholder: "admin@jewellzrealty.com",
		allowedRoles: ["admin"],
		portalName: "Admin CMS",
	},
};

type PortalAuthModalProps = {
	isOpen: boolean;
	onClose: () => void;
	initialRole?: PortalRole;
};

export function PortalAuthModal({
	isOpen,
	onClose,
	initialRole = "agent",
}: PortalAuthModalProps) {
	if (!isOpen) return null;

	return (
		<PortalAuthModalContent
			key={`${initialRole}-${isOpen}`}
			onClose={onClose}
			initialRole={initialRole}
		/>
	);
}

function PortalAuthModalContent({
	onClose,
	initialRole,
}: {
	onClose: () => void;
	initialRole: PortalRole;
}) {
	const router = useRouter();
	const backdropPointerDown = useRef(false);
	const [activeRole, setActiveRole] = useState<PortalRole>(initialRole);
	// Keep credentials scoped to the selected role tab so switching Agent →
	// Developer → Admin never carries another portal's values across.
	const [credentials, setCredentials] = useState<Record<PortalRole, { email: string; password: string }>>({
		agent: { email: "", password: "" },
		developer: { email: "", password: "" },
		admin: { email: "", password: "" },
	});
	const email = credentials[activeRole].email;
	const password = credentials[activeRole].password;
	const setEmail = (value: string) => setCredentials((current) => ({ ...current, [activeRole]: { ...current[activeRole], email: value } }));
	const setPassword = (value: string) => setCredentials((current) => ({ ...current, [activeRole]: { ...current[activeRole], password: value } }));
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
	const [isForgotPassword, setIsForgotPassword] = useState(false);
	const [captchaToken, setCaptchaToken] = useState("");
	const [captchaResetKey, setCaptchaResetKey] = useState(0);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const currentConfig = PORTAL_ROLE_MAP[activeRole];

	function resetCaptcha() {
		setCaptchaToken("");
		setCaptchaResetKey((current) => current + 1);
	}

	async function verifyCaptcha() {
		if (!captchaToken) {
			setMessage({ text: "Please complete the captcha before continuing.", type: "error" });
			return false;
		}

		const response = await fetch("/api/recaptcha", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: captchaToken }),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => null);
			setMessage({ text: data?.error || "Captcha verification failed. Please try again.", type: "error" });
			resetCaptcha();
			return false;
		}

		return true;
	}

	async function handlePasswordSignIn(e: FormEvent) {
		e.preventDefault();
		if (!email.trim() || !password) return;

		setLoading(true);
		setMessage({ text: "Verifying captcha...", type: "info" });

		try {
			if (!(await verifyCaptcha())) {
				setLoading(false);
				return;
			}

			setMessage({ text: "Authenticating credentials...", type: "info" });
			const { data, error } = await supabaseBrowser.auth.signInWithPassword({
				email: email.trim().toLowerCase(),
				password,
			});

			if (error) {
				setMessage({ text: error.message, type: "error" });
				resetCaptcha();
				setLoading(false);
				return;
			}

			const userId = data.user?.id;
			if (!userId) {
				setMessage({ text: "Sign in succeeded, but no user was returned.", type: "error" });
				resetCaptcha();
				setLoading(false);
				return;
			}

			// Validate profile status and role
			const { data: profile, error: profileError } = await supabaseBrowser
				.from("profiles")
				.select("role, is_active")
				.eq("id", userId)
				.maybeSingle();

			if (profileError) {
				setMessage({ text: `Profile check failed: ${profileError.message}`, type: "error" });
				resetCaptcha();
				setLoading(false);
				return;
			}

			if (profile && profile.is_active === false) {
				await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
				setMessage({ text: "Your account is inactive. Please contact the brokerage administrator.", type: "error" });
				resetCaptcha();
				setLoading(false);
				return;
			}

			// Strict portal role validation:
			// Agent form -> agent only
			// Admin form -> admin only
			// Developer form -> developer only
			const currentTarget = PORTAL_ROLE_MAP[activeRole];
			const userRole = (profile?.role || "").trim().toLowerCase();

			if (!currentTarget.allowedRoles.includes(userRole)) {
				await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
				setMessage({
					text: `Access denied: This login form is exclusively for the ${currentTarget.portalName}. Your account does not have permission to access this portal.`,
					type: "error",
				});
				resetCaptcha();
				setLoading(false);
				return;
			}

			const targetDestination = currentTarget.destination;

			setMessage({ text: "Authenticated! Opening your workspace...", type: "success" });
			setTimeout(() => {
				onClose();
				router.replace(targetDestination);
				router.refresh();
			}, 700);
		} catch {
			setMessage({ text: "Connection error. Please try again.", type: "error" });
			resetCaptcha();
			setLoading(false);
		}
	}

	async function handleSendMagicLink() {
		if (!email.trim()) {
			setMessage({ text: "Please enter your email address first.", type: "error" });
			return;
		}

		setLoading(true);
		setMessage({ text: "Verifying captcha...", type: "info" });

		if (!(await verifyCaptcha())) {
			setLoading(false);
			return;
		}

		setMessage({ text: "Sending a secure sign-in link...", type: "info" });

		const { error } = await supabaseBrowser.auth.signInWithOtp({
			email: email.trim().toLowerCase(),
			options: {
				emailRedirectTo: `${window.location.origin}${currentConfig.destination}`,
			},
		});

		if (error) {
			setMessage({ text: error.message, type: "error" });
			resetCaptcha();
			setLoading(false);
			return;
		}

		setMessage({ text: `Magic sign-in link sent to ${email}. Check your inbox!`, type: "success" });
		resetCaptcha();
		setLoading(false);
	}

	async function handleForgotPassword(e: FormEvent) {
		e.preventDefault();
		if (!email.trim()) {
			setMessage({ text: "Please enter your registered email address.", type: "error" });
			return;
		}

		setLoading(true);
		setMessage({ text: "Verifying captcha...", type: "info" });

		if (!(await verifyCaptcha())) {
			setLoading(false);
			return;
		}

		setMessage({ text: "Sending password reset link...", type: "info" });

		const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
			redirectTo: `${window.location.origin}/reset-password`,
		});

		if (error) {
			setMessage({ text: error.message, type: "error" });
			resetCaptcha();
			setLoading(false);
			return;
		}

		setMessage({
			text: `Password reset instructions sent to ${email}.`,
			type: "success",
		});
		resetCaptcha();
		setLoading(false);
	}

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-3 transition-opacity duration-200 sm:p-6"
			onMouseDown={(e) => {
				backdropPointerDown.current = e.target === e.currentTarget;
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget && backdropPointerDown.current) onClose();
				backdropPointerDown.current = false;
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="portal-modal-title"
		>
			<div className="relative flex h-[540px] max-h-[calc(100dvh-24px)] w-full max-w-[420px] flex-col overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-5">
				{/* Top Close Button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-black/55 transition hover:bg-zinc-200 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] focus-visible:ring-offset-2 sm:right-5 sm:top-5"
					aria-label="Close portal sign in modal"
				>
					<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>

				{/* Title and compact icon-only portal switcher */}
				<div className="mt-7 flex min-h-10 items-center justify-between gap-2 pr-11">
					<div className="min-w-0">
						<h2 id="portal-modal-title" className="truncate text-xl font-semibold tracking-tight text-[#111111]">
							{isForgotPassword ? "Reset password" : `${activeRole === "developer" ? "Developer" : activeRole === "admin" ? "Admin" : "Agent"} sign in`}
						</h2>
						{isForgotPassword ? <p className="mt-0.5 text-xs text-black/50">We’ll email a reset link.</p> : null}
					</div>
					<div role="group" aria-label="Choose sign-in portal" className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 p-1">
						<button type="button" aria-label="Agent portal" title="Agent" aria-pressed={activeRole === "agent"} onClick={() => { setActiveRole("agent"); setMessage(null); }} className={`grid h-8 w-8 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] ${activeRole === "agent" ? "bg-zinc-100 text-[#DE141C]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}>
							<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
						</button>
						<button type="button" aria-label="Developer portal" title="Developer" aria-pressed={activeRole === "developer"} onClick={() => { setActiveRole("developer"); setMessage(null); }} className={`grid h-8 w-8 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] ${activeRole === "developer" ? "bg-zinc-100 text-[#DE141C]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}>
							<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M6 20V5l6-2 6 2v15M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 20v-4h4v4" /></svg>
						</button>
						<button type="button" aria-label="Admin portal" title="Admin" aria-pressed={activeRole === "admin"} onClick={() => { setActiveRole("admin"); setMessage(null); }} className={`grid h-8 w-8 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] ${activeRole === "admin" ? "bg-zinc-100 text-[#DE141C]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}>
							<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
						</button>
					</div>
				</div>

				{/* Message Banner */}
				<div aria-live="polite" className="mt-2 h-9 shrink-0 overflow-hidden">
				{message ? (
					<div
						className={`flex h-9 items-center rounded-lg border px-3 text-xs font-medium leading-4 ${
							message.type === "error"
								? "border-red-200 bg-red-50 text-red-800"
								: message.type === "success"
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-blue-200 bg-blue-50 text-blue-800"
						}`}
					>
						<span className="line-clamp-2">{message.text}</span>
					</div>
				) : null}
				</div>

				{/* Forms */}
				{isForgotPassword ? (
					<form onSubmit={handleForgotPassword} className="mt-3 space-y-3">
						<label className="block">
							<span className="mb-1.5 block text-xs font-semibold text-black/65">
								Email
							</span>
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="name@company.com"
								className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 text-sm text-[#111111] outline-none transition placeholder:text-zinc-400 focus:border-[#DE141C] focus:bg-white focus:ring-2 focus:ring-[#DE141C]/10"
							/>
						</label>

						<ReCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />

						<div className="flex flex-col gap-2 pt-1">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#DE141C] text-sm font-semibold text-white transition hover:bg-[#b80f15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] focus-visible:ring-offset-2 disabled:opacity-50"
							>
								{loading ? "Sending link…" : "Send reset link"}
							</button>
							<button
								type="button"
								onClick={() => {
									setIsForgotPassword(false);
									setMessage(null);
								}}
								className="py-1 text-center text-sm font-medium text-black/55 transition hover:text-black"
							>
								Back to Sign In
							</button>
						</div>
					</form>
				) : (
					<form onSubmit={handlePasswordSignIn} autoComplete="off" className="mt-3 space-y-3">
						<label className="block">
							<span className="mb-1.5 block text-xs font-semibold text-black/65">
								Email
							</span>
							<input
								type="email"
								required
								name={`${activeRole}-email`}
								autoComplete="off"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="name@company.com"
								className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/70 px-3.5 text-sm text-[#111111] outline-none transition placeholder:text-zinc-400 focus:border-[#DE141C] focus:bg-white focus:ring-2 focus:ring-[#DE141C]/10"
							/>
						</label>

						<label className="block">
							<div className="mb-1 flex items-center justify-between">
								<span className="text-xs font-semibold text-black/65">
									Password
								</span>
								<button
									type="button"
									onClick={() => {
										setIsForgotPassword(true);
										setMessage(null);
									}}
									className="text-xs font-semibold text-[#C4121A] transition hover:text-[#9E0E15] hover:underline"
								>
									Forgot password?
								</button>
							</div>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									required
									name={`${activeRole}-password`}
									autoComplete="off"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50/70 pl-3.5 pr-11 text-sm text-[#111111] outline-none transition placeholder:text-zinc-400 focus:border-[#DE141C] focus:bg-white focus:ring-2 focus:ring-[#DE141C]/10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-black/40 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? (
										<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
										</svg>
									) : (
										<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
											<circle cx="12" cy="12" r="3" />
										</svg>
									)}
								</button>
							</div>
						</label>

						<ReCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />

						<div className="flex flex-col gap-1.5 pt-1">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#DE141C] text-sm font-semibold text-white transition hover:bg-[#b80f15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loading ? "Signing in…" : "Sign in"}
							</button>

							<button
								type="button"
								disabled={loading}
								onClick={handleSendMagicLink}
								className="inline-flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium text-black/55 transition hover:bg-black/[0.035] hover:text-black disabled:opacity-50"
							>
								Email me a sign-in link
							</button>
						</div>
					</form>
				)}

				<div className="mt-auto flex items-center justify-center gap-1.5 border-t border-black/[0.06] pt-3 text-[11px] text-black/40">
					<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-600">
						<path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
					</svg>
					<span>Secure account access</span>
				</div>
			</div>
		</div>
	);
}
