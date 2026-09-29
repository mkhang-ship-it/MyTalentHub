# ĐẶC TẢ DASHBOARD HỌC SINH `/student` — `frontend/src/pages/student/Dashboard.tsx` (Đợt 1)

> ⚠️ **Ảnh tham chiếu `refs/02-dashboard-hoc-sinh.svg` CHỈ ĐỂ XEM HÌNH DẠNG.**
> Mọi con số/màu/khoảng cách lấy từ file này; file chữ thắng.
> Đọc `00-he-thong-thiet-ke.md` trước (thang chữ, nhịp không gian, bảng màu, a11y).

**Phạm vi:** `frontend/src/pages/student/Dashboard.tsx` (+ class mới ở `index.css`/`ui.tsx` nếu cần).
**Không** sửa `Layout.tsx` (sidebar, header mobile, bottom-nav giữ nguyên 100%).

---

## A. Khung trang

| Hạng mục | Giá trị |
|---|---|
| Khung ngoài | `Layout.tsx` — sidebar 280px (≥1024), header mobile sticky (390–1023), bottom-nav 64px (<1024) |
| Padding trang | 20px (<640) · 24px (640–1023) · 32px (≥1024) — **giữ của Layout** |
| Container nội dung | `max-width: 1200px; margin: 0 auto` (thêm — tránh giãn méo ≥1600) |
| Nền | `var(--canvas)` |
| Scope màu (Layout ghi đè) | `--portal #A1458F` · `--portal-soft #F9EEF7` · `--portal-dark #7E2F73` · `--hero-gradient #FF5A4E→#EF4580→#844BD2` |
| Khoảng cách khối dọc | **32px** (`space-y-8` hoặc `mb-8`) |
| Thứ tự khối | PageHeader → Hero banner → 4 Thẻ chỉ số → Skill Orbit → AI + Lộ trình (2 cột) → Bảng hoạt động |

### GIỮ NGUYÊN từ bản hiện tại
1. `PageHeader`, `Card`, `StatCard`, `Loading`, `ErrorBox` từ `components/ui` (chỉ chỉnh style theo mục D).
2. Toàn bộ logic fetch `/student/overview`, `fetchErrorMessage` (dịch lỗi tiếng Việt) — **không đổi**.
3. Khối hero banner gradient + cách đặt tên “Chào mừng trở lại, {tên}! 👋”, chip chuỗi ngày, khối điểm.
4. Bố cục 4 thẻ KPI → Skill Orbit → 2 cột AI/Lộ trình → bảng hoạt động.
5. `SkillOrbit` (component 3D) — giữ nguyên, chỉ thêm fallback.
6. Bảng `<table>` thật với `role="region"` + `<th scope="col">`.
7. `FIELD_LABELS` (6 lĩnh vực tiếng Việt).
8. Animation `fadeUp` hiện có + block `prefers-reduced-motion` trong trang.

---

## B. MÔ TẢ TỪNG KHỐI THEO THỨ TỰ MÀN HÌNH

### B1. `PageHeader` (đầu trang)
```
margin-bottom: 24px
H1: 24px/1.25/800 · letter-spacing −0.015em · --ink       → “Tổng quan cá nhân”
sub: margin-top 4 · 14px/1.6/400 · --muted-strong          → “Hiển thị điểm năng lực, huy hiệu, giờ trải nghiệm của bạn.”
actions (nếu có): flex gap 8, canh phải, không đè sub
```
- Mobile (<640): H1 22px; sub vẫn 14px, không cắt.

### B2. Hero banner (khối gradient)
```
height: tự động, min-height 148px (≥768) · 132px (<768)
border-radius: 20px · overflow hidden
background-image:
   linear-gradient(105deg, rgba(27,42,94,.62) 0%, rgba(27,42,94,.40) 55%, rgba(27,42,94,.18) 100%),
   var(--hero-gradient)
padding: 24px (mobile 20)
box-shadow: 0 8px 24px rgba(51,50,77,.10)
```
Bố cục **≥768: 2 cột `1fr / auto`, canh giữa, gap 24** · **<768: xếp dọc, gap 16**.

**Cột trái:**
1. `h2` **24px/1.25/800 `#ffffff`** → “Chào mừng trở lại, {full_name}! 👋” (mobile 20px).
2. `p` margin-top 4 · **14/1.6 `#ffffff` opacity 1** (bỏ `text-white/70`)
   → “{N}h trải nghiệm · Khoá/Khối {grade} · Hạng #{rank}/{total}”.
