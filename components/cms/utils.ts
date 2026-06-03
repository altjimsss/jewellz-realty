import type { CmsPayload, CmsRow, FieldSpec } from "./types";

export function asText(value: unknown) {
	return value == null ? "" : String(value);
}

export function asArrayText(value: unknown) {
	if (Array.isArray(value)) {
		return value.filter(Boolean).join("\n");
	}

	return asText(value);
}

export function parseArrayText(value: FormDataEntryValue | null) {
	return asText(value)
		.split(/\r?\n|,/)
		.map((item) => item.trim())
		.filter(Boolean);
}

export function toDateTimeLocal(value: unknown) {
	if (!value) {
		return "";
	}

	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const offset = date.getTimezoneOffset() * 60000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function readNumber(value: FormDataEntryValue | null) {
	const text = asText(value).trim();
	return text === "" ? null : Number(text);
}

export function readBoolean(value: FormDataEntryValue | null) {
	return value === "on";
}

export function buildPayload(fields: FieldSpec[], formData: FormData) {
	const payload: CmsPayload = {};

	for (const field of fields) {
		const raw = formData.get(field.name);

		if (field.type === "checkbox") {
			payload[field.name] = readBoolean(raw);
			continue;
		}

		if (field.type === "number") {
			payload[field.name] = readNumber(raw);
			continue;
		}

		if (field.type === "array") {
			payload[field.name] = parseArrayText(raw);
			continue;
		}

		if (field.type === "datetime-local") {
			payload[field.name] = asText(raw).trim() ? new Date(asText(raw)).toISOString() : null;
			continue;
		}

		const text = asText(raw).trim();
		payload[field.name] = text === "" ? null : text;
	}

	return payload;
}

export function displayValue(field: FieldSpec, value: unknown) {
	if (field.type === "checkbox") {
		return Boolean(value) ? "true" : "";
	}

	if (field.type === "number") {
		return value == null ? "" : String(value);
	}

	if (field.type === "array") {
		return asArrayText(value);
	}

	if (field.type === "datetime-local") {
		return toDateTimeLocal(value);
	}

	return asText(value);
}

export function labelForRow(row: CmsRow) {
	return asText(row?.title ?? row?.company_name ?? row?.project_name ?? row?.author_name ?? row?.headline ?? row?.label ?? row?.key ?? row?.slug ?? row?.id ?? "Record");
}
