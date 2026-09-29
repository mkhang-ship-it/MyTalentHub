# ĐẶC TẢ `/enterprise/talents` — `frontend/src/pages/enterprise/Talents.tsx` (Đợt 4 · file 02)

> PANE 1 chỉ thiết kế · **CHỮ THẮNG ẢNH · CON SỐ LÀ CHUẨN · CLASS LÀ GỢI Ý** (00/0.3).
> Nguồn sự thật: `../dot1/00-he-thong-thiet-ke.md` — đọc lại 4.2 (Nút), 4.3 (Badge), 4.6 (Ô nhập),
> 4.7 (Bảng), 4.8 (Empty), 4.9 (Skeleton), 4.10 (ErrorBox), 5.2, 6, 7.
> Nguồn đã đọc (đọc-ghi, KHÔNG sửa): `pages/enterprise/Talents.tsx` (413 dòng),
> `components/three/DataNetwork.tsx` (268 dòng — **thuộc `three/**`, ĐỢT 4 KHÔNG ĐƯỢC SỬA**),
> `components/ui.tsx`, `index.css`, `Layout.tsx` (tone Doanh nghiệp `#C44296`).
>
> **⚠️ Ranh giới theo lệnh P5:** đổi **BỐ CỤC XUNG QUANH** `DataNetwork` → ghi ở đây, P2 làm được
> trong `Talents.tsx`. Sửa **BẢN THÂN** `DataNetwork` → chỉ ghi ở **mục E (ĐỀ NGHỊ)**, chờ P5 mở quyền
> `three/**` cho Đợt 4 — **không** viết như thể đã chốt.

**Quyết định chung G1–G11 ở `README.md`.**

---

## A. TRẠNG THÁI TRANG (3 nhánh)

### A1. Đang tải (Skeleton — 00/4.9)
`aria-busy="true"` + chữ `Đang tải danh sách nhân tài…` 14/400 `--muted-strong`.

| Vị trí | Skeleton |
|---|---|
| PageHeader | 260×28 + 100%×14 |
| Card bộ lọc | 1 khung **100%×140** |
| Hàng đếm + số dòng/trang | 1 khung **280×20** + 1 khung **120×44** |
| Bảng | 1 khung **100%×44** (header) + **5** khung **100%×48** (đúng `pageSize` hiển thị tối đa 5 hàng mẫu) |
| Khối mạng | 1 khung **100%×320** |

### A2. Lỗi — **TÁCH 2 LOẠI (sửa lỗi thật đang có)**

| Loại | Hiện tại | **Chốt** |
|---|---|---|
| **Lỗi tải danh sách** (`load()` catch → `error`) | `if (error) return <ErrorBox/>` → **mất PageHeader + bộ lọc**, đổi bộ lọc lần sau cũng nhảy về trang lỗi | Giữ nguyên trang: `PageHeader` + bộ lọc + `<ErrorBox message retryLabel="Thử lại" onRetry={load}/>` đặt **ngay trên hàng đếm**; bảng/`DataNetwork` không render khi chưa có `data` |
| **Lỗi mời phỏng vấn** (`handleInvite` catch → `setError`) | cũng `setError` → **bấm “Mời phỏng vấn” lỗi là mất cả trang** | state riêng `loiMoiId` (id hồ sơ lỗi): hiện **chip tone nguy hiểm** ngay trong ô thao tác của dòng đó: `bg #FEF2F2 · chữ #B91C1C 12/600 · icon ⚠ 12 · radius 999 · h 24` + `role="alert"`; nút “Mời phỏng vấn” trở lại trạng thái bấm được; **không** đụng `error` của trang |

### A3. Rỗng
- `data.items.length === 0` → **không render table**: thay bằng component `Empty` (00/4.8) đặt dưới hàng đếm:
  ```
  <Empty text="Không tìm thấy hồ sơ phù hợp với bộ lọc."
         icon={<Search size={32}/>}
         action={đang có bộ lọc ? <button className="btn-secondary h-9 px-3.5 text-[13px]">Bỏ bộ lọc</button> : undefined} />
  ```
  - Nút “Bỏ bộ lọc” xóa **cả 6** điều kiện (`q, classFilter, grade, field, minScore, minTechnicalScore`) rồi `setPage(1)`.
  - `total === 0` và **không** có bộ lọc → `text="Chưa có hồ sơ nhân tài nào."` (không nút).
