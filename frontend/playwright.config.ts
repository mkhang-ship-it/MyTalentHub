import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Kiểm thử giao diện FTalentHub (`npx playwright test` trong frontend/).
 *
 * HAI CHẾ ĐỘ CHẠY:
 * 1. Dev (mặc định): tái dùng server dev đang chạy (FE :5174, BE :8001).
 *    Test thao tác GHI bị SKIP — trừ khi `WRITE_TESTS=1` (khi đó chúng ghi vào
 *    DB dev THẬT, nhưng mỗi test tự dọn sạch trong finally và tự FAIL nếu sót).
 * 2. Cách ly (`CI=true`): copy `backend/talenthub.db` ra thư mục tạm cố định,
 *    khởi động backend riêng (cổng 8101) với `DATABASE_URL` trỏ vào bản sao,
 *    FE riêng (cổng 5175) proxy theo; xong việc globalTeardown xóa thư mục tạm.
 *    Test ghi chạy thoải mái. Không chạy 2 bộ cách ly song song.
 *
 * Project: `desktop` (toàn bộ suite) + `mobile` (390x844, chỉ auth+navigation
 * để giữ thời gian hợp lý).
 */

const DEV_BACKEND_URL = "http://127.0.0.1:8001";
const DEV_FRONTEND_PORT = 5174;

const ISOLATED = !!process.env.CI;
const WRITE_TESTS_ENABLED = ISOLATED || process.env.WRITE_TESTS === "1";
// `npx playwright test --list` cũng nạp config nhưng không chạy gì — bỏ qua
// việc sao chép DB để khỏi rò rỉ thư mục tạm.
const LIST_ONLY = process.argv.includes("--list");

/**
 * QUAN TRỌNG: Playwright nạp file config này NHIỀU LẦN trong các tiến trình
 * khác nhau (main + worker). Mọi giá trị suy ra ở scope module PHẢI tất định
 * (deterministic): cổng cố định, đường dẫn tạm cố định. Tuyệt đối không dùng
 * cổng ngẫu nhiên hay `mkdtemp` ở đây — mỗi lần nạp sẽ ra một giá trị khác
 * nhau, tiến trình chạy test dùng baseURL khác với server đã khởi động và toàn
 * bộ suite fail với ERR_CONNECTION_REFUSED. (Bài học xương máu vòng 4.)
 * Không chạy 2 bộ test cách ly song song trên cùng máy.
 */
const ISOLATED_BE_PORT = Number(process.env.FTH_PW_BE_PORT ?? 8101);
const ISOLATED_FE_PORT = Number(process.env.FTH_PW_FE_PORT ?? 5175);
const ISOLATED_TMPDIR = path.join(os.tmpdir(), "fth-pw-isolated");

function prepareIsolatedDb(): void {
  const src = path.resolve(process.cwd(), "../backend/talenthub.db");
  if (!fs.existsSync(src)) {
    throw new Error(`Không thấy DB dev để sao chép: ${src}`);
  }
  fs.mkdirSync(ISOLATED_TMPDIR, { recursive: true });
  fs.copyFileSync(src, path.join(ISOLATED_TMPDIR, "test.db"));
  // globalTeardown đọc biến này để dọn thư mục tạm.
  process.env.FTH_PW_TMPDIR = ISOLATED_TMPDIR;
}

let backendURL = DEV_BACKEND_URL;
let frontendPort = DEV_FRONTEND_PORT;

if (ISOLATED && !LIST_ONLY) {
  prepareIsolatedDb();
  const bePort = ISOLATED_BE_PORT;
  frontendPort = ISOLATED_FE_PORT;
  backendURL = `http://127.0.0.1:${bePort}`;
  console.log(
    `[playwright] Chế độ CÁCH LY: backend riêng :${bePort} với DB sao chép tại ${ISOLATED_TMPDIR} (DB dev không bị đụng tới).`
  );
} else if (WRITE_TESTS_ENABLED) {
  console.warn(
    [
      "[playwright] CẢNH BÁO: WRITE_TESTS=1 — test thao tác ghi SẼ GHI VÀO DB DEV THẬT",
      `(${DEV_BACKEND_URL}, file backend/talenthub.db). Mỗi test tự dọn trong finally và tự FAIL`,
      "nếu còn sót dữ liệu. Chỉ dùng khi bạn cố ý kiểm tra ghi trên môi trường dev.",
    ].join("\n")
  );
} else {
  console.warn(
    "[playwright] Chế độ dev: tái dùng server đang chạy; các test thao tác ghi bị SKIP " +
      "(chạy với WRITE_TESTS=1 để kiểm ghi, hoặc CI=true để dùng DB cách ly)."
  );
}

export default defineConfig({
  testDir: "./tests",
  globalTeardown: "./tests/global-teardown",
  // Chạy tuần tự: các test dùng chung DB + cùng cổng, chạy song song dễ gây nhiễu.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    // TẮT trace: `retain-on-failure` gây flake hạ tầng (ENOENT khi Playwright
    // ráp trace.zip ở teardown) làm fail oan test dài nhất suite dù app xanh.
    trace: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Viewport điện thoại 390x844: chỉ chạy lại auth + navigation để phát
      // hiện lỗi bố cục, không chạy lại toàn bộ (giữ thời gian hợp lý).
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
      testMatch: ["**/auth.spec.ts", "**/navigation.spec.ts"],
    },
  ],
  webServer: [
    {
      command: `python3 -m uvicorn app.main:app --host 127.0.0.1 --port ${new URL(backendURL).port}`,
      cwd: "../backend",
      url: `${backendURL}/api/v1/health`,
      timeout: 120_000,
      reuseExistingServer: !ISOLATED,
      env: ISOLATED
        ? {
            DATABASE_URL: `sqlite:///${path.join(process.env.FTH_PW_TMPDIR ?? "", "test.db")}`,
            LOG_LEVEL: "WARNING",
            MAIL_TO_OUTBOX: "true",
            ALLOW_UNVERIFIED_EMAIL: "true",
          }
        : {},
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}/login`,
      timeout: 120_000,
      reuseExistingServer: !ISOLATED,
      env: {
        VITE_API_PROXY: backendURL,
        VITE_PORT: String(frontendPort),
      },
    },
  ],
});
