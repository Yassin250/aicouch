const { chromium } = require("playwright");

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', "student@mku.ac.rw");
  await page.fill('input[type="password"]', "Student@123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  for (const [path, file] of [
    ["/dashboard", "screenshots/ui-mobile-dashboard.png"],
    ["/materials", "screenshots/ui-mobile-materials.png"],
    ["/assistant", "screenshots/ui-mobile-assistant.png"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file);
  }

  await browser.close();
})();