- `DataNetwork` khi `items.length === 0`: **không render khối mạng** (xem B6) — tránh 2 hộp rỗng cùng lúc.

---

## B. MÔ TẢ KHỐI THEO THỨ TỰ MÀN HÌNH

### B1. `PageHeader`
- Bỏ **“(slide 29)”** → subtitle: `"Tra cứu hồ sơ học sinh theo tên, lớp, khối, lĩnh vực, điểm năng lực — để tuyển thực tập hoặc tài trợ tài năng."` (G1)
- `margin-bottom 24` (đã có).

### B2. Card “Bộ lọc”
```
Card: card-surface · radius 20 · padding 24 · margin-bottom 16 · KHÔNG hover-shadow (G5)
hàng tiêu đề: icon Filter 16 --muted-strong + “Bộ lọc” 13/600 --ink-soft  ……  (phải) nút “Bỏ bộ lọc”
```

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | Nhãn “Bộ lọc” | `text-xs text-muted-light uppercase tracking-wider` (12/400, 2,09 ❌) | **13/600 `--ink-soft`** (00/4.6 label) — **bỏ uppercase** (uppercase chỉ dành cho header bảng 00/4.7) |
| 2 | Nút “Bỏ bộ lọc” | **không có** (bộ lọc không có cách bỏ nhanh) | thêm: `btn-secondary h-11 px-5` (44/12/14-600, viền `--line-control`) — chỉ hiện khi ≥1 điều kiện khác rỗng; bấm = xóa 6 điều kiện + `setPage(1)` |
| 3 | Lưới 6 ô | `grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3` | **`grid-cols-1 · md:grid-cols-2 · xl:grid-cols-3 · gap-4`** — *lý do bằng số*: tại 1024 nội dung = 1024−280−48 = 696px; 6 cột → mỗi ô **~106px**, trong khi option “Điểm năng lực ≥ bất kỳ” dài ~160px → select cắt chữ. 2 cột (768–1279) → ~344px/ô ✅; 3 cột ≥1280 → 1440: 1096/3 ≈ 356px/ô ✅ |
| 4 | 6 ô nhập/select | `py-2 … rounded-xl border border-line` (~40px, viền **1,39:1 ❌**) | **`.input-control`**: h **44** · radius **12** · viền **`--line-control` 3,27:1** · chữ 14/400 `--ink` · placeholder 14 `--muted-strong` · focus border `--portal` + ring 3px (00/4.6) |
| 5 | Ô tìm kiếm có icon | wrapper `rounded-xl border-line` + icon `text-muted-light` | wrapper h **44** radius **12** viền `--line-control`; icon giữ `--muted` (icon 3,46:1 ✅ 00/7.2); input bên trong không viền, `py-0` cao 44 |
| 6 | label sr-only | có | **giữ nguyên** (6/6 đều có `<label for>` thật) |

### B3. Hàng đếm + số dòng/trang
```
margin-bottom 16 · flex flex-wrap justify-between gap-4
trái:  “{total} hồ sơ phù hợp · Trang {page} / {total_pages}” — 14/400 --muted-strong (bỏ text-muted 3,46 ❌)
       giữ aria-live="polite" (đúng chỗ: thông báo kết quả đổi)
phải:  select “{n}/trang” → .input-control h 44 radius 12 --line-control (hiện py-1.5 ~36px ❌)
       label sr-only giữ
```