3. **Chip chuỗi ngày** margin-top 12:
   ```
   height 32px · padding 0 12px · radius 999 · gap 6
   background #ffffff · color var(--portal-dark) /* #7E2F73 */
   font 13/700 · icon Flame 14px fill var(--portal)
   ```
   Text: “Chuỗi {streak} ngày” hoặc “Bắt đầu chuỗi hôm nay”.
   *Lý do:* hiện tại `bg-white/20 + text-white` trên gradient chỉ **2,52:1 ❌** → nền đặc
   trắng + chữ `--portal-dark` = **6,4–7,2:1 ✅**.

**Cột phải (ẩn <640 → hiển thị lại dạng full-width dưới 640):**
```
background: rgba(27,42,94,.50) · border: 1px solid rgba(255,255,255,.22)
border-radius: 16px · padding: 16px 20px · text-align right · min-width 160px
label: 12/700 uppercase letter-spacing .06em #ffffff        → “Điểm năng lực”
value: 40/1.05/800 tabular-nums #ffffff                     → {talent_score}
```
(<640: `width: 100%`, `text-align: left`, giá trị 34px.)

### B3. 4 thẻ chỉ số (KPI)
- Lưới: **1 cột <640 · 2 cột 640–1279 · 4 cột ≥1280**, `gap: 16px`.
- Mỗi thẻ (`StatCard` sửa theo mục 4.4 của 00):
  ```
  card-surface · radius 20 · padding 20 · min-height 116
  hàng 1: label 13/600 --ink-soft   (TRÁI)          ô icon 44×44 radius 12 (PHẢI)
                                             nền var(--portal-soft) · icon 18 stroke 2.2 var(--portal-dark)
  giá trị: margin-top 4 · 28/800 --ink · tabular-nums
  phụ chú: margin-top 4 · 12/600 --muted-strong
  ```
- Nội dung 4 thẻ (**giữ nguyên text**):
  | Label | Giá trị | Phụ chú | Icon |
  |---|---|---|---|
  | Điểm năng lực | `{talent_score}` | “Thang điểm 100” | `Trophy` |
  | Giờ trải nghiệm | `{N}h` | “Tích lũy tự động qua check-in” | `Flame` |
  | Xếp hạng | `#{rank}/{total}` | “Khoá/Khối {grade} · {total} bạn” | `Users` |
  | Huy hiệu đã mở | `{N}` | “Explorer/Innovator/Expert/Master” | `Sparkles` |
- **Đổi màu phụ chú:** hiện `text-emerald-600` (`#059669` = 3,77:1 ❌, và “Thang điểm 100”
  không phải tín hiệu tăng) → **tất cả dùng `--muted-strong`**; chỉ khi API có trường delta
  thật thì mới tô `#047857` (▲) / `#B91C1C` (▼).
- Icon tile `color`: bỏ `text-portal-dark/text-portal` rải rác → **duy nhất `text-portal-dark`**.

### B4. Card “Skill Orbit”
```
card-surface · radius 20 · padding 24 · margin-top 32
header: flex justify-between, gap 16, margin-bottom 16
   trái: H3 18/700 --ink “Skill Orbit”
         + mô tả 14/1.6 --muted-strong, margin-top 4
         “Năng lực và hành trình của bạn trong một không gian dữ liệu.”
   phải: chip điểm — height 24, padding 0 10, radius 999,
         background var(--portal-soft) · color var(--portal-dark) · 12/700 → “{score}/100”
canvas: width 100% · height 360px (≥768) · 260px (<768) · border-radius 12 · overflow hidden
```
- **Fallback WebGL lỗi:** thay canvas bằng **6 thanh tiến độ** (mục 4.5 của 00): mỗi dòng
  label lĩnh vực 13/600 `--ink-soft` trái, `{N}h` 13/700 tabular phải, thanh 8px tô gradient
  `skillbar-a…d` có sẵn; gap 16.
- Giữ nguyên props `data={orbitData}`.

### B5. 2 cột: AI phân tích + Lộ trình
- Lưới: **1 cột <1024 · 2 cột ≥1024**, `gap: 24px`, `margin-top: 32px`.
- **Card AI phân tích năng lực**
  ```
  padding 24 · card-surface · radius 20 · hover-lift (translateY −2px) nếu là vùng bấm
  header: icon Sparkles 18 var(--portal) + gap 8 + H3-cap 16/700 --ink   → “AI phân tích năng lực”
          margin-bottom 12
  body:   14/1.6 --ink-soft (bỏ text-muted) · min-height 66px
  box CTA (margin-top 16):
     background var(--portal-soft) · border 1px solid color-mix(in srgb, var(--portal) 25%, transparent)
     radius 16 · padding 16 · display block
     text 14/600 color var(--portal-dark) → “💡 Xem lộ trình 3 tháng được AI gợi ý riêng cho bạn →”
     hover: border-color var(--portal) · translateY(−2px) · shadow 0 6px 16px rgba(51,50,77,.10)
     focus: outline 2px var(--portal) offset 2
  ```
  Text rỗng khi chưa có AI: “Đang phân tích — hoàn thành bài test năng khiếu để nhận gợi ý.” (**giữ**)
