import { expect, test, type Page } from "@playwright/test";

const propertyPath = process.env.PLAYWRIGHT_PROPERTY_PATH ?? "/project-list/azure-studio-condo";

test("visitor property activity is recorded through analytics and inquiry APIs", async ({ page }) => {
	const propertyViewRequestPromise = waitForAnalyticsRequest(page, "property_view");

	await page.goto(`${propertyPath}?utm_source=playwright&utm_medium=e2e&utm_campaign=engagement-recording`, { waitUntil: "domcontentloaded" });

	await expectAnalyticsTracked(propertyViewRequestPromise);

	const galleryOpenRequestPromise = waitForAnalyticsRequest(page, "property_gallery_open");
	await page.getByRole("button", { name: "Show all images" }).first().click();
	await expectAnalyticsTracked(galleryOpenRequestPromise);
	await page.getByRole("button", { name: "Close gallery" }).click();

	const mapOpenRequestPromise = waitForAnalyticsRequest(page, "property_map_open");
	await page.getByRole("button", { name: /open map/i }).first().click();
	await expectAnalyticsTracked(mapOpenRequestPromise);

	const inquiryToggle = page.getByRole("button", { name: /inquire us/i }).first();
	await expect(inquiryToggle).toBeVisible();

	const detailOpenRequestPromise = waitForAnalyticsRequest(page, "detail_open");

	await inquiryToggle.click();

	await expectAnalyticsTracked(detailOpenRequestPromise);

	const testRunId = Date.now();
	await page.getByPlaceholder("Email").fill(`playwright-engagement-${testRunId}@example.com`);
	await page.getByPlaceholder("Name").fill("Playwright Engagement Test");
	await page.getByPlaceholder("Subject").fill("E2E engagement recording test");
	await page.getByPlaceholder("Message", { exact: true }).fill("This is an automated test inquiry. It verifies that the public site can write to the CMS engagement pipeline.");

	const inquiryResponsePromise = page.waitForResponse((response) => {
		const request = response.request();
		return request.method() === "POST" && response.url().includes("/api/inquiries");
	});

	await page.getByRole("button", { name: /send inquiry/i }).click();

	const inquiryResponse = await inquiryResponsePromise;
	expect(inquiryResponse.ok()).toBeTruthy();
	const inquiryPayload = await inquiryResponse.json();
	expect(inquiryPayload.ok).toBe(true);
	expect(inquiryPayload.inquiryId).toBeTruthy();

	await expect(page.getByText(/inquiry sent/i)).toBeVisible();

	const dwellRequestPromise = waitForAnalyticsRequest(page, "property_dwell_time");
	await page.waitForTimeout(5_200);
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await expectAnalyticsRequested(dwellRequestPromise);
});

function waitForAnalyticsRequest(page: Page, eventName: string) {
	return page.waitForRequest((request) => {
		const body = request.postData() ?? "";
		return request.method() === "POST"
			&& request.url().includes("/api/analytics")
			&& body.includes(`"event":"${eventName}"`);
	});
}

async function expectAnalyticsTracked(requestPromise: ReturnType<typeof waitForAnalyticsRequest>) {
	const request = await requestPromise;
	const response = await request.response();
	expect(response, `Expected ${request.postData()} to receive an API response`).toBeTruthy();
	expect(response?.ok()).toBeTruthy();
	const payload = await response?.json();
	expect(payload?.tracked, `Expected analytics response to be tracked, got ${JSON.stringify(payload)}`).toBe(true);
}

async function expectAnalyticsRequested(requestPromise: ReturnType<typeof waitForAnalyticsRequest>) {
	const request = await requestPromise;
	expect(request.postData()).toContain('"propertyId"');
}
