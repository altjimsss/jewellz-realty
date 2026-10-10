"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

function safeNextPath(value: string | null) {
	if (!value || !value.startsWith("/") || value.startsWith("//")) return "/login";
	return value;
}

export function ResetPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [ready, setReady] = useState(false); // true once recovery session is active
	const [isExpired, setIsExpired] = useState(false);
	const [message, setMessage] = useState<{
		text: string;
		type: "info" | "error" | "success";
	} | null>(null);

	useEffect(() => {
		let isMounted = true;

		// 1. Check for errors in search params or hash (e.g. otp_expired)
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			const hash = window.location.hash.replace(/^#/, "");
			const hashParams = new URLSearchParams(hash);

			const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");
			const errorCode = searchParams.get("error_code") || hashParams.get("error_code") || searchParams.get("error");

			if (errorDesc || errorCode) {
				const humanMsg = errorDesc
					? decodeURIComponent(errorDesc.replace(/\+/g, " "))
					: "This password reset link is invalid or has expired. Please request a new one.";
				setMessage({ text: humanMsg, type: "error" });
				setIsExpired(true);
				return;
			}

			// 2. Handle PKCE code exchange if present
			const code = searchParams.get("code");
			if (code) {
				void supabaseBrowser.auth
					.exchangeCodeForSession(code)
					.then(({ data, error }) => {
						if (!isMounted) return;
						if (error) {
							setMessage({
								text: error.message || "Failed to verify the password reset code. It may have expired.",
								type: "error",
							});
							setIsExpired(true);
						} else if (data.session) {
							setReady(true);
						}
					})
					.catch((err) => {
						if (!isMounted) return;
						setMessage({
							text: err?.message || "Error validating reset token.",
							type: "error",
						});
						setIsExpired(true);
					});
			}
		}

		// 3. Listen for Supabase auth state change (e.g. PASSWORD_RECOVERY or SIGNED_IN)
		const {
			data: { subscription },
		} = supabaseBrowser.auth.onAuthStateChange((event, session) => {
			if (!isMounted) return;
			if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
				setReady(true);
			}
		});

		// 4. Also check if there is already an active session
		void supabaseBrowser.auth.getSession().then(({ data }) => {
			if (!isMounted) return;
			if (data.session) setReady(true);
		});

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, []);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const nextPath =
			typeof window !== "undefined"
				? safeNextPath(new URLSearchParams(window.location.search).get("next"))
				: "/login";

		if (password.length < 8) {
			setMessage({ text: "Password must be at least 8 characters long.", type: "error" });
			return;
		}
		if (password !== confirm) {
			setMessage({ text: "Passwords do not match.", type: "error" });
			return;
		}

		setLoading(true);
		setMessage({ text: "Updating your password...", type: "info" });

		const { error } = await supabaseBrowser.auth.updateUser({ password });

		if (error) {
			setMessage({ text: error.message, type: "error" });
			setLoading(false);
			return;
		}

		setMessage({ text: "Password updated successfully! Redirecting to sign in...", type: "success" });

		// Sign out and redirect to /login so they authenticate cleanly with the new credentials
		setTimeout(async () => {
			await supabaseBrowser.auth.signOut().catch(() => undefined);
			router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
		}, 2000);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(222,20,28,0.07),_transparent_35%),linear-gradient(180deg,#fdf5f5_0%,#ffffff_100%)] px-6 py-12 text-[#111111]">
			<section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white p-8 shadow-[0_20px_70px_rgba(17,17,17,0.08)]">
				{/* Brand */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 rounded-full bg-[#DE141C]" />
						<p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#111111]">
							Jewellz Realty
						</p>
					</div>
					<Link href="/login" className="text-xs font-semibold text-black/50 hover:text-black">
						← Back to sign in
					</Link>
				</div>

				<div className="mt-6">
					<h1 className="text-2xl font-bold tracking-tight text-[#111111]">
						Set New Password
					</h1>
					<p className="mt-1 text-xs leading-5 text-black/60">
						Enter a secure new password for your portal account.
					</p>
				</div>

				{/* Message banner */}
				{message && (
					<div
						className={`mt-4 rounded-xl border p-3 text-xs font-medium leading-5 ${
							message.type === "error"
								? "border-red-200 bg-red-50 text-red-800"
								: message.type === "success"
									? "border-emerald-200 bg-emerald-50 text-emerald-800"
									: "border-amber-200 bg-amber-50 text-amber-800"
						}`}
					>
						{message.text}
					</div>
				)}

				{isExpired ? (
					/* Expired or invalid token fallback */
					<div className="mt-6 flex flex-col items-center gap-4 text-center">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
							<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10" />
								<line x1="12" y1="8" x2="12" y2="12" />
								<line x1="12" y1="16" x2="12.01" y2="16" />
							</svg>
						</div>
						<p className="text-xs text-black/60">
							Password reset links are time-sensitive and single-use. Please request a fresh reset link from the sign in page.
						</p>
						<Link
							href="/login"
							className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#DE141C] text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15]"
						>
							Request New Reset Link
						</Link>
					</div>
				) : !ready ? (
					/* Waiting for Supabase to exchange the token */
					<div className="mt-8 flex flex-col items-center gap-3">
						<div className="h-7 w-7 animate-spin rounded-full border-2 border-black/15 border-t-[#DE141C]" />
						<p className="text-xs text-black/50">Verifying your reset link…</p>
						<p className="mt-2 text-center text-[11px] text-black/40">
							If this takes more than a few seconds,{" "}
							<Link href="/login" className="text-[#DE141C] hover:underline">
								request a new link
							</Link>
							.
						</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="mt-6 space-y-4">
						{/* New password */}
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
								New Password
							</span>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									required
									autoComplete="new-password"
									minLength={8}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Minimum 8 characters"
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

						{/* Confirm password */}
						<label className="block">
							<span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-black/55">
								Confirm New Password
							</span>
							<input
								type={showPassword ? "text" : "password"}
								required
								autoComplete="new-password"
								minLength={8}
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								placeholder="Re-enter your password"
								className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-[#111111] outline-none transition focus:border-[#DE141C]"
							/>
						</label>

						{/* Password strength hints */}
						<ul className="space-y-1 text-[11px] text-black/50">
							<li className={password.length >= 8 ? "text-emerald-600" : ""}>
								{password.length >= 8 ? "✓" : "·"} At least 8 characters
							</li>
							<li className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>
								{/[A-Z]/.test(password) ? "✓" : "·"} One uppercase letter
							</li>
							<li className={/[0-9]/.test(password) ? "text-emerald-600" : ""}>
								{/[0-9]/.test(password) ? "✓" : "·"} One number
							</li>
							<li className={password === confirm && confirm.length > 0 ? "text-emerald-600" : ""}>
								{password === confirm && confirm.length > 0 ? "✓" : "·"} Passwords match
							</li>
						</ul>

						<div className="pt-1">
							<button
								type="submit"
								disabled={loading || !ready}
								className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#DE141C] text-xs font-semibold text-white shadow-sm transition hover:bg-[#b80f15] disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loading ? "Updating password…" : "Set New Password"}
							</button>
						</div>
					</form>
				)}

				{/* Security badge */}
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
