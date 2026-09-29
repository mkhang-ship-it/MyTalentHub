# HỆ THỐNG THIẾT KẾ FTalentHub — Đợt 1 (nền tảng cho 9 trang)

> ## ⚠️ ĐỌC TRƯỚC KHI CODE (điều quan trọng nhất)
> 1. **ẢNH TRONG THƯ MỤC `refs/` CHỈ ĐỂ THAM KHẢO HÌNH DẠNG.** Không đọc số liệu, không
>    đo màu, không đoán kích thước từ ảnh. **MỌI CON SỐ, MÀU SẮC, KHOẢNG CÁCH PHẢI LẤY TỪ
>    BỘ ĐẶC TẢ NÀY.** Nếu ảnh và chữ mâu thuẫn → **chữ thắng**, báo lại pane 1 để sửa ảnh.
> 2. File này là **nguồn sự thật duy nhất** cho pane 2. Không hỏi lại, không tự diễn giải.
> 3. **NGUYÊN TẮC ƯU TIÊN: CON SỐ LÀ CHUẨN — CLASS CHỈ LÀ GỢI Ý.** Mọi bảng trong tài
>    liệu này, cột số đo (px, rem, khoảng cách, cỡ chữ) quyết định; cột class Tailwind chỉ
>    là cách viết tắt để code nhanh. Nếu class và con số mâu thuẫn → **code theo con số**
>    (tự tính class đúng, ví dụ `56px` → `text-[56px]`, KHÔNG dùng `text-7xl` vì nó = 72px)
>    và báo lại pane 1 để sửa class trong tài liệu.
> 4. Phạm vi đợt 1: file này + `01-trang-chu.md` + `02-dashboard-hoc-sinh.md`.
> 5. Không sửa `frontend/src/**` ngoài việc implement theo đặc tả; không chạy git; không cài package.

Ảnh tham chiếu (SVG, đúng bảng màu, do pane 1 vẽ):
`refs/00-thanh-phan.svg` · `refs/01-trang-chu.svg` · `refs/02-dashboard-hoc-sinh.svg`

---

## 0. Nguyên tắc

1. **Giữ bảng màu đã có.** Mọi màu bắt buộc đều là token trong `frontend/src/index.css`.
   Thay đổi duy nhất được phép là các token **mới** ở mục 7 (có ghi rõ lý do + tỉ lệ tương
   phản cũ/mới). Không phát minh màu lạ.
2. **Trong phạm vi portal** (`/student`, `/school`, `/enterprise`, …) `Layout.tsx` đã ghi đè
   `--portal/--portal-soft/--portal-dark/--hero-gradient/--nav-gradient/--cta-gradient`.
   → Trang trong portal **phải dùng `var(--portal)`**, không hard-code `#C44296`.
   Riêng trang Landing/Login nằm ngoài `Layout` → `var(--portal) = #C44296`.
   Giá trị trong scope học sinh: `--portal #A1458F · --portal-soft #F9EEF7 · --portal-dark #7E2F73`.
3. **Ngôn ngữ:** mọi nhãn, chú thích, thông báo, placeholder bằng tiếng Việt (đã có sẵn trong code).
4. **Motion:** dùng lại primitive có sẵn (`reveal-up`, `hover-lift`, `transition-fast/base`),
   luôn tôn trọng `prefers-reduced-motion` như `index.css` đang làm.
5. **Không thêm dependency.** Biểu đồ vẽ bằng SVG tay/`components/chart` sẵn có.

---

## 1. BẢNG MÀU (giữ nguyên + 3 token mở rộng ở mục 7)

### 1.1 Token bắt buộc (không đổi)

| Token | Mã | Dùng cho |
|---|---|---|
| `--canvas` | `#fdf7f1` | nền trang |
| `--canvas-soft` | `#faf3ea` | nền khối phụ, nền trang trí |
| `--surface` | `#ffffff` | thẻ, bảng, hộp thoại |
| `--ink` | `#33324d` | tiêu đề, chữ chính |
| `--ink-soft` | `#4b4a66` | chữ nội dung/nhãn phụ cỡ nhỏ |
| `--muted` | `#8a87a3` | **chỉ** chữ ≥ 19px/600, icon, trang trí (xem 7.2) |
| `--brand` | `#284b8c` | xanh thương hiệu (đăng nhập, layout) |
| `--brand-dark` | `#1e3a6e` | hover/xen kẽ brand |
| `--brand-soft` | `#eaf0f9` | nền nhạt brand |
| `--portal` | `#C44296` (mặc định) / `#A1458F` (scope học sinh) | nhấn chính |
| `--portal-soft` | `#FBEFF7` / `#F9EEF7` | nền nhạt nhấn |
| `--portal-dark` | `#9A2E5E` / `#7E2F73` | chữ trên nền nhạt nhấn |
| `--line` | `#ede7e1` | viền thẻ, kẻ bảng |
| `--line-strong` | `#e2d9d0` | viền nâng cấp (hover) |
| `--hero-gradient` | `linear-gradient(100deg,#FF5A4E 0%,#EF4580 48%,#844BD2 100%)` | banner.hero trong portal |
| `--nav-gradient` | `linear-gradient(90deg,#F97316 0%,#C44296 100%)` | nav đang active |
| `--cta-gradient` | `linear-gradient(90deg,#F43F5E 0%,#922C6B 100%)` | nút chính, CTA |
| `--radius-lg / --radius-xl` | `1rem / 1.25rem` | bo góc |
| font | `"Be Vietnam Pro"` | toàn bộ |

