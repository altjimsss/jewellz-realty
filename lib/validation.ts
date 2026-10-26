export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function normalizePhone(value: unknown) {
	return typeof value === "string" ? value.replace(/[\s()-]/g, "").trim() : "";
}

export function isValidEmail(value: unknown) {
	return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

/** Accepts 09XXXXXXXXX or +639XXXXXXXXX. */
export function isValidPhilippineMobile(value: unknown) {
	return /^(09\d{9}|\+639\d{9})$/.test(normalizePhone(value));
}

export function emailValidationMessage(value: unknown, required = true) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) return required ? "Email address is required." : "";
	if (!isValidEmail(text)) return "Please enter a valid email address (e.g. name@domain.com).";
	return "";
}

export function phoneValidationMessage(value: unknown, required = true) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) return required ? "Contact number is required." : "";
	if (!isValidPhilippineMobile(text)) return "Please enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
	return "";
}
