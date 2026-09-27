import { test, expect, type APIRequestContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { guardConsole } from "./helpers";

/**
 * Quên / đặt lại mật khẩu + xác minh email (backend vòng 3).
 *
 * NGUYÊN TẮC AN TOÀN (bắt buộc):
 * - TUYỆT ĐỐI không dùng 5 tài khoản demo cho thao tác cố tình thất bại hay đổi
 *   mật khẩu: backend chặn 5 lần sai/10 phút (kể cả đăng nhập đúng → 429), và
 *   policy mật khẩu (>= 8 ký tự, có hoa, có số) khiến "demo123" KHÔNG THỂ đặt
 *   lại qua endpoint reset — đổi pass demo rồi là hỏng vĩnh viễn.
 * - Luồng đổi mật khẩu chạy trên tài khoản test RIÊNG, email cố định
 *   (không phình DB qua các lần chạy), mật khẩu cuối luôn khôi phục về giá trị
 *   đã biết trong `finally`. Test FAIL ầm ĩ nếu khôi phục thất bại.
 */

const OUTBOX = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../backend/outbox"
);

const PWTEST_EMAIL = "pwtest-dat-lai@example.com";
const PWTEST_NAME = "Tài Khoản Test Đặt Lại";
/** Mật khẩu đã biết / trạng thái cuối (đạt policy: >= 8 ký tự, có hoa, có số). */
const PWTEST_PASS = "Pwtest1234";
/** Mật khẩu dùng trong pha "đã đổi" của test. */
const PWTEST_NEW = "Pwtest5678";

