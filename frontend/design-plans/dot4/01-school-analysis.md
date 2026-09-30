# ĐẶC TẢ `/school/analysis` — `frontend/src/pages/school/Analysis.tsx` (Đợt 4 · file 01)

> PANE 1 chỉ thiết kế · **CHỮ THẮNG ẢNH · CON SỐ LÀ CHUẨN · CLASS LÀ GỢI Ý** (00/0.3).
> Nguồn sự thật: `../dot1/00-he-thong-thiet-ke.md` — đọc lại 4.1 (Card), 4.3 (Badge), 4.7 (Bảng),
> 4.8 (Empty), 4.9 (Skeleton), 4.10 (ErrorBox), 5.2 (Lưới), 6 (Biểu đồ), 7 (Accessibility).
> Nguồn đã đọc (đọc-ghi, KHÔNG sửa): `pages/school/Analysis.tsx` (283 dòng),
> `components/chart/BieuDoCot.tsx`, `components/chart/ThanhXepHang.tsx`, `components/ui.tsx`,
> `index.css`, `Layout.tsx` (tone Nhà trường `#9B6AB5`).
> Trang này dùng 2 component biểu đồ P2 viết ở vòng trước → **thiết kế XUNG QUANH, không thay thế**
> (sửa chỉ là sửa nhỏ có lý do, gom ở mục E).

**Quyết định chung của Đợt 4 (G1–G11) nằm ở `README.md` — file này chỉ ghi phần riêng của trang.**

---

## A. TRẠNG THÁI TRANG (3 nhánh — cả 3 phải có thiết kế)

### A1. Đang tải (hiện tại: `<Loading/>` → thay bằng Skeleton khớp bố cục, 00/4.9)
Vùng bọc `aria-busy="true"` + dòng chữ `Đang tải phân tích…` 14/400 `--muted-strong` (bắt buộc kèm chữ, 00/4.9).

| Vị trí | Skeleton |
|---|---|
| PageHeader | 1 khung **260×28** + 1 khung **100%×14** (dòng phụ) |
| Hàng 1 (grid 2 cột) | 2 khung, mỗi **100%×400** (bằng nhau — khớp radar + bảng xếp hạng) |
| Card Top học sinh | 1 khung **100%×280** |
| Section biểu đồ | 2 khung, mỗi **100%×340** |

- Số khối/số khung **bằng hệt** bố cục thật (00/4.9).
- `prefers-reduced-motion` → bỏ shimmer, nhấp nháy `opacity .6 ↔ 1` mỗi 1,6s (index.css đã có — chỉ dùng `Skeleton`).

### A2. Lỗi tải (`error` — hiện tại đang `return <ErrorBox/>` mất PageHeader)
```
<PageHeader title="Phân tích năng lực học sinh" subtitle=… />
<ErrorBox message={error} retryLabel="Thử lại" onRetry={reload} />
```
- `reload` = gọi lại `get("/school/analysis")` (đặt trong hàm, tách khỏi `useEffect`).
- Không render bất kỳ khối dữ liệu nào khi `data === null`.
- Lỗi dịch tiếng Việt bằng `fetchErrorMessage` đang chạy — **giữ nguyên logic** (00/4.10).

### A3. Rỗng (API trả mảng rỗng — 4 trường hợp, hiện tại KHÔNG có thiết kế)
| Dữ liệu rỗng | Thiết kế |
|---|---|
| `skill_map = []` | Card radar thay bằng `<Empty text="Chưa có dữ liệu kỹ năng của toàn trường." icon={<BarChart3 size={32}/>} />` — **KHÔNG render SVG** (hiện tại `n = Math.max(len,3)` vẫn vẽ đa giác 3 đỉnh về tâm → đồ thị vô nghĩa) |
| `skill_map = []` | `ThanhXepHang` tự hiện `thongBaoRong` (đã có prop) — giữ |
| `grade_ranking = []` | Card xếp hạng thay `<Empty text="Chưa có dữ liệu điểm theo khối." icon={<BarChart3 size={32}/>} />`; `BieuDoCot` tự hiện `thongBaoRong` (đã có); dòng "rồi sao?" của bảng xếp hạng **không render** |
| `top_students = []` | Card Top thay `<Empty text="Chưa có học sinh nào trong danh sách nổi bật." icon={<Trophy size={32}/>} />`; bỏ luôn dòng "Bấm để xem Talent Passport" |
| `grade_ranking` rỗng mà `tongHS === 0` | `tomTatTruong` đổi thành `"Chưa có dữ liệu học sinh để tóm tắt."` |

