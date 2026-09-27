import { defineConfig, devices } from "@playwright/test";

/**
 * Kiểm thử giao diện FTalentHub (chạy bằng `npx playwright test` trong frontend/).
 *
 * - baseURL trỏ vào Vite dev server :5174 (proxy /api sang backend :8001).
 * - webServer tự khởi động backend + frontend rồi tự tắt khi xong; nếu cổng đã có
 *   server đang chạy (chế độ dev thường ngày) thì TÁI DÙNG thay vì khởi động mới
 *   (tránh 2 backend cùng giữ một file SQLite).
 * - Trên CI (CI=true) luôn khởi động server mới.
 */
export default defineConfig({
  testDir: "./tests",
  // Chạy tuần tự: các test dùng chung DB dev + cùng cổng, chạy song song dễ gây nhiễu.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  // 1 lần thử lại: test chập chờn (mạng, chunk lazy-load) thường xanh ở lần
  // chạy kế tiếp. Không có retries thì một lần nhiễu chặn cả pipeline CI.
  retries: process.env.CI ? 1 : 0,
  // Cần cả `html`: CI upload artifact `frontend/playwright-report/` khi test
  // hỏng. Chỉ có `list` thì thư mục đó không tồn tại và upload rỗng.
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    // `on-first-retry` thay vì `retain-on-failure`:
    //  - `retain-on-failure` phải ráp trace cho MỌI test, kể cả test xanh, và
    //    đó là lúc Playwright tự gây flake ENOENT ở teardown (ráp trace.zip vào
    //    .playwright-artifacts-* đã bị dọn) — fail oan.
    //  - `on-first-retry` chỉ quay lúc thử lại, tức đúng lúc test đang hỏng
    //    và trace mới có giá trị chẩn đoán. Test xanh không phải ráp gì.
    trace: "on-first-retry",
    // Chụp ảnh màn hình khi hỏng: rẻ hơn trace nhiều mà thấy ngay lỗi hiển thị.
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      // Backend FastAPI (chỉ khởi động khi :8001 chưa có ai nghe).
      command: "python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001",
      cwd: "../backend",
      url: "http://127.0.0.1:8001/api/v1/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Frontend Vite (chỉ khởi động khi :5174 chưa có ai nghe).
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174/login",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_PROXY: "http://127.0.0.1:8001",
        VITE_PORT: "5174",
      },
    },
  ],
});
