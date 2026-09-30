# 04 — DATANETWORK + CÁC E: CHỐT E1–E3 (dot2) VÀ E1–E10 (dot4) + E11 MỚI

> P5 hỏi: **chốt rõ E1–E3 (còn từ Đợt 2) và E1–E10 nào còn đúng sau khi bố cục trang Đợt 4 đổi.**
> Mỗi dòng: trạng thái **CÒN ĐÚNG → làm** / **BỎ** / **ĐÃ XONG** + **bằng chứng đo/grep**.
> Quyền sửa `three/**` đã mở cho Đợt 5 → phiếu sửa dưới đây là chữ để pane 2 code.

---

## 1. E1–E3 CỦA DOT2 (`01-discover.md` — yêu cầu mở quyền `DiscoverScene`)

| # | Đề nghị Đợt 2 | Trạng thái 29/9 | Bằng chứng (cách đo) | Việc làm |
|---|---|---|---|---|
| **E1** | Chiều cao scene responsive: 300 ≥768 / **240 <768** (bỏ `height: 300` inline) | **BỎ — giữ 300/280 mọi breakpoint** | `DiscoverScene.tsx:174` vẫn `height: 300, minHeight: 280` (grep). Đo @390 (`resultsE.json`): hull = **300×300**, `state=running`, `scrollWidth 390 = viewport` → **không tràn**, khung vuông thấy đủ nội dung; 240 chỉ tiết kiệm 60px mà mất 20% bề mặt scene. Đổi lúc này = phá “khung 300 là bất biến Đợt 2” mà chính dot2 đã cấm. | không đổi |
| **E2** | Fallback `text-xs text-muted` → `--muted-strong` | **CÒN ĐÚNG → LÀM** | `DiscoverScene.tsx:141` vẫn `text-xs text-muted` (grep) → `rgb(138,135,163)` = **3,46:1 ❌** (12px, 00/7.2) trên nền trắng của card | **PS2**: → `text-muted-strong` (6,68:1 ✅) — `03` |
| **E3** | Cột chưa làm `0x8a87a3` → sáng hơn (`#b2afc6`) cho thấy trên nền trắng | **BỎ — màu hiện tại đúng, đề nghị cũ sai** | Tính WCAG từ RGB: `#8a87a3` vs `#FFF` = **3,44:1 ✅ ≥3:1** (00/7.1 chỉ đòi ≥3 với hình ảnh không phải chữ); còn `#b2afc6` (đề nghị Đợt 2) = **2,13:1 ❌** → làm theo sẽ **vi phạm**. Nguồn: `DiscoverScene.tsx:82–85` (grep) | không đổi |

---

## 2. E1–E10 CỦA DOT4 (`02-enterprise-talents.md` — `DataNetwork.tsx`)

### Bảng chốt

