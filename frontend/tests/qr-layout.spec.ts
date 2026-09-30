import { test, expect, type Page } from "@playwright/test";
import { loginAs, guardConsole } from "./helpers";

/**
 * Hồi quy L4 — số đo layout quan quét QR và khối Skill Orbit.
 *
 * Lỗi thật từng đo được (trước khi P1/P2/P3 sửa, số trong l4-baseline.json):
 *  - /student/checkin: figure 310–384px bị figcaption (URL + câu hướng dẫn)
 *    kéo rộng, QR lệch 61–98px ngang so với tâm figure.
 *  - /passport/1 (+ hộp thoại): figure 464px tràn 153–200px ra ngoài thẻ
 *    trắng, chữ chú thích bị cắt ngang mép thẻ.
 *  - /student: marker huy hiệu BoxGeometry lơ lửng NGOÀI vòng tròn (r=1.9),
 *    khối 3D không có nhãn tên kỹ năng nào.
 *
 * Lưu ý phạm vi test DOM: "khối vuông lơ lửng" chỉ kiểm được bằng mắt trên
 * ảnh chụp (canvas không khai báo DOM) — số đo trước/sau ghi trong
 * /tmp/fth-reports/l4-out.md. Test này giữ 3 tiêu chí đo được bằng DOM.
 */

interface QrFigure {
  /** Lượng figure vượt ra ngoài element cha, theo từng cạnh (px). */
  overflow: { left: number; top: number; right: number; bottom: number };
  /** Lệch tâm ngang: tâm figure − tâm SVG QR (px, âm = QR lệch trái). */
  dx: number;
  /** Lệch tâm dọc: tâm figure − tâm SVG QR (caption nằm dưới kéo tâm xuống). */
  dy: number;
  figW: number;
  svgW: number;
  /** Bề rộng 1 ô module đọc từ path SVG thật (lệnh `v{m}` = đúng 1 module). */
  modulePx: number;
  viewBox: string;
  inDialog: boolean;
}

/** Tràn ngang của trang: scrollWidth − innerWidth (0 = không tràn). */
async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
  );
}

/**
 * Đo mọi `<figure>` chứa SVG QR trên trang hiện tại.
 * Ô module đọc từ path thật của SVG: số nhỏ nhất trong path chính là bề rộng
 * 1 module (lệnh dọc `v{m}` luôn bằng đúng bề rộng một ô) — không tính tay.
 */
async function measureQrFigures(page: Page): Promise<QrFigure[]> {
  return page.evaluate(() => {
    const out: {
      overflow: { left: number; top: number; right: number; bottom: number };
      dx: number;
      dy: number;
      figW: number;
      svgW: number;
      modulePx: number;
      viewBox: string;
      inDialog: boolean;
    }[] = [];
    for (const fig of Array.from(document.querySelectorAll("figure"))) {
      const svg = fig.querySelector("svg");
      if (!svg) continue; // figure không chứa QR (không phải nơi kiểm tra này)
      const f = fig.getBoundingClientRect();
      const p = (fig.parentElement ?? fig).getBoundingClientRect();
      const s = svg.getBoundingClientRect();
      const d = svg.querySelector("path")?.getAttribute("d") ?? "";
      const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number).filter((v) => Math.abs(v) > 0);
      const modulePx = nums.length ? Math.min(...nums.map((v) => Math.abs(v))) : 0;
      out.push({
        overflow: {
          left: Math.max(0, p.left - f.left),
          top: Math.max(0, p.top - f.top),
          right: Math.max(0, f.right - p.right),
          bottom: Math.max(0, f.bottom - p.bottom),
        },
        dx: Math.round((f.left + f.width / 2) - (s.left + s.width / 2)),
        dy: Math.round((f.top + f.height / 2) - (s.top + s.height / 2)),
        figW: Math.round(f.width),
        svgW: Math.round(s.width),
        modulePx,
        viewBox: svg.getAttribute("viewBox") ?? "",
        inDialog: Boolean(fig.closest('[role="dialog"]')),
      });
    }
    return out;
  });
}

/** Ngưỡng L4 cho mọi figure QR: không tràn 4 cạch, canh giữa ngang, module ≥ 2px. */
function assertQrFigure(f: QrFigure, where: string, index: number): void {
  for (const [side, px] of Object.entries(f.overflow)) {
    expect(px, `${where}: figure #${index} tràn ${side}px ra ngoài thẻ`).toBe(0);
  }
  expect(Math.abs(f.dx), `${where}: figure #${index} lệch tâm ngang ${f.dx}px (QR bị đẩy sang một bên)`)
    .toBeLessThanOrEqual(1);
  // Thẻ không bị caption kéo rộng quá mức P2 cho phép: maxWidth = max(QR, 140) + 24.
  expect(f.figW, `${where}: figure #${index} rộng ${f.figW}px — bị caption kéo giãn`)
    .toBeLessThanOrEqual(Math.max(f.svgW, 140) + 24 + 1);
  expect(f.modulePx, `${where}: figure #${index} ô module ${f.modulePx}px < 2px — khó quét`)
    .toBeGreaterThanOrEqual(2);
  // SVG hiển thị đúng kích thước viewBox (không bị CSS co giãn làm mờ module).
  expect(f.svgW, `${where}: figure #${index} SVG ${f.svgW}px ≠ viewBox ${f.viewBox}`)
    .toBe(Number(f.viewBox.split(" ")[2]));
}

