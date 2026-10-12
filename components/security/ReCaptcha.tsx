"use client";

import { useEffect, useRef, useState } from "react";

declare global {
	interface Window {
		grecaptcha?: {
			render: (
				container: HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					"expired-callback": () => void;
					"error-callback": () => void;
				},
			) => number;
			reset: (widgetId?: number) => void;
		};
	}
}

type ReCaptchaProps = {
	onVerify: (token: string) => void;
	resetKey?: number;
	className?: string;
};

const SCRIPT_ID = "google-recaptcha-script";
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

function loadScript() {
	if (document.getElementById(SCRIPT_ID)) return;

	const script = document.createElement("script");
	script.id = SCRIPT_ID;
	script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
	script.async = true;
	script.defer = true;
	document.head.appendChild(script);
}

export function ReCaptcha({ onVerify, resetKey = 0, className = "" }: ReCaptchaProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const widgetIdRef = useRef<number | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!SITE_KEY) return;
		loadScript();

		const interval = window.setInterval(() => {
			if (!window.grecaptcha || !containerRef.current || widgetIdRef.current !== null) return;
			widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
				sitekey: SITE_KEY,
				callback: onVerify,
				"expired-callback": () => onVerify(""),
				"error-callback": () => onVerify(""),
			});
			setReady(true);
			window.clearInterval(interval);
		}, 150);

		return () => window.clearInterval(interval);
	}, [onVerify]);

	useEffect(() => {
		if (widgetIdRef.current === null || !window.grecaptcha) return;
		window.grecaptcha.reset(widgetIdRef.current);
		onVerify("");
	}, [onVerify, resetKey]);

	if (!SITE_KEY) {
		return (
			<p className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 ${className}`}>
				Captcha site key is missing.
			</p>
		);
	}

	return (
		<div className={className}>
			<div ref={containerRef} className="min-h-[78px]" />
			{!ready ? <p className="text-xs text-black/45">Loading captcha...</p> : null}
		</div>
	);
}
