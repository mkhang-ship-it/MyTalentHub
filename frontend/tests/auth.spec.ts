import { test, expect } from "@playwright/test";
import { ACCOUNTS, loginAs, guardConsole, type Role } from "./helpers";

/**
 * Đăng nhập thành công với cả 5 vai trò:
 * submit form → về đúng trang chủ của vai trò + thấy nhãn vai trò trong khung,
 * không trang trắng, không lỗi console.
 */
const ROLES = Object.keys(ACCOUNTS) as Role[];

for (const role of ROLES) {
  test(`đăng nhập thành công vai trò ${role} (${ACCOUNTS[role].email})`, async ({ page }) => {
    const guard = guardConsole(page);
    await loginAs(page, role);

    await expect(page).toHaveURL(new RegExp(ACCOUNTS[role].home.replace("/", "\\/")));
    await expect(page.locator("body")).toContainText(ACCOUNTS[role].label);
    const len = await page.evaluate(() => document.body.innerText.length);
    expect(len, "trang trắng sau đăng nhập").toBeGreaterThan(100);

    guard.assertClean();
  });
}

test("đăng nhập sai mật khẩu báo lỗi tiếng Việt, không trang trắng", async ({ page }) => {
  const guard = guardConsole(page);
  await page.goto("/login");
  await page.fill('input[type="email"]', ACCOUNTS.student.email);
  await page.fill('input[type="password"]', "sai-mat-khau-co-tinh");
  await page.click('button[type="submit"]');

  // Vẫn ở trang login + hiện hộp lỗi có chữ tiếng Việt (không redirect, không trắng trang)
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("body")).toContainText(/mật khẩu/i);
  const len = await page.evaluate(() => document.body.innerText.length);
  expect(len, "trang trắng khi đăng nhập sai").toBeGreaterThan(100);

  guard.assertClean();
});
