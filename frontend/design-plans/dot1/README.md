# ĐỢT 1 — HỆ THỐNG THIẾT KẾ + 2 TRANG MẪU (pane 1)

**Trạng thái:** ✅ Đợt 1 hoàn tất — DỪNG TẠI ĐÂY, chờ pane 2 code xong rồi mới sang Đợt 2.

## File

| File | Nội dung |
|---|---|
| [`00-he-thong-thiet-ke.md`](00-he-thong-thiet-ke.md) | **Nguồn sự thật duy nhất**: bảng màu + ngưỡng tương phản, thang chữ, nhịp không gian, thành phần (card/nút/badge/thẻ chỉ số/thanh tiến độ/ô nhập/bảng/empty/skeleton/lỗi/toast), bố cục & responsive 390·768·1024·1440, bảng màu biểu đồ, accessibility, token mới cần thêm |
| [`01-trang-chu.md`](01-trang-chu.md) | Đặc tả `/` — `Landing.tsx`: 7 khối theo thứ tự màn hình + checklist thay đổi D1–D13 |
| [`02-dashboard-hoc-sinh.md`](02-dashboard-hoc-sinh.md) | Đặc tả `/student` — `Dashboard.tsx`: 7 khối + checklist thay đổi D1–D19 |
| `refs/00-thanh-phan.svg` | Ảnh tham chiếu: thang chữ, nút, badge, thẻ, ô nhập, trạng thái, chuỗi màu biểu đồ |
| `refs/01-trang-chu.svg` | Ảnh tham chiếu: trang chủ 1440px |
| `refs/02-dashboard-hoc-sinh.svg` | Ảnh tham chiếu: dashboard học sinh 1440px (kèm sidebar) |

## ⚠️ Quy tắc với ảnh
**ẢNH CHỈ ĐỂ XEM HÌNH DẠNG.** Mọi con số và màu phải nằm trong file đặc tả bằng chữ.
Ảnh ≠ chữ → **chữ thắng**, báo pane 1 sửa ảnh. (Phiên này không có model sinh ảnh raster
nên ảnh tham chiếu là SVG vector vẽ tay — màu lấy đúng mã hex trong `index.css`.)

## Quyết định đã chốt (tóm tắt)
1. **Không đổi bảng màu đã có.** Thêm 4 token (có nêu tỉ lệ tương phản cũ/mới trong file 00):
   - `--muted-strong #6F6C8A` — thay `--muted` cho chữ 12–15px (3,46:1 ❌ → 5,01:1 ✅)
   - `--line-control #968D82` — viền ô nhập/nút phụ (1,39:1 ❌ → 3,27:1 ✅)
   - `--scrim-navy` — phủ nền gradient ở vùng có chữ nhỏ (3,08–3,60:1 ❌ → ≥5,37:1 ✅)
   - `--btn-primary-bg` — `cta-gradient` + phủ 12% đen cho nút chính (3,67:1 ❌ → 4,61:1 ✅)
2. **Chip/phiếu trên nền gradient phải nền đặc trắng**, chữ `--portal-dark` (2,52:1 ❌ → ≥6,4:1 ✅).
3. **`emerald-600` bị cấm** cho chữ nhỏ (3,77:1 ❌) → `#047857` (5,48:1 ✅).
4. Thang chữ: 4 bậc tiêu đề (56/32/24/18) + body 14 + caption 12, không dùng < 12px.
5. Nhịp không gian một thang 4→96; **card padding 24** (nhỏ 20, lớn 32); khối dọc cách **32**.
6. Trong portal dùng `var(--portal)` (scope HS = `#A1458F`), không hard-code `#C44296`.
7. Biểu đồ: 6 chuỗi `#1B2A5E · #284B8C · #C44296 · #0D9488 · #F97316 · #B2AFC6` theo bậc
   sáng tối + hoạ tiết + nhãn trực tiếp (không để màu là tín hiệu duy nhất).

## Chỗ CHƯA chắc (cần pane 1 ↔ pane 2 đối chiếu khi code)
- **`PortalCard3D` / `TalentConstellation` / `SkillOrbit`**: tôi chưa mở component ra đo —
  đặc tả chỉ chốt phần bọc ngoài (section, lề, kích thước hộp, fallback). Nếu pane 2 thấy
  kích thước thật khác → báo lại, **không tự ý sửa component 3D**.
- **Skeleton thay `Loading`**: nếu pane 2 muốn giữ `Loading` cho lần tải đầu, phải nói rõ
  trong báo cáo (file 02 mục B7 cho phép cả hai, nhưng phải nhất quán toàn trang).
- **Danh sách thẻ thay bảng trên <768px** ở Dashboard: đây là thay đổi hành vi, pane 2 cần
  xác nhận đã làm ở 390px trước khi báo xong.
- **Link footer Landing** (“Điều khoản/Quyền riêng tư/Liên hệ”) chưa có route → giữ `<a href="#">`.

## Kế hoạch các đợt sau (chờ điều phối)
- **Đợt 2:** `/student/discover`, `/student/activities`
- **Đợt 3:** `/student/checkin`, `/passport/:id` + hộp chi tiết
- **Đợt 4:** `/school/analysis`, `/enterprise/talents`, `/enterprise/sponsorships`