| # | Vị trí | Trạng thái 29/9 | Bằng chứng (cách đo / grep) | Việc làm |
|---|---|---|---|---|
| **E1** | `tomTat` dòng 169 | **CÒN ĐÚNG → LÀM** | đo DOM trên `/enterprise/talents`: **14px**, `rgb(138,135,163)` = **3,46:1 ❌** trên `bg-white` của figure — lại chính là câu “rồi sao?” (điểm TB, kỹ năng phổ biến) | → 14/400 `--ink-soft` (8,39:1 ✅) |
| **E2** | dòng 175 · 198 · 200 · 210 (`text-xs text-muted`) | **CÒN ĐÚNG → LÀM** | đo DOM: 12px `rgb(138,135,163)` = **3,46:1 ❌** (mô tả, label checkbox, danh sách reduced-motion) — danh sách reduced-motion chính là bản thay svg nên càng phải đọc được | → 12/400 `--muted-strong` (6,68:1 ✅) — lưu ý dòng 175 sẽ đổi theo E11 |
| **E3** | gạch nối dòng 197 | **CÒN ĐÚNG → LÀM** | đo DOM: `rgb(178,175,198)` = `--muted-light` = **2,09:1 ❌** (00/7.2) — mang `aria-hidden` nhưng mắt vẫn phải thấy | → `--muted-strong` |
| **E4** | ô rỗng dòng 180 | **CÒN ĐÚNG → LÀM** | grep `role="status"` dòng 180: `text-sm text-muted` = 3,46:1 ❌ — đây là **thông báo chính** khi chưa đủ dữ liệu | → 14/600 `--ink-soft` (00/4.8) |
| **E5** | `<figure>` dòng 164 | **CÒN ĐÚNG → LÀM** | grep: `rounded-2xl` = **16px**; figure có border + nền + padding = card theo 00/4.1 → **20** | → `rounded-[20px]` |
| **E6** | checkbox dòng 205 | **CÒN ĐÚNG → LÀM** | grep: `accent-pink-600` — màu ngoài bảng màu (00/7.5 + bảng màu) | → `accent-portal` + viền `--line-control` |
| **E7** | nhãn svg 247/251/255 `fontSize 9.5 / 7.5` | **CÒN ĐÚNG (mở lại) — ĐẶC BIỆT Ở MOBILE** | **Đo thật**: @1440 (figure 560, scale 1,727) → 9,5→**16,40px** ✅ / 7,5→**12,95px** ✅; **@390 (svg 316, scale 1,053) → 9,5→10,01px ❌ / 7,5→7,90px ❌** (00/7.1: hiện ≥12). Đợt 4 ghi “cần đo trước” → **đã đo: fail ở mobile** | **Phiếu E7** (mục 3.2): fontSize **12/12**, đổi x cột 78→**90** / 222→**210**, chỉnh baseline, fill tag → `--muted-strong` |
| **E8** | hằng `grade` `#8B5CF6` (dòng 47) + `default` `#8A87A3` | **CÒN ĐÚNG → LÀM** | grep dòng 47: `grade: "#8B5CF6"` — ngoài 6 chuỗi màu biểu đồ (00/6.1). *Lưu ý trung thực*: với dữ liệu đã đo, group trong svg chỉ có `talent`/`skill` → 2 hằng này **không hiện ra** — sửa vì hằng màu phải nằm trong bảng, rủi ro 0 | → `#0D9488` (grade) · `#6F6C8A` (default) |
| **E9** | đường nối 230–231 `#c7c9d9 opacity .8` | **CÒN ĐÚNG → LÀM** | tính WCAG sau blend: 0,8×`#c7c9d9` + 0,2×trắng ≈ `rgb(212,212,221)` = **1,47:1 ❌** (dot4 ước ≈1,6 — cùng kết luận) — đường nối mang thông tin (“người này có kỹ năng thật”) cần ≥3:1 | → `#6F6C8A` đặc (5,02:1 ✅), `strokeWidth 1.5` |
| **E10** | `<svg>` dòng 218 “cao ≈1.883px@1440” | **ĐÃ XONG — BỎ việc sửa component** | **Đo** (`resultsF/G.json`): figure **560×720,81** · svg **518×493,81** (viewBox 300×286) — **@1440 và @1024 giống hệt** → không còn 1.883/1.200, vì Đợt 4 đã bọc `max-w-[560px]` thật trong code (`Talents.tsx:505`, grep) — phương án B6-6 vận hành. Dự đoán Đợt 4 sai vì giả định full-width 1096 | **Giữ wrapper 560 là bắt buộc** (ghi thành special spec); cực trị **CHƯA ĐO**: `caoSvg = 56+46·K`, K≤15 → cao ≤ 518/300×746 ≈ **1.288px** — gỡ wrapper = svg cao theo tỉ lệ trở lại |
| **E11 (MỚI — từ đo T5)** | 3 trạng thái `!visible` / rỗng / có-data | **LÀM — lỗi T5 đo được** | `measureC.json`: chưa cuộn tới = figure **560×321** (placeholder `h-40`, svg = null) → đã cuộn = **560×720,81** → **nhảy +399,81px** (đẩy phân trang/footer khi biểu đồ hiện) | **Phiếu E11** (mục 3.3) |

### Kết luận “sau khi bố cục Đợt 4 đổi”

- **E10 khép lại** nhờ thay đổi bố cục của Đợt 4 (bọc 560) — đây là E duy nhất hết vai trò vì layout.
- **E1–E9 không đổi bởi layout** (chúng nằm trong `DataNetwork.tsx` mà Đợt 4 không được đụng)
  → **còn nguyên**, nay được sửa.
- **E7 đảo chiều kết luận** nhờ số đo: thay vì “<12 luôn”, thực tế **đủ ở ≥560, fail ở 390**
  → vẫn phải sửa, nhưng phạm vi = mobile.

---

## 3. PHIẾU SỬA `DataNetwork.tsx`

### 3.1 E1–E6, E8, E9 (12 dòng class/hằng — không đổi cấu trúc)

| Dòng | Hiện tại (đo/grep) | Sửa thành |
|---|---|---|
| 169 | `text-sm text-muted` (3,46 ❌) | `text-sm text-ink-soft` (8,39 ✅) |
| 175 | `text-xs text-muted` + `h-40` | **xóa khối theo E11** — chữ dời vào placeholder mới, màu `text-muted-strong` |
| 180 | `text-sm text-muted` | `text-sm font-semibold text-ink-soft` (14/600) |
| 197 | `text-muted-light` (2,09 ❌) | `text-muted-strong` |
| 198 · 200 · 210 | `text-muted` (3,46 ❌) | `text-muted-strong` (6,68 ✅) |
| 164 | `rounded-2xl` (16px) | `rounded-[20px]` (00/4.1) |
| 205 | `accent-pink-600` | `accent-portal border-line-control` |
| 47 · default | `grade: "#8B5CF6"` · `#8A87A3` | `#0D9488` · `#6F6C8A` |
| 230–231 | `stroke="#c7c9d9" strokeOpacity="0.8" strokeWidth={1.4}` (1,47:1 ❌) | `stroke="#6F6C8A"` · bỏ `strokeOpacity` · `strokeWidth={1.5}` (5,02 ✅) |