Ngoài ra Landing dùng dải gradient có sẵn trong code (giữ nguyên): hero
`#1B2A5E → #27308E → #C44296`, khối số liệu `#A1458F → #9B6AB5 → #27308E`, CTA cuối
`#A1458F → #9B6AB5 → #27308E`, 3 thẻ tính năng `#FF5A4E→#EF4580→#844BD2` /
`#FBBF24→#F97316→#EA580C` / `#F4417E→#C345A9→#7C57DB`.

### 1.2 Mã màu chữ trên nền nào (bắt buộc tuân)

| Chữ | Nền | Tỉ lệ | Kết luận |
|---|---|---|---|
| `--ink` `#33324d` | trắng | **12,32:1** | ✅ mọi cỡ |
| `--ink` | canvas | **11,7:1** | ✅ |
| `--ink-soft` `#4b4a66` | trắng | **8,50:1** | ✅ mọi cỡ |
| `--ink-soft` | canvas | **7,99:1** | ✅ |
| `--muted-strong` `#6F6C8A` (mới) | trắng | **5,01:1** | ✅ chữ 12–15px |
| `--muted-strong` | canvas | **4,72:1** | ✅ |
| `--muted` `#8a87a3` | trắng | **3,46:1** | ❌ chữ thường → cấm (7.2) |
| `--portal` `#C44296` | trắng | **4,60:1** | ✅ ≥14px |
| `--portal` `#C44296` | canvas | **4,33:1** | ❌ chữ ≤15px → dùng `--portal-dark` |
| `--portal-dark` `#9A2E5E` | trắng / canvas | **7,18 / 6,75:1** | ✅ |
| `--portal-dark` | `--portal-soft` | **6,42:1** | ✅ badge/chip |
| scope HS `#A1458F` | trắng | **5,58:1** | ✅ |
| `--brand` `#284b8c` | trắng | **8,49:1** | ✅ |
| trắng | `#C44296` | **4,60:1** | ✅ chữ thường trên nút nhấn |
| trắng | `#A1458F` (scope HS) | **5,58:1** | ✅ |
| trắng | `#F43F5E` (đầu cta-gradient) | **3,67:1** | ❌ → nút chính phải phủ nền (7.3) |
| trắng | `#EF4580` (giữa hero-gradient) | **3,60:1** | ❌ chữ ≤18,66px/700 |
| trắng | `#FF5A4E` (đầu hero-gradient) | **3,08:1** | ⚠️ chỉ chữ ≥18,66px/700 |
| trắng | `#844BD2` (cuối hero-gradient) | **5,36:1** | ✅ |
| trắng | `#1B2A5E` / `#27308E` | **13,65 / 11,06:1** | ✅ |
| `#047857` (emerald-700) | trắng | **5,48:1** | ✅ chữ nhỏ |
| `#059669` (emerald-600) | trắng | **3,77:1** | ❌ chữ ≤15px (7.4) |
| `--line-control` `#968D82` (mới) | trắng | **3,27:1** | ✅ viền control (7.5) |
| `--line-strong` `#e2d9d0` | trắng | **1,39:1** | ❌ cấm làm viền ô nhập/nút (7.5) |

---

## 2. THANG CHỮ

Font "Be Vietnam Pro", `font-size` gốc 16px. `line-height` viết dạng số nhân.

