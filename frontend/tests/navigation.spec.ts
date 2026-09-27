import { test, expect } from "@playwright/test";
import {
  loginAs,
  guardConsole,
  assertNoRawTemplateLiteral,
  type Role,
} from "./helpers";

test("trang chủ (/) không đỏ console", async ({ page }) => {
  const guard = guardConsole(page);
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/FTalentHub/);
  guard.assertClean();
});

/** Mỗi vai trò điều hướng được tới trang chính: khung cổng đúng + nội dung render. */
const FLOWS: { role: Role; nav: RegExp; pages: string[] }[] = [
  { role: "student", nav: /Hồ sơ năng lực/, pages: ["/student", "/student/profile", "/student/activities"] },
  { role: "teacher", nav: /Sân chơi của tôi/, pages: ["/teacher", "/teacher/activities", "/teacher/classes"] },
  { role: "coach", nav: /Sân chơi của tôi/, pages: ["/coach", "/coach/students"] },
  { role: "school", nav: /Phân tích năng lực/, pages: ["/school", "/school/settings", "/school/classes"] },
  { role: "enterprise", nav: /Tìm nhân tài/, pages: ["/enterprise", "/enterprise/talents", "/enterprise/internships"] },
];

for (const flow of FLOWS) {
  test(`điều hướng cổng ${flow.role}: ${flow.pages.join(", ")}`, async ({ page }) => {
    const guard = guardConsole(page);
    await loginAs(page, flow.role);
    await expect(page.locator("body")).toContainText(flow.nav);

    for (const path of flow.pages) {
      await page.goto(path);
      // Chờ hết request mạng trước khi kiểm nội dung. Nhãn nav nằm sẵn trong
      // khung nên `toContainText(nav)` khớp ngay cả khi thân trang còn đang tải;
      // các ô kiểm phía dưới sẽ chạy vào đúng lúc đó và bỏ sót lỗi hiển thị.
      await page.waitForLoadState("networkidle");
      // Khung cổng vẫn đúng + trang có nội dung thật (không trắng, không kẹt loading)
      await expect(page.locator("body")).toContainText(flow.nav);
      const len = await page.evaluate(() => document.body.innerText.length);
      expect(len, `trang trắng hoặc rỗng ở ${path}`).toBeGreaterThan(100);
      // Bắt lỗi quên dấu $ trong template string: tsc và eslint không thấy,
      // nhưng người dùng thấy nguyên chữ {data.xxx} thay vì giá trị.
      await assertNoRawTemplateLiteral(page);
      // Project mobile: phát hiện lỗi bố cục (tràn ngang màn hình 390px)
      if (test.info().project.name === "mobile") {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `tràn ngang ở ${path} (mobile 390px)`).toBeLessThanOrEqual(2);
      }
    }

    guard.assertClean();
  });
}

test("trang Chấm điểm khi chưa phụ trách sân chơi nào hiện hướng dẫn (không treo loading)", async ({
  page,
}) => {
  // Hồi quy: giáo viên không có sân chơi từng bị kẹt 'Đang tải...' vô hạn.
  const guard = guardConsole(page);
  await loginAs(page, "teacher");
  await page.goto("/teacher/grading");
  await expect(page.locator("body")).toContainText(/chưa phụ trách sân chơi nào/i);
  guard.assertClean();
});
