"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { PortalRole } from "@/components/auth/PortalAuthModal";

export function LoginPage() {
	return (
		<Suspense fallback={<LoginShellLoading />}>
			<LoginForm />
		</Suspense>
	);
}

function resolveTargetRoute(role: string, requestedNext: string | null): string {
	if (requestedNext && requestedNext !== "/admin") {
		if (requestedNext.startsWith("/admin") && role !== "admin") {
			return role === "agent" ? "/agent" : role === "developer_partner" ? "/developer" : "/login";
		}
		if (requestedNext.startsWith("/agent") && role !== "agent" && role !== "admin") {
			return role === "developer_partner" ? "/developer" : "/login";
		}
		if (requestedNext.startsWith("/developer") && role !== "developer_partner" && role !== "admin") {
			return role === "agent" ? "/agent" : "/login";
		}
		return requestedNext;
	}

	if (role === "admin") return "/admin";
	if (role === "agent") return "/agent";
	if (role === "developer_partner") return "/developer";
	return "/admin";
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
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
	const [loading, setLoading] = useState(false);
	const [isForgotPassword, setIsForgotPassword] = useState(false);

	const roleConfig: Record<
		PortalRole,
		{ title: string; subtitle: string; destination: string; placeholder: string }
	> = {
		agent: {
			title: "Agent Portal",
			subtitle: "Sign in to access your assigned buyer leads, property listings, and sales pipeline.",
			destination: "/agent",
			placeholder: "agent@jewellzrealty.com",
		},
		developer: {
			title: "Developer Partner Hub",
			subtitle: "Sign in to manage your master developments, unit inventory, and track buyer analytics.",
			destination: "/developer",
			placeholder: "partner@developer.com",
		},
		admin: {
			title: "Admin CMS",
			subtitle: "Brokerage management, site settings, agent registrations, and full analytics.",
			destination: "/admin",
			placeholder: "admin@jewellzrealty.com",
		},
	};

	const currentConfig = roleConfig[activeRole];

	useEffect(() => {
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
						const destination = resolveTargetRoute(profile.role, nextParam);
						router.replace(destination);
					} else {
						router.replace(nextParam || "/admin");
					}
				}
			})
			.catch(async () => {
				await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
			});
	}, [nextParam, router]);

	async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!email.trim() || !password) return;

		setLoading(true);
		setMessage({ text: "Authenticating credentials...", type: "info" });

		try {
			const { data, error } = await supabaseBrowser.auth.signInWithPassword({
				email: email.trim().toLowerCase(),
				password,
			});

			if (error) {
				setMessage({ text: error.message, type: "error" });
				setLoading(false);
				return;
			}

			const userId = data.user?.id;
			if (!userId) {
				setMessage({ text: "Signed in, but no user was returned.", type: "error" });
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
				setLoading(false);
				return;
			}

			if (profile && profile.is_active === false) {
				setMessage({ text: "This profile is inactive. Please contact the administrator.", type: "error" });
				setLoading(false);
				return;
			}

			const destination = resolveTargetRoute(profile?.role || "agent", nextParam || currentConfig.destination);

			setMessage({ text: "Signed in! Opening workspace...", type: "success" });
			router.replace(destination);
			router.refresh();
		} catch {
			setMessage({ text: "Connection error. Please try again.", type: "error" });
			setLoading(false);
		}
	}

	async function handleMagicLink() {
		if (!email.trim()) {
			setMessage({ text: "Enter an email address first.", type: "error" });
			return;
		}

		setLoading(true);
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
			setLoading(false);
			return;
		}

		setMessage({ text: "Check your email for the login link.", type: "success" });
		setLoading(false);
	}

	async function handleForgotPassword(e: FormEvent) {
		e.preventDefault();
		if (!email.trim()) {
			setMessage({ text: "Please enter your registered email address.", type: "error" });
			return;
		}

		setLoading(true);
		setMessage({ text: "Sending password reset link...", type: "info" });

		const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
			redirectTo: `${window.location.origin}/reset-password`,
		});

		if (error) {
			setMessage({ text: error.message, type: "error" });
			setLoading(false);
			return;
		}

		setMessage({ text: `Password reset link sent to ${email}.`, type: "success" });
		setLoading(false);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(222,20,28,0.07),_transparent_35%),linear-gradient(180deg,#fdf5f5_0%,#ffffff_100%)] px-6 py-12 text-[#111111]">
			<section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white p-8 shadow-[0_20px_70px_rgba(17,17,17,0.08)]">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-[#DE141C]" />
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#DE141C]">
							Jewellz Realty
						</p>
					</div>
					<Link href="/" className="text-xs font-semibold text-black/50 hover:text-black">
						← Back to site
					</Link>
				</div>

				{/* Role Tabs */}
				<div className="mt-4 flex rounded-xl border border-black/10 bg-zinc-100/80 p-1">
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

				<div className="mt-5">
					<h1 className="text-2xl font-bold tracking-tight text-[#111111]">
						{isForgotPassword ? "Reset Password" : currentConfig.title}
					</h1>
					<p className="mt-1 text-xs leading-5 text-black/60">
						{isForgotPassword
							? "Enter your registered email address to receive password reset instructions."
							: currentConfig.subtitle}
					</p>
				</div>

				{message ? (
					<div
						className={`mt-4 rounded-xl border p-3 text-xs font-medium leading-5 ${
							message.type === "error"
								? "border-red-200 bg-red-50 text-red-800"
								: message.type === "success"
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-blue-200 bg-blue-50 text-blue-800"
						}`}
					>
						{message.text}
					</div>
				) : null}

				{isForgotPassword ? (
					<form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
								Email Address
							</span>
							<input
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={currentConfig.placeholder}
								className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#111111] outline-none transition focus:border-[#DE141C]"
							/>
						</label>

						<div className="flex flex-col gap-2 pt-1">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#DE141C] text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15] disabled:opacity-50"
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
					<form onSubmit={handlePasswordSignIn} className="mt-5 space-y-3.5">
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
								Email Address
							</span>
							<input
								type="email"
								required
								autoComplete="username"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder={currentConfig.placeholder}
								className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#111111] outline-none transition focus:border-[#DE141C]"
							/>
						</label>

						<label className="block">
							<div className="mb-1 flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
									Password
								</span>
								<button
									type="button"
									onClick={() => {
										setIsForgotPassword(true);
										setMessage(null);
									}}
									className="text-[11px] font-medium text-[#DE141C] hover:underline"
								>
									Forgot password?
								</button>
							</div>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									required
									autoComplete="current-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="h-11 w-full rounded-xl border border-black/10 bg-white pl-3.5 pr-10 text-sm text-[#111111] outline-none transition focus:border-[#DE141C]"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
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

						<div className="flex flex-col gap-2 pt-2">
							<button
								type="submit"
								disabled={loading}
								className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#DE141C] text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15] disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loading ? "Signing in..." : "Sign In to Workspace"}
							</button>

							<button
								type="button"
								disabled={loading}
								onClick={handleMagicLink}
								className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white text-xs font-medium text-[#111111] transition hover:bg-black/5 disabled:opacity-50"
							>
								Send Magic Link Instead
							</button>
						</div>
					</form>
				)}

				<div className="mt-6 flex items-center justify-center gap-1.5 border-t border-black/5 pt-3 text-[11px] text-black/45">
					<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-600">
						<path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
					</svg>
					<span>Secured by Supabase Encrypted Authentication</span>
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
