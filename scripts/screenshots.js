const { chromium } = require("playwright");
const fs = require("fs");

const BASE = "http://localhost:3100";
const OUT = ".screenshots";

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`PAGEERROR: ${err.message}`));

  // 1. Landing
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: true });
  console.log("landing ok");

  // 2. Login page
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/02-login.png` });
  console.log("login page ok");

  // 3. Sign in as the demo student
  await page.fill("#email", "student@mku.ac.rw");
  await page.fill("#password", "Student@123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/03-dashboard.png`, fullPage: true });
  console.log("dashboard ok");

  // 4. Materials list
  await page.goto(BASE + "/materials", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/04-materials.png`, fullPage: true });
  console.log("materials ok");

  // 5. Material detail
  const materialLink = page.locator('a[href^="/materials/c"]').first();
  await materialLink.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/05-material-detail.png`, fullPage: true });
  console.log("material detail ok");

  // 6. Assistant empty state
  await page.goto(BASE + "/assistant", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06-assistant-empty.png` });
  console.log("assistant empty ok");

  // 7. Ask a question
  await page.fill("textarea", "Why does normalisation reduce data redundancy?");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/07-assistant-answer.png` });
  console.log("assistant answer ok");

  // 8. Upload dialog
  await page.goto(BASE + "/materials", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Upload notes/i }).first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/08-upload-dialog.png` });
  console.log("upload dialog ok");

  // 9. Mobile dashboard
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await mobile.waitForTimeout(900);
  await mobile.screenshot({ path: `${OUT}/09-mobile-dashboard.png`, fullPage: true });
  console.log("mobile ok");

  console.log("\nConsole errors:", errors.length ? errors.slice(0, 10) : "none");

  await browser.close();
})();
