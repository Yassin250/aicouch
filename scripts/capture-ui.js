const { chromium } = require("playwright");

const BASE = "http://localhost:3000";

async function shot(page, path, file, fullPage = true) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: file, fullPage });
  console.log("saved", file);
}

async function login(browser, email, password) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  return page;
}

(async () => {
  const browser = await chromium.launch();

  // Public
  const pubCtx = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const pub = await pubCtx.newPage();
  await shot(pub, "/", "screenshots/ui-landing.png");
  await shot(pub, "/login", "screenshots/ui-login.png", false);

  // Student
  const student = await login(browser, "student@mku.ac.rw", "Student@123");
  await shot(student, "/dashboard", "screenshots/ui-dashboard.png");
  await shot(student, "/materials", "screenshots/ui-materials.png");
  await shot(student, "/quizzes", "screenshots/ui-quizzes.png");
  await shot(student, "/progress", "screenshots/ui-progress.png");
  await shot(student, "/planner", "screenshots/ui-planner.png");
  await shot(student, "/assistant", "screenshots/ui-assistant.png");

  // Admin
  const admin = await login(browser, "admin@mku.ac.rw", "Admin@123");
  await shot(admin, "/admin", "screenshots/ui-admin.png");
  await shot(admin, "/admin/users", "screenshots/ui-admin-users.png");

  await browser.close();
})();