| Vai trò | Cỡ | Độ đậm | Line-height | Letter-spacing | Class gợi ý | Dùng ở đâu |
|---|---|---|---|---|---|---|
| **Hiển thị lớn (hero)** | 56px · 768→44px · mobile 36px | 800 | 1,05 | −0,02em | `text-[36px] md:text-[44px] lg:text-[56px] font-extrabold leading-[1.05] tracking-[-0.02em]` (KHÔNG dùng `text-5xl`=48 / `text-7xl`=72) | H1 Landing |
| **Số lớn trội** | 40px · mobile 34px | 800 | 1,05 | −0,02em | `text-[34px] sm:text-[40px] font-extrabold tabular-nums` (KHÔNG dùng `text-4xl`=36) | điểm năng lực trong hero banner |
| **Tiêu đề trang (H1)** | 24px · mobile 22px | 800 | 1,25 | −0,015em | `text-[22px] sm:text-2xl font-extrabold tracking-[-0.015em]` | `PageHeader` |
| **Tiêu đề khoảng (H2)** | 32px · mobile 26px | 800 | 1,20 | −0,02em | `text-[26px] md:text-[32px] font-extrabold tracking-[-0.02em]` (KHÔNG dùng `text-3xl`=30 / `text-4xl`=36) | tiêu đề section Landing, tiêu đề card lớn |
| **Tiêu đề card (H3)** | 18px · mobile 17px | 700 | 1,35 | −0,01em | `text-[17px] md:text-lg font-bold tracking-[-0.01em]` | tiêu đề `<Card>` |
| **Tiêu đề mục nhỏ (H4)** | 16px | 700 | 1,40 | 0 | `text-base font-bold` | tiêu đề item trong card |
| **Đoạn dẫn (subtitle)** | 15px · mobile 14px | 400 | 1,60 | 0 | `text-[14px] md:text-[15px] leading-relaxed` | `PageHeader` subtitle, mô tả section |
| **Nội dung (body)** | 14px | 400 | 1,60 | 0 | `text-sm leading-relaxed` | mọi đoạn văn trong card |
| **Nội dung nhấn** | 14px | 600 | 1,60 | 0 | `text-sm font-semibold` | tên hoạt động, giá trị chính |
| **Nhãn (label)** | 13px | 600 | 1,40 | 0 | `text-[13px] font-semibold` | label ô nhập, nhãn StatCard (xem 4.4) |
| **Chữ nhỏ (caption)** | 12px | 500 | 1,50 | 0 | `text-xs font-medium` | chú thích, meta, footer |
| **Chữ nhấn (eyebrow)** | 12px | 700 | 1,40 | +0,1em, UPPERCASE | `text-xs font-bold uppercase tracking-[0.1em]` | trên tiêu đề section |
| **Chữ số KPI** | 28px | 800 | 1,15 | −0,01em, `tabular-nums` | `text-[28px] font-extrabold tabular-nums` | giá trị `StatCard` |
| **Chữ số nhỏ** | 16px | 700 | 1,30 | `tabular-nums` | `text-base font-bold tabular-nums` | giá trị trong bảng/dòng |
| **Chữ trong nút** | 14px (md) / 15px (lg) | 600 / 700 | 1,2 | 0 | `text-sm font-semibold` · nút lg: `text-[15px] font-bold` | mọi nút |
| **Chữ trong badge** | 12px | 600 | 1,2 | 0 | `text-xs font-semibold` | badge/chip |

Quy tắc:
- **Không dùng cỡ dưới 12px** ở bất kỳ đâu.
- Một trang chỉ có **1 H1**, các tiêu đề phần là H2, card là H3 (dùng thẻ `<h2>/<h3>` thật, không phải `<div>`).
- Chữ trong bảng: 14px; số trong bảng: 14px/600 `tabular-nums`.
- Tiêu đề card luôn có mô tả 14px `--ink-soft` ngay dưới, cách 4px.

---

## 3. NHỊP KHÔNG GIAN

Thang duy nhất (px): **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96**

| Bậc | Khi nào dùng |
|---|---|
| **4** | icon ↔ chữ trong chip; tiêu đề ↔ mô tả trong cùng nhóm rất chặt |
| **8** | icon ↔ nhãn; badge padding-x; các phần tử inline liên quan |
| **12** | giữa label và ô nhập; khoảng cách 2 dòng trong cùng 1 nhóm; gap bảng dày |
| **16** | padding thẻ nhỏ (`StatCard`); gap lưới trên mobile; giữa 2 thẻ tròn trong 1 nhóm |
| **20** | padding thẻ trung; offset của header trang so với nội dung đầu tiên ở mobile |
| **24** | **padding chuẩn của card**; gap lưới desktop; khoảng cách 2 khối cùng hàng; margin dưới `PageHeader` |
| **32** | khoảng cách **giữa 2 khối dọc** trong trang; padding card lớn/hero card; padding ngang trang ≥1024 |
| **40** | padding trên/dưới của trạng thái trống; khoảng cách trước block tiêu đề section |
| **48** | khoảng cách section ở mobile |
| **64** | khoảng cách section ở tablet; margin trên khối H2 |
| **80** | padding section desktop (nhỏ) |
| **96** | padding section Landing desktop (chính) |

Quy tắc cứng:
- **Card chuẩn:** `padding: 24px` (`p-6`). Card nhỏ (chỉ số, item): `20px` (`p-5`).
  Card nổi bật/hero: `32px` (`p-8`). **Không có cỡ khác.**
- **Khoảng cách giữa 2 card cùng hàng:** 24px desktop / 16px mobile (`gap-6` / `gap-4`).
- **Khoảng cách giữa 2 khối xếp dọc trong trang:** 32px (`space-y-8`); với các khối trong
  cùng 1 card → 16px (`space-y-4`), nhóm chặt → 8–12px.
- **Mỗi block trong trang đều cách nhau bội số của 8** (trừ padding icon 4px).
- Page padding: mobile 20 · tablet 24 · desktop 32 (Layout `p-5 sm:p-6 lg:p-8` — giữ nguyên).