### B4. Bảng kết quả (≥ 768px)

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | `<table role="grid">` | có `role="grid"` | **bỏ `role="grid"`** — giữ semantic `<table>/<th scope>` thật; `role="grid"` đòi hỏi điều hướng bàn phím dạng lưới mà bảng không có (00/4.7) |
| 2 | Wrapper cuộn | `overflow-x-auto` trần | thêm `role="region" aria-label="Kết quả tìm kiếm nhân tài" tabIndex={0}` (00/4.7 + 7.6) |
| 3 | `<thead>` | `text-muted-light text-xs uppercase tracking-wider` · `border-b border-line` · `pb-2 pr-4` | **12/700 `--muted-strong` · tracking .06em · `border-b --line-strong` · padding 10px 12px** (00/4.7); cột số (Năng lực/Kỹ thuật/Thao tác) `text-right` |
| 4 | Hàng | `border-b border-line/50` · `hover:-translate-y-0.5` · `bg-portal-soft/20` | `border-b --line` · **bỏ translate** (hàng không phải card — chữ không được nhảy, 00/4.1) · hover `bg-portal-soft/40` (00/4.7) · min-height 44 · padding 12 |
| 5 | Họ tên | `max-w-[180px] truncate font-medium text-ink` | **14/600 `--ink`** · giữ `truncate` + `title` (tên dài không mất, có tooltip) |
| 6 | Lớp / Khối | `text-muted` (3,46 ❌) | **14/400 `--ink`** (00/4.7) |
| 7 | Năng lực | `text-portal` (4,60 ✅ nhưng…) | **14/700 `--ink` · tabular-nums · căn phải** — cùng tông với cột Kỹ thuật (00/4.7 cột số); giữ `aria-label="Điểm năng lực {n}"` (đọc đủ chữ) |
| 8 | Kỹ thuật | `text-amber-600` (**3,19:1 ❌**) | như mục 7: **14/700 `--ink`** · giữ `aria-label` |
| 9 | Chip kỹ năng | `text-[11px]` (11 < 12 ❌) · cao ~20 · `font-medium` | **12/600 · h 24 · radius 999 · px 10** · nền `--portal-soft` chữ `--portal-dark` (6,42 ✅ giữ) · gap giữa chip **6px** · tối đa 3 chip + `aria-label` nhóm (đang có, giữ) |
| 10 | Nút “Xem hồ sơ” | `rounded-full border-line text-xs px-3 py-1.5` (~30px, viền 1,39 ❌) | **≥768: h 36 · radius 10 · 13/600 · viền --line-control · chữ --ink** (00/4.2 sm) · **<768 (danh sách thẻ): h 44** (00/7.8 target cảm ứng) |
| 11 | Nút “Mời phỏng vấn” | `cta-gradient rounded-full text-xs` (**3,67:1 ❌** + radius pill + ~30px) | **`btn-primary` sm: h 36 · radius 10 · 13/600 · nền --btn-primary-bg (4,61 ✅)** ≥768; **h 44** <768 · disabled: attribute `disabled` thật + opacity theo 00/4.2 (**bỏ `disabled:opacity-50`**) · spinner + `aria-busy` giữ nguyên |
| 12 | Chip “Đã mời” | `bg-emerald-50 text-emerald-700` + icon 12 | 2 màu này **đúng** tone thành công 00/4.3 (`#ECFDF5/#047857`) → chỉ chốt **h 24 · radius 999 · 12/600 · icon 12** · `aria-live="polite"` giữ |
| 13 | Hàng rỗng trong `<tbody>` | `<td colSpan>` viền dashed + `text-muted` | **dọn hẳn** — render `Empty` ngoài bảng (A3), không render `<table>` khi 0 kết quả |

### B5. Phân trang (`nav`, chỉ khi `total_pages > 1`)
```
margin-top 16 (hàng phụ trong khối bảng) · flex justify-center gap-1
```

| # | Hiện tại | **Chốt** | Lý do |
|---|---|---|---|
| 1 | nút số `w-9 h-9` (36) · mũi tên `p-2` (~34) | **44×44 · radius 12** mọi nút | 00/7.8 target cảm ứng; phân trang là control thưa → không cần nhét 36 |
| 2 | viền `border-line` (1,39 ❌) | **`--line-control`** (3,27 ✅) | 00/7.5 |
| 3 | mũi tên + `…` màu `text-muted-light` (2,09 ❌) | **`--muted-strong`** (5,01 ✅; icon ≥3 ✅) | 00/7.2 |
| 4 | nút hiện hành `bg-portal text-white font-medium` | giữ nền `--portal` + trắng (`#C44296` = **4,60 ✅**) · đổi **font 600** · `aria-current="page"` giữ | 00/4.3 nhấn; 7.7 số+`aria-current` là tín hiệu |
| 5 | `disabled:opacity-30` | **`opacity .55`** (00/4.2 disabled) + `aria-disabled` giữ | 00/4.2 |
| 6 | hover `-translate-y-0.5 + shadow` | giữ (nút bấm được → hover-lift OK 00/4.1) | — |
| 7 | `role="navigation"` lồng trong `<nav>` | **bỏ `role` thừa** (nav đã có role) | ARIA thừa |

### B6. Khối `DataNetwork` — **chỉ đổi phần nằm trong `Talents.tsx`**

```
<section aria-label="Mạng nhân tài và kỹ năng thật" style margin-top: 32 (00/5.2)>
  <DataNetwork … />
</section>
```