- **Card “Lộ trình gợi ý 3 tháng tới”**
  ```
  padding 24 · card-surface · radius 20
  header: icon CalendarDays 18 var(--portal) + 16/700 --ink · margin-bottom 16
  list: mỗi mục flex gap 12, không có card nền (nền trong suốt)
     ô tròn: 32×32 radius 999 · background var(--portal-soft) · color var(--portal-dark) · 12/700 → “T1/T2/T3”
     đường nối: 2px · var(--line) · từ đáy ô này tới ô tiếp theo (margin-left 15px)
     tiêu đề: 14/600 --ink
     mô tả:  13/1.5 --muted-strong
  khoảng cách giữa 2 mục: 16px
  ```
  Rỗng: “Chưa có lộ trình — AI sẽ gợi ý sau bài khảo sát năng khiếu.” 14/400 `--muted-strong`
  + icon `Sparkles` 16 (`--muted`).

### B6. Card “Hoạt động của bạn” (bảng)
```
margin-top 32 · card-surface · radius 20 · padding 24
header: icon CalendarDays 18 var(--portal) + 16/700 --ink · margin-bottom 16
```
- **Có dữ liệu → bảng** (mục 4.7 của 00):
  ```
  thead: 12/700 UPPERCASE tracking .06em --muted-strong · padding 10px 12px
         border-bottom 1px solid var(--line-strong)
         4 cột: Hoạt động | Lĩnh vực | Trạng thái | “Giờ tích lũy” (phải)
  tbody row: padding 12px · min-height 44 · border-bottom 1px solid var(--line)
             hover: color-mix(in srgb, var(--portal-soft) 40%, transparent)
  cột 1: 14/600 --ink (không cắt, cho phép 2 dòng trên mobile-list)
  cột 2: 14/400 --ink-soft, viết hoa đúng `FIELD_LABELS` (dùng map có sẵn, KHÔNG `capitalize` thô)
  cột 3: badge — nền var(--portal-soft) chữ var(--portal-dark) 12/600 + icon theo status
         (đã duyệt ✓ · đang tham gia ⟳ · hoàn thành ★ · chưa bắt đầu ○)
  cột 4: 14/700 tabular-nums --ink, canh phải → “{hours}h”
  ```
  <768px → **danh sách thẻ** (mục 4.7): mỗi hoạt động 1 card `border 1px var(--line) radius 16
  padding 16`, dòng 1 tên hoạt động 14/600, dòng 2 3 cặp “label 12/600 `--muted-strong` :
  giá trị 13/600 `--ink`” xếp 2 cột, gap 8.
- **Không có dữ liệu → `Empty`** (mục 4.8):
  ```
  border 1px dashed var(--line-strong) · bg canvas-soft/60 · radius 16 · padding 40px 16px
  icon CalendarDays 32 --muted
  dòng 1: 14/600 --ink-soft → “Bạn chưa tham gia hoạt động nào — khám phá sân chơi ngay!”
  dòng 2: nút secondary sm margin-top 16 → “Khám phá sân chơi →”  (link /student/activities)
  ```

### B7. Trạng thái tải / lỗi của trang
- **Đang tải:** thay `Loading` chung bằng **skeleton khớp bố cục thật** (mục 4.9):
  1 skeleton hero (100%×148, radius 20) → 4 skeleton thẻ (100%×116, radius 20) →
  1 skeleton lớn (100%×440, radius 20) → 2 skeleton cột (100%×240) → 1 skeleton bảng (100%×260).
  Bọc `aria-busy="true"`, giữ dòng chữ “Đang tải…” 14px `--muted-strong`.
  *(Nếu pane 2 muốn gọn: dùng `Loading` cũ cho lần đầu, skeleton cho refresh — nhưng phải nói rõ.)*
- **Lỗi:** `ErrorBox` — giữ đúng mục 4.10: nền `#FEF2F2`, viền `#FECACA`, **chữ 14/500 `--ink`**
  (không đỏ toàn câu), icon `AlertTriangle` 18 `#B91C1C`, nút “Thử lại” secondary sm
  (`onClick` gọi lại `get('/student/overview')`) margin-top 12. Vị trí: ngay dưới `PageHeader`.

---

## C. RESPONSIVE

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| PageHeader | H1 22px | H1 24px | H1 24px | H1 24px |
| Hero banner | xếp dọc, padding 20, score full-width 34px | **ngang**, padding 24, score box | ngang | ngang |
| KPI | 1 cột | 2 cột | 2 cột | **4 cột** |
| Skill Orbit canvas | 260px | 360px | 360px | 360px |
| AI + Lộ trình | 1 cột | 1 cột | 2 cột gap 24 | 2 cột gap 24 |
| Bảng hoạt động | **danh sách thẻ** | cuộn ngang trong card | cuộn ngang | full, 4 cột |
| Sidebar / nav | drawer + bottom-nav 64px | drawer + bottom-nav | sticky 280px | sticky 280px |