---

## 4. THÀNH PHẦN

### 4.1 Thẻ (Card)
```
background: var(--surface)
border: 1px solid var(--line)            /* #ede7e1 */
border-radius: 20px                       /* --radius-card */
box-shadow: 0 1px 2px rgba(51,50,77,.05), 0 4px 12px rgba(51,50,77,.06)   /* 2 lớp: sát + bay */
padding: 24px                             /* card chuẩn; nhỏ 20, lớn 32 */
transition: transform 200ms cubic-bezier(.22,1,.36,1), box-shadow 200ms same
```
- **Hover** (chỉ card tương tác): `transform: translateY(-2px)`; shadow
  `0 12px 28px rgba(51,50,77,.10), 0 4px 8px rgba(51,50,77,.06)`; `border-color: var(--line-strong)`.
- **Focus (card là link/toàn bộ bấm được):** `outline: 2px solid var(--portal); outline-offset: 2px`.
- **Card thường (không bấm được):** **không** hover-lift → tránh giả tạo tín hiệu bấm được.
- Tiêu đề card: H3 18/700 `--ink`; mô tả 14/400 `--ink-soft`, margin-top 4px.

### 4.2 Nút
Độ cao / padding / bo góc / chữ:

| Loại | Cao | padding-x | Bo góc | Cỡ chữ / đậm | Nền | Chữ |
|---|---|---|---|---|---|---|
| **Nhỏ (sm)** | 36px | 14px | 10px | 13/600 | theo loại | theo loại |
| **Chính (md)** | **44px** | **20px** | **12px** | **14/600** | `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)` (xem 7.3) | `#ffffff` |
| **Lớn (lg)** | 52px | 32px | 16px | 15/700 | như md | `#ffffff` |
| **Phụ (secondary)** | 44px | 20px | 12px | 14/600 | `var(--surface)` | `var(--ink)` |
| **Ghost** | 44px | 20px | 12px | 14/600 | trong suốt | `var(--ink-soft)` |
| **Nguy hiểm** | 44px | 20px | 12px | 14/600 | `#B91C1C` | `#ffffff` |

- **Phụ:** `border: 1px solid var(--line-control)` (7.5) · hover: `background: var(--canvas-soft); border-color: var(--line-strong); transform: translateY(-1px)`.
- **Ghost:** hover `background: var(--canvas-soft); color: var(--ink)`.
- **Nguy hiểm:** hover `background: #991B1B`; xác nhận phụ (dùng khi xóa) thêm bước hỏi lại.
- **Chung:**
  - gap icon↔label 8px; icon 16–18px.
  - **Focus (bắt buộc, mọi loại):** `outline: 2px solid var(--portal); outline-offset: 2px;`
    nút trên nền tối/gradient → `outline-color: #ffffff` + `box-shadow: 0 0 0 4px rgba(27,42,94,.55)`.
  - **Active:** `transform: translateY(0)` (bỏ độ bay), `filter: brightness(.97)`.
  - **Disabled:** `opacity: .55; cursor: not-allowed; transform: none; box-shadow: none;`
    và **không** được hover effect; luôn kèm `disabled` attribute thật (không chỉ class).
  - Nút icon vuông: 44×44 (md) / 36×36 (sm), bo góc 12.
  - Nút trên nền gradient hero: dùng `background: #ffffff; color: #1B2A5E` (13,65:1) cho chính,
    và `background: rgba(27,42,94,.45); border: 1px solid rgba(255,255,255,.4); color:#fff` cho phụ.

### 4.3 Huy hiệu (Badge / chip)
```
height: 24px · padding: 0 10px · border-radius: 999px · font: 12px/1.2/600
```
| Tone | Nền | Chữ | Tỉ lệ |
|---|---|---|---|
| nhấn (portal) | `var(--portal-soft)` | `var(--portal-dark)` | 6,42:1 ✅ |
| thành công | `#ECFDF5` | `#047857` | 5,4:1 ✅ |
| cảnh báo | `#FFF7ED` | `#9A3412` | 6,9:1 ✅ |
| nguy hiểm | `#FEF2F2` | `#B91C1C` | 6,4:1 ✅ |
| trung tính | `var(--canvas-soft)` + viền `var(--line-strong)` | `var(--ink-soft)` | 8,1:1 ✅ |

Badge luôn có **icon 12px hoặc tiền tố chữ** (VD "Đã duyệt", "Đang mở") — **không dùng màu làm tín hiệu duy nhất**.

### 4.4 Thẻ chỉ số (StatCard)
```
padding: 20px · radius 20px · min-height: 116px
hàng trên:  nhãn 13/600 --ink-soft  ……  ô icon 44×44 bo góc 12 nền var(--portal-soft), icon 18 stroke 2.2 màu var(--portal-dark)
giá trị:    margin-top 4px · 28/800 · --ink · tabular-nums
phụ chú:    margin-top 4px · 12/600 · --muted-strong
```
- Chữ phụ chú mặc định `--muted-strong`; **chỉ** màu `#047857` (cùng icon ▲) khi thực sự là
  xu hướng tăng; giảm → `#B91C1C` + icon ▼. Không bao giờ tô màu vì “cho vui”.
