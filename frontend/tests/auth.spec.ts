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
  // NGUYÊN TẮC: thao tác cố tình thất bại KHÔNG BAO GIỜ dùng tài khoản demo thật.
  // Backend chặn 5 lần sai / 10 phút kể cả đăng nhập đúng (429) — dùng hs01 ở đây
  // sẽ tự khóa tài khoản demo. Email không tồn tại cho cùng phản hồi 401 nên
  // vẫn kiểm đúng thứ cần kiểm (giao diện báo lỗi, không trắng trang).
  // 401 là thứ đang kiểm. 429 cũng chấp nhận được vì chính test này tạo ra nó
  // khi chạy nhiều lần — xem giải thích email bên dưới.
  const guard = guardConsole(page, { ignoreHttp: [401, 429] });
  await page.goto("/login");
  // Email KHÔNG tồn tại và MỚI cho mỗi lần chạy. Hai lý do cùng lúc:
  //  - không thuộc tài khoản demo nào, nên không khoá nhầm tài khoản thật;
  //  - là mới mỗi lần, nên bộ test chạy lặp nhiều lần không tự dồn đủ 5 lần
  //    sai để backend khoá chính email đó rồi trả 429.
  await page.fill(
    'input[type="email"]',
    `khong-ton-tai-${Date.now()}-kiem-thu@vidu.com`
  );
  await page.fill('input[type="password"]', "sai-mat-khau-co-tinh");
  await page.click('button[type="submit"]');

  // Vẫn ở trang login + hiện hội lỗi có chữ tiếng Việt (không redirect, không trắng trang)
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("body")).toContainText(/mật khẩu|quá nhiều|lần/i);
  const len = await page.evaluate(() => document.body.innerText.length);
  expect(len, "trang trắng khi đăng nhập sai").toBeGreaterThan(100);

  guard.assertClean();
});
