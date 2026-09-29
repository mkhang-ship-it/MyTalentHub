# ĐẶC TẢ `/student/activities` — `Activities.tsx` + `components/ActivityCard.tsx` (Đợt 2 · file 02)

> ⚠️ **ẢNH THAM KHẢO `refs/02-activities.svg` CHỈ ĐỂ XEM HÌNH DẠNG — chữ thắng ảnh.**
> Đọc `../dot1/00-he-thong-thiet-ke.md` trước. **CON SỐ LÀ CHUẨN, CLASS LÀ GỢI Ý.**

**Phạm vi:** `frontend/src/pages/student/Activities.tsx` + `frontend/src/components/ActivityCard.tsx`
(+ `ui.tsx`/`index.css` nếu cần class). **CẤM:** sửa `frontend/src/components/three/**`.

---

## ⚠️⚠️ RÀNG BUỘC SỐ 1 — GIỮ NGUYÊN “THẺ CAO BẰNG NHAU, NÚT CÙNG MỘT ĐƯỜNG NGANG”

Trang này **đã từng có lỗi nút các thẻ lệch nhau và đã sửa xong**. Đặc tả mới phải giữ
nguyên tính chất đó. **Pane 2 không được phá bất kỳ mục nào trong đây, kể cả khi refactor.**

### 6 bất biến bắt buộc
| # | Bất biến | Vị trí trong code hiện tại |
|---|---|---|
| 1 | Lưới `items-stretch` (cấm `items-start`/`items-baseline`) | `Activities.tsx` — `grid … items-stretch` |
| 2 | `<article>` là **cột dọc co giãn**: `flex h-full min-w-0 flex-col` | `ActivityCard` |
| 3 | Banner `shrink-0` + **chiều cao cố định** (xem B2: 84px) | `ActivityCard` |
| 4 | Thân thẻ `flex flex-1 flex-col` — vùng nội dung tự giãn | `ActivityCard` |
| 5 | Tiêu đề giữ sẵn `min-h-[3rem]` + `line-clamp-2` (2 dòng = 48px với 16/700, leading 24) | `ActivityCard` |
| 6 | Khối nút `mt-auto shrink-0 pt-4` và **mọi nút dùng chung một class** `NUT_DANG_KY_CLASS` | `ActivityCard` |

### Bất biến bổ sung của 4 thẻ test ở trang Discover (file 01, mục B3)
Ô badge `invisible` giữ chỗ phải **cùng height 24px** với badge thật → nút 4 thẻ test mới thẳng hàng.

### Kiểm thử bắt buộc trước khi báo xong (chụp màn hình ở 390/768/1440)
1. Lưới có 3 thẻ: title **1 dòng** / title **2 dòng** / description dài nhất → **đáy 3 nút trùng nhau**, sai 1px là fail.
2. Một thẻ `slots_left = 0` (nút “Đã hết chỗ”) cạnh 1 thẻ đang đăng ký (spinner) → vẫn thẳng hàng.
3. filter đổi số cột (1 cột ở 390) → không còn lệch.
4. `Tab` qua lưới: thứ tự theo vị trí thị giác, vòng focus thấy rõ ở mọi nút.

---

## A. Khung trang & trạng thái

Giữ nguyên **khung đầu trang dùng chung cho mọi trạng thái** (`khungDauTrang`) — đây là lý do
bố cục không nhảy khi đổi trạng thái. Mọi nhánh đều render khung này trước.

| Nhánh | Điều kiện | Mục |
|---|---|---|
| Đang tải | `data === null && !error` | B5 |
| Lỗi | `error` khác rỗng | B6 |
| Rỗng | `data.length === 0` | B7 |
| Có dữ liệu | còn lại | B2–B4, B8 |

Giữ nguyên: `load()` theo `field`/`q`, `register(id)` + `registeringId` (khóa nút),
`thuLai()`, `filters = ["", ...Object.keys(ACTIVITY_FIELD_NAMES)]`, `ACTIVITY_FIELD_NAMES`,
`data-testid="activity-grid" / "activity-card" / "activity-title" / "activity-register-btn"`.

---

## B. MÔ TẢ TỪNG KHỐI THEO THỨ TỰ MÀN HÌNH

