import type { Page } from "@playwright/test";

/** Tài khoản demo của 5 vai trò (mật khẩu đều là demo123). */
export const ACCOUNTS = {
  student: { email: "hs01@ftalenthub.edu.vn", home: "/student", label: "Học sinh" },
  teacher: { email: "nguyen.van.hung@ftalenthub.edu.vn", home: "/teacher", label: "Giáo viên" },
  coach: { email: "hlv.boi@ftalenthub.edu.vn", home: "/coach", label: "Huấn luyện viên" },
  school: { email: "bgh@ftalenthub.edu.vn", home: "/school", label: "Nhà trường" },
  enterprise: { email: "hr@techfpt.vn", home: "/enterprise", label: "Doanh nghiệp" },
} as const;

export type Role = keyof typeof ACCOUNTS;

/** Đăng nhập qua form /login (dùng đúng flow người dùng thật). */
export async function loginAs(page: Page, role: Role): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', ACCOUNTS[role].email);
  await page.fill('input[type="password"]', "demo123");
  await page.click('button[type="submit"]');
  // Chờ điều hướng về trang chủ của vai trò rồi mới làm bước tiếp theo
  // (tránh race: token chưa lưu đã goto trang cần auth).
  await page.waitForURL(new RegExp(ACCOUNTS[role].home.replace("/", "\\/")), { timeout: 20_000 });
}

export interface ConsoleGuard {
  errors: string[];
  assertClean: () => void;
}

/**
 * Bắt lỗi console (type=error) + pageerror (exception JS không được catch).
 * Gọi guard.assertClean() ở cuối mỗi test — test FAIL nếu có bất kỳ lỗi nào,
 * không chỉ chụp ảnh rồi cho qua.
 *
 * Ngoại lệ duy nhất: `ignoreHttp` — khi test CỐ TÌNH gọi API bị từ chối
 * (VD: kiểm tra RBAC chờ 403), Chromium tự ghi "Failed to load resource… 403"
 * vào console. Những dòng này được bỏ qua, nhưng test phải tự assert đã nhận
 * đúng status đó (xem rbac.spec.ts) để không xanh giả.
 */
export function guardConsole(page: Page, opts?: { ignoreHttp?: number[] }): ConsoleGuard {
  const errors: string[] = [];
  const ignored = opts?.ignoreHttp ?? [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Bỏ qua tiếng ồn mạng đã được test cho phép (VD: 403 khi kiểm tra RBAC)
    if (/^Failed to load resource/i.test(text)) {
      const m = text.match(/status of (\d{3})/);
      if (m && ignored.includes(Number(m[1]))) return;
    }
    errors.push(`[console] ${text.slice(0, 300)}`);
  };
  const onPageError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`[pageerror] ${message.slice(0, 300)}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    errors,
    assertClean: () => {
      if (errors.length > 0) {
        throw new Error(`Có ${errors.length} lỗi console/pageerror:\n${errors.join("\n")}`);
      }
    },
  };
}
