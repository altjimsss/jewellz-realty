"use client";

import { FormEvent, Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
	return (
		<Suspense fallback={<LoginShell message="Loading sign in..." />}>
			<LoginForm />
		</Suspense>
	);
}

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextPath = searchParams.get("next") ?? "/admin";
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("Sign in to continue.");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		void supabaseBrowser.auth.getSession().then(({ data }) => {
			if (data.session) {
				router.replace(nextPath);
			}
		});
	}, [nextPath, router]);

	async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setMessage("Signing in...");

		const { data, error } = await supabaseBrowser.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setMessage(error.message);
			setLoading(false);
			return;
		}

		const userId = data.user?.id;
		if (!userId) {
			setMessage("Signed in, but Supabase did not return a user.");
			setLoading(false);
			return;
		}

		const { data: profile, error: profileError } = await supabaseBrowser
			.from("profiles")
			.select("role, is_active")
			.eq("id", userId)
			.maybeSingle();

		if (profileError) {
			setMessage(`Signed in, but profile check failed: ${profileError.message}`);
			setLoading(false);
			return;
		}

		if (!profile) {
			setMessage("Signed in, but no profiles row exists for this user.");
			setLoading(false);
			return;
		}

		if (!profile.is_active) {
			setMessage("Signed in, but this profile is inactive.");
			setLoading(false);
			return;
		}

		if (nextPath.startsWith("/admin") && profile.role !== "admin") {
			setMessage(`Signed in, but this user role is ${profile.role}, not admin.`);
			setLoading(false);
			return;
		}

		setMessage("Signed in. Opening dashboard...");
		router.replace(nextPath);
		router.refresh();
	}

	async function handleMagicLink() {
		if (!email) {
			setMessage("Enter an email address first.");
			return;
		}

		setLoading(true);
		setMessage("Sending a sign-in link...");

		const { error } = await supabaseBrowser.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${window.location.origin}${nextPath}`,
			},
		});

		if (error) {
			setMessage(error.message);
			setLoading(false);
			return;
		}

		setMessage("Check your email for the login link.");
		setLoading(false);
	}

	return (
		<LoginShell message={message}>
			<form className="mt-6 space-y-4" onSubmit={handlePasswordSignIn}>
				<label className="block">
					<span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-black/55">Email</span>
					<input
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#0E4B74]"
						placeholder="admin@jewellzrealty.com"
					/>
				</label>
				<label className="block">
					<span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-black/55">Password</span>
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#0E4B74]"
						placeholder="••••••••"
					/>
				</label>

				<div className="flex flex-col gap-3 sm:flex-row">
					<button
						type="submit"
						disabled={loading}
						className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#0E4B74] px-4 text-sm font-medium text-white transition hover:bg-[#0b3d5c] disabled:cursor-not-allowed disabled:opacity-60"
					>
						Sign in
					</button>
					<button
						type="button"
						disabled={loading}
						onClick={handleMagicLink}
						className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#111111] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Magic link
					</button>
				</div>
			</form>
		</LoginShell>
	);
}

function LoginShell({ children, message }: { children?: ReactNode; message: string }) {
	return (
		<main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,75,116,0.16),_transparent_35%),linear-gradient(180deg,#f5f8fa_0%,#ffffff_100%)] px-6 py-12 text-[#111111]">
			<section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-[0_20px_70px_rgba(17,17,17,0.08)]">
				<p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0E4B74]">Jewellz Realty CMS</p>
				<h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in</h1>
				<p className="mt-2 text-sm leading-6 text-black/60">Use your Supabase Auth account. Admins get the full CMS, while agents and developer partners only see their permitted records.</p>
				{children}
				<p className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-black/65">{message}</p>
			</section>
		</main>
	);
}