- Giá trị quá dài (VD `#12/450`) → `break-words`, không tràn, không cắt số.

### 4.5 Thanh tiến độ
```
nhãn hàng: 13/600 --ink-soft (trái) · giá trị 13/700 tabular-nums --ink (phải) · margin-bottom 8px
thanh:      height 8px · radius 999px · nền (track) var(--line) · tô (fill) gradient theo lĩnh vực
            fill = linear-gradient(90deg,#EC4899,#8B5CF6) — hoặc màu 1 chuỗi dữ liệu nếu là biểu đồ
khoảng cách nhãn → thanh: 8px · giữa các thanh: 16px
```
- Luôn kèm **số text** (VD `68%`) cạnh thanh → không để màu/thanh là tín hiệu duy nhất.
- Semantics: `role="progressbar" aria-valuenow aria-valuemin="aria-valuemax aria-label="<tên>"`.
- Thanh ở 0% vẫn phải thấy track (nền `--line`).

### 4.6 Ô nhập (input / select / textarea)
```
label: 13/600 --ink-soft, margin-bottom 6px, hiển thị trước, không placeholder thay label
ô:     height 44px (textarea min-height 112px) · padding 0 14px · radius 12px
       border 1px solid var(--line-control)  (7.5) · nền var(--surface) · chữ 14/400 --ink
placeholder: 14/400 --muted-strong
focus: border-color var(--portal) · box-shadow 0 0 0 3px color-mix(in srgb, var(--portal) 18%, transparent)
       · outline: none (vòng focus do box-shadow đảm nhiệm)
error: border #DC2626 · box-shadow 0 0 0 3px rgba(220,38,38,.16)
       · chữ báo lỗi 12/500 --ink hiện dưới ô, margin-top 6px, có icon ⚠ 12px
helper: 12/400 --muted-strong, margin-top 6px
disabled: background var(--canvas-soft) · color var(--muted) · cursor not-allowed
```
Mỗi ô có `<label for>` thật; lỗi dùng `aria-invalid="true"` + `aria-describedby`.

### 4.7 Bảng
```
container: radius 16px · overflow-x auto · border 1px solid var(--line) (chỉ khi bảng nằm rời, không nằm trong card)
header:    12/700 UPPERCASE tracking .06em --muted-strong · padding 10px 12px · border-bottom 1px solid var(--line-strong)
row:       min-height 44px · padding 12px · border-bottom 1px solid var(--line)
row hover: background color-mix(in srgb, var(--portal-soft) 40%, transparent)
cột số:    text-align right · 14/600 tabular-nums
cột chữ:   14/400 --ink (cột chính 14/600)
empty cell: gạch nối "—" (U+2014), màu --muted
```
- `<th scope="col">` thật; vùng cuộn có `role="region" aria-label tabIndex={0}` (đã có sẵn — giữ).
- **Dưới 768px: bảng biến thành danh sách thẻ** (mỗi hàng = 1 card, label bên trái 12/600
  `--muted-strong`, giá trị bên phải 14/600 `--ink`, cách nhau 8px, padding 16px).

### 4.8 Trạng thái trống (Empty)
```
border: 1px dashed var(--line-strong) · background: color-mix(in srgb, var(--canvas-soft) 60%, transparent)
radius 16px · padding: 40px 16px · text-align center
icon 32px --muted · dòng chính 14/600 --ink-soft · dòng phụ 13/400 --muted-strong
nút hành động: secondary sm, margin-top 16px
```

### 4.9 Trạng thái tải (Skeleton)
```
nền --surface · radius 12px (hoặc khớp radius phần tử thật)
gradient shimmer: linear-gradient(90deg, #f3ece3 25%, #faf3ea 37%, #f3ece3 63%) · background-size 400% 100%
animation: 1.4s ease infinite
kích thước mẫu: tiêu đề 220×20 · dòng 100%×14 (dòng cuối 60%) · thẻ chỉ số 100%×96 · ảnh bìa 100%×160
```
- Bố cục skeleton phải **giống hệt bố cục trang thật** (số thẻ, số dòng bằng nhau).
- `aria-busy="true"` trên vùng tải; kèm chữ “Đang tải…” 14px `--muted-strong`.
- `prefers-reduced-motion` → bỏ shimmer, chỉ nhấp nháy `opacity .6 ↔ 1` mỗi 1,6s.

