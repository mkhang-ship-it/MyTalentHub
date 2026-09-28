import { test, expect, type APIRequestContext } from "@playwright/test";
import { guardConsole, loginAs } from "./helpers";

/**
 * Thao tác GHI (vòng 4): tạo → đọc lại → sửa → đọc lại → xóa → hết.
 *
 * AN TOÀN:
 * - Mặc định SKIP khi chạy dev thường (tránh ghi vào DB dev thật).
 *   Chỉ chạy khi `WRITE_TESTS=1` (người chạy chấp nhận ghi DB dev) hoặc
 *   `CI=true` (backend + DB đều là bản sao cách ly).
 * - Mọi test dùng tên có tiền tố `PWTEST-<timestamp>` để nhận diện, tự dọn
 *   trong `finally` (kể cả khi assert giữa chừng fail), quét vét mọi thực thể
 *   `PWTEST-*` còn sót, rồi assert danh sách sạch — sót là FAIL ầm ĩ.
 * - Không dùng tài khoản demo cho thao tác cố tình thất bại; ở đây mọi thao
 *   tác đều hợp lệ nên không chạm rate-limit (chỉ đếm lần SAI).
 * - "Duyệt ứng viên" KHÔNG test được: backend không có endpoint nộp đơn
 *   (student apply) lẫn duyệt (approve) — chỉ có GET danh sách. Test enterprise
 *   bao vòng đời tin tuyển dụng (CRUD đầy đủ) thay thế, đã ghi rõ trong báo cáo.
 */

const WRITE_ENABLED = !!process.env.CI || process.env.WRITE_TESTS === "1";

const TEACHER_EMAIL = "nguyen.van.hung@ftalenthub.edu.vn";
const SCHOOL_EMAIL = "bgh@ftalenthub.edu.vn";
const ENTERPRISE_EMAIL = "hr@techfpt.vn";
const DEMO_PASSWORD = "demo123";