/** Đọc token reset mới nhất trong outbox cho email, chờ tối đa `timeoutMs`. */
async function latestResetToken(email: string, sinceMs: number, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const files = fs
      .readdirSync(OUTBOX)
      .filter((f) => f.includes(`-reset-${email}.html`))
      .map((f) => path.join(OUTBOX, f))
      .filter((p) => fs.statSync(p).mtimeMs > sinceMs)
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
    if (files.length > 0) {
      const html = fs.readFileSync(files[files.length - 1], "utf-8");
      const m = html.match(/token=([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
    if (Date.now() > deadline) {
      throw new Error(`Không thấy file outbox reset cho ${email} sau ${timeoutMs}ms`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** Xin link reset mới qua API rồi trả về token đọc từ outbox. */
async function freshResetToken(request: APIRequestContext, email: string): Promise<string> {
  const since = Date.now();
  const res = await request.post("/api/v1/auth/forgot-password", { data: { email } });
  expect(res.ok(), "forgot-password phải luôn 200").toBeTruthy();
  return latestResetToken(email, since);
}

/**
 * Đảm bảo tài khoản test tồn tại và đang ở mật khẩu đã biết.
 * Email cố định → chạy lại không tạo thêm dòng DB.
 */
async function ensurePwtestAccount(request: APIRequestContext): Promise<void> {
  const reg = await request.post("/api/v1/auth/register", {
    data: {
      full_name: PWTEST_NAME,
      email: PWTEST_EMAIL,
      password: PWTEST_PASS,
      role: "student",
      class_name: "10A1",
      grade: 10,
    },
  });
  if (reg.status() === 409) {
    // Đã tồn tại từ lần chạy trước → phải đăng nhập được bằng pass đã biết,
    // nếu không nghĩa là lần chạy trước chết giữa chừng (mật khẩu lạ).
    const login = await request.post("/api/v1/auth/login", {
      data: { email: PWTEST_EMAIL, password: PWTEST_PASS },
    });
    expect(login.ok(), "tài khoản test tồn tại nhưng không login được bằng pass đã biết").toBeTruthy();
    return;
  }
  expect(reg.ok(), `đăng ký tài khoản test thất bại: ${await reg.text()}`).toBeTruthy();
}

async function apiLogin(request: APIRequestContext, email: string, password: string): Promise<boolean> {
  const res = await request.post("/api/v1/auth/login", { data: { email, password } });
  return res.ok();
}

test("quên mật khẩu → đặt lại → đăng nhập pass mới → khôi phục pass cũ", async ({
  page,
  request,
}) => {
  // Đổi mật khẩu sẽ thu hồi phiên cũ, nên /auth/me trả 401 một lần rồi ứng
  // dụng đưa người dùng về trang đăng nhập — đó là hành vi ĐÚNG. Guard bỏ qua
  // 401; các status khác (500, 403…) và mọi lỗi pageerror vẫn làm fail.
  const guard = guardConsole(page, { ignoreHttp: [401] });
  await ensurePwtestAccount(request);
  expect(await apiLogin(request, PWTEST_EMAIL, PWTEST_PASS), "sanity: login pass cũ").toBeTruthy();

  try {
    // 1) Quên mật khẩu qua UI: thông điệp nêu rõ email đã nhập, không lộ tồn tại.
    await page.goto("/quen-mat-khau");
    await page.fill('input[type="email"]', PWTEST_EMAIL);
    await page.click('button[type="submit"]');
    await expect(page.locator("body")).toContainText(PWTEST_EMAIL);
    await expect(page.locator("body")).toContainText(/kiểm tra hộp thư/i);
    await expect(page.locator("body")).not.toContainText(/không tồn tại/i);

    // 2) Lấy token từ outbox (không hard-code) → đặt lại qua UI.
    const token = await freshResetToken(request, PWTEST_EMAIL);
    await page.goto(`/dat-lai-mat-khau?token=${token}`);
    await page.fill("#reset-password", PWTEST_NEW);
    await page.fill("#reset-confirm", PWTEST_NEW);
    await page.click('button[type="submit"]');

    // 3) Thành công → về /login kèm thông báo.
    await expect(page).toHaveURL(/\/login\?dat-lai=thanh-cong/);
    await expect(page.locator("body")).toContainText(/Đặt lại mật khẩu thành công/i);

    // 4) Đăng nhập được bằng mật khẩu MỚI (chứng minh đổi thật).
    await page.fill('input[type="email"]', PWTEST_EMAIL);
    await page.fill('input[type="password"]', PWTEST_NEW);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/student/);

    // Đăng xuất để xóa token khỏi trình duyệt: bước khôi phục (finally) sẽ
    // thu hồi token của pass mới, nên giữ token đó lại sẽ gây 401 khi tải
    // trang sau (hành vi đúng của app, nhưng gây ồn cho guard).
    await page.click('[aria-label="Đăng xuất"]');
    await expect(page).toHaveURL(/\/login/);
  } finally {
    // 5) KHÔI PHỤC BẮT BUỘC: đặt lại về pass đã biết, fail ầm ĩ nếu không được.
    const token = await freshResetToken(request, PWTEST_EMAIL);
    const res = await request.post("/api/v1/auth/reset-password", {
      data: { token, new_password: PWTEST_PASS },
    });
    expect(res.ok(), `khôi phục mật khẩu thất bại: ${await res.text()}`).toBeTruthy();
    expect(await apiLogin(request, PWTEST_EMAIL, PWTEST_PASS), "login lại bằng pass đã khôi phục").toBeTruthy();
  }

  // 6) Sau khôi phục: UI login bằng pass cũ vẫn vào được.
  await page.goto("/login");
  await page.fill('input[type="email"]', PWTEST_EMAIL);
  await page.fill('input[type="password"]', PWTEST_PASS);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/student/);

  guard.assertClean();
});

test("quên mật khẩu với email không tồn tại vẫn hiện thông điệp chung", async ({ page }) => {
  const guard = guardConsole(page);
  const fakeEmail = "khong-ton-tai-dat-lai@vidu.com";
  await page.goto("/quen-mat-khau");
  await page.fill('input[type="email"]', fakeEmail);
  await page.click('button[type="submit"]');

  // Thông điệp Y HỆT như email có thật: nêu email đã nhập, không hề nói "không tồn tại".
  await expect(page.locator("body")).toContainText(fakeEmail);
  await expect(page.locator("body")).toContainText(/kiểm tra hộp thư/i);
  await expect(page.locator("body")).not.toContainText(/không tồn tại/i);

  guard.assertClean();
});

test("link xác minh / đặt lại không hợp lệ hiện lỗi thân thiện, không trắng trang", async ({
  page,
}) => {
  const guard = guardConsole(page);

  // Token verify bịa → trang báo link hết hạn/không hợp lệ (backend trả HTML lỗi).
  await page.goto("/xac-minh-email?token=bogus-token-khong-ton-tai-123");
  await expect(page.locator("body")).toContainText(/không hợp lệ|hết hạn/i);
  let len = await page.evaluate(() => document.body.innerText.length);
  expect(len, "trắng trang verify-email").toBeGreaterThan(100);

  // Trang reset không có token → hướng dẫn xin link mới (không gọi API).
  await page.goto("/dat-lai-mat-khau");
  await expect(page.locator("body")).toContainText(/thiếu mã|link mới/i);
  len = await page.evaluate(() => document.body.innerText.length);
  expect(len, "trắng trang reset không token").toBeGreaterThan(100);

  guard.assertClean();
});