### 4.10 Trạng thái lỗi (ErrorBox)
```
background #FEF2F2 · border 1px solid #FECACA · radius 12px · padding 16px
icon AlertTriangle 18px #B91C1C · gap 8px · chữ 14/500 --ink  (màu chữ chính, KHÔNG đỏ toàn bộ)
nút “Thử lại”: secondary sm, margin-top 12px
```
Lỗi API phải được dịch sang tiếng Việt như `fetchErrorMessage` đang làm — **giữ nguyên logic đó**.

### 4.11 Toast / hộp thoại
- Toast: rộng 320px (mobile `calc(100vw - 32px)`), radius 16, padding 16, shadow
  `0 12px 32px rgba(51,50,77,.16)`, viền `--line`, icon 18 theo loại (thành công `#047857`,
  lỗi `#B91C1C`, info `--brand`), tiêu đề 14/700 + mô tả 13/400, tự biến mất 4s.
- Hộp thoại (dialog): `max-width: 560px`, radius 20, padding 24, overlay `rgba(27,42,94,.45)`,
  tiêu đề 18/700, hành động cách 24px, nút phải có focus trap + phím Esc đóng.

---

## 5. BỐ CỤC & RESPONSIVE

### 5.1 Container
| Trang | Container | Padding ngang |
|---|---|---|
| Landing, Login, Passport (không có sidebar) | `max-width: 1152px` (`max-w-6xl`) | 24px (≥768) · 20px (<768) |
| Trang trong portal (có sidebar) | sidebar cố định `280px` ≥1024 · nội dung `max-width: 1200px` | theo Layout: 20 / 24 / 32px |
| Sidebar mobile (<1024) | drawer trượt + thanh dưới `height 64px` | — |

### 5.2 Lưới
- Lưới chung: `grid-cols-1 · gap-4 (mobile) · gap-6 (≥640)`.
- Thẻ chỉ số: **1 cột <640 · 2 cột 640–1279 · 4 cột ≥1280**.
- Card 3 mục (tính năng): **1 cột <768 · 3 cột ≥768**.
- Card 2 cột (nội dung/chữ): **1 cột <1024 · 2 cột ≥1024**.
- Khoảng cách giữa khối dọc trong trang: 32px.

### 5.3 Bảng breakpoint — những gì gộp

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Nav Landing | logo + nút “Đăng nhập” (sm) | + 3 link giữa | + 2 nút phải, cao 64 | cao 64, container 1152 |
| Hero Landing | 1 cột, H1 36px, 3 nút xếp 1 cột chiếm full width, **ẩn khối 3D** | 1 cột, H1 44px, nút xếp ngang, **ẩn khối 3D** | 2 cột: chữ + khối 3D 380×460 | 2 cột: chữ + khối 3D 380×460 |
| Thẻ portal (dưới hero) | 1 cột / 2×2 lưới | 2×2 | 4 cột | 4 cột |
| Thẻ tính năng | 1 cột, ảnh bìa 160px | 3 cột, ảnh bìa 160px | 3 cột, ảnh 192px | 3 cột, ảnh 192px |
| Khối “Tại sao” | 1 cột (list trước, số liệu sau) | 1 cột | 2 cột | 2 cột |
| Hero banner Dashboard | xếp dọc, padding 20 | xếp dọc | **ngang** | ngang, padding 24 |
| Thẻ chỉ số | 1 cột | 2 cột | 2 cột | **4 cột** |
| AI + Lộ trình | 1 cột | 1 cột | 2 cột | 2 cột |
| Bảng hoạt động | **danh sách thẻ** | cuộn ngang | cuộn ngang | full width |
| Sidebar portal | drawer + bottom-nav | drawer + bottom-nav | sticky 280px | sticky 280px |

---

## 6. BIỂU ĐỒ

### 6.1 Chuỗi dữ liệu (6 màu, phân biệt cả khi xám)
Thứ tự mặc định theo **bậc sáng tối** (tự phân biệt grayscale), mỗi chuỗi có **màu + hoạ tiết + nhãn trực tiếp**:

| # | Màu | Luminance | Hoạ tiết khi in/nhìn mòn | Dùng cho |
|---|---|---|---|---|
| S1 | `#1B2A5E` | 0,027 | đặc | chuỗi 1 (nền tảng nhất) |
| S2 | `#284B8C` | 0,074 | nét đứt 6 3 | chuỗi 2 |
| S3 | `#C44296` | 0,178 | chấm tròn 1 4 | chuỗi 3 |
| S4 | `#0D9488` | 0,230 | kẻ chéo (pattern 4px) | chuỗi 4 |
| S5 | `#F97316` | 0,325 | nét đứt-dài 10 4 | chuỗi 5 |
| S6 | `#B2AFC6` | 0,442 | đặc + viền `#4b4a66` 1px | chuỗi 6 |

- **Không** dùng `--portal` làm màu chuỗi khi nó đang là màu nhấn của trang (tránh nhầm
  “điểm nhấn = dữ liệu”); nếu trang ngoài portal thì S3 dùng `#C44296`.