---

## B. MÔ TẢ KHỐI THEO THỨ TỰ MÀN HÌNH

### B1. `PageHeader`
- Title giữ nguyên. Subtitle: **bỏ "(slide 25)"** → `"So sánh năng khiếu theo khối, lớp và các nhóm ngành."` (G1).
- Sub của `PageHeader` đã là 14/400 `--muted-strong` — giữ; `margin-bottom 24` (đã có).

### B2. Hàng 1 — grid 2 cột: Card radar (trái) + Card bảng xếp hạng (phải)
```
grid-cols-1 lg:grid-cols-2 · gap-4 md:gap-6 (16/24 — 00/5.2) · margin-bottom 32 (00/5.2)
Card: card-surface · radius 20 · padding 24
```
- **Bỏ `hover:shadow`** trên cả 2 Card (khối không bấm được — 00/4.1 hover-lift chỉ cho card/nút tương tác) → G5.
- Tiêu đề Card `h2` hiện `font-semibold` (16/600) → **18/700 --ink** (00/4.1 tiêu đề card).

#### B2a. Card “Bản đồ năng khiếu toàn trường” (radar SVG inline — P2 sửa trong `Analysis.tsx`)

| # | Vị trí | Hiện tại | **Chốt** | Lý do |
|---|---|---|---|---|
| 1 | `SIZE` / `RADIUS` | 320 / 100 | **272 / 83** | **ĐO LẠI 29/9 (Playwright, viewport 1024×900, `getBoundingClientRect` + `viewBox.baseVal`):** cột hẹp nhất THẬT ≠ 288 như đặc tả cũ — gridW **680** (main 744 − 2×32 pad, Layout pad 32 ở ≥1024 chứ không phải 24) → cột **328** (gap 24) → card inner = 328 − 48 (padding 24×2) − 2 (viền 1×2) = **278px** → viewBox 288 cũ → scale **0,9653** → font 12 chỉ hiện **11,58px** (P2 báo 11,6 ✓; **sai 0,42px / −3,5%** so với chốt 12,0 → vi phạm 00/7.1, **không chấp nhận**). Chốt mới **SIZE 272**: 278/272 = 1,022 → **12,27px ≥12** ✅. Đo 3 cỡ còn lại (svg = 300 @390 · 340 @768 · 340 @1440, `max-w-[340px]`) → 13,2 / 15,0 / 15,0 ✅. |
| 2 | Nhãn kỹ năng | `fontSize 9` / `10`, `fill #64748b` | **12 / 600 · `--ink-soft` (`#4b4a66`)** | 00/6.1 nhãn trục 12/600 `--ink-soft`; `#64748b` ngoài bảng token |
| 3 | Giá trị điểm | `fontSize 12` bold, `fill #db2777` | **12 / 700 · `--ink`** | 00/6.1 “giá trị trực tiếp 12/700 `--ink`”; `#db2777` ngoài bảng |
| 4 | Vòng lưới (rings) | solid `#e2e8f0` | **`1px dashed #ede7e1`** | 00/6.1 lưới |
| 5 | Trục toạ độ | `#e2e8f0` | **`1px #cfc6bc`** | 00/6.1 đường trục |
| 6 | Đa giác dữ liệu | fill `rgba(236,72,153,.25)` · stroke `#ec4899` 2px | fill **`rgba(27,42,94,.15)`** · stroke **`#1B2A5E` 2.5px** | 00/6.1: không dùng `--portal`/hồng làm màu chuỗi khi nó là màu nhấn trang; 00/6.3 stroke 2.5px |
| 7 | Điểm dữ liệu | `r=2.5` hồng | **`r=4` · `#1B2A5E`** | 00/6.3 điểm dữ liệu r=4 |
| 8 | Nhãn quanh vòng | offset `r+32`, clamp x `[56, SIZE−56]`, y `[14, SIZE−14]` | offset **`r+30`**, clamp x **`[64, 208]`**, y **`[16, 256]`** (theo SIZE 272 — đổi từ [64,224]/[16,272] theo SIZE 288 cũ) | giữ nhãn không tràn viewBox; **đo bằng devtools** (mục G, AN16) |
| 9 | Animation | `strokeDashoffset="200"` + `drawRadar 1.2s` | đặt **`strokeDashoffset="0"` mặc định**, keyframe chỉ `from { stroke-dashoffset: 200; opacity: 0 }` | reduced-motion tắt animation → đa giác phải hiện đủ, không bị ẩn vì offset 200 |
| 10 | Chú thích dưới SVG | `text-xs text-muted-light` (2,09:1 ❌) | **12/400 `--muted-strong`** (5,01:1 ✅) | 00/7.2 |
| 11 | `sr-only aria-live="polite"` mô tả radar | có | **bỏ** | mô tả tĩnh không đổi → vùng live thừa; giữ `role="img"` + `aria-label` + `<desc>` + `tabIndex={0}` (đủ, 00/7.6) |

