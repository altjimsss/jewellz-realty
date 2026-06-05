import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnvLocal();

const propertyPath = process.env.PLAYWRIGHT_PROPERTY_PATH ?? "/project-list/azure-studio-condo";
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? "playwright-admin@jewellzrealty.test";
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? "PlaywrightAdmin!2026";

test("CMS inquiry queue shows a newly submitted public inquiry", async ({ page }) => {
	test.skip(!canCreateAdminUser(), "Set Supabase service role env vars to run CMS E2E tests.");

	await ensurePlaywrightAdminUser();

	const testRunId = Date.now();
	const buyerEmail = `cms-visible-${testRunId}@example.com`;
	const buyerName = "CMS Visible Playwright Lead";

	await page.goto(`${propertyPath}?utm_source=playwright&utm_medium=e2e&utm_campaign=cms-visibility`, { waitUntil: "domcontentloaded" });
	await page.getByRole("button", { name: /inquire us/i }).first().click();
	await page.getByPlaceholder("Email").fill(buyerEmail);
	await page.getByPlaceholder("Name").fill(buyerName);
	await page.getByPlaceholder("Subject").fill("CMS visibility test");
	await page.getByPlaceholder("Message", { exact: true }).fill("This test verifies that public inquiries appear in the CMS inquiry queue.");

	const inquiryResponsePromise = page.waitForResponse((response) => {
		const request = response.request();
		return request.method() === "POST" && response.url().includes("/api/inquiries");
	});

	await page.getByRole("button", { name: /send inquiry/i }).click();
	const inquiryResponse = await inquiryResponsePromise;
	expect(inquiryResponse.ok()).toBeTruthy();
	await expect(page.getByText(/inquiry sent/i)).toBeVisible();

	await page.goto(`/login?next=${encodeURIComponent("/admin/inquiries")}`, { waitUntil: "domcontentloaded" });
	await expect(page.getByText("Sign in to continue.")).toBeVisible();
	await submitLoginForm(page, adminEmail, adminPassword);

	await expect
		.poll(
			async () => {
				if (/\/admin\/inquiries/.test(page.url())) return "signed-in";
				const statusText = await page.locator("main section p").last().textContent().catch(() => "");
				return statusText?.trim() || page.url();
			},
			{ timeout: 30_000, message: "Expected CMS login to reach /admin/inquiries." },
		)
		.toBe("signed-in");
	await expect(page.getByRole("heading", { name: "All Inquiries" })).toBeVisible();
	await expect(page.getByText(buyerEmail).first()).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(buyerName).first()).toBeVisible();
});

async function submitLoginForm(page: Page, email: string, password: string) {
	const emailInput = page.getByPlaceholder("admin@jewellzrealty.com");
	const passwordInput = page.getByLabel("Password");
	const signInButton = page.getByRole("button", { name: /^sign in$/i });

	await expect(signInButton).toBeEnabled();

	for (let attempt = 0; attempt < 6; attempt += 1) {
		await emailInput.click();
		await emailInput.fill("");
		await emailInput.pressSequentially(email);
		await passwordInput.click();
		await passwordInput.fill("");
		await passwordInput.pressSequentially(password);

		const emailValue = await emailInput.inputValue();
		const passwordValue = await passwordInput.inputValue();
		if (emailValue === email && passwordValue === password) {
			await signInButton.click();
			return;
		}

		await page.waitForTimeout(400);
	}

	throw new Error("Login form values did not remain filled before submit.");
}

function loadEnvLocal() {
	const envPath = resolve(process.cwd(), ".env.local");
	try {
		const envText = readFileSync(envPath, "utf8");
		for (const line of envText.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const separatorIndex = trimmed.indexOf("=");
			if (separatorIndex === -1) continue;
			const key = trimmed.slice(0, separatorIndex).trim();
			const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
			process.env[key] ??= value;
		}
	} catch {
		// Playwright can still run when env vars are provided by the shell.
	}
}

function canCreateAdminUser() {
	return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getAdminSupabase() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceRoleKey) {
		throw new Error("Supabase URL and service role key are required for CMS E2E setup.");
	}

	return createClient(url, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}

async function ensurePlaywrightAdminUser() {
	const supabase = getAdminSupabase();
	const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
	if (listError) throw listError;

	const existingUser = usersData.users.find((user) => user.email?.toLowerCase() === adminEmail.toLowerCase());
	const userId = existingUser?.id ?? (await createPlaywrightAdminUser()).id;

	if (existingUser) {
		const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
			password: adminPassword,
			email_confirm: true,
			user_metadata: { name: "Playwright Admin" },
		});
		if (error) throw error;
	}

	await upsertProfileWithFallback(userId);
}

async function createPlaywrightAdminUser() {
	const supabase = getAdminSupabase();
	const { data, error } = await supabase.auth.admin.createUser({
		email: adminEmail,
		password: adminPassword,
		email_confirm: true,
		user_metadata: { name: "Playwright Admin" },
	});

	if (error) throw error;
	if (!data.user) throw new Error("Supabase did not return the created Playwright admin user.");
	return data.user;
}

async function upsertProfileWithFallback(userId: string) {
	const supabase = getAdminSupabase();
	let payload: Record<string, unknown> = {
		id: userId,
		email: adminEmail,
		full_name: "Playwright Admin",
		role: "admin",
		is_active: true,
	};

	for (let attempt = 0; attempt < 6; attempt += 1) {
		const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
		if (!error) return;

		const missingColumn = error.message.match(/'([^']+)' column/)?.[1];
		if (!missingColumn || !(missingColumn in payload)) throw error;

		const { [missingColumn]: _missingValue, ...fallbackPayload } = payload;
		payload = fallbackPayload;
	}
}