test("Check-in học sinh: figure QR ôm sát mã, canh giữa ngang, không tràn", async ({ page }) => {
  const guard = guardConsole(page);
  await loginAs(page, "student");
  await page.goto("/student/checkin");
  await page.waitForLoadState("networkidle");

  const figs = await measureQrFigures(page);
  expect(figs.length, "trang /student/checkin phải render đúng 1 figure QR").toBe(1);
  assertQrFigure(figs[0], "/student/checkin", 0);
  expect(await overflowX(page), "trang /student/checkin tràn ngang").toBe(0);
  guard.assertClean();
});

test("Passport trang + hộp thoại chi tiết: mọi figure QR không tràn 4 cạch", async ({ page }) => {
  const guard = guardConsole(page);
  await loginAs(page, "student");
  await page.goto("/passport/1");
  await page.waitForLoadState("networkidle");

  const onPage = await measureQrFigures(page);
  expect(onPage.length, "trang /passport/1 phải có QR thẻ passport").toBeGreaterThanOrEqual(1);
  onPage.forEach((f, i) => assertQrFigure(f, "/passport/1", i));
  expect(await overflowX(page), "trang /passport/1 tràn ngang").toBe(0);

  await page.locator('[aria-haspopup="dialog"]').first().click();
  await page.waitForSelector('[role="dialog"]');
  const inDialog = (await measureQrFigures(page)).filter((f) => f.inDialog);
  // Hộp thoại có 3 QR: mặt trước HoloCard, mặt sau thẻ, khối QR mã định danh.
  expect(inDialog.length, "hộp thoại chi tiết phải có ≥ 3 figure QR").toBeGreaterThanOrEqual(3);
  inDialog.forEach((f, i) => assertQrFigure(f, "hộp thoại chi tiết", i));
  expect(await overflowX(page), "trang /passport/1 (đang mở hộp thoại) tràn ngang").toBe(0);
  guard.assertClean();
});

test("Skill Orbit: scene 3D chạy và có chú thích tên kỹ năng đọc được", async ({ page }) => {
  const guard = guardConsole(page);
  await loginAs(page, "student");
  await page.goto("/student");
  await page.waitForLoadState("networkidle");

  const scene = page.locator("[data-scene-state]").first();
  await scene.scrollIntoViewIfNeeded();
  // Trước L4 khối 3D chạy nhưng không có nhãn nào: người dùng không biết các
  // chấm trên vòng là kỹ năng gì, và marker huy hiệu trôi ra ngoài vòng.
  await expect(scene, "scene Skill Orbit không ở trạng thái running").toHaveAttribute(
    "data-scene-state",
    "running",
    { timeout: 15_000 }
  );

  const cardText = await page.evaluate(() => {
    const el = document.querySelector("[data-scene-state]");
    let node: Element | null = el?.parentElement ?? null;
    while (node && node !== document.body) {
      if ((node as HTMLElement).innerText.includes("Skill Orbit")) return (node as HTMLElement).innerText;
      node = node.parentElement;
    }
    return "";
  });
  // Chú thích dưới khối 3D: chip "Tên kỹ năng n/10" + chip huy hiệu.
  // (?<![\d.]) loại trường hợp dương sai "60.7/100" ở tiêu đề thẻ.
  expect(cardText, "khối Skill Orbit thiếu chip mức độ kỹ năng (n/10)").toMatch(
    /(?<![\d.])\d{1,2}\/10\b/
  );
  expect(cardText, "khối Skill Orbit thiếu chip tên huy hiệu").toMatch(/Huy hiệu\s+\S+/);
  guard.assertClean();
});

/**
 * NGƯỠNG L4 "lệch tâm QR ≤ 1px" đo cả trục DỌC — hiện CHƯA ĐẠT (số đo l4-sau.json):
 * trục ngang đã đạt (dx = 0 ở cả 9 tổ hợp) nhưng dy vẫn 49–59px, vì figcaption
 * nằm DƯỚI ô QR trong cùng figure (p-3 + QR + caption ⇒ tâm figure luôn nằm dưới
 * tâm QR). Muốn ≤ 1px cả 2 trục phải tách caption khỏi figure (figcaption làm
 * element anh em bên dưới) — quyết định sửa thuộc coordinator/P2; P4 chỉ đo.
 */
test.fixme("lệch tâm QR trục dọc (tâm SVG vs tâm figure) ≤ 1px — chờ tách caption khỏi figure", async ({
  page,
}) => {
  await loginAs(page, "student");
  await page.goto("/student/checkin");
  await page.waitForLoadState("networkidle");
  const figs = await measureQrFigures(page);
  expect(figs.length).toBe(1);
  expect(Math.abs(figs[0].dy)).toBeLessThanOrEqual(1);
});