**Thêm 1 dòng “rồi sao?” ngay dưới chú thích** (14/400 `--ink-soft`, `margin-top 8`, text-center):
```
Ưu tiên bồi dưỡng: {kyNangThapNhat.name} ({điểm}) — thấp hơn {kyNangCaoNhat.name} {chênh} điểm.
```
- Chỉ hiện khi `skill_map.length ≥ 2`; nếu 1 kỹ năng → `"Chưa đủ dữ liệu để so sánh kỹ năng."`
- Hai biến `kyNangCaoNhat/kyNangThapNhat` **đã có sẵn** trong file — chỉ dùng lại, không tính mới.

#### B2b. Card “Bảng xếp hạng khối” (bảng `<table>` thật)

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | `h2` | 16/600 | **18/700 --ink** (00/4.1) |
| 2 | `<thead>` | `text-muted-light text-xs uppercase tracking-wider` · `border-b border-line` | **12/700 `--muted-strong` · uppercase · tracking .06em · `border-b --line-strong` · padding 10px 12px** (00/4.7) |
| 3 | Ô số hiệu hạng | badge tròn 24px, 3 màu `pink-500 / orange-400 / violet-500` + chữ trắng (2,26–4,23:1 ❌) | **hạng 1:** nền `--portal-soft` chữ `--portal-dark` (6,42 ✅) · **hạng 2–n:** nền `--canvas-soft` viền `1px --line-strong` chữ `--ink-soft` (8,1 ✅) · **12/600 · h 24 · radius 999** (00/4.3). Số là tín hiệu chính (00/7.7) |
| 4 | Ô “Điểm TB” | tô `text-pink-600 / text-orange-500 / text-violet-600` (2,80–4,58 ❌) | **14/700 `--ink` · tabular-nums · căn phải** — bỏ tô màu theo hạng (màu không thêm thông tin nào so với cột #, 00/4.7 + 7.7) |
| 5 | Dòng phụ “điểm” | `text-[11px] text-muted-light` (11px + 2,09 ❌) | **12/400 `--muted-strong`** |
| 6 | Ô “h hoạt động · HS” | `text-muted` (3,46 ❌) | **14/400 `--ink`** (00/4.7 cột chữ) |
| 7 | Ô “Khối” | `font-semibold text-ink` | giữ — 14/600 `--ink` (cột chính) |
| 8 | Padding hàng | `px-4 py-3` | **12px mọi cạnh** (00/4.7) · min-height 44 |
| 9 | Hover hàng | `hover:bg-portal-soft/20` | `color-mix(--portal-soft 40%)` → class `hover:bg-portal-soft/40` (00/4.7) |
| 10 | Link cuối card | `text-portal` (trắng `#9B6AB5` = **3,76:1 ❌**) | **`text-portal-dark` (`#6E4390` = 7,32:1 ✅)** + `focus-visible:outline 2px --portal offset 2` (G9) |
| 11 | Cột “#” của bảng Top | — | thêm `tabular-nums` (xem B3) |

**Thêm dòng “rồi sao?” ngay dưới `h2`** (14/400 `--ink-soft`, `margin-bottom 12`), tính từ `grade_ranking` đã sắp `avg_score` giảm dần:
```
Khối {cao nhất} cao nhất {điểm} điểm · Khối {thấp nhất} thấp nhất {điểm} điểm · chênh {x} điểm.
```
(≥ 2 dòng dữ liệu mới render; 1 dòng → bỏ dòng.)

### B3. Card “Top học sinh nổi bật”

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | `h2` + icon Trophy | 16/600 · icon `--portal-dark` | **18/700 --ink** · icon giữ `--portal-dark` (7,32 ✅) |
| 2 | Hint “Bấm để xem Talent Passport” | `text-xs text-muted-light` (2,09 ❌) | **12/600 `--muted-strong`** + `margin-left auto` giữ |
| 3 | `<thead>` | như B2b | **12/700 `--muted-strong` · `border-b --line-strong` · padding 10/12** |
| 4 | Cột số hiệu | `text-muted-light` (2,09 ❌) | **12/700 `--muted-strong` · tabular-nums** |
| 5 | Avatar chữ | nền gradient `from-portal to-portal-dark`, chữ trắng 12/700 (đỉnh gradient `#9B6AB5` = 3,76 ❌) | nền **`--portal-dark` đặc** + chữ trắng 12/700 (7,32 ✅) · `h-8 w-8` giữ · `aria-hidden` giữ (chữ nằm kế tên) |
| 6 | Tên | `font-medium text-ink` | **14/600 `--ink`** |
| 7 | Ô “Lớp” | `text-muted` (3,46 ❌) | **14/400 `--ink`** |
| 8 | Ô “Điểm năng lực” | `text-center font-bold text-portal-dark` | **căn phải** · **14/700 `--portal-dark`** (7,32 ✅ — giữ làm số nổi bật) · `tabular-nums` |
| 9 | Ô “Giờ trải nghiệm” | `text-center` | **căn phải** · **14/600 `--ink`** · `tabular-nums` (00/4.7 cột số) — header 2 cột này đổi sang `text-right` |
| 10 | Link “Xem passport →” | `text-portal` (3,76 ❌) | **`text-portal-dark`** · 12/600 · giữ `hover:underline` |
| 11 | Hover hàng | `bg-portal-soft/20` | `bg-portal-soft/40` (00/4.7) |

**Thêm dòng “rồi sao?” dưới hàng tiêu đề** (14/400 `--ink-soft`, `margin-left auto` đổi thành dòng riêng `margin-bottom 8`):
```
{N} em điểm cao nhất — điểm cao {max} · thấp nhất trong danh sách {min} · tổng {sum} giờ trải nghiệm.
```
(tính từ `top_students` — 3 dòng số sẵn có; bỏ khi mảng rỗng.)

### B4. Section “Phân bố khối + xếp hạng kỹ năng”
```
margin-top 32 (00/5.2) · grid-cols-1 lg:grid-cols-2 · gap-4 md:gap-6 · aria-label giữ nguyên
```
- **Props của `BieuDoCot` và `ThanhXepHang` GIỮ NGUYÊN** (tieuDe, tomTat, donVi, thangToiDa, thongBaoRong, ghiChu đều đã đúng “rồi sao?”).
- Nội dung thay đổi nằm trong 2 component → **mục E**.

---

## C. SỐ LIỆU & “RỒI SAO?” (thành phẩm bắt buộc của trang — 00/6.3)

| Khối | Con số thật | Câu trả lời “rồi sao?” | Nguồn |
|---|---|---|---|
| Radar | điểm TB từng kỹ năng (12/700 quanh vòng) | **dòng mới** “Ưu tiên bồi dưỡng: …” (B2a) | `skill_map` |
| Bảng xếp hạng khối | giờ hoạt động · số HS · điểm TB từng khối | **dòng mới** “Khối X cao nhất … chênh …” (B2b) + link sang `/school/classes` | `grade_ranking` |
| Top học sinh | điểm + giờ từng em | **dòng mới** “N em … điểm cao … tổng …h” (B3) + link passport | `top_students` |
| `BieuDoCot` | số HS từng cột + `phuDe` “TB 72,8 · 150h” | `tomTatTruong` (đã có) + `ghiChu` cảnh báo khối lạ (đã có) | props |
| `ThanhXepHang` | điểm từng kỹ năng + thanh có % ngầm | `tomTat` “cao nhất/thấp nhất/chênh → ưu tiên bồi dưỡng” (đã có) | props |

- **Không** bọc số vào khung đẹp mà thiếu chữ: mọi biểu đồ trong trang đều có ≥1 câu tóm tắt bằng chữ
  (aria-label của `figure` cũng đọc đủ số — **giữ nguyên** 2 aria-label đang có).

---

## D. RESPONSIVE — 390 / 768 / 1024 / 1440

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Hàng radar + xếp hạng | 1 cột | 1 cột | **2 cột** | 2 cột |
| Section 2 biểu đồ | 1 cột | 1 cột | **2 cột** | 2 cột |
| Radar SVG (viewBox 272, `max-w-[340px]`) — svg đo được 29/9 | 300px → font 13,2 | 340 → 15,0 | **278 → 12,3** | 340 → 15,0 |
| Bảng xếp hạng khối | **danh sách thẻ (D1)** | cuộn ngang (`overflow-x-auto` + region) | cuộn ngang | full width |
| Bảng Top học sinh | **danh sách thẻ (D2)** | cuộn ngang | cuộn ngang | full width |
| `BieuDoCot` (nhiều cột) | flex-1 tự co ≤56px/cột, gap 16, nhãn xuống 2 dòng | như 390 | như 390 | như 390 |

**→ Chốt breakpoint “đổi từ lưới sang danh sách dọc” (yêu cầu 3 của lệnh):**
- **Bảng → danh sách thẻ dọc khi `< 768px`** (00/4.7) — áp dụng cho bảng xếp hạng khối và bảng Top học sinh.
- **Lưới 2 cột → 1 cột khi `< 1024px`** (00/5.2 Card 2 cột).
- Grid gap: **16 (<640) · 24 (≥640)** → `gap-4 md:gap-6`.

### D1. Bảng xếp hạng khối → danh sách thẻ (< 768)
```
card: radius 16 · border 1px --line · background --surface · padding 16 · margin-bottom 12
hàng 1:  badge hạng (B2b-3)  +  “Khối {n}” 14/600 --ink   ……   {điểm} 16/700 --ink tabular-nums  + “điểm” 12/400 --muted-strong
hàng 2:  label “Hoạt động & HS” 12/600 --muted-strong   ……   “{hours}h · {count} học sinh” 14/600 --ink
```
- `label` trái · giá trị phải · cách 8px · padding 16 (đúng 00/4.7).

### D2. Bảng Top học sinh → danh sách thẻ (< 768)
```
card: radius 16 · border 1px --line · background --surface · padding 16 · margin-bottom 12
hàng 1: avatar 32 (nền --portal-dark) + tên 14/600 --ink
hàng 2: “Lớp” …… “{class_name} · Khối {grade}” 14/600 --ink
hàng 3: “Điểm năng lực” …… {talent_score} 14/700 --portal-dark tabular-nums
hàng 4: “Giờ trải nghiệm” …… {hours}h 14/600 --ink
chân:   link “Xem passport →” 14/600 --portal-dark, khối cao 44px (target cảm ứng, 00/7.8)
```

---

## E. SỬA NHỎ TRONG 2 COMPONENT BIỂU ĐỒ — **giữ nguyên bố cục, chỉ sửa có lý do**

> `components/chart/**` KHÔNG nằm trong `three/**` → P2 được sửa ở Đợt 4.
> Không thay component, không đổi API props, không đổi cách vẽ cơ học — chỉ màu/chữ/kích thước vi phạm 00.

### E1. `BieuDoCot.tsx`

| # | Hiện tại | **Chốt** | Lý do (con số) |
|---|---|---|---|
| 1 | `<figure>` `rounded-2xl` (17,6) | **radius 20** | 00/4.1 — đứng cạnh `Card` radius 20 |
| 2 | `h3` `font-semibold` (16/600) | **18/700 `--ink`** | 00/4.1 tiêu đề card (figure là thẻ chứa biểu đồ; 00/6.3 “14/700” dành cho tiêu đề con nằm TRONG vùng vẽ) |
| 3 | `tomTat` `text-muted` (3,46 ❌) | **14/400 `--ink-soft`** (8,50 ✅) | đây là câu “rồi sao?” — chữ quan trọng nhất của figure |
| 4 | `donViY` `text-muted-light` (2,09 ❌) | **12/500 `--muted-strong`** (5,01 ✅) | 00/6.3 đơn vị 12/500 `--muted-strong` |
| 5 | cột: gradient `violet-600→violet-400`, `rounded-t-lg` (8), `max-w-[72px]`, `gap-2/3` (8/12) | nền **`#1B2A5E` (S1) đặc** · bo trên **6px** · max-w **56px** · gap **16px** | 00/6.1 chuỗi 1 = `#1B2A5E` (violet ngoài 6 chuỗi) · 00/6.3 bo 6 / ≤56 / gap 16 |
| 6 | nhãn giá trị `text-xs font-bold text-ink` | **giữ nguyên** | đúng 00/6.1 (12/700 `--ink`) |
| 7 | nhãn dưới cột `text-[11px] text-muted-light` (`phuDe`) | **12/400 `--muted-strong`** | 11px < 12px + 2,09:1 ❌ |
| 8 | ô rỗng `text-sm text-muted` | **14/600 `--ink-soft`** | 00/4.8 (icon 32 **không thêm** — prop `thongBaoRong` là chuỗi; `Empty` cũng cho phép không icon) |
| 9 | `ghiChu` `bg-amber-50 border-amber-200 text-amber-800` | nền **`#FFF7ED`** · chữ **`#9A3412` 12/400** · radius **12** · padding **8/12** · icon ⚠ 12px · **bỏ viền amber** | tone cảnh báo 00/4.3 (6,9:1 ✅); amber-50/200/800 ngoài bảng 00 |
| 10 | `aria-label` ghép tiêu đề + tóm tắt + giá trị | **giữ nguyên** | đúng 00/6.3 “mọi biểu đồ nói bằng chữ” |

### E2. `ThanhXepHang.tsx`

| # | Hiện tại | **Chốt** | Lý do |
|---|---|---|---|
| 1 | `<figure>` `rounded-2xl` · `h3` 16/600 | **radius 20** · **18/700** | 00/4.1 (như E1-1/2) |
| 2 | `tomTat` `text-muted` (3,46 ❌) | **14/400 `--ink-soft`** | như E1-3 |
| 3 | badge hạng `h-6 w-6 … text-xs font-bold bg-portal-soft text-portal-dark` | giữ màu (6,42 ✅) · đổi `font-bold` → **600** | 00/4.3 font 12/600 |
| 4 | tên `text-sm font-medium` (500) | **14/600 `--ink`** | cột chính 00/4.7 |
| 5 | đơn vị cạnh điểm `text-muted-light` (2,09 ❌) | **12/400 `--muted-strong`** | 00/7.2 |
| 6 | thanh: track `bg-canvas-soft` · fill `orange-400→pink-500` · `h-2.5` (10) | track **`--line` (`#ede7e1`)** · fill **`#1B2A5E` (S1) đặc** · cao **8px** | 00/4.5 track `--line`, cao 8 · 00/6.1 1 chuỗi = S1 (gradient cam→hồng không thuộc bảng) |
| 7 | ô rỗng `text-sm text-muted` | **14/600 `--ink-soft`** | 00/4.8 |
| 8 | số hạng + `sr-only` đọc đủ | **giữ nguyên** | 00/7.7 (số là tín hiệu) |

---

## F. CHECKLIST AN1–AN16 (pane 2 tự đối chiếu — sai số báo pane 1)

| # | Khối | Việc phải làm | Nguồn |
|---|---|---|---|
| AN1 | Toàn trang | Bỏ “(slide 25)” khỏi subtitle + xóa comment `(slide 25)` | G1 |
| AN2 | Trạng thái lỗi | Không `return <ErrorBox>` toàn trang: `PageHeader` + `ErrorBox retryLabel onRetry` (gọi lại API) | 00/4.10, G2 |
| AN3 | Trạng thái tải | `<Loading/>` → `Skeleton` đúng 4 khối (A1) + `aria-busy` + chữ “Đang tải phân tích…” | 00/4.9 |
| AN4 | Rỗng | 4 nhóm `Empty` (A3) + **không render radar SVG khi `skill_map` rỗng** | 00/4.8 |
| AN5 | `<style>` cục bộ | Bỏ `@keyframes fadeUp` trùng → dùng `.reveal-up`; **bỏ selector `*` trong media reduced-motion**; `drawRadar` có rule reduced-motion riêng + `strokeDashoffset` mặc định 0 | 00/7.8, G4 |
| AN6 | Hàng 1 | Bỏ `hover:shadow` 2 Card; `gap-4 md:gap-6`; `margin-bottom 32`; `h2` 18/700 | 00/4.1/5.2 |
| AN7 | Radar | Bảng 11 số ở B2a (SIZE 272, font 12 `--ink-soft`, giá trị 12/700 `--ink`, lưới dashed `#ede7e1`, trục `#cfc6bc`, polygon S1 2.5px, dot r4) | 00/6.1/6.3 |
| AN8 | Radar | Dòng “rồi sao?” 14/400 `--ink-soft` + caption 12 `--muted-strong` + bỏ `sr-only aria-live` thừa | C |
| AN9 | Bảng xếp hạng | Header 12/700 `--muted-strong` + `--line-strong`; badge hạng 4.3 (1 portal-soft, còn lại trung tính); điểm TB 14/700 `--ink` bỏ 3 màu; padding 12; hover `/40` | 00/4.3/4.7 |
| AN10 | Bảng xếp hạng | Dòng “rồi sao?” dưới `h2` + link → `--portal-dark` | C, G9 |
| AN11 | Top học sinh | Header + rank + avatar `--portal-dark` + cột số căn phải (B3-3…9) + hint 12 `--muted-strong` + link `--portal-dark` | 00/4.7, G9 |
| AN12 | Top học sinh | Dòng “rồi sao?” dưới hàng tiêu đề | C |
| AN13 | Section dưới | `margin-top 32` · `gap-4 md:gap-6`; props 2 biểu đồ **không đổi** | 00/5.2 |
| AN14 | 2 bảng | Wrapper `overflow-x-auto` → `role="region" aria-label tabIndex={0}`; hover hàng `bg-portal-soft/40`, không transform | 00/4.7/7.6 |
| AN15 | Responsive | <768: 2 bảng → **danh sách thẻ D1/D2**; lưới 2 cột ≥1024; gap 16/24 | 00/4.7/5.2 |
| AN16 | Đo | Devtools: mọi `<text>` trong radar nằm trong viewBox, font hiển thị **≥12px** ở 390/768/1024/1440 → ghi số đo vào mục G, sai → báo pane 1 (không tự đổi font) | 00/7.1 |
| AN16·kết quả | **29/9 — pane 1 đo** (Playwright, `fontSize_user × rect.width / viewBox.width`): 1024 → **11,58px ❌** (cột 278), 390 → 12,5 · 768/1440 → 14,17 (viewBox 288 cũ). P2 báo 11,6 ✓. → chốt SIZE **272** ở B2a-1, dự kiến mới: **12,27 / 13,2 / 15,0 / 15,0** — P2 đo lại sau khi sửa (CHƯA ĐO cho tới khi code) | |

---

## G. BẢNG ĐỐI CHIẾU SỐ ĐO (P2 đo bằng devtools, sai → báo pane 1)

| Thành phần | Số chuẩn |
|---|---|
| Radar SVG | viewBox **272×272** · RADIUS **83** · nhãn 12/600 `--ink-soft` · giá trị 12/700 `--ink` · max-w **340** · font hiển thị ≥12 ở mọi cỡ (đo 29/9: 12,3–15,0px) |
| Grid hàng 1 & section | 1 cột **<1024** · 2 cột **≥1024** · gap **16/24** · khối cách nhau **32** · PageHeader → khối đầu **24** |
| Card | radius **20** · padding **24** · tiêu đề **18/700** — không hover-shadow |
| Bảng (≥768) | header 12/700 `--muted-strong` · padding header 10/12 · hàng min-height **44** · padding 12 · border-bottom `--line-strong` (header) / `--line` (hàng) |
| Badge hạng | **h 24 · radius 999 · 12/600** · hạng 1 `--portal-soft/--portal-dark` · còn lại `--canvas-soft + --line-strong/--ink-soft` |
| Cột số | **14 · căn phải · tabular-nums** (600 thường, 700 điểm nổi bật) |
| Danh sách thẻ <768 | radius **16** · padding **16** · gap label↔giá trị **8** · margin-bottom **12** |
| Link trong trang | `--portal-dark` (7,32:1 ✅) · focus `outline 2px --portal / offset 2` |