- Không tràn ngang ở cả 4 cỡ; tổng chiều cao khối dưới 1024 < 2 màn hình.
- Bottom-nav (64px) → trang có `padding-bottom` 24px ở <1024 (Layout đã có spacer — không lặp lại).

---

## D. DANH SÁCH THAY ĐỔI (pane 2 checklist)

| # | Vị trí | Hiện tại | Chuyển thành | Lý do |
|---|---|---|---|---|
| D1 | Toàn trang | khoảng cách khối `mb-6` (24) | **32px** giữa các khối dọc | nhịp không gian mục 3 của 00 |
| D2 | `PageHeader` sub | `text-muted` 3,46:1 ❌ | `--muted-strong` 5,01:1 ✅ | mục 7.2 |
| D3 | Hero banner | không scrim | + `--scrim-navy` (00 mục 7.3) | chữ 14px trên gradient 3,08–3,60:1 ❌ |
| D4 | Hero mô tả | `text-white/70` | `#ffffff` opacity 1 | ≈3,1:1 ❌ |
| D5 | Chip chuỗi ngày | `bg-white/20 text-white` | nền `#ffffff` + chữ `var(--portal-dark)` | 2,52:1 ❌ → 6,4:1 ✅ |
| D6 | Khối điểm | chỉ chữ, không nền | hộp `rgba(27,42,94,.50)` viền trắng 22%, padding 16×20 | tách lớp, tăng độ đọc |
| D7 | `StatCard` label | `text-sm font-medium text-muted` | 13/600 `--ink-soft` | 3,46 ❌ → 8,50 ✅ |
| D8 | `StatCard` delta | `text-emerald-600` 3,77:1 ❌ | 12/600 `--muted-strong` (hoặc `#047857` khi có delta thật) | mục 7.4 |
| D9 | `StatCard` padding | `p-5` ngẫu hứng | 20px + min-height 116 | mục 4.4 |
| D10 | Skill Orbit | canvas không fallback | + fallback 6 thanh tiến độ | WebGL lỗi → trắng màn hình |
| D11 | Card AI/ Roadmap | body `text-muted` | `--ink-soft` | mục 7.2 |
| D12 | Card AI | hover `shadow-[…]` rải rác, tiêu đề `font-semibold` | dùng class `hover-lift` + tiêu đề 16/700 | thống nhất component |
| D13 | CTA trong card AI | viền `border-portal-soft` (không thấy) | viền `color-mix(portal 25%)` | viền vô hình → 0 tín hiệu |
| D14 | Bảng cột Lĩnh vực | `capitalize` trên `ky_thuat` → “Ky thuat” | map `FIELD_LABELS` (đã có trong file) | tiếng Việt sai |
| D15 | Badge trạng thái | chip màu đơn | + icon/đ tiền tố chữ theo status | mục 7.7 (màu không là tín hiệu duy nhất) |
| D16 | Trạng thái rỗng | inline div | component `Empty` mục 4.8 + nút secondary | thống nhất |
| D17 | Trạng thái tải | spinner chung | skeleton khớp bố cục | mục 4.9 |
| D18 | `ErrorBox` | chữ đỏ toàn bộ | chữ `--ink` + icon đỏ + nút “Thử lại” | mục 4.10 |
| D19 | — | không có container max | `max-width: 1200px` cho vùng nội dung | ≥1600 không méo |

**Không thay đổi:** fetch/logic lỗi, text hiển thị, thứ tự khối, component `SkillOrbit`,
`Layout.tsx`, bảng `<table>` thật, animation reduced-motion.

---

## E. CHECKLIST NHẬN NGHIỆM
- [ ] 390 / 768 / 1024 / 1440: 0 tràn ngang; KPI đổi 1→2→4 cột đúng.
- [ ] Không còn chữ nào `text-muted`/`text-white/70`/`text-white/20` trong trang.
- [ ] Chip + hộp điểm đọc rõ trên mọi pixel của gradient (kiểm tra cả đầu `#FF5A4E`).
- [ ] Skeleton không “nhảy” layout so với nội dung thật (độ cao khối bằng nhau).
- [ ] Focus tuần tự: PageHeader → hero (không có control) → 4 KPI (không) → link CTA AI → bảng → Empty.
- [ ] Giảm dữ liệu về 0: hiện `Empty` đúng mẫu, không hiện bảng rỗng.
- [ ] Mô phỏng lỗi 401/403: `ErrorBox` tiếng Việt như hiện tại + nút Thử lại hoạt động.
