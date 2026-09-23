# Audit hiển thị vòng 2 — findings & task chia pane

Ngày: 2026-09-24 · Scan: Playwright 22 route × 7 viewport (1440/1024/768/390/375/360/320) + tìm thủ phạm DOM từng route.
Chuẩn đối chiếu: `ThenTV_Slides (2).pptx` (OCR 35 slide tại `/tmp/fth-ui/slides/ocr/slideNN.txt`).
Trạng thái: **fix chưa thực thi** — đây là kế hoạch giao cho 4 pane.

---

## Nhóm lỗi và file chịu trách nhiệm (1 pane sửa 1 file, không trùng)

| # | Lỗi | Gốc rễ (file) | Pane |
|---|-----|---------------|------|
| G1 | **Body overflow trang @320/360/375/390 toàn route** (`docsw` 384–406) + @1024 student (1064) | **Layout.tsx** mobile header: `LogoWordmark compact` (tagline 8px nowrap) + Home + role button tràn 64px; desktop: StatCard delta | P2 |
| G2 | **StatCard value/delta tràn card** @1024 (student `#11/14`, enterprise `10M₫`, `Explorer/…` 209px trong card 164px) → đẩy grid → body overflow 1064 | **ui.tsx** `StatCard` (delta `text-xs` không wrap; value `text-[28px]` trong `min-w-0`) | P2 |
| G3 | **Bottom-nav label cắt mất nghĩa** @320: "Khám phá năng khiếu" (129>89), "Talent Passport", "Sân chơi của tôi" — `max-w-[4.5rem] truncate` | **Layout.tsx** bottom nav (L470–502) | P2 |
| G4 | **Drawer/sidebar nav label cắt**: "Khám phá năng khiếu" (36 lần), "Phân tích năng lực" — `span.truncate` trong `NavItem` | **Layout.tsx** NavItem (L140–179) | P2 |
| G5 | **Tên tổ chức sidebar/user-card cắt**: "Ban Giám hiệu THPT FTI" (163>137), "Công ty TNHH TechFPT" (159>137) mọi viewport — `truncate text-sm font-extrabold` | **Layout.tsx** user card (L340–343) | P2 |
| L1 | **Login: email demo cắt** mọi viewport (`hs01@…` 118>65, `nguyen.van.hung@…` 178>68) + label "Doanh nghiệp" tràn @320 (82>62) | **Login.tsx** demo buttons (L158–177) | P1 |
| D1 | **Dashboard student: node roadmap "T3: Mở rộng & Portfolio" trong vòng tròn 32px** — 43>32, chữ đè | **student/Dashboard.tsx** L153–155 (chỉ nên "T1"/"T2"/"T3") | P1 |
| D2 | Chứng chỉ Profile cắt: "Chứng nhận Hoàn thành IoT Lab", "Giấy khen Sân chơi Sáng tạo" | **student/Profile.tsx** (truncate) | P1 |
| S1 | Analysis: label SVG "Làm việc nhóm" tràn (w 64–78 vs chữ dài) tại nhiều viewport | **school/Analysis.tsx** | P3 |
| S2 | Classes: số `text-2xl` "75.4" tràn w=49 @1024; Overview: label "Hoạt động/tháng" tràn w=60 | **school/Classes.tsx** L72–80, **school/Overview.tsx** L121 | P3 |
| E1 | Enterprise Overview: StatCard "10M₫" tràn @1024 (do G2 — kiểm lại sau khi P2 sửa StatCard) | **enterprise/Overview.tsx** L88–115 | P4 |
| P1 | Passport: rà bố cục theo slide 19 (GR CODE/HỒ SƠ/CHỨNG CHỈ/DỰ ÁN/HOẠT ĐỘNG/ĐIỂM/KỸ NĂNG) — chưa thấy lỗi scan, chỉ đối chiếu | **passport/Passport.tsx** | P3 |
| T1 | Landing: kiểm bố cục slide 1–8 (hero, 6 lĩnh vực, đối tượng) — chưa thấy lỗi scan | **Landing.tsx** | P4 |

**Lưu ý chung:**
- `tiny-font` (2374 lượt, nav 10/11px) = thiết kế có chủ đích ("giống slide"), **không sửa**.
- `clipped` chấp nhận được (ellipsis có nghĩa) chỉ khi tiêu đề/chứng chỉ — G4/D2 cần cho wrap 2 dòng.
- Giữ: brand, màu token, routes, auth, reduced-motion fallback.
- File dùng chung: `ui.tsx`, `Layout.tsx`, `Logo.tsx`, `index.css` **chỉ P2 sửa**; P1/P3/P4 không đụng.
- Không tạo component mới, không thêm dependency. Bám Tailwind có sẵn + token `--portal-*`.

## Tham chiếu slide (OCR, để đối chiếu bố cục "giống slide 100%")
- Student dashboard = slide 10: hero "Chào mừng trở lại, Nguyễn Văn A" + "Bạn đã hoàn thành 64 giờ trải nghiệm"; nav: Tổng quan, Hồ sơ năng lực, Khám phá năng khiếu, Hoạt động, Check-in QR.
- Student profile = 11, discover = 12, activities = 13, check-in = 14, đánh giá = 15, AI gợi ý = 16, huy hiệu = 17, thống kê = 18, passport = 19.
- Teacher: overview = 20 ("Cô Lê Thị Hương", 3 hoạt động cần check-in, KPI 128/8/42), activities = 21, grading = 22 (HÀNG CHỜ / ĐANG CHẤM, "Chuyên môn (40) 36/40"), students = 23.
- School: overview = 24 ("THPT Nguyễn Du", Ban giám hiệu), analysis = 25 (Bản đồ năng khiếu, Bảng xếp hạng khối, 2.340h), reports = 26 (Báo cáo năng lực Q2/2026, PDF 2.4MB), classes = 27 (KHỐI 10/11/12).
- Enterprise: overview = 28 ("FPT Software 3", 86 hồ sơ mới, "Xem nhân tài + Đăng tin tuyển dụng"), talents = 29 (1,247 hồ sơ, bộ lọc AI/ML/Thiết kế/Marketing/Khối 12), internships = 30 (12 tin đăng · 123 ứng viên), sponsorships = 31 (285 triệu VNĐ · 8 dự án · 47 học sinh).
- Login/Landing: slide 1 (hero), 6 (6 lĩnh vực Âm nhạc/Nghệ thuật/Thể thao…), 7 (Trải nghiệm thực tế, IOT LAB), 8 (Đối tượng: Học sinh/Giáo viên/Nhà trường/Doanh nghiệp).

## SAS (Stop): mỗi pane phải
1. Chạy đúng fix của mình, không sửa file pane khác.
2. `cd frontend && npx tsc -b --noEmit && npm run lint` — sạch lỗi mới.
3. `npx playwright screenshot` hoặc `npm run dev` kiểm tra viewport liên quan (Dev có sẵn: `127.0.0.1:5174`, backend `127.0.0.1:8001`).
4. Sau khi sửa, **gửi lại theo định dạng cũ: chạy `frontend/design-plans` nếu cần + báo READY trong terminal**. Không `--interrupt`, không tạo pane/subagent mới.

## Kiểm chứng sau fix (pane điều phối)
- Re-run scan tương tự → `body-overflow`/`text-overflow` G1/G2/G3/G4/G5/L1/D1 tiêu giảm; L1 email hiện đủ; G5 tên tổ chức 2 dòng.
- Build + lint pass. Chưa commit, chờ user duyệt.