# ĐỢT 2 — `/student/discover` + `/student/activities` (PANE 1 · THIẾT KẾ)

> **ẢNH THAM KHẢO CHỈ ĐỂ XEM HÌNH DẠNG — file chữ luôn thắng nếu mâu thuẫn.**
> Mọi con số/màu trong file `.md`, KHÔNG đếm số từ ảnh SVG.

## Mục lục

| File | Nội dung |
|---|---|
| `01-discover.md` | Đặc tả `/student/discover` (`pages/student/Discover.tsx`) — 3 nhánh trạng thái, 9 khối, checklist D1–D15, bảng đối chiếu số đo, **mục E: đề nghị mở quyền `three/**`** |
| `02-activities.md` | Đặc tả `/student/activities` (`Activities.tsx` + `ActivityCard.tsx`) — **6 bất biến nút thẳng hàng ở đầu file**, checklist D1–D17, bảng đối chiếu số đo |
| `03-de-xuat-3-cho-p2.md` | Đề xuất xử lý 3 chỗ P2 báo: G1 `StatCard` · G2 `Badge` · G3 component 3D |
| `refs/01-discover.svg` | Ảnh tham chiếu Discover (2 nhánh: chọn test + làm bài) |
| `refs/02-activities.svg` | Ảnh tham chiếu Activities (4 trạng thái) |

Nguồn sự thật chung: **`../dot1/00-he-thong-thiet-ke.md`** (thang chữ, nhịp không gian,
bảng màu, accessibility, mapping token → class).

---

## Quyết định đã chốt ở Đợt 2

1. **Nguyên tắc mới ghi ở đầu file 00:** **CON SỐ LÀ CHUẨN, CLASS CHỈ LÀ GỢI Ý**
   (đã sửa toàn bộ bảng thang chữ — xem mục dưới).
2. **Ràng buộc ActivityCard được ghi ở CẢ HAI file 01 và 02** (vì lệnh chỉ ghi
   “file 01 của đợt 2”, không rõ chỉ file nào) — 6 bất biến nút thẳng hàng +
   ô badge `invisible` giữ chỗ ở Discover.
3. **Không đụng `components/three/**`**: Discover chấp nhận scene **300px mọi breakpoint**;
   mọi thay đổi 3D ghi thành **đề nghị cho P5 quyết** (01 · mục E).
4. Mọi nút/chip bấm trên trang này **cao 44px** (00/7.8), radius **12** (bảng `--radius-sm`),
   không dùng `rounded-full`/`rounded-xl` cho nút.
5. Trạng thái **rỗng** và **lỗi tải dữ liệu** bắt buộc cho cả 2 trang (01·B9, 02·B5–B7).

## Việc đã sửa trong file 00 (theo yêu cầu P2)

**Quy tắc thêm vào đầu file 00 (mục 0.3):** con số chuẩn, class là gợi ý; lệch → code theo con số.

**Lỗi mâu thuẫn CON SỐ ↔ CLASS trong cùng dòng (sửa hết):**

| Dòng | Cũ (sai) | Mới (đúng) |
|---|---|---|
| Hàng “Hiển thị lớn (hero)” | 56/36 · `text-5xl md:text-7xl` (=48/72) ❌ | `text-[36px] md:text-[44px] lg:text-[56px]` |
| Hàng “Số lớn trội” | 40/34 · `text-4xl` (=36) ❌ | `text-[34px] sm:text-[40px]` |
| Hàng “Tiêu đề khoảng (H2)” | 32/26 · `text-3xl md:text-4xl` (=30/36) ❌ | `text-[26px] md:text-[32px]` |

**Thiếu class cho mobile/lg (không mâu thuẫn nhưng code theo class sẽ ra sai số):**

| Dòng | Cũ | Mới |
|---|---|---|
| “Tiêu đề trang (H1)” 24/22 | `text-2xl` (thiếu 22) | `text-[22px] sm:text-2xl` |
| “Tiêu đề card (H3)” 18/17 | `text-lg` (thiếu 17) | `text-[17px] md:text-lg` |
| “Đoạn dẫn (subtitle)” 15/14 | `text-[15px]` (thiếu 14) | `text-[14px] md:text-[15px]` |
| “Chữ trong nút” 14/15 | `text-sm font-semibold` (thiếu 15) | thêm `text-[15px] font-bold` cho nút lg |

**Thêm lưu ý class có sẵn lệch số đo (mục 9):** `rounded-xl` = 17,6px ≠ card 20px →
phải viết `rounded-[20px]`; ô icon `StatCard` 12px → `rounded-[12px]`.

---

## Kế hoạch các đợt

| Đợt | Trang | Trạng thái |
|---|---|---|
| Đợt 1 | Hệ thống thiết kế + `/` + `/student` | ✅ P2 đã code xong, commit |
| **Đợt 2** | `/student/discover` + `/student/activities` | **Đặc tả xong — chờ P2 code** |
| Đợt 3 | `/student/checkin`, `/passport/:id` | chờ |
| Đợt 4 | `/school/analysis`, `/enterprise/talents`, `/enterprise/sponsorships` (+ 4 trang overview nếu G1 không gộp) | chờ |
| Đợt 5 (đề xuất) | 7 component `components/three/**` — chờ P5 mở quyền (G3) | chờ quyết |

## Điểm chưa chắc / chờ quyết

1. **G1, G2** (đề xuất gộp `StatCard` + `Badge` vào Đợt 2) — chờ P5 chốt.
2. **E1–E3** (mở quyền sửa `DiscoverScene`) — chờ P5 chốt; mặc định P2 giữ nguyên.
3. Kiểm thử nút thẳng hàng phải do P2 chạy thật ở 390/768/1440 rồi báo lại (02 · đầu file).
4. Kiểu dữ liệu `delta` ở `school/Overview` — P2 kiểm tra khi làm G1.