- Trục: đường trục `1px #cfc6bc`; lưới (grid) `1px dashed #ede7e1`; **không** viền khung biểu đồ.
- Chữ trục/nhãn: 12/600 `--ink-soft`. Giá trị trực tiếp trên cột/điểm: 12/700 `--ink`.

### 6.2 Chú giải (legend)
- Vị trí: **trên bên phải** của biểu đồ, wrap thành hàng; dưới 640px → 2 cột.
- Mỗi mục: chấm vuông 10×10 bo 3px (đúng màu + hoạ tiết) + nhãn 12/600 `--ink-soft`, gap 8px,
  khoảng cách giữa các mục 16px.
- **Không để legend là cách duy nhất nhận diện** → luôn có nhãn trực tiếp (VD tên chuỗi ở
  cuối đường, hoặc giá trị trên cột).
- Chú giải là `<ul>/<li>` có text thật (không phải div rỗng) → screen reader đọc được.

### 6.3 Cột / đường / tròn
- Cột: bo góc 6px phía trên; rộng cột ≤ 56px; gap 16px; có nhãn giá trị trên đỉnh (12/700).
- Đường: stroke 2.5px, `stroke-linecap: round`, điểm dữ liệu r = 4 (r = 6 khi hover).
- Tròn (pie/donut): tối đa 6 lát; lát > 6% mới hiện nhãn; lát nhỏ gộp thành “Khác” màu `#B2AFC6`.
- Tất cả biểu đồ phải có: tiêu đề 14/700 + đơn vị 12/500 `--muted-strong` + trạng thái rỗng (4.8).
- Tooltip: nền `#33324d`, chữ trắng 12/600, radius 8, padding 8×10, shadow `0 6px 16px rgba(0,0,0,.2)`.

---

## 7. ACCESSIBILITY (ngưỡng cụ thể)

### 7.1 Tương phản
- Chữ thường (dưới 18,66px/700 hoặc 24px): **≥ 4,5:1**.
- Chữ lớn (≥ 18,66px/700 hoặc ≥ 24px): **≥ 3:1**.
- Thành phần/đường viền/biểu tượng mang thông tin + vòng focus: **≥ 3:1** với màu lân cận.
- Bảng mục 1.2 liệt kê đủ cặp màu được phép dùng. **Cặp nào không đạt thì cấm dùng** —
  không có “được phép ngoại lệ”.

### 7.2 `--muted` bị giới hạn (thay đổi so với hiện tại)
`--muted #8a87a3` trên trắng chỉ **3,46:1** → hiện đang dùng cho chữ 12–14px là **sai**.
Quy tắc mới:
- `--muted` → chỉ dùng cho: chữ ≥ 19px/600, biểu tượng, gạch phân cách, chữ trên nền `--brand-dark`.
- Thay thế bằng token mới **`--muted-strong: #6F6C8A`** (5,01:1 trắng · 4,72:1 canvas) cho mọi
  chữ phụ 12–15px (mô tả, phụ chú, placeholder, label bảng).
- Lý do + số liệu: cũ `#8a87a3` = 3,46:1 ❌ → mới `#6F6C8A` = 5,01:1 ✅.

### 7.3 Chữ trên nền gradient (thêm scrim bắt buộc)
Mọi khối `--hero-gradient / --cta-gradient / dải màu Landing`:
1. Khu vực có chữ ≤ 18px phải phủ **scrim navy** chồng lên nền:
   ```
   background-image:
     linear-gradient(105deg, rgba(27,42,94,.62) 0%, rgba(27,42,94,.40) 55%, rgba(27,42,94,.18) 100%),
     var(--hero-gradient);
   ```
   Khi scrim ≥ 0,35 thì chữ trắng 14px đạt ≥ 4,5:1 trên **điểm sáng nhất** `#FF5A4E`
   (0,35 → 5,37:1; 0,62 → 8,42:1).
2. Chữ ≥ 24px/800 trắng có thể đặt ngoài vùng scrim (cần ≥ 3:1 — luôn đạt với dải gradient này).
3. **Chip/phiếu trên nền gradient phải là nền đặc** `background:#ffffff; color: var(--portal-dark)`
   (6,4–7,2:1). **Cấm** `bg-white/20 + text-white` (hiện tại chỉ **2,52:1** ❌).
4. Nút trên gradient: chính = nền `#ffffff` chữ `#1B2A5E` (13,65:1); phụ = nền
   `rgba(27,42,94,.45)` viền `rgba(255,255,255,.4)` chữ trắng.

### 7.4 Nút chính & màu cảnh báo
- `--cta-gradient` đầu `#F43F5E` trắng 14px = **3,67:1 ❌** → **bắt buộc** phủ:
  ```
  background-image: linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.12)), var(--cta-gradient);
  ```
  → **4,61:1 ✅** (sắc độ gradient không đổi, chỉ tối 12%).
  *Lý do + số liệu:* cũ 3,67:1 → mới 4,61:1.
- Chữ tăng/giảm 12px: **cấm** `emerald-600 #059669` (3,77:1 ❌) → dùng `#047857` (5,48:1 ✅).

