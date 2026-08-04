import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.spec.ts",
	timeout: 90_000,
	expect: {
		timeout: 10_000,
	},
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [["html"], ["list"]],
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	webServer: {
		command: `npm run dev -- --hostname localhost --port ${port}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