### B1. Hàng đầu: `PageHeader` + bộ lọc lĩnh vực
```
flex flex-wrap items-end justify-between gap-3 · margin-bottom 24
TRÁI: PageHeader — H1 24/800 (mobile 22) --ink · sub 14/1.6 --muted-strong
      title “Đăng ký hoạt động” · sub “Săn slot các lab, câu lạc bộ, cuộc thi đang mở.” (GIỮ)
      PageHeader tự margin-bottom 0 khi nằm trong hàng này (đặt class override mb-0)
PHẢI: role="group" aria-label="Lọc theo lĩnh vực" · flex wrap · gap 8
```
**Chip lọc (button):**
```
height 44 · padding-x 16 · radius 999 · font 13/600 · transition 200ms
CHƯA chọn: background #ffffff · border 1px solid var(--line-control) (3,27:1 ✅) · chữ var(--ink-soft)
           hover: border-color var(--portal) · chữ var(--ink)
ĐANG chọn: background var(--ink) · border 1px solid var(--ink) · chữ #ffffff (12,32:1 ✅)
           + icon ✓ 14px bên trái label   ← không để màu làm tín hiệu duy nhất
aria-pressed={field === f} (GIỮ) · aria-label (GIỮ)
<768: group chiếm full width, wrap, gap 8 (chip không bị cắt chữ)
```
*Lý do đổi:* hiện chip chưa chọn dùng `text-muted` 12px = **3,46:1 ❌** và cao ≈27px
(< 44px mục tiêu cảm ứng — 00/7.8).

### B2. Ô tìm kiếm
```
container: width 100% · max-width 384 · height 44 · radius 12
           border 1px solid var(--line-control) (đổi từ border-line 1,15:1 ❌)
           background #ffffff · padding-x 12 · display flex · align-items center · margin-bottom 24
icon Search: 16px · color var(--muted-strong) · shrink-0
input: flex 1 · height 42 · padding-x 8 · font 14/400 · color var(--ink)
       background transparent · outline none
       placeholder “Tìm hoạt động theo tên…” → color var(--muted-strong)
       autocomplete="off" (GIỮ) · <label class="sr-only"> (GIỮ)
focus (toàn khối): border-color var(--portal) · box-shadow 0 0 0 3px color-mix(in srgb, var(--portal) 18%, transparent)
```

### B3. Thông báo lỗi
```
position: ngay dưới ô tìm kiếm, trên lưới · margin-bottom 16
<ErrorBox> theo 00/4.10: nền #FEF2F2 · viền #FECACA · radius 12 · padding 16
           icon AlertTriangle 18 #B91C1C · chữ 14/500 --ink (KHÔNG đỏ toàn bộ câu)
text (giữ nguyên): “Không tải được danh sách hoạt động, bạn thử lại sau nhé.” /
                   “Đăng ký chưa thành công, bạn thử lại sau nhé.”
nút “Thử lại”: secondary — h 44 · px 20 · radius 12 · 14/600 · viền --line-control · margin-top 12
                onClick={thuLai} (GIỮ)
```

### B4. Thông báo thành công sau đăng ký (MỚI — hiện chưa có phản hồi)
```
position: trên lưới (sau khối lỗi), margin-bottom 16
role="status" aria-live="polite"
icon ✓ 16 · gap 8 · chữ 14/600 #047857 (5,48:1 ✅) → “Đăng ký thành công — bạn đã giữ chỗ.”
```

### B5. Đang tải (nhánh 1)
- **Giữ nguyên** `khungDauTrang` (PageHeader + filter + search vẫn hiển thị).
- Thay spinner chung bằng **6 skeleton thẻ khớp bố cục `ActivityCard`** (00/4.9):
  ```
  skeleton: radius 20 · nền shimmer 1.4s · 6 phần
     banner  : height 84  (nền #F3ECE3 đặc, không shimmer nhẹ)
     title   : width 70% × 20, margin 16/16/0
     3 dòng meta: width 55% / 80% / 45% × 12, gap 8
     progress: width 100% × 8
     nút     : width 100% × 44 (margin-top auto — dùng flex column để giữ đúng vị trí)
  ```
- Bọc vùng lưới `aria-busy="true"`, kèm dòng chữ “Đang tải danh sách hoạt động…” 14 `--muted-strong`
  (giữ label hiện tại).