| # | Việc (thuộc `Talents.tsx` → P2 làm được) | Chốt |
|---|---|---|
| 1 | Vị trí | **giữ dưới phân trang** — mạng hiển thị đúng dữ liệu đang lọc/đang trang (nếu đặt lên trên sẽ mô tả dữ liệu khác với bảng dưới mặt), không chuyển lên trên |
| 2 | Khi `items.length === 0` | **không render section**; thay dòng chữ 14/400 `--muted-strong`: `"Mạng kỹ năng sẽ hiện khi có hồ sơ phù hợp."` (tránh 2 hộp rỗng cùng lúc — bảng `Empty` đã nêu nguyên nhân) |
| 3 | Khoảng cách | `margin-top 32` (hiện `mt-6` = 24) |
| 4 | `height={280}` | **giữ** (khung chuẩn của component) |
| 5 | Props `tieuDe` / `tomTat` / `nodes` / `links` | **giữ nguyên** — `tomTatNhanTai` đang trả lời “rồi sao?” đúng (điểm TB, kỹ năng phổ biến, giải thích đường nối) |
| 6 | Bọc ngoài (nếu cần chống SVG cao quá — xem E10) | **phương án dự phòng P2 tự làm được:** bọc `<div className="mx-auto w-full max-w-[560px]">` quanh `<DataNetwork>` (giới hạn bề rộng figure, không sửa component) — **chỉ dùng nếu E10 chưa được P5 mở quyền** |

> **Sửa bên trong `DataNetwork.tsx` → xem MỤC E (đề nghị, chờ P5).**

---

## C. SỐ LIỆU & “RỒI SAO?”

| Khối | Con số thật | Câu trả lời “rồi sao?” |
|---|---|---|
| Hàng đếm | `{total} hồ sơ · trang page/total_pages` | đủ/ chưa đủ kết quả → đổi bộ lọc hoặc bỏ lọc (nút **mới** ở B2-2) |
| Bảng | điểm Năng lực/Kỹ thuật từng hồ sơ, chip 3 kỹ năng thật | đọc nhanh + đi tiếp bằng **2 nút** (Xem hồ sơ / Mời phỏng vấn) — hành động ngay trên dòng |
| `DataNetwork` (đã có) | 5 nhân tài điểm cao nhất + đường nối kỹ năng THẬT | `tomTatNhanTai`: “Trong N hồ sơ đang hiện (tổng M): điểm TB X; kỹ năng phổ biến nhất: Y (Z người). Đường nối nghĩa là…” — **giữ nguyên prop, không viết lại** |
| Chip “Đã mời” / chip lỗi mời | trạng thái gửi lời mời | phản hồi tại chỗ, không mất trang (A2) |

- **Không** thêm biểu đồ mới: bảng + mạng đã là 2 dạng số liệu (bảng = chi tiết, mạng = quan hệ).

---

## D. RESPONSIVE — 390 / 768 / 1024 / 1440

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Bộ lọc 6 ô | **1 cột** | **2 cột** | 2 cột | **3 cột** (≥1280) |
| Kết quả | **danh sách thẻ (D1)** | **bảng** 7 cột, region cuộn | bảng (nội dung 696px ≥ min-w) | bảng full (1096px) |
| Nút hành động | **44px** (cảm ứng) | 36px (sm 00/4.2) | 36px | 36px |
| Phân trang | 44×44 | 44×44 | 44×44 | 44×44 |
| `DataNetwork` | full-width (svg `w-full`) | full-width | full-width | full-width → **xem E10** |

**→ Chốt breakpoint “đổi từ lưới sang danh sách dọc”:**
- **Bảng kết quả → danh sách thẻ dọc khi `< 768px`** (00/4.7).
- **Bộ lọc: 1 cột <768 · 2 cột 768–1279 · 3 cột ≥1280** (lý do số ở B2-3).
- Khối mạng luôn là 1 khối full-width (không nằm lưới).

