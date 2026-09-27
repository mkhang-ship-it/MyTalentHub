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
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
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