- `prefers-reduced-motion` → bỏ shimmer, chỉ nhấp nháy opacity.

### B6. Lỗi
Như B3. **Không** thay cả trang bằng `ErrorBox` — giữ khung đầu trang (đang đúng, giữ nguyên).

### B7. Rỗng
```
<Empty> theo 00/4.8: border 1px dashed var(--line-strong) · nền canvas-soft/60
        radius 16 · padding 40px 16px · canh giữa · margin-bottom 0 (thay luôn lưới)
icon CalendarDays 32 --muted
dòng 1: 14/600 --ink-soft  → “Chưa có hoạt động nào, bạn thử đổi từ khóa hoặc lĩnh vực khác nhé.” (GIỮ text)
dòng 2 (MỚI): nút secondary h 44 “Xóa bộ lọc” → setField("") + setQ("")
```

### B8. Lưới thẻ hoạt động
```
grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 · gap-4 md:gap-6 · items-stretch
      (đổi gap-4 cố định → 16 mobile / 24 desktop theo 00/3)
margin-bottom: 32
```

### B9. Thẻ hoạt động `ActivityCard` (chi tiết từng phần)

**a) Khung thẻ**
```
<article data-testid="activity-card">
width 100% · height 100% · radius 20  (VIẾT rounded-[20px] — rounded-2xl chỉ = 16px)
border 1px solid var(--line) · background #ffffff · box-shadow var(--shadow-card)
overflow hidden · display flex · flex-direction column
transition 200ms
BỎ hover-lift: thẻ không phải vùng bấm (chỉ nút mới bấm) → 00/4.1 cấm card thường hover-lift
                (vẫn giữ hover nhẹ ở nút)
```

**b) Banner (`shrink-0`)**
```
height: 84px CỐ ĐỊNH · padding 12px 16px · position relative
nền (GIỮ): field ky_thuat / hoc_thuat → .field-banner-tech (cam) · còn lại → var(--hero-gradient)
chip lĩnh vực:
   height 24 · padding-x 10 · radius 999 · 12/600
   background #ffffff · color var(--portal-dark)   ← đổi từ bg-white/25 + text-[11px]
   (11px < 12px và trắng 25% trên gradient ≈2,5:1 ❌ → nền đặc trắng ≥6,4:1 ✅)
```

**c) Thân thẻ**
```
padding 16 · display flex · flex-direction column · flex 1
```

**d) Tiêu đề**
```
font 16/700 · line-height 24 · color var(--ink) · min-height 48 (min-h-[3rem]) · line-clamp-2
word-break: break-word · margin-bottom 0
(đổi từ text-[15px] → chốt 16 theo H4; 2 dòng × 24 = 48 khớp min-h — không đổi min-h)
```

**e) Thông tin 3 dòng (gap 4 giữa các dòng)**
```
mỗi dòng: flex · gap 6 · align-items center · font 12/400 --muted-strong
icon 14 stroke 2 --muted-strong · shrink-0
dòng 1 Clock   : {start_date ?? "Sắp mở"}          — truncate 1 dòng
dòng 2 MapPin  : {description ?? "Địa điểm cập nhật sau"} — truncate 1 dòng
dòng 3 Users   : “{daLay}/{capacity}” tabular-nums  …  giá trị phải:
                 · slots_left > 0 → “Còn {n} chỗ”   12/700 #047857
                 · slots_left = 0 → “Hết chỗ”       12/700 #B91C1C
                 (đổi `text-emerald-600` 3,77:1 ❌; text đã khác nhau → không phụ thuộc màu)
margin-bottom: 8
```

**f) Thanh tiến độ**
```
height 8 (đổi từ h-1.5 = 6) · radius 999 · track var(--line) · fill var(--hero-gradient)
margin-top 8 · shrink-0
aria-hidden="true"   ← thông tin “x/y” đã có ở dòng 3 bằng chữ, không lặp lại cho SR
```

