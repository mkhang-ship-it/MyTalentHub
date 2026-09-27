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
  const isIgnoredHttp = (status: number) => ignored.includes(status);
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Bỏ qua tiếng ồn mạng đã được test cho phép (VD: 403 khi kiểm tra RBAC)
    if (/^Failed to load resource/i.test(text)) {
      const m = text.match(/status of (\d{3})/);
      if (m && isIgnoredHttp(Number(m[1]))) return;
    }
    errors.push(`[console] ${text.slice(0, 300)}`);
  };
  const onPageError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`[pageerror] ${message.slice(0, 300)}`);
  };
  // Ghi lại URL của mọi response HTTP lỗi để debug (VD: biết 401 đến từ endpoint nào).
  const onResponse = (res: { url: () => string; status: () => number }) => {
    const status = res.status();
    if (status >= 400 && !isIgnoredHttp(status)) {
      errors.push(`[http ${status}] ${res.url().slice(0, 200)}`);
    }
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  return {
    errors,
    assertClean: () => {
      if (errors.length > 0) {
        throw new Error(`Có ${errors.length} lỗi console/pageerror:\n${errors.join("\n")}`);
      }
    },
  };
}

/**
 * Chặn lỗi "quên dấu $ trong template string".
 *
 * Trong `` `Khối {data.grade}` `` (thiếu `$`) thì cú pháp vẫn hợp lệ nên `tsc`
 * im lặng, `eslint` im lặng, và test chỉ kiểm tra "có render" vẫn xanh — nhưng
 * người dùng thấy nguyên chữ `{data.grade}` thay vì số 10. Đã xảy ra thật ở
 * Dashboard.tsx, nên phải kiểm ở tầng triệu chứng: đọc text thật trên trang.
 */
export async function assertNoRawTemplateLiteral(page: Page) {
  const text = await page.evaluate(() => document.body.innerText);
  const found = text.match(/\{(?:data|props|item|user)\.[A-Za-z_$][\w$.]*\}/g);
  if (found) {
    throw new Error(
      "Trang hiển thị nguyên văn biểu thức — khả năng cao quên dấu $ " +
        `trong template string:\n  ${[...new Set(found)].join("\n  ")}`
    );
  }
}