### D1. Bảng → danh sách thẻ (< 768)
```
card: radius 16 · border 1px --line · background --surface · padding 16 · margin-bottom 12
hàng 1: họ tên 14/600 --ink  ……  badge “Điểm NL” không — để điểm ở hàng riêng cho đúng format 00/4.7
hàng 2: “Lớp” …… {class_name} 14/600 --ink
hàng 3: “Khối” …… Khối {grade} 14/600 --ink
hàng 4: “Điểm năng lực” …… {talent_score} 14/700 --ink tabular-nums
hàng 5: “Điểm kỹ thuật” …… {technical_score} 14/700 --ink tabular-nums
hàng 6: “Kỹ năng nổi bật” …… các chip 12/600 (như B4-9, wrap, gap 6)
chân:   flex gap-8 … 2 nút h 44 flex-1: “Xem hồ sơ” (btn-secondary) · “Mời phỏng vấn” (btn-primary)
        khi mời lỗi → chip tone nguy hiểm (A2-2) chiếm hàng riêng trên 2 nút
```
- label 12/600 `--muted-strong` trái · giá trị phải · gap 8 · padding 16 (00/4.7).

---

## E. ĐỀ NGHỊ MỞ QUYỀN SỬA `components/three/**` CHO ĐỢT 4 — **CHỜ P5 QUYẾT, KHÔNG PHẢI ĐÃ CHỐT**

> `DataNetwork.tsx` nằm trong `three/**` → Đợt 4 P2 **không được sửa**. Dưới đây là các lỗi thật
> đã đọc được trong source (29/09). Nếu P5 mở quyền → sửa theo bảng; nếu không → ghi lại cho Đợt 5.

| # | Vị trí trong `DataNetwork.tsx` | Hiện tại | Đề nghị | Lý do |
|---|---|---|---|---|
| E1 | `tomTat` (dòng 169) | `text-sm text-muted` (**3,46:1 ❌**) — lại chính là câu “rồi sao?” | **14/400 `--ink-soft`** (8,50 ✅) | 00/7.2 |
| E2 | dòng mô tả + label checkbox + danh sách reduced-motion (175/198/200/210) | `text-xs text-muted` (3,46 ❌) | **12/400 `--muted-strong`** (5,01 ✅) | 00/7.2 |
| E3 | gạch nối chú giải (197) | `text-muted-light` (**2,09 ❌**) | `--muted-strong` (mang `aria-hidden` vẫn phải thấy) | 00/7.2 |
| E4 | ô rỗng (180) | `text-sm text-muted` | **14/600 `--ink-soft`** | 00/4.8 |
| E5 | `<figure>` (164) | `rounded-2xl` = 17,6 | **radius 20** | 00/4.1 (figure là card) |
| E6 | checkbox (205) | `accent-pink-600` (màu ngoài bảng) | **`accent-portal`** + viền `--line-control` | 00/7.5 + bảng màu |
| E7 | nhãn SVG (247/251/255) | `fontSize 9.5` / `7.5` (**< 12px ❌**) | **12** (hiển thị ≥12) — **cần đo trước**: `RONG=300`, cột trái nhãn `text-anchor=end` tại `x−14` → nếu tràn thì phải **tăng `RONG`** (bố cục!) → thuộc phạm vi P5 | 00/7.1 + 6.1 |
| E8 | màu nhóm (43–50) | `grade #8B5CF6` ngoài 6 chuỗi · `default #8A87A3` | `grade` → **`#0D9488` (S4)** · giữ `talent #C44296` (S3) · `skill #F97316` (S5) · `default #6F6C8A` | 00/6.1 |
| E9 | đường nối (230–231) | `#c7c9d9 opacity .8` ≈ **1,6:1 ❌** (đường mang thông tin cần ≥3:1) | **`#6F6C8A` đặc**, `strokeWidth 1.5` | 00/7.1 (đường viền/thành phần mang thông tin ≥3:1) |
| E10 | `<svg>` (218) | `viewBox 0 0 300 {cao}` + `h-auto w-full` → **cao theo tỉ lệ**: 1440 (rộng ~1096) → cao ≈ 1096/300 × `caoSvg` (516) ≈ **1.883px**; 1024 → ≈ 696/300×516 ≈ **1.200px** | thêm giới hạn bề rộng trong component (`max-width: 560px` + `margin: 0 auto` cho `<svg>`, hoặc set `height` cố định + `preserveAspectRatio`) | *Chưa đo bằng devtools — P2 đo trước khi báo; nếu đúng thì đây là lỗi bố cục lớn nhất trang. Trong lúc chờ: dùng B6-6 (bọc `max-w-[560px]` từ `Talents.tsx`).* |

**Cách kiểm nhanh E10 (P2 chạy, không cần sửa file):** `document.querySelector('figure svg').getBoundingClientRect()` → so chiều cao với 280 (prop `height`).

