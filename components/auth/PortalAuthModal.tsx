"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export type PortalRole = "agent" | "developer" | "admin";

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
	const [activeRole, setActiveRole] = useState<PortalRole>(initialRole);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);
	const [isForgotPassword, setIsForgotPassword] = useState(false);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

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

	async function handlePasswordSignIn(e: FormEvent) {
		e.preventDefault();
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
				setMessage({ text: "Sign in succeeded, but no user was returned.", type: "error" });
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
				setLoading(false);
				return;
			}

			if (profile && profile.is_active === false) {
				setMessage({ text: "Your account is inactive. Please contact the brokerage administrator.", type: "error" });
				setLoading(false);
				return;
			}

			// Intelligent role destination fallback
			let targetDestination = currentConfig.destination;
			if (profile?.role) {
				if (profile.role === "admin") {
					targetDestination = "/admin";
				} else if (profile.role === "agent") {
					targetDestination = "/agent";
				} else if (profile.role === "developer_partner") {
					targetDestination = "/developer";
				}
			}

			setMessage({ text: "Authenticated! Opening your workspace...", type: "success" });
			setTimeout(() => {
				onClose();
				router.replace(targetDestination);
				router.refresh();
			}, 700);
		} catch {
			setMessage({ text: "Connection error. Please try again.", type: "error" });
			setLoading(false);
		}
	}

	async function handleSendMagicLink() {
		if (!email.trim()) {
			setMessage({ text: "Please enter your email address first.", type: "error" });
			return;
		}

		setLoading(true);
		setMessage({ text: "Sending a secure sign-in link...", type: "info" });

		const { error } = await supabaseBrowser.auth.signInWithOtp({
			email: email.trim().toLowerCase(),
			options: {
				emailRedirectTo: `${window.location.origin}${currentConfig.destination}`,
			},
		});

		if (error) {
			setMessage({ text: error.message, type: "error" });
			setLoading(false);
			return;
		}

		setMessage({ text: `Magic sign-in link sent to ${email}. Check your inbox!`, type: "success" });
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

		setMessage({
			text: `Password reset instructions sent to ${email}.`,
			type: "success",
		});
		setLoading(false);
	}

	return (
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm transition-opacity duration-200"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="portal-modal-title"
		>
			<div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
				{/* Top Close Button */}
				<button
					type="button"
					onClick={onClose}
					className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-black/60 transition hover:bg-zinc-200 hover:text-black"
					aria-label="Close portal sign in modal"
				>
					<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>

				{/* Brand Tagline */}
				<div className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full bg-[#DE141C]" />
					<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#DE141C]">
						Jewellz Realty Portals
					</p>
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

				{/* Header Titles */}
				<div className="mt-5">
					<h2 id="portal-modal-title" className="text-2xl font-bold tracking-tight text-[#111111]">
						{isForgotPassword ? "Reset Password" : currentConfig.title}
					</h2>
					<p className="mt-1 text-xs leading-5 text-black/60">
						{isForgotPassword
							? "Enter your registered email address to receive secure reset instructions."
							: currentConfig.subtitle}
					</p>
				</div>

				{/* Message Banner */}
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

				{/* Forms */}
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
								onClick={handleSendMagicLink}
								className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white text-xs font-medium text-[#111111] transition hover:bg-black/5 disabled:opacity-50"
							>
								Send Magic Link Instead
							</button>
						</div>
					</form>
				)}

				<div className="mt-5 flex items-center justify-center gap-1.5 border-t border-black/5 pt-3 text-[11px] text-black/45">
					<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-emerald-600">
						<path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
					</svg>
					<span>Secured by Supabase Encrypted Authentication</span>
				</div>
			</div>
		</div>
	);
}
