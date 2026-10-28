"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

// Inactivity configuration
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000; // Warning shown 2 minutes prior to logout
const ACTIVITY_STORAGE_KEY = "jewellz_portal_last_activity";
const THROTTLE_ACTIVITY_INTERVAL_MS = 2000; // Throttle activity updates to every 2 seconds

export function PortalSessionTimeout() {
	const router = useRouter();
	const pathname = usePathname();
	const [showWarning, setShowWarning] = useState(false);
	const [secondsRemaining, setSecondsRemaining] = useState(120);

	const lastActivityRef = useRef<number>(Date.now());
	const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
	const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const lastRecordedActivityRef = useRef<number>(0);

	const handleSignOut = useCallback(async () => {
		try {
			if (typeof window !== "undefined") {
				localStorage.removeItem(ACTIVITY_STORAGE_KEY);
			}
			await supabaseBrowser.auth.signOut({ scope: "local" }).catch(() => undefined);
		} finally {
			setShowWarning(false);
			const redirectTarget = pathname ? encodeURIComponent(pathname) : "";
			router.replace(`/login?next=${redirectTarget}&expired=1`);
			router.refresh();
		}
	}, [pathname, router]);

	const recordActivity = useCallback(() => {
		const now = Date.now();
		if (now - lastRecordedActivityRef.current < THROTTLE_ACTIVITY_INTERVAL_MS) {
			return;
		}
		lastRecordedActivityRef.current = now;
		lastActivityRef.current = now;
		try {
			localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
		} catch {}

		// If warning was visible, user activity dismisses it and resets session
		setShowWarning(false);
	}, []);

	const stayLoggedIn = useCallback(() => {
		const now = Date.now();
		lastActivityRef.current = now;
		lastRecordedActivityRef.current = now;
		try {
			localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
		} catch {}
		setShowWarning(false);
	}, []);

	// Main periodic inactivity check
	useEffect(() => {
		// Initialize last activity timestamp
		const now = Date.now();
		lastActivityRef.current = now;
		try {
			localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
		} catch {}

		// Listen to user interaction events
		const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
		const handleEvent = () => recordActivity();

		events.forEach((event) => {
			window.addEventListener(event, handleEvent, { passive: true });
		});

		// Listen to cross-tab activity updates
		function handleStorageChange(e: StorageEvent) {
			if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
				const remoteTime = Number(e.newValue);
				if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
					lastActivityRef.current = remoteTime;
					setShowWarning(false);
				}
			}
		}
		window.addEventListener("storage", handleStorageChange);

		// Check inactivity interval every 5 seconds
		const checkInterval = setInterval(() => {
			const currentTime = Date.now();
			const idleTime = currentTime - lastActivityRef.current;
			const timeRemaining = INACTIVITY_TIMEOUT_MS - idleTime;

			if (timeRemaining <= 0) {
				// Expired completely
				void handleSignOut();
			} else if (timeRemaining <= WARNING_BEFORE_TIMEOUT_MS) {
				// Show warning modal and update remaining seconds
				setSecondsRemaining(Math.max(1, Math.ceil(timeRemaining / 1000)));
				setShowWarning(true);
			} else {
				setShowWarning(false);
			}
		}, 3000);

		return () => {
			events.forEach((event) => {
				window.removeEventListener(event, handleEvent);
			});
			window.removeEventListener("storage", handleStorageChange);
			clearInterval(checkInterval);
			if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
			if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
		};
	}, [handleSignOut, recordActivity]);

	// Second-by-second countdown ticker when warning is displayed
	useEffect(() => {
		if (!showWarning) return;

		const timer = setInterval(() => {
			const remaining = Math.max(
				0,
				Math.ceil((INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityRef.current)) / 1000),
			);
			setSecondsRemaining(remaining);
			if (remaining <= 0) {
				void handleSignOut();
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [showWarning, handleSignOut]);

	if (!showWarning) return null;

	const minutes = Math.floor(secondsRemaining / 60);
	const seconds = secondsRemaining % 60;
	const formattedTime = `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
			<div className="w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-2xl transition-all">
				<div className="flex items-start gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
						<ShieldAlert className="h-6 w-6" />
					</div>
					<div className="flex-1">
						<h3 className="text-base font-bold text-[#111111]">
							Session Inactivity Warning
						</h3>
						<p className="mt-1 text-xs text-black/60 leading-relaxed">
							For your security, your portal workspace will automatically sign out due to inactivity in:
						</p>

						<div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-amber-900">
							<Clock className="h-4 w-4 animate-pulse text-amber-600" />
							<span className="text-sm font-bold tracking-tight font-mono">
								{formattedTime}
							</span>
							<span className="text-xs text-amber-700/80">remaining</span>
						</div>
					</div>
				</div>

				<div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
					<button
						type="button"
						onClick={handleSignOut}
						className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-black/10 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-black/70 transition hover:bg-zinc-100 hover:text-[#111111]"
					>
						<LogOut className="h-3.5 w-3.5 opacity-70" />
						Sign Out Now
					</button>
					<button
						type="button"
						onClick={stayLoggedIn}
						className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black/80"
					>
						<CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
						Stay Signed In
					</button>
				</div>
			</div>
		</div>
	);
}
