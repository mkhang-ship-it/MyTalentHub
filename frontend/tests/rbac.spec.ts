import { test, expect } from "@playwright/test";
import { loginAs, guardConsole } from "./helpers";

/**
 * RBAC ở tầng giao diện + API:
 * - Chưa đăng nhập mà mở /school → bị chuyển về /login.
 * - Học sinh mở /school và /enterprise → KHÔNG thấy dữ liệu của cổng khác
 *   (API trả 403, trang hiện thông báo từ chối thay vì dữ liệu).
 */
test("chưa đăng nhập mở /school bị chuyển về /login", async ({ page }) => {
  const guard = guardConsole(page);
  await page.goto("/school");
  await expect(page).toHaveURL(/\/login/);
  guard.assertClean();
});

for (const path of ["/school", "/enterprise"]) {
  test(`học sinh không xem được dữ liệu ở ${path} (403)`, async ({ page }) => {
    // 403 từ API là hành vi ĐÚNG ở đây → cho guard bỏ qua tiếng ồn mạng đó,
    // nhưng bắt buộc phải thấy ít nhất 1 response 403 thật (chống xanh giả).
    const guard = guardConsole(page, { ignoreHttp: [403] });
    const denied: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/api/") && res.status() === 403) denied.push(res.url());
    });

    await loginAs(page, "student");
    await expect(page).toHaveURL(/\/student/);

    await page.goto(path);
    // Không redirect nhưng trang phải hiện dấu hiệu từ chối (mã 403 từ API),
    // chứng tỏ không lọt dữ liệu của cổng khác.
    await expect(page.locator("body")).toContainText(/403|không đủ quyền|mới được truy cập/i);
    expect(denied.length, `không thấy API nào trả 403 ở ${path}`).toBeGreaterThan(0);

    guard.assertClean();
  });
}
