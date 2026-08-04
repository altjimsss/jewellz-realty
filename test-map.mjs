import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => {
	if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push("PAGEERROR: " + err.message));
await page.goto("http://localhost:3000/project-list/azure-studio-condo", { waitUntil: "networkidle" });
const btn = page.getByRole("button", { name: /open map/i }).first();
console.log("Button visible:", await btn.isVisible());
await btn.click();
await page.waitForTimeout(3000);
const mapContainer = await page.$("#property-location-map");
console.log("Map container present after click:", !!mapContainer);
const leafletContainer = await page.$(".leaflet-container");
console.log("Leaflet container present after click:", !!leafletContainer);
console.log("Button text now:", await btn.textContent().catch(() => "n/a"));
console.log("Console errors:", JSON.stringify(errors, null, 2));
await browser.close();