**g) Khối nút (BẤT BIẾN 6)**
```
margin-top auto · padding-top 16 · shrink-0 · width 100%
nút: width 100% · height 44 (đổi từ h-10 = 40 → đúng mục tiêu 44 của 00/7.8)
     radius 12  (VIẾT rounded-[12px], KHÔNG rounded-full / rounded-xl)
     font 14/600 · text-align center
     → MỘT class chung duy nhất cho mọi trạng thái (tiếp tục giữ nguyên vai trò của NUT_DANG_KY_CLASS)
```
**4 trạng thái nút (cùng height → luôn thẳng hàng):**

| Trạng thái | Điều kiện | Nền | Chữ | Ghi chú |
|---|---|---|---|---|
| Mặc định | `!registered && slots_left > 0 && !dangDangKy` | `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)` | `#ffffff` 14/600 (4,61:1 ✅) | label “Đăng ký ngay”; hover brightness 1.08 + `translateY(-1px)` |
| Đang đăng ký | `dangDangKy` | như trên, `opacity .9` | `#ffffff` | label “Đang đăng ký…” + spinner 16 · `disabled` · `aria-busy="true"` |
| Đã đăng ký | `registered` | `var(--portal-soft)` · viền `1px var(--portal)` | `var(--portal-dark)` 14/600 (6,4:1 ✅) | label “Đã đăng ký ✓” · `disabled` · **không** dùng gradient → phân biệt được với CTA |
| Hết chỗ | `slots_left <= 0` | `var(--canvas-soft)` · viền `1px var(--line-control)` | `var(--muted-strong)` 14/600 (4,55:1 trên canvas-soft ✅) | label “Đã hết chỗ” · `disabled` |

- **Focus (mọi trạng thái, kể cả disabled=false):** `outline: 2px solid var(--portal); outline-offset: 2px`.
- **Disabled:** `cursor: not-allowed` · **không** hover effect · `opacity: 1` cho 2 trạng thái
  “Đã đăng ký”/“Hết chỗ” (nền đã đủ khác biệt — **không** dùng `opacity .40` như hiện tại vì
  làm chữ trắng/mờ rơi xuống dưới 4,5:1).
- `type="button"` + `data-testid` giữ nguyên.

**h) Banner CTA cuối trang**
```
margin-top 32 · card-surface · radius 20 · padding 24 · BỎ interactive/hover-lift (không bấm được)
icon tile: 48×48 · radius 16 · background var(--brand-soft) · icon CalendarDays 22 var(--brand)
           (đổi gradient indigo→tím — màu ngoài bảng màu, 00/1 không cho phép)
tiêu đề: 16/700 --ink → “Tham gia – Trải nghiệm – Phát triển”
mô tả : 14/1.6 --muted-strong (đổi text-muted)
gap: 16 · giữ nguyên text
```

---

## C. RESPONSIVE

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Hàng đầu | PageHeader full, filter xuống dưới, wrap | filter wrap 2 dòng | filter 1 dòng phải | 1 dòng |
| Ô tìm kiếm | max-width full | 384 | 384 | 384 |
| Lưới | **1 cột** | **2 cột, gap 24** | **3 cột, gap 24** | 3 cột |
| Thẻ ActivityCard | toàn rộng, banner 84 | như vậy | như vậy | như vậy |
| Banner CTA cuối | xếp dọc (icon trên) | xếp ngang | xếp ngang | xếp ngang |
| Skeleton | 1 / 2 / 6 thẻ theo lưới | 2 | 6 | 6 |

- Không tràn ngang ở 4 cỡ; giữ `min-w-0` cho card và `overflow-x` cho filter nhóm.

---

## D. CHECKLIST ĐỔI (pane 2 tự đối chiếu)

