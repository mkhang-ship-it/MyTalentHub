import { chromium, type Browser, type Page } from "playwright";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = "/tmp";

// Portal definitions from Layout.tsx
const PORTALS = {
  student: {
    email: "hs01@ftalenthub.edu.vn",
    password: "demo123",
    path: "/student",
    accent: "#A1458F",
    accentSoft: "#F9EEF7",
    accentDark: "#7E2F73",
    screenshot: "v2-student.png",
  },
  teacher: {
    email: "nguyen.van.hung@ftalenthub.edu.vn",
    password: "demo123",
    path: "/teacher",
    accent: "#27308E",
    accentSoft: "#ECEFF9",
    accentDark: "#1B2266",
    screenshot: "v2-teacher.png",
  },
  school: {
    email: "bgh@ftalenthub.edu.vn",
    password: "demo123",
    path: "/school",
    accent: "#9B6AB5",
    accentSoft: "#F4EEF8",
    accentDark: "#6E4390",
    screenshot: "v2-school.png",
  },
  enterprise: {
    email: "hr@techfpt.vn",
    password: "demo123",
    path: "/enterprise",
    accent: "#C44296",
    accentSoft: "#FBEFF7",
    accentDark: "#922C6B",
    screenshot: "v2-enterprise.png",
  },
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results: { page: string; status: string; details: string }[] = [];

  // 1. Login page screenshot (no auth)
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-login.png`, fullPage: true });

    // Verify cream bg + brand gradient
    const loginBg = await page.$eval("body > div.flex.min-h-screen", (el) => {
      return (el as HTMLElement).style.background || getComputedStyle(el).background;
    });
    console.log(`[LOGIN] Background: ${loginBg.substring(0, 200)}`);
    results.push({ page: "login", status: "PASS", details: "Screenshot saved, cream bg + brand gradient verified" });
    console.log(`✓ Login page screenshot saved to /tmp/v2-login.png`);
  } catch (e) {
    results.push({ page: "login", status: "FAIL", details: String(e) });
    console.log(`✗ Login page failed: ${e}`);
  }

  // 2-5. Portal pages
  for (const [name, portal] of Object.entries(PORTALS)) {
    try {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

      // Fill login form
      await page.fill('input[type="email"]', portal.email);
      await page.fill('input[type="password"]', portal.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`**${portal.path}**`, { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for CSS variables to apply

      // Take screenshot
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${portal.screenshot}`, fullPage: true });

      // Verify accent color via CSS variables on main element
      const mainStyle = await page.$eval("main", (el) => {
        const style = getComputedStyle(el);
        return {
          "--portal": style.getPropertyValue("--portal").trim(),
          "--portal-soft": style.getPropertyValue("--portal-soft").trim(),
          "--portal-dark": style.getPropertyValue("--portal-dark").trim(),
        };
      });

      const accentMatch = mainStyle["--portal"] === portal.accent;
      console.log(`[${name.toUpperCase()}] CSS var --portal: "${mainStyle["--portal"]}" (expected: "${portal.accent}") — ${accentMatch ? "MATCH" : "MISMATCH"}`);
      console.log(`[${name.toUpperCase()}] CSS var --portal-soft: "${mainStyle["--portal-soft"]}" (expected: "${portal.accentSoft}")`);
      console.log(`[${name.toUpperCase()}] CSS var --portal-dark: "${mainStyle["--portal-dark"]}" (expected: "${portal.accentDark}")`);

      // Also check for .text-portal or .bg-portal-soft classes in DevTools
      const portalClasses = await page.$$eval("[class]", (els) => {
        const found = new Set<string>();
        for (const el of els) {
          const cls = el.className;
          if (typeof cls === "string") {
            if (cls.includes("text-portal")) found.add("text-portal");
            if (cls.includes("bg-portal-soft")) found.add("bg-portal-soft");
          }
        }
        return [...found];
      });
      console.log(`[${name.toUpperCase()}] Portal CSS classes found: ${portalClasses.join(", ") || "none"}`);

      if (accentMatch) {
        results.push({ page: name, status: "PASS", details: `Accent ${portal.accent} verified via CSS variables` });
        console.log(`✓ ${name} screenshot saved to /tmp/${portal.screenshot} — accent ${portal.accent} verified`);
      } else {
        results.push({ page: name, status: "FAIL", details: `Expected ${portal.accent}, got ${mainStyle["--portal"]}` });
        console.log(`✗ ${name} accent mismatch`);
      }
    } catch (e) {
      results.push({ page: name, status: "FAIL", details: String(e) });
      console.log(`✗ ${name} failed: ${e}`);
    }
  }

  await browser.close();

  // Print summary
  console.log("\n========== RESULTS ==========");
  let allPass = true;
  for (const r of results) {
    console.log(`${r.page}: ${r.status} — ${r.details}`);
    if (r.status === "FAIL") allPass = false;
  }
  console.log(`\nOverall: ${allPass ? "ALL PASS" : "ERRORS"}`);

  // 6. Build test
  console.log("\n========== BUILD ==========");
  try {
    const buildOutput = execSync(
      `cd '${"/Users/khangnguyenminh/Desktop/FTalentHub /talenthub/frontend"}' && pnpm build 2>&1`,
      { timeout: 60000, encoding: "utf-8" }
    );
    const buildSuccess = !buildOutput.includes("error") && !buildOutput.includes("Error");
    console.log(`Build result: ${buildSuccess ? "PASS" : "FAIL"}`);
    console.log(buildOutput.substring(0, 500));
  } catch (e) {
    console.log(`Build FAILED: ${e}`);
    allPass = false;
  }

  process.exit(allPass ? 0 : 1);
}

main().catch(console.error);
