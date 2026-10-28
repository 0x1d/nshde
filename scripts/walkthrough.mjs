import { chromium } from "playwright";
import fs from "fs";

const outDir = "/opt/cursor/artifacts/screenshots";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false });
}

await page.goto("http://127.0.0.1:43123", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("01-home-welcome");

await page.locator("button", { hasText: "stats-card.nsh.tsx" }).click();
await shot("03-stats-card-editor");

await page.getByRole("button", { name: "run" }).first().click();
await shot("04-runtime-stats");

await page.locator("button", { hasText: "Implementer" }).click();
await shot("05-agent-implementer");
const textarea = page.getByPlaceholder("Describe the module to develop…");
await textarea.fill("Build a todo list module");
await page.getByRole("button", { name: "Develop module" }).click();
await page.getByText("Generating NSH component").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1500);
await shot("06-agent-generated-todo");

await page.getByTitle("Storage settings").click();
await shot("07-storage-settings");

await browser.close();
console.log("Screenshots saved to", outDir);
