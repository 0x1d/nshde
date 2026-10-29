import { chromium } from "playwright";
import fs from "fs";

const outDir = "/opt/cursor/artifacts/screenshots";
fs.mkdirSync(outDir, { recursive: true });

const UI_URL = process.env.NSHDE_UI_URL ?? "http://127.0.0.1:8791/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
}

await page.goto(UI_URL, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await shot("01-nsh-ide-home");

await page.getByRole("button", { name: /stats-card/i }).first().click().catch(() => {});
await shot("03-stats-card-editor");

await page.getByRole("button", { name: /Mount at runtime|live/i }).first().click().catch(() => {});
await shot("04-runtime-stats");

await page.getByRole("button", { name: "Implementer" }).click().catch(() => {});
await shot("05-agent-implementer");

await page.getByRole("textbox", { name: "Agent prompt" }).fill("Build a todo list module").catch(() => {});
await page.getByRole("button", { name: "Develop module" }).click().catch(() => {});
await page.waitForTimeout(2500);
await shot("06-agent-generated-todo");

await page.getByRole("button", { name: "Storage settings" }).click().catch(() => {});
await shot("07-storage-settings");

await browser.close();
console.log("Screenshots saved to", outDir);