### 7.5 Viền control (thêm token mới)
`--line-strong #e2d9d0` trên trắng chỉ **1,39:1** → không đủ cho viền ô nhập/nút phụ (cần 3:1).
→ Token mới **`--line-control: #968D82`** = **3,27:1 ✅** dùng cho: viền ô nhập, select, textarea,
checkbox/radio, viền nút phụ. Viền thẻ (`--line`) **không đổi** (thẻ không phải control).
*Lý do + số liệu:* cũ 1,39:1 ❌ → mới 3,27:1 ✅.

### 7.6 Focus
- Mọi phần tử tương tác: vòng focus **luôn nhìn thấy** —
  `outline: 2px solid var(--portal); outline-offset: 2px;` (giữ rule `:focus-visible` sẵn có).
- Trên nền tối/gradient: `outline-color: #ffffff` + `box-shadow: 0 0 0 4px rgba(27,42,94,.55)`.
- Không bao giờ `outline: none` mà không thay bằng phần tử thay thế.
- Thứ tự tab theo đúng thứ tự thị giác; vùng cuộn có keyboard (`tabindex=0` + `role=region`).

### 7.7 Không dùng màu làm tín hiệu duy nhất
Mọi trạng thái phải kèm **1 trong**: chữ, icon, hoạ tiết, vị trí.
- Badge trạng thái: thêm icon/đ tiền tố chữ.
- Tiến độ: thêm %.
- Biểu đồ: thêm hoạ tiết + nhãn trực tiếp.
- Lỗi: thêm icon ⚠ + tiêu đề chữ.

### 7.8 Khác
- Target cảm ứng ≥ 44×44px.
- Tôn trọng `prefers-reduced-motion` (đã có trong `index.css` — không gỡ).
- `lang="vi"` trong HTML; ảnh trang trí `alt="" aria-hidden="true"`; ảnh nội dung mô tả tiếng Việt.
- Tỷ lệ phóng to chữ 200% không bị cắt/ngủ (dùng `min-height` thay `height` ở card).

---

## 8. TÓM TẮT THAY ĐỔI TOKEN (để pane 2 thêm vào `index.css` `:root`)

```css
--muted-strong: #6F6C8A;   /* chữ phụ 12–15px; 5,01:1 trên trắng (cũ: --muted 3,46:1 ❌) */
--line-control: #968D82;   /* viền ô nhập/nút phụ; 3,27:1 (cũ: --line-strong 1,39:1 ❌) */
--scrim-navy: linear-gradient(105deg, rgba(27,42,94,.62) 0%, rgba(27,42,94,.40) 55%, rgba(27,42,94,.18) 100%);
--btn-primary-bg: linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.12)), var(--cta-gradient); /* 4,61:1 */
```
Không đổi bất kỳ mã màu nào đã có ở dòng 1–50 của `index.css`.

---

## 9. ÁNH XẠ TOKEN → CLASS (tham chiếu nhanh cho pane 2)

| Thành phần | Class |
|---|---|
| Card chuẩn | `card-surface rounded-[20px] p-6` + `hover-lift` nếu tương tác |
| Card chỉ số | `card-surface rounded-[20px] p-5 min-h-[116px]` |
| Nút chính | `btn-primary` (sửa `.btn-primary` theo 7.4) · lg: `h-[52px] px-8 rounded-2xl text-[15px] font-bold` |
| Nút phụ | `btn-secondary` (sửa viền theo 7.5) |
| Badge | `inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold` + tone |
| Ô nhập | `input-control` (sửa viền theo 7.5) |
| Nhãn phụ | `text-[13px] font-semibold text-ink-soft` · caption `text-xs font-medium text-muted-strong` |
| Tiêu đề card | `text-[17px] md:text-lg font-bold tracking-[-0.01em] text-ink` |
| Trạng thái trống | component `Empty` (đổi theo 4.8) |
| Skeleton | component `Skeleton` mới (4.9) |
| Scrim gradient | class `.scrim-navy` (7.3) |

**Lưu ý class có sẵn lệch con số (không phải mâu thuẫn nội dòng, nhưng dễ gây lỗi code):**
- `tailwind.config.js` đặt `borderRadius.xl = 1.1rem` → `rounded-xl` = **17,6px**, trong khi
  đặc tả card là **20px**. Component `ui.tsx` từng dùng `rounded-xl` cho `Card`/ô icon `StatCard`
  (P2 có thể đã sửa — hãy đo lại trước khi code).
  → Khi code: viết `rounded-[20px]` (hoặc sửa class trong `ui.tsx`), **không** mặc định `rounded-xl`.
- Tương tự: ô icon 44×44 của `StatCard` cần bo góc **12px**, mà `rounded-xl` đang ra 17,6px
  → dùng `rounded-[12px]`.
- Quy tắc chung ở mục 0.3 vẫn thắng: **con số chuẩn, class là gợi ý.**
