import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => {
	if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push("PAGEERROR: " + err.message));
page.on("requestfailed", (req) => {
	const url = req.url();
	if (url.includes("tile")) errors.push("TILE FAILED: " + req.failure()?.errorText + " " + url);
});
page.on("response", (res) => {
	const url = res.url();
	if (url.includes("tile")) errors.push("TILE HTTP " + res.status() + " " + url);
});

const start = Date.now();
await page.goto("http://localhost:3000/project-list/luxury-family-home", { waitUntil: "domcontentloaded" });
console.log("domcontentloaded in", Date.now() - start, "ms");
await page.waitForTimeout(2000);
console.log("Button visible:", await page.getByRole("button", { name: /open map/i }).isVisible().catch(() => "n/a"));

const btn = page.getByRole("button", { name: /open map/i }).first();
await btn.click();
await page.waitForTimeout(5000);
const mapContainer = await page.$("#property-location-map");
console.log("Map container present after click:", !!mapContainer);
const leafletContainer = await page.$(".leaflet-container");
console.log("Leaflet container present after click:", !!leafletContainer);
const tileCount = await page.$$eval(".leaflet-tile", (els) => els.length).catch(() => -1);
console.log("Tile <img> count:", tileCount);
const containerSize = await page.$eval(".leaflet-container", (el) => ({ w: el.clientWidth, h: el.clientHeight })).catch(() => null);
console.log("Leaflet container size:", JSON.stringify(containerSize));
console.log("Button text now:", await btn.textContent().catch(() => "n/a"));
console.log("Console errors:", JSON.stringify(errors, null, 2));
await browser.close();
