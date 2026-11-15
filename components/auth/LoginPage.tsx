"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ReCaptcha } from "@/components/security/ReCaptcha";
import { AuthFeedbackIndicator } from "@/components/auth/AuthFeedbackIndicator";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PORTAL_ROLE_MAP, type PortalRole } from "@/components/auth/PortalAuthModal";

export function LoginPage() {
	return (
		<Suspense fallback={<LoginShellLoading />}>
			<LoginForm />
		</Suspense>
	);
}

function homeForRole(role: string) {
	if (role === "admin") return "/admin";
	if (role === "agent") return "/agent";
	if (role === "developer_partner") return "/developer";
	return "/login";
}

function resolveTargetRoute(role: string, requestedNext: string | null): string {
	const home = homeForRole(role);
	if (!requestedNext) return home;

	// Never send a user into another role's portal. A stale ?next= value (for
	// example /admin left over from the previous account) must not override the
	// role returned by the current session.
	if (requestedNext.startsWith("/admin")) return role === "admin" ? requestedNext : home;
	if (requestedNext.startsWith("/agent")) return role === "agent" ? requestedNext : home;
	if (requestedNext.startsWith("/developer")) return role === "developer_partner" ? requestedNext : home;

	return requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : home;
}

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextParam = searchParams.get("next");

	const defaultRole: PortalRole = nextParam?.startsWith("/developer")
		? "developer"
		: nextParam?.startsWith("/admin")
			? "admin"
			: "agent";

	const [activeRole, setActiveRole] = useState<PortalRole>(defaultRole);
	// Each role tab owns its own credentials. Typing in the Agent tab must not
	// populate Developer or Admin, including when the browser autofills a form.
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
	const isExpired = searchParams.get("expired") === "1";
	const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(() =>
		isExpired
			? {
					text: "Your portal session has expired due to inactivity. Please sign in again.",
					type: "info",
			  }
			: null,
	);
	const [loading, setLoading] = useState(false);
	const [isForgotPassword, setIsForgotPassword] = useState(false);
	const [captchaToken, setCaptchaToken] = useState("");
	const [captchaResetKey, setCaptchaResetKey] = useState(0);

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

	useEffect(() => {
		if (isExpired) {
			void supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
			return;
		}

		// If arriving via a password setup link/token, redirect to /reset-password immediately.
		if (typeof window !== "undefined") {
			const hash = window.location.hash;
			const search = window.location.search;
			if (
				hash.includes("type=recovery") ||
				search.includes("type=recovery") ||
				hash.includes("type=invite") ||
				search.includes("type=invite") ||
				search.includes("code=")
			) {
				router.replace(`/reset-password${search}${hash}`);
				return;
			}
		}

		void supabaseBrowser.auth
			.getSession()
			.then(async ({ data, error }) => {
				if (error) {
					await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
					return;
				}

				if (data.session) {
					const { data: profile } = await supabaseBrowser
						.from("profiles")
						.select("role, is_active")
						.eq("id", data.session.user.id)
						.maybeSingle();

					if (profile?.is_active && profile?.role) {
						const currentTarget = PORTAL_ROLE_MAP[activeRole];
						const userRole = profile.role.trim().toLowerCase();
						if (currentTarget.allowedRoles.includes(userRole)) {
							const destination = resolveTargetRoute(profile.role, nextParam);
							router.replace(destination);
						} else {
							await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
						}
					} else {
						await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
						setMessage({ text: "This account has no active portal profile. Contact the brokerage administrator.", type: "error" });
					}
				}
			})
			.catch(async () => {
				await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
			});
	}, [activeRole, isExpired, nextParam, router]);

	async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
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
				setMessage({ text: "Signed in, but no user was returned.", type: "error" });
				resetCaptcha();
				setLoading(false);
				return;
			}

			const { data: profile, error: profileError } = await supabaseBrowser
				.from("profiles")
				.select("role, is_active")
				.eq("id", userId)
				.maybeSingle();

			if (profileError) {
				setMessage({ text: `Profile verification failed: ${profileError.message}`, type: "error" });
				resetCaptcha();
				setLoading(false);
				return;
			}

			if (profile && profile.is_active === false) {
				await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
				setMessage({ text: "This profile is inactive. Please contact the administrator.", type: "error" });
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

			setMessage({ text: "Signed in! Opening workspace...", type: "success" });
			router.replace(currentTarget.destination);
			router.refresh();
		} catch {
			setMessage({ text: "Connection error. Please try again.", type: "error" });
			resetCaptcha();
			setLoading(false);
		}
	}

	async function handleMagicLink() {
		if (!email.trim()) {
			setMessage({ text: "Enter an email address first.", type: "error" });
			return;
		}

		setLoading(true);
		setMessage({ text: "Verifying captcha...", type: "info" });

		if (!(await verifyCaptcha())) {
			setLoading(false);
			return;
		}

		setMessage({ text: "Sending a secure sign-in link...", type: "info" });

		const redirectDestination = nextParam || currentConfig.destination;
		const { error } = await supabaseBrowser.auth.signInWithOtp({
			email: email.trim().toLowerCase(),
			options: {
				emailRedirectTo: `${window.location.origin}${redirectDestination}`,
			},
		});

		if (error) {
			setMessage({ text: error.message, type: "error" });
			resetCaptcha();
			setLoading(false);
			return;
		}

		setMessage({ text: "Check your email for the login link.", type: "success" });
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

		setMessage({ text: `Password reset link sent to ${email}.`, type: "success" });
		resetCaptcha();
		setLoading(false);
	}

	return (
		<main className={`relative isolate flex min-h-screen items-center justify-center px-6 py-12 text-[#111111] ${isExpired ? "bg-white" : "bg-[radial-gradient(circle_at_top,_rgba(222,20,28,0.07),_transparent_35%),linear-gradient(180deg,#fdf5f5_0%,#ffffff_100%)]"}`}>
			{isExpired ? (
				<>
					<div aria-hidden="true" className="absolute inset-0 z-0 bg-[url('/assets/session-timeout-bg.png')] bg-cover bg-center" />
					<div aria-hidden="true" className="absolute inset-0 z-0 bg-white/70" />
				</>
			) : null}
			<section className="relative z-10 flex h-[640px] max-h-[calc(100dvh-24px)] w-full max-w-[440px] flex-col overflow-hidden rounded-[24px] border border-[#E5E5E7] bg-white p-5 shadow-[0_18px_50px_-38px_rgba(0,0,0,0.45)] sm:p-6">
				<div className="relative z-10 flex min-h-0 flex-1 flex-col">
				<div className="mt-1 flex h-10 shrink-0 items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<Image src="/assets/admin-emblem.webp" alt="" aria-hidden="true" width={40} height={40} className="h-9 w-9 shrink-0 object-contain" />
						<span aria-hidden="true" className="h-8 w-px shrink-0 bg-zinc-300" />
						<div className="min-w-0 leading-tight"><p className="truncate text-[13px] font-bold tracking-tight text-[#202334]">J'WELLZ REALTY</p><p className="mt-0.5 text-[9px] font-bold tracking-[0.22em] text-[#73778B]">{activeRole.toUpperCase()} PORTAL</p></div>
					</div>
					<div role="group" aria-label="Choose sign-in portal" className="flex shrink-0 items-center gap-0.5 rounded-xl border border-[#E4E5EA] bg-white/85 p-1">
						<button type="button" aria-label="Agent portal" title="Agent" aria-pressed={activeRole === "agent"} onClick={() => { setActiveRole("agent"); setMessage(null); }} className={`grid h-8 w-8 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] ${activeRole === "agent" ? "bg-[#DE141C] text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg></button>
						<button type="button" aria-label="Developer portal" title="Developer" aria-pressed={activeRole === "developer"} onClick={() => { setActiveRole("developer"); setMessage(null); }} className={`grid h-8 w-8 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] ${activeRole === "developer" ? "bg-[#DE141C] text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M6 20V5l6-2 6 2v15M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 20v-4h4v4" /></svg></button>
						<button type="button" aria-label="Admin portal" title="Admin" aria-pressed={activeRole === "admin"} onClick={() => { setActiveRole("admin"); setMessage(null); }} className={`grid h-8 w-8 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C] ${activeRole === "admin" ? "bg-[#DE141C] text-white" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg></button>
					</div>
					<Link href="/" aria-label="Return to website" title="Return to website" className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/80 text-[0px] text-black/55 transition hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DE141C]">
						<svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h9a7 7 0 0 1 0 14h-2" /></svg>
						← Back to site
					</Link>
				</div>

				{/* Role Tabs */}
				<div className="hidden">
					<button
						type="button"
						onClick={() => {
							setActiveRole("agent");
							setMessage(null);
						}}
						className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
							activeRole === "agent"
								? "bg-white text-[#111111] shadow-sm"
								: "text-black/55 hover:text-black"
						}`}
					>
						Agent
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveRole("developer");
							setMessage(null);
						}}
						className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
							activeRole === "developer"
								? "bg-white text-[#111111] shadow-sm"
								: "text-black/55 hover:text-black"
						}`}
					>
						Developer
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveRole("admin");
							setMessage(null);
						}}
						className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
							activeRole === "admin"
								? "bg-white text-[#111111] shadow-sm"
								: "text-black/55 hover:text-black"
						}`}
					>
						Admin
					</button>
				</div>

				<div className="mt-5 min-h-10 shrink-0">
					<h1 className="truncate text-[27px] font-bold leading-tight tracking-[-0.045em] text-[#202334] sm:text-3xl">
						{isForgotPassword ? "Reset password" : <>{activeRole === "developer" ? "Developer" : activeRole === "admin" ? "Admin" : "Agent"} <span className="text-[#DE141C]">Sign In</span></>}
					</h1>
				</div>
				<p className="mt-1 shrink-0 text-sm tracking-[-0.02em] text-[#73778B]">{isForgotPassword ? "We'll email a reset link." : "Welcome back! Please sign in to continue."}</p>

				{isForgotPassword ? (
					<form onSubmit={handleForgotPassword} className="mt-3 space-y-3">
						<label className="block">
							<span className="mb-1.5 block text-xs font-semibold text-[#202334]">
								Email Address
							</span>
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={currentConfig.placeholder}
								className="h-11 w-full rounded-xl border border-[#DDE0E8] bg-white px-3.5 text-sm text-[#202334] outline-none transition placeholder:text-[#A0A5B4] focus:border-[#DE141C] focus:ring-2 focus:ring-[#DE141C]/10"
							/>
						</label>

						<div className="flex items-center gap-3">
							<ReCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />
							<AuthFeedbackIndicator message={message} loading={loading} />
						</div>

						<div className="flex flex-col gap-2 pt-1">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#DE141C] text-sm font-semibold text-white transition hover:bg-[#b80f15] disabled:opacity-50"
							>
								{loading ? "Sending link..." : "Send Reset Link"}
							</button>
							<button
								type="button"
								onClick={() => {
									setIsForgotPassword(false);
									setMessage(null);
								}}
								className="py-1 text-center text-xs font-medium text-black/60 hover:text-black hover:underline"
							>
								Back to Sign In
							</button>
						</div>
					</form>
				) : (
					<form onSubmit={handlePasswordSignIn} autoComplete="off" className="mt-3 space-y-3">
						<label className="block">
							<span className="mb-1.5 block text-xs font-semibold text-[#202334]">
								Email Address
							</span>
							<input
								type="email"
								required
								name={`${activeRole}-email`}
								autoComplete="off"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={currentConfig.placeholder}
								className="h-11 w-full rounded-xl border border-[#DDE0E8] bg-white px-3.5 text-sm text-[#202334] outline-none transition placeholder:text-[#A0A5B4] focus:border-[#DE141C] focus:ring-2 focus:ring-[#DE141C]/10"
							/>
						</label>

						<label className="block">
							<div className="mb-1 flex items-center justify-between">
								<span className="text-xs font-semibold text-[#202334]">
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
									className="h-11 w-full rounded-xl border border-[#DDE0E8] bg-white pl-3.5 pr-11 text-sm text-[#202334] outline-none transition placeholder:text-[#A0A5B4] focus:border-[#DE141C] focus:ring-2 focus:ring-[#DE141C]/10"
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

						<div className="flex items-center gap-3">
							<ReCaptcha onVerify={setCaptchaToken} resetKey={captchaResetKey} />
							<AuthFeedbackIndicator message={message} loading={loading} />
						</div>

						<div className="flex flex-col gap-2 pt-2">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#DE141C] text-sm font-semibold text-white transition hover:bg-[#b80f15] disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loading ? "Signing in..." : "Sign In to Workspace"}
							</button>

							<button
								type="button"
								disabled={loading}
								onClick={handleMagicLink}
								className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#E4E5EA] bg-white text-sm font-medium text-[#202334] transition hover:bg-zinc-50 disabled:opacity-50"
							>
								Send Magic Link Instead
							</button>
						</div>
					</form>
				)}

				<div className="mt-auto flex items-center justify-center gap-1.5 border-t border-black/5 pt-3 text-[11px] text-black/45">
					<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-600">
						<path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
					</svg>
					<span>Secured by Supabase Encrypted Authentication</span>
				</div>
				</div>
			</section>
		</main>
	);
}

function LoginShellLoading() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-[#111111]">
			<div className="flex flex-col items-center gap-3">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-[#DE141C]" />
				<p className="text-xs font-medium text-black/50">Loading sign in...</p>
			</div>
		</main>
	);
}
