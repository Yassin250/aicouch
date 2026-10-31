const { chromium } = require("playwright");
const fs = require("fs");

const BASE = "http://localhost:3001";
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

  // 1. Quiz list
  await page.goto(`${BASE}/quizzes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/11-quizzes.png`, fullPage: true });
  console.log("quizzes ok");

  // 2. Open the first quiz (has a previous attempt -> review view)
  await page.locator('a[href^="/quizzes/c"]').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/13-quiz-review.png`, fullPage: true });
  console.log("review ok");

  // 3. Retake -> runner
  await page.getByRole("link", { name: /Retake/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/14-quiz-runner.png` });
  console.log("runner ok");

  // 4. Answer every question, then submit
  for (let i = 0; i < 12; i += 1) {
    await page.getByTestId("option-0").click();
    await page.waitForTimeout(180);

    const submit = page.getByTestId("quiz-submit");
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      break;
    }

    await page.getByTestId("quiz-next").click();
    await page.waitForTimeout(220);
  }

  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT}/15-quiz-results.png`, fullPage: true });
  console.log("results ok, url:", page.url());

  // 5. Planner
  await page.goto(`${BASE}/planner`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/16-planner.png`, fullPage: true });
  console.log("planner ok");

  // 6. Tick an activity
  const firstCheckbox = page.locator('button:has(span.rounded-\\[5px\\])').first();
  if (await firstCheckbox.isVisible().catch(() => false)) {
    await firstCheckbox.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/16b-planner-toggled.png`, fullPage: true });
    console.log("activity toggle ok");
  }

  // 7. Progress
  await page.goto(`${BASE}/progress`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/18-progress.png`, fullPage: true });
  console.log("progress ok");

  // 8. Dashboard
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/10-dashboard-v2.png`, fullPage: true });
  console.log("dashboard ok");

  // 9. Mobile
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${BASE}/progress`, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: `${OUT}/19-mobile-progress.png`, fullPage: true });
  console.log("mobile ok");

  console.log("\nConsole errors:", errors.length ? errors.slice(0, 8) : "none");

  await browser.close();
})();
