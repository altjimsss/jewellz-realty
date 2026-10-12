export type RecaptchaVerification = {
	ok: boolean;
	error?: string;
};

type RecaptchaResponse = {
	success?: boolean;
	"error-codes"?: string[];
};

function clientIp(request: Request) {
	const forwardedFor = request.headers.get("x-forwarded-for");
	return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

export async function verifyRecaptchaToken(token: string, request: Request): Promise<RecaptchaVerification> {
	const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();

	if (!secret) {
		return { ok: false, error: "Captcha verification is not configured." };
	}

	if (!token.trim()) {
		return { ok: false, error: "Please complete the captcha before continuing." };
	}

	const formData = new URLSearchParams({
		secret,
		response: token,
	});
	const remoteIp = clientIp(request);
	if (remoteIp) formData.set("remoteip", remoteIp);

	try {
		const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: formData,
			cache: "no-store",
		});
		const payload = (await response.json().catch(() => null)) as RecaptchaResponse | null;

		if (!response.ok || !payload?.success) {
			return { ok: false, error: "Captcha verification failed. Please try again." };
		}

		return { ok: true };
	} catch {
		return { ok: false, error: "Captcha verification is temporarily unavailable." };
	}
}