---

## F. CHECKLIST TA1–TA16

| # | Khối | Việc phải làm | Nguồn |
|---|---|---|---|
| TA1 | PageHeader | Bỏ “(slide 29)” | G1 |
| TA2 | Lỗi | Tách `error` (trang) với lỗi mời (chip trong dòng) — không `return <ErrorBox>` toàn trang | 00/4.10, G2 |
| TA3 | Tải | `<Loading/>` → Skeleton 5 khối (A1) + `aria-busy` + chữ | 00/4.9 |
| TA4 | Rỗng | `items=0` → `Empty` + nút “Bỏ bộ lọc” (A3); ẩn khối mạng khi 0 kết quả | 00/4.8, B6-2 |
| TA5 | `<style>` cục bộ | Bỏ `fadeUp` trùng → `.reveal-up`; bỏ reset `*` reduced-motion (G4) | 00/7.8 |
| TA6 | Card bộ lọc | bỏ hover-shadow · nhãn 13/600 `--ink-soft` · thêm nút “Bỏ bộ lọc” `btn-secondary h-11` | 00/4.2/4.6 |
| TA7 | Lưới bộ lọc | `grid-cols-1 · md:2 · xl:3 · gap-4` (bỏ `lg:6`) | B2-3 |
| TA8 | 6 ô | `.input-control` h44 r12 `--line-control` (6/6 có label sr-only) | 00/4.6/7.5 |
| TA9 | Hàng đếm | 14 `--muted-strong` + `aria-live` giữ; select `/trang` h44 | 00/4.6 |
| TA10 | Bảng | bỏ `role="grid"` · region+tabIndex · header 12/700 `--muted-strong`+`--line-strong` · hàng 44/12 · hover `/40` không translate | 00/4.7 |
| TA11 | Ô bảng | Lớp/Khối `--ink` · 2 cột điểm 14/700 `--ink` phải + `tabular-nums` · chip 12/600 h24 · bỏ `text-[11px]`/`amber-600` | 00/4.3/4.7 |
| TA12 | 2 nút dòng | ≥768: sm h36 r10 (secondary + `btn-primary` 4,61:1) · <768: h44 · disabled theo 00/4.2 | 00/4.2/7.4/7.8 |
| TA13 | Phân trang | 44×44 r12 · viền `--line-control` · icon `--muted-strong` · active `--portal`+trắng 600 · bỏ `role` thừa | 00/7.8/7.5 |
| TA14 | Khối mạng | `margin-top 32` · giữ props · ẩn khi 0 kết quả (+ dòng dẫn 14 `--muted-strong`) | 00/5.2, B6 |
| TA15 | Responsive | <768 bảng → **thẻ D1** (nút 44) · bộ lọc 1/2/3 cột · gap 16 | 00/4.7/5.2 |
| TA16 | `three/**` | **không sửa `DataNetwork`** — đối chiếu mục E, báo P5 chọn **có mở quyền hay không**; đo E10 bằng console | lệnh P5 |

---

## G. BẢNG ĐỐI CHIẾU SỐ ĐO

| Thành phần | Số chuẩn |
|---|---|
| Ô bộ lọc / select `/trang` | h **44** · radius **12** · viền `--line-control` · chữ 14/400 `--ink` · placeholder 14 `--muted-strong` |
| Lưới bộ lọc | 1 cột <768 · 2 cột 768–1279 · **3 cột ≥1280** · gap **16** |
| Bảng (≥768) | header 12/700 `--muted-strong` + `--line-strong`, padding 10/12 · hàng 44 · padding 12 · cột số 14/700 phải `tabular-nums` |
| Chip kỹ năng / “Đã mời” | h **24** · radius **999** · 12/600 · tone (nhấn `--portal-soft/--portal-dark` · thành công `#ECFDF5/#047857`) |
| Nút trong bảng | sm **36 · r10 · 13/600** (≥768) · **44** (<768) · primary nền `--btn-primary-bg` 4,61:1 |
| Phân trang | **44×44** · radius **12** · viền `--line-control` · chữ 14/600 |
| Danh sách thẻ <768 | radius **16** · padding **16** · gap **8** · margin-bottom **12** · nút chân thẻ **44** |
| Khối chính | PageHeader → khối đầu **24** · khối ↔ khối **32** · hàng phụ trong khối **16** |
