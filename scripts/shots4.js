const { chromium } = require("playwright");
const fs = require("fs");

const BASE = "http://localhost:3000";
const OUT = "screenshots";

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`PAGEERROR: ${err.message}`));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "student@mku.ac.rw");
  await page.fill("#password", "Student@123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Live AI badge on the dashboard
  await page.screenshot({ path: `${OUT}/20-dashboard-live.png`, fullPage: true });
  console.log("dashboard live ok");

  // Ask the coach a real question
  await page.goto(`${BASE}/assistant`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/21-assistant-live-empty.png` });

  await page.fill("textarea", "Explain the difference between 2NF and 3NF with a short example.");
  await page.keyboard.press("Enter");
  console.log("waiting for live answer…");

  // The model takes 15-40s; wait for the composer to be usable again.
  await page
    .waitForFunction(
      () => {
        const busy = document.querySelector('button[aria-label="Send question"]');
        return busy && !busy.hasAttribute("disabled");
      },
      { timeout: 120000 },
    )
    .catch(() => console.log("  (timed out waiting for idle)"));

  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/22-assistant-live-answer.png` });
  console.log("assistant live ok");

  // Material with an AI summary
  await page.goto(`${BASE}/materials`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator('a[href^="/materials/c"]').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/23-material-live-summary.png`, fullPage: true });
  console.log("material summary ok");

  // AI-generated quiz in the library
  await page.goto(`${BASE}/quizzes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/24-quizzes-live.png`, fullPage: true });
  console.log("quizzes ok");

  console.log("\nConsole errors:", errors.length ? errors.slice(0, 6) : "none");

  await browser.close();
})();