async function apiToken(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post("/api/v1/auth/login", {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(res.ok(), `login API cho ${email}`).toBeTruthy();
  const body = (await res.json()) as { token: string };
  return body.token;
}

async function api(
  request: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  token: string,
  data?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const res = await request.fetch(`/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  expect(res.ok(), `${method} ${path} → ${res.status()}: ${(await res.text()).slice(0, 200)}`).toBeTruthy();
  if (res.status() === 204) return null;
  return res.json();
}

test.describe("thao tác ghi (tạo–sửa–xóa có dọn dẹp)", () => {
  test.skip(
    !WRITE_ENABLED,
    "Bỏ qua mặc định để không ghi vào DB dev — chạy với WRITE_TESTS=1 (ghi DB dev, tự dọn) hoặc CI=true (DB cách ly)."
  );

  test("teacher: vòng đời sân chơi (tạo → đọc → sửa → đọc → xóa → hết)", async ({
    page,
    request,
  }) => {
    const guard = guardConsole(page);
    const token = await apiToken(request, TEACHER_EMAIL);
    const PREFIX = `PWTEST-A-${Date.now()}`;
    const NAME_A = `${PREFIX} Sân chơi`;
    const NAME_B = `${PREFIX} Sân chơi Sua`;

    try {
      await loginAs(page, "teacher");
      await page.goto("/teacher/activities");

      // Tạo qua UI
      await page.click('button:has-text("Tạo sân chơi mới")');
      await page.fill("#activity-title", NAME_A);
      await page.locator("form").locator('button[type="submit"]').click();
      await expect(page.locator("body")).toContainText("Tạo sân chơi thành công");
      // Đọc lại: hàng mới hiện trong bảng
      await expect(page.locator("body")).toContainText(NAME_A);

      // Sửa qua UI: đổi tên hoàn toàn (không là chuỗi con của tên cũ)
      await page.click(`[aria-label="Sửa ${NAME_A}"]`);
      await page.fill("#activity-title", NAME_B);
      await page.locator("form").locator('button[type="submit"]').click();
      await expect(page.locator("body")).toContainText("Cập nhật sân chơi thành công");
      // Đọc lại: tên mới hiện, nút Sửa tên cũ không còn
      await expect(page.locator("body")).toContainText(NAME_B);
      expect(await page.locator(`[aria-label="Sửa ${NAME_A}"]`).count()).toBe(0);

      // Xóa qua UI (modal xác nhận, không còn window.confirm)
      await page.click(`[aria-label="Xóa ${NAME_B}"]`);
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await page.click('button:has-text("Xóa sân chơi")');
      await expect(page.locator("body")).toContainText("Xóa sân chơi thành công");
      await expect(page.locator("body")).not.toContainText(NAME_B);
    } finally {
      // Dọn vét mọi sân chơi PWTEST-* (kể cả sót từ lần chạy trước chết giữa chừng)
      const list = (await api(request, "GET", "/teacher/activities", token)) as {
        id: number;
        title: string;
      }[];
      for (const a of list.filter((x) => x.title.startsWith("PWTEST-"))) {
        await api(request, "DELETE", `/teacher/activities/${a.id}`, token);
      }
      // Khẳng định sạch — sót là FAIL
      const after = (await api(request, "GET", "/teacher/activities", token)) as {
        title: string;
      }[];
      expect(
        after.filter((x) => x.title.startsWith("PWTEST-")),
        "còn sót sân chơi PWTEST sau dọn dẹp"
      ).toEqual([]);
    }
    guard.assertClean();
  });

  test("school: thêm rồi gỡ học viên khỏi nhóm học (tạo nhóm → gán → đọc → gỡ → đọc → xóa nhóm)", async ({
    page,
    request,
  }) => {
    const guard = guardConsole(page);
    const token = await apiToken(request, SCHOOL_EMAIL);
    const PREFIX = `PWTEST-G-${Date.now()}`;
    const GROUP = `${PREFIX} Nhóm`;
    const STUDENT = "Nguyễn Minh Anh"; // hs01, có mặt trong cả DB dev lẫn bản sao CI

    const findGroup = async () => {
      const list = (await api(request, "GET", "/school/study-groups", token)) as {
        id: number;
        name: string;
      }[];
      return list.find((g) => g.name === GROUP) ?? null;
    };
    const openMembers = async () => {
      await page.locator(`[aria-label="Hành động cho nhóm ${GROUP}"] button:has-text("Thành viên")`).click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    };
    const studentCheckbox = () =>
      page.locator("label", { hasText: STUDENT }).locator('input[type="checkbox"]');

    try {
      await loginAs(page, "school");
      await page.goto("/school/settings");

      // Tạo nhóm qua UI
      await page.click('button:has-text("Thêm nhóm mới")');
      await page.fill("#sg-name", GROUP);
      await page.click('button:has-text("Tạo nhóm")');
      await expect(page.locator("body")).toContainText("Tạo nhóm học tập thành công");
      await expect(page.locator("body")).toContainText(GROUP);
      expect(await findGroup(), "tạo xong đọc lại được qua API").not.toBeNull();

      // Gán học viên qua UI (tìm theo tên → tick → lưu)
      await openMembers();
      await page.fill('[aria-label="Tìm học sinh"]', STUDENT);
      await expect(studentCheckbox()).toBeVisible();
      if (!(await studentCheckbox().isChecked())) await studentCheckbox().check();
      await page.click('button:has-text("Lưu thành viên")');
      await expect(page.locator("body")).toContainText("Đã cập nhật 1 thành viên");
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);

      // Đọc lại: mở modal, checkbox đã tick (đã lưu thật)
      await openMembers();
      await page.fill('[aria-label="Tìm học sinh"]', STUDENT);
      await expect(studentCheckbox()).toBeChecked();
      await page.keyboard.press("Escape");

      // Gỡ: bỏ tick → lưu → mở lại thấy chưa tick
      await openMembers();
      await page.fill('[aria-label="Tìm học sinh"]', STUDENT);
      if (await studentCheckbox().isChecked()) await studentCheckbox().uncheck();
      await page.click('button:has-text("Lưu thành viên")');
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      await openMembers();
      await page.fill('[aria-label="Tìm học sinh"]', STUDENT);
      await expect(studentCheckbox()).not.toBeChecked();
      await page.keyboard.press("Escape");
    } finally {
      // Dọn vét mọi nhóm PWTEST-* rồi khẳng định sạch
      const list = (await api(request, "GET", "/school/study-groups", token)) as {
        id: number;
        name: string;
      }[];
      for (const g of list.filter((x) => x.name.startsWith("PWTEST-"))) {
        await api(request, "DELETE", `/school/study-groups/${g.id}`, token);
      }
      const after = (await api(request, "GET", "/school/study-groups", token)) as {
        name: string;
      }[];
      expect(
        after.filter((x) => x.name.startsWith("PWTEST-")),
        "còn sót nhóm học PWTEST sau dọn dẹp"
      ).toEqual([]);
    }
    guard.assertClean();
  });

  test("enterprise: vòng đời tin tuyển dụng (tạo → đọc → sửa → đọc → xóa → hết)", async ({
    page,
    request,
  }) => {
    const guard = guardConsole(page);
    const token = await apiToken(request, ENTERPRISE_EMAIL);
    const PREFIX = `PWTEST-P-${Date.now()}`;
    const TITLE_A = `${PREFIX} Tin`;
    const TITLE_B = `${PREFIX} Tin Sua`;
    const deadline = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const postActions = (title: string) => page.locator(`[aria-label="Hành động cho tin ${title}"]`);

    try {
      await loginAs(page, "enterprise");
      await page.goto("/enterprise/internships");

      // Tạo qua UI
      await page.click('button:has-text("Đăng tin mới")');
      await page.fill("#internship-title", TITLE_A);
      await page.fill("#internship-deadline", deadline);
      await page.fill("#internship-skills", "Playwright, TypeScript");
      await page.locator("form").locator('button[type="submit"]').click();
      await expect(page.locator("body")).toContainText("Đăng tin tuyển thực tập thành công");
      // Đọc lại qua UI + API (kèm danh sách ứng viên đang trống)
      await expect(page.locator("body")).toContainText(TITLE_A);
      const created = (
        (await api(request, "GET", "/enterprise/internships", token)) as {
          id: number;
          title: string;
        }[]
      ).find((p) => p.title === TITLE_A);
      expect(created, "tạo xong đọc lại được qua API").toBeTruthy();
      const apps = (await api(
        request,
        "GET",
        `/enterprise/internships/${created!.id}/applicants`,
        token
      )) as unknown[];
      expect(apps, "tin mới chưa có ứng viên").toEqual([]);

      // Sửa tiêu đề qua UI
      await postActions(TITLE_A).locator('button:has-text("Chỉnh sửa")').click();
      await page.fill("#internship-title", TITLE_B);
      await page.locator("form").locator('button[type="submit"]').click();
      await expect(page.locator("body")).toContainText("Cập nhật tin tuyển thực tập thành công");
      await expect(page.locator("body")).toContainText(TITLE_B);

      // Tạm dừng rồi mở lại (đọc lại trạng thái qua nút)
      await postActions(TITLE_B).locator('button:has-text("Tạm dừng")').click();
      await expect(postActions(TITLE_B).locator('button:has-text("Kích hoạt")')).toBeVisible();
      await postActions(TITLE_B).locator('button:has-text("Kích hoạt")').click();
      await expect(postActions(TITLE_B).locator('button:has-text("Tạm dừng")')).toBeVisible();

      // Xóa qua UI (window.confirm → chấp nhận dialog native)
      page.once("dialog", (d) => d.accept());
      await postActions(TITLE_B).locator('button:has-text("Xóa")').click();
      await expect(page.locator("body")).not.toContainText(TITLE_B);
    } finally {
      // Dọn vét mọi tin PWTEST-* rồi khẳng định sạch
      const list = (await api(request, "GET", "/enterprise/internships", token)) as {
        id: number;
        title: string;
      }[];
      for (const p of list.filter((x) => x.title.startsWith("PWTEST-"))) {
        await api(request, "DELETE", `/enterprise/internships/${p.id}`, token);
      }
      const after = (await api(request, "GET", "/enterprise/internships", token)) as {
        title: string;
      }[];
      expect(
        after.filter((x) => x.title.startsWith("PWTEST-")),
        "còn sót tin tuyển dụng PWTEST sau dọn dẹp"
      ).toEqual([]);
    }
    guard.assertClean();
  });
});