| # | Vị trí | Hiện tại | Chuyển thành | Lý do |
|---|---|---|---|---|
| D1 | **6 bất biến nút thẳng hàng** | đã sửa xong | **GIỮ NGUYÊN** (bảng đầu file) | không làm hỏng lại |
| D2 | Chip lọc chưa chọn | `text-muted` 12px @3,46:1 ❌, cao ≈27px | h 44 · 13/600 `--ink-soft` · viền `--line-control` | 00/7.2 + 7.5 + 7.8 |
| D3 | Chip lọc đang chọn | nền `--ink` (đúng) | giữ + **thêm icon ✓** | 00/7.7 (màu không là tín hiệu duy nhất) |
| D4 | Ô tìm kiếm | wrapper `border-line` (1,15:1 ❌), `py-2` ≈36 | viền `--line-control`, h 44, placeholder `--muted-strong` | 00/7.5 + 7.8 |
| D5 | Nút “Thử lại” | `h-9` = 36 | h 44 | 00/7.8 |
| D6 | Đang tải | spinner chung | **6 skeleton khớp `ActivityCard`** | 00/4.9 |
| D7 | Rỗng | chỉ text | + nút “Xóa bộ lọc” secondary | 00/4.8 |
| D8 | Thành công khi đăng ký | không có phản hồi | dòng `aria-live` “Đăng ký thành công…” 14/600 `#047857` | phản hồi trạng thái |
| D9 | Grid | `gap-4` cố định | `gap-4 md:gap-6` | 00/3 |
| D10 | Thẻ ActivityCard radius | `rounded-2xl` = 16px | `rounded-[20px]` | số đo card = 20 |
| D11 | Thẻ | `hover-lift` | **bỏ** hover-lift (chỉ nút hover) | 00/4.1 |
| D12 | Banner thẻ | cao theo nội dung, chip `bg-white/25 text-[11px]` | **h 84 cố định**, chip nền trắng 12/600 `--portal-dark` | bất biến 3 + 00/7.3 |
| D13 | Tiêu đề thẻ | `text-[15px]` | 16/700, giữ `min-h-[3rem]` + `line-clamp-2` | 2 dòng × 24 = 48 khớp min-h |
| D14 | Meta 3 dòng | `text-muted` ❌ · “Còn N chỗ” `emerald-600` ❌ | `--muted-strong` · `#047857` / `#B91C1C` | 00/7.2 + 7.4 |
| D15 | Progress thẻ | h 6, track `bg-canvas-soft` | h 8, track `--line`, `aria-hidden` | 00/4.5 |
| D16 | Nút thẻ | `h-10` (40) + `rounded-full` + `disabled:opacity-40` | **h 44 · radius 12** + bảng 4 trạng thái (B9g) | 00/7.8 + 4.2 |
| D17 | Banner CTA cuối | gradient indigo→tím (ngoài bảng màu), `interactive`, `text-muted` | nền `--brand-soft` + icon `--brand`, bỏ interactive, `--muted-strong` | 00/1 + 4.1 |

**Không thay đổi:** API `load/register`, `registeringId` khóa nút, `khungDauTrang`,
`ACTIVITY_FIELD_NAMES`, `data-testid`, text tiếng Việt hiện có, thứ tự khối
(header → tìm kiếm → [lỗi] → [rỗng/lưới] → banner CTA).

---

## E. BẢNG ĐỐI CHIẾU SỐ ĐO (P2 đo bằng devtools, sai → báo pane 1)

| Phần tử | Số đo phải đúng |
|---|---|
| `PageHeader` H1 | **24/800** (mobile 22) · sub **14/400** `--muted-strong` · margin-bottom hàng đầu **24** |
| Chip lọc | height **44**, padding-x **16**, radius **999**, font **13/600**, gap trong nhóm **8** |
| Ô tìm kiếm | height **44**, max-width **384**, radius **12**, margin-bottom **24** |
| Hộp lỗi | padding **16**, radius **12**, nút Thử lại height **44**, margin-top **12**, margin-bottom khối **16** |
| Lưới | gap **16 (<768)** / **24 (≥768)**; cột 1 / 2 / 3 tại 390 / 768 / 1024 |
| Thẻ ActivityCard | radius **20**, border **1**, shadow 2 lớp 00/4.1 |
| Banner trong thẻ | height **84** (cố định), padding **12/16**, chip **24×px10 /12/600** |
| Thân thẻ | padding **16**, gap 3 dòng **4**, icon **14** |
| Tiêu đề | **16/700**, line-height **24**, min-height **48**, 2 dòng max |
| Progress | height **8**, radius **999**, margin-top **8** |
| Khối nút | padding-top **16** (`mt-auto`) |
| Nút đăng ký | height **44**, width **100%**, radius **12**, font **14/600** — **mọi thẻ giống hệt nhau** |
| Banner CTA cuối | margin-top **32**, padding **24**, icon tile **48×48 / r16** |
| Khoảng cách dọc | header→search **24** · search→[lỗi|rỗng|lưới] **16/24** · lưới→banner **32** |
