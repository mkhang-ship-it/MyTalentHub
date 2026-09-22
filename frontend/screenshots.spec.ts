import { test, expect } from "@playwright/test";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = "/tmp";

const PORTALS: Record<string, { email: string; password: string; path: string; accent: string; accentSoft: string; accentDark: string; screenshot: string }> = {
  student: { email: "hs01@ftalenthub.edu.vn", password: "demo123", path: "/student", accent: "#A1458F", accentSoft: "#F9EEF7", accentDark: "#7E2F73", screenshot: "v2-student.png" },
  teacher: { email: "nguyen.van.hung@ftalenthub.edu.vn", password: "demo123", path: "/teacher", accent: "#27308E", accentSoft: "#ECEFF9", accentDark: "#1B2266", screenshot: "v2-teacher.png" },
  school: { email: "bgh@ftalenthub.edu.vn", password: "demo123", path: "/school", accent: "#9B6AB5", accentSoft: "#F4EEF8", accentDark: "#6E4390", screenshot: "v2-school.png" },
  enterprise: { email: "hr@techfpt.vn", password: "demo123", path: "/enterprise", accent: "#C44296", accentSoft: "#FBEFF7", accentDark: "#922C6B", screenshot: "v2-enterprise.png" },
};

test.describe("FTalentHub Portal Verification", () => {

  test("1. Login page - cream bg #FDF7F1 + brand gradient", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/v2-login.png`, fullPage: true });
    const loginBg = await page.locator('div.flex.min-h-screen').evaluate((el) => {
      return (el as HTMLElement).style.background || getComputedStyle(el).background;
    });
    expect(loginBg).toContain("rgb(253, 247, 241)");
    expect(loginBg).toContain("gradient");
  });

  for (const [name, p] of Object.entries(PORTALS)) {
    test(`${name === "student" ? "2." : name === "enterprise" ? "3." : name === "school" ? "4." : "5."} ${name} page - accent ${p.accent}`, async ({ page }) => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
      await page.fill('input[type="email"]', p.email);
      await page.fill('input[type="password"]', p.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`**${p.path}**`, { timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/${p.screenshot}`, fullPage: true });

      const mainStyle = await page.$eval("main", (el) => {
        const s = getComputedStyle(el);
        return { portal: s.getPropertyValue("--portal").trim(), portalSoft: s.getPropertyValue("--portal-soft").trim(), portalDark: s.getPropertyValue("--portal-dark").trim() };
      });

      expect(mainStyle.portal).toBe(p.accent);
      expect(mainStyle.portalSoft).toBe(p.accentSoft);
      expect(mainStyle.portalDark).toBe(p.accentDark);

      const hasPortalClasses = await page.$$eval("[class]", (els) => {
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
      expect(hasPortalClasses.length).toBeGreaterThan(0);
    });
  }
});

test.describe("Build", () => {
  test("pnpm build passes", async () => {
    const out = execSync(`cd '${"/Users/khangnguyenminh/Desktop/FTalentHub /talenthub/frontend"}' && pnpm build 2>&1`, { timeout: 60000, encoding: "utf-8" });
    expect(out).not.toContain("error");
    expect(out).not.toContain("Error");
  });
});