### 3.2 E7 — font 12 + dời cột (đủ chỗ bằng số đo)

| Hạng mục | Cũ | **Mới** | Lý do/đo |
|---|---|---|---|
| `fontSize` tên nhân tài/kỹ năng (247, 251) | 9,5 | **12** | @390: 12×316/300 = **12,64 ✅** · @1440: 12×518/300 = 20,72 (tăng theo scale — 00 không có trần; nếu P5 muốn ~14 đều thì mới tính lại động, **không làm trong vòng này**) |
| `fontSize` tag nhóm (255) | 7,5 fill `#8A87A3` (3,46 ❌) | **12** fill **`#5C5A66`** (`--muted-strong`, 6,68 ✅) | vừa size vừa contrast |
| x nhân tài (148) | 78 | **90** | fit đo bằng `getBBox × 12/9,5` trên dữ liệu thật: trái dài nhất **“Đặng Thanh” = 72,4** → anchor 90−14 = 76 → mép trái **3,6 ≥ 0** ✅ (cũ: anchor 64 → **−8,4 tràn viewBox** ❌) |
| x kỹ năng (149) | 222 | **210** | phải dài nhất **“Chuyên môn” = 73** → anchor 210+14 = 224 → kết **297 ≤ 300** ✅ (cũ: 236+73 = **309 tràn** ❌) |
| baseline | 2 dòng: `y−4` / `y+8`; tag `y+19` / `y+12` | 2 dòng: **`y−7` / `y+8`**; tag **`y+22`** · 1 dòng: `y+1` giữ; tag **`y+16`** | giữ khoảng cách baseline ≥ **15 = 1,25×12**; chiều cao hàng vẫn 46 → hở ≥4 đơn vị |
| `benTrai` (151) | `x < 150` | **giữ** | 90 < 150 ✅ · 210 > 150 ✅ |

**Cách P2 kiểm sau sửa**: mọi `<text>`: `getBBox()` nằm trong `[0,300] × [0,caoSvg]`;
`getComputedStyle(t).fontSize × svgRect.width/300 ≥ 12` ở **cả 390 và 1440**
(mục này là **CHƯA ĐO** cho tới khi code — xem `README/5`).

### 3.3 E11 — 3 trạng thái không nhảy khối (T5)

- **Legend (dòng 186) + checkbox (dòng 200) render ở mọi trạng thái** (bỏ khỏi nhánh
  `visible && !duLieuRong`) — 2 khối HTML này nhẹ, không cần chờ “cuộn tới”.
- **`duLieuRong` → render `role="status"` (180) NGAY cả khi chưa visible** (bỏ gate `visible`) —
  điều kiện dữ liệu đã biết từ props.
- **Chỉ `<svg>` bị hoãn**: thay khối `h-40` (175) bằng
  ````html
  <div aria-hidden="true" class="mt-2 flex w-full items-center justify-center"
       style="aspect-ratio: 300 / {caoSvg}">
    <span class="text-xs text-muted-strong">Biểu đồ sẽ hiện khi bạn cuộn tới.</span>
  </div>
  ````
  - **Tại sao cao bằng nhau**: svg là `h-auto w-full` → cao = rộng × `caoSvg/300`; box
    `aspect-ratio 300/caoSvg` cùng công thức → **0px** (đối chiếu đo: 518×286/300 = **493,81**
    = đúng `rect.height` 493,81 đã đo); `mt-2` = 8px giống `mt-2` của svg (dòng 218).
- **Cách kiểm**: `getBoundingClientRect()` của `figure` trước và sau `scrollIntoView` → lệch
  **≤2px** (kỳ vọng 0; **hiện tại 399,81px ❌**).

### 3.4 Trạng thái T1–T5 `DataNetwork` sau phiếu (dự kiến — chờ code rồi đo)

| T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|
| n/a (không WebGL) | ✅ **đã đạt** (reduce → `<ul>` đủ chữ, đo `resultsB`) | n/a | n/a (không phải scene — nếu P5 muốn warn thì không có WebGL để hỏng, **không đặt**) | ❌ → ✅ sau E11 (**CHƯA ĐO**) |
