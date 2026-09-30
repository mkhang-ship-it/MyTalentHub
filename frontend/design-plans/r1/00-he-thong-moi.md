# R1 — Hệ thống thiết kế 2D mobile-first (thay thế bảng desktop cũ)

> Phạm vi: học sinh dùng hằng ngày trên điện thoại (viewport tham chiếu 390px).
> Bảng cũ thiết cho desktop — KHÔNG tái dùng. Mọi số diện tích dưới đây lấy từ
> `/tmp/fth-reports/r1.md` (canvas SkillOrbit 1046×320 @1440px, 300×320 @390px;
> DiscoverScene 1046×300 / 300×300; tổng 3D 11 trang 822kpx @1440px, 186kpx @390px;
> tổng chiều cao 11 trang @390px là 23.867px). Cách đo lại: DevTools
> `getBoundingClientRect()` trên wrapper component ở 2 viewport 1440px và 390px,
> đếm pixel = width × height.

## 1. Quy tắc số 1 — vùng chạm 44×44px tối thiểu

- Mọi thứ bấm được (nút, icon-button, link, checkbox, radio, tab, nút trong nav,
  nút điều hướng phân trang enterprise) phải có hộp chạm ≥ 44×44px.
- Cách đo: DevTools → kiểm tra `getBoundingClientRect()` của chính phần tử bấm
  được (không đo icon SVG bên trong). Phần tử nào < 44px ghi `CHƯA ĐẠT`.
- Ngoại lệ duy nhất: chữ inline trong đoạn văn (link trong câu) — khi đó khoảng
  cách dòng ≥ 28px và không đặt 2 link sát nhau.
- Checkbox DataNetwork hiện tại `h-4 w-4` (16px) → VI PHẠM, phải bọc label
  padding để hộp chạm đạt 44px (xem 03-T5).

## 2. Quy tắc "1 màn hình = 1 việc chính"

- Mỗi route mobile chỉ có 1 việc chính + 1 CTA chính (cao 44–52px, full-width).
- Thứ tự: việc chính lên đầu; AI analysis, roadmap, lịch sử, thống kê phụ xuống
  dưới hoặc sang tab riêng. Mục tiêu: giảm tổng 23.867px chiều cao 11 trang
  @390px — mỗi trang student cắt ≥ 300px so với hiện tại.
- Card mô tả dài (Discover TESTS desc, Dashboard AI card) thu gọn mặc định,
  bấm "Xem thêm" mới mở rộng.

## 3. Thang mới CHO RIÊNG mobile (không dùng bảng desktop)

### 3.1 Khoảng cách (spacing)
| Token | px | Dùng cho |
|---|---|---|
| `s1` | 4 | gap icon–chữ, dot |
| `s2` | 8 | gap trong hàng, padding chip |
| `s3` | 12 | padding card nhỏ, gap form |
| `s4` | 16 | padding card chuẩn, gap section con |
| `s5` | 20 | gap giữa các card |
| `s6` | 24 | gap giữa các section |
| `s7` | 32 | padding trang đặc biệt (hero, empty) |

Page padding ngang mobile: 16px (`px-4`). Không dùng `px-5/px-6` desktop cho mobile.

### 3.2 Cỡ chữ (mobile)
| Token | size / line-height | Dùng cho |
|---|---|---|
| `t-caption` | 12 / 16 | nhãn, eyebrow, meta |
| `t-body` | 14 / 20 | nội dung chính, mô tả |
| `t-title` | 16 / 22 | tiêu đề card, tên hoạt động |
| `t-h` | 18–20 / 26 | tiêu đề section |
| `t-hero` | 24–28 / 32 | hero Dashboard/Landing mobile |

Không dùng chữ < 12px cho nội dung đọc (chỉ cho mã QR caption 11px đã có là tối đa).

### 3.3 Bo góc
- Chip/badge: full (999px). Nút: 12px. Card: 16px (thẻ Passport giữ 20px để
  phân biệt). QR figure giữ 16px + nền trắng đặc.

### 3.4 Bóng đổ (mobile nhẹ hơn desktop)
- Card thường: `0 1px 3px rgba(51,50,77,.08)` — bỏ `shadow-lift` hover trên
  mobile (không có hover thật).
- Thẻ Passport (điểm nhấn duy nhất được phép nổi): giữ 2 lớp hiện tại
  (`0 24px 60px` + viền sáng trong) vì đã là CSS 2D, không tốn GPU 3D.
- Cấm blur > 24px cho card danh sách (hiệu năng máy yếu).

## 4. Bảng dữ liệu → dạng 2D (áp dụng thống nhất)

| Loại dữ liệu (API thật) | Dạng 2D trên mobile | Ghi chú |
|---|---|---|
| Kỹ năng + level 1–10 (`GET /student/overview` → activities gom theo field; `GET /passport/{id}` → skills) | Thanh tiến độ ngang + số `x/10` (xem 01) | Không dùng chấm tròn bay |
| Kết quả test (`GET /student/assessments` → `{test_type, result, date}`, score 0–100 trong `result_json`) | Danh sách 4 hàng + thanh % + số `/100` | Giữ đúng 4 màu `MAU_THEO_TEST` |
| Huy hiệu (`GET /student/badges` → `{unlocked, current_hours, min_hours, progress_pct}`) | Hàng ngang: icon + tên + `X/Yh` + thanh % | Không vẽ lại artwork (xem 02) |
| Chứng chỉ (`GET /passport/{id}` → certificates; CRUD `POST/PUT/DELETE /student/certificates`) | Hàng dọc: title 14 semibold + issuer · date 12px | Không thêm ảnh bìa |
| Xếp hạng/điểm (`GET /student/overview` → talent_score, school_rank/total) | Số tabular-nums lớn + nhãn 12px | Đã đúng, giữ nguyên |
| Mạng nhân tài–kỹ năng (`GET /enterprise/talents` → top5 + top_skills) | Giữ SVG 2 cột DataNetwork + `tomTat` bằng chữ | Đã là 2D thật, không bỏ (xem 01) |
| QR (`qr_code` từ passport/checkin) | Component `QrCode` nền trắng, ô module ≥ 2px | Xem 01 mục QR |

## 5. Điều cấm trong R1

1. Không thêm `three`, GLTF, canvas WebGL mới.
2. Không thêm animation xoay/bob/tilt theo chuột trên mobile.
3. Không dùng màu làm tín hiệu duy nhất (giữ icon ★/✓/⟳ + chữ như Dashboard đã làm).
4. Mọi con số hiển thị phải kèm đơn vị (`h`, `/10`, `/100`, `%`).
