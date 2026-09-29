# ĐẶC TẢ `/student/discover` — `frontend/src/pages/student/Discover.tsx` (Đợt 2 · file 01)

> ⚠️ **ẢNH THAM KHẢO `refs/01-discover.svg` CHỈ ĐỂ XEM HÌNH DẠNG — chữ thắng ảnh.**
> Đọc `../dot1/00-he-thong-thiet-ke.md` trước (thang chữ, nhịp không gian, bảng màu, a11y).
> **Nguyên tắc ở đầu file 00: CON SỐ LÀ CHUẨN, CLASS CHỈ LÀ GỢI Ý** — nếu class và con số
> lệch → code theo con số, báo lại pane 1.

**Phạm vi:** `frontend/src/pages/student/Discover.tsx` (+ `ui.tsx`/`index.css` nếu cần class).
**CẤM:** sửa `frontend/src/components/three/**` (xem mục E — nơi nào *cần* mở quyền thì tôi ghi
đề nghị cho P5 quyết, **không** phải quyết định của đặc tả này).

---

## ⚠️ RÀNG BUỘC CHUNG CỦA ĐỢT 2 (đọc trước — áp dụng cho cả `ActivityCard`/trang Hoạt động)

Trang Hoạt động đã từng có lỗi **nút các thẻ lệch nhau** và đã sửa xong. Đặc tả đợt 2
**phải giữ nguyên cơ chế đó**, không được phá. 6 bất biến (chi tiết ở `02-activities.md`):

| # | Bất biến |
|---|---|
| 1 | Lưới dùng `items-stretch` (không `items-start`) |
| 2 | `<article>` là **cột dọc** `flex h-full flex-col` |
| 3 | Banner/ảnh trên cùng `shrink-0` + **chiều cao cố định** |
| 4 | Thân thẻ `flex-1 flex flex-col` |
| 5 | Tiêu đề giữ `min-h` cho 2 dòng + `line-clamp-2` |
| 6 | Khối nút `mt-auto shrink-0` và **mọi nút dùng chung 1 class** (cùng cao, cùng padding) |

Tương tự với 4 thẻ bài test ở trang này (mục B3) — **ô badge giữ chỗ (`invisible`) là một
phần của bất biến số 5/6, không được xóa**. Kiểm thử bắt buộc: 3 thẻ có tiêu đề 1 dòng / 2 dòng
/ mô tả dài nhất → đáy nút phải trùng nhau tuyệt đối.

---

## A. Trạng thái trang (3 nhánh render — đều phải có thiết kế)

| Nhánh | Điều kiện | Xem mục |
|---|---|---|
| **A — Chọn test** | `questions === null` hoặc `activeTest === null` | B1–B4 |
| **B — Làm bài** | có `questions` và `activeTest` | B5–B8 |
| **C — Lỗi tải câu hỏi** | `error` khi `startTest` | B9 |

**Giữ nguyên:** gọi API `GET /student/assessments/questions`, `POST …/compute`,
`POST /student/assessments`, `GET /student/assessments`; toàn bộ state machine
(`qIdx`, `answers`, `busy`, `saved`); mảng `TESTS`, `POLE_LABEL`, `POLE_COLOR`;
component `DiscoverScene` (xem mục E).

---

## B. MÔ TẢ TỪNG KHỐI THEO THỨ TỰ MÀN HÌNH

### B1. `PageHeader`
- Nhánh A: title **“Khám phá năng khiếu”**, sub “Bộ test khoa học giúp bạn hiểu chính mình hơn.”
  → **bỏ cụm “(slide 12)” khỏi text hiển thị** (chữ nội bộ không thuộc UI).
- Nhánh B: title `Test {tên}` (16/… → dùng H1 24/800), sub `Câu {i}/{n} — chọn mức phù hợp nhất.`
- Cả hai: H1 **24/800 (mobile 22)** `--ink`; sub **14/1.6 `--muted-strong`** (bỏ `text-muted`);
  `margin-bottom: 24px`.

### B2. Card “Bản đồ kết quả 3D”
```
card-surface · radius 20 · padding 24 · overflow hidden · margin-bottom 32
header: flex justify-between gap 16 · margin-bottom 16
  trái:  H3 18/700 --ink        “Bản đồ kết quả 3D”
         + mô tả 14/1.6 --muted-strong, margin-top 4  (bỏ text-muted)
  phải:  chip h 24 · px 10 · radius 999 · 12/600
         nền var(--portal-soft) · chữ var(--portal-dark)   ← thay px-3 py-1 (≈22px)
scene:   <DiscoverScene className="w-full" />  → CAO CỐ ĐỊNH 300px MỌI BREAKPOINT
         (inline style trong three/DiscoverScene — KHÔNG được sửa, xem mục E)
```
**Chip kết quả — 4 trạng thái (bắt buộc phân biệt, không chỉ dùng màu):**

| Trạng thái | Điều kiện | Cấu trúc chip |
|---|---|---|
| Đang tải | `assessments === null` | nền `--canvas-soft`, chữ `--muted-strong` 12/600, text “Đang tải…” |
| Rỗng | load OK, `length === 0` | nền `--portal-soft`, chữ `--portal-dark`, text “Chưa có kết quả” |
| Có dữ liệu | `length > 0` | nền `--portal-soft`, chữ `--portal-dark`, text “{n} bài đã làm” |
| **Lỗi** | `GET /student/assessments` fail | nền `#FFF7ED`, chữ `#9A3412`, icon ⚠ 12, text “Chưa tải được kết quả” |

> Hiện tại lỗi bị `catch(() => {}) nuốt mất → chip luôn hiện “Chưa có kết quả” làm người dùng
> hiểu nhầm. **Đổi thành:** đặt cờ `assessmentsError` trong `catch`, chip dùng bảng trên.
> (Không hiện `ErrorBox` cho lỗi này — trang vẫn dùng được khi chưa có lịch sử test.)

### B3. Lưới 4 thẻ bài test (nhánh A)
```
<section aria-labelledby="tests-heading"> · h2 sr-only giữ nguyên
grid: 1 cột <640 · 2 cột 640–1023 · 4 cột ≥1024
      class: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-stretch
      (gap đổi từ gap-4 cố định → 16 mobile / 24 desktop theo mục 3 của file 00)
margin-bottom: 24
```
**Mỗi thẻ (`<article>` bọc `<Card>`):**
```
Card: card-surface · radius 20 · padding 24 · display flex · flex-direction column
      · height 100% (h-full) · text-align center
1) icon tile: 56×56 · radius 16 · mx auto · emoji 24px · aria-hidden
   (GIỮ 4 gradient nền hiện có: cam / tím / hồng / amber — đây là trang trí, đã aria-hidden)
2) tên test:  16/700 --ink · margin-top 8          ← hiện `font-bold` không cỡ (kế thừa 16) → chốt 16
3) mô tả:     12/400 --muted-strong · margin-top 4 · min-height 32px · flex 1
   (hiện `text-xs text-muted` = 12px @3,46:1 ❌ → --muted-strong 5,01:1 ✅)
4) ô badge giữ chỗ: height 24px · margin-top 8
   - đã làm:   nền #ECFDF5 · chữ #047857 · 12/600 · icon ✓ 12  (hiện text-[11px] + emerald-600
                → 11px < 12px và 3,77:1 ❌)
   - chưa làm: 1 ô TRỐNG cùng height 24 + `invisible` + aria-hidden  ← GIỮ NGUYÊN (bất biến)
5) khối nút:   margin-top auto · padding-top 12 · width 100%
   nút:        width 100% · height 44 · radius 12 (`rounded-[12px]`, KHÔNG rounded-xl)
               14/600 · nền linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)
               · chữ #ffffff (4,61:1 ✅)
               label: “Bắt đầu” / “Làm lại” (đã làm) · aria-label kèm tên test (giữ)
   hover: brightness 1.08 · translateY(-1px)   focus: outline 2px --portal, offset 2
   disabled (khi đang mở bài khác): opacity .55 · cursor not-allowed · bỏ hover
```

### B4. Card “Kết quả đã có” (chỉ khi `assessments.length > 0`)
```
card-surface · radius 20 · padding 24
title: icon GraduationCap 18 var(--portal) + gap 8 + 16/700 --ink   “Kết quả đã có”
       margin-bottom 12
danh sách chip: flex wrap · gap 8
chip:  height 24 · px 10 · radius 999 · 12/600 · nền var(--portal-soft) · chữ var(--portal-dark)
       nội dung giữ nguyên “{Tên test}: {type/holland} — {score}/100”
```

### B5. Thanh tiến độ (nhánh B)
```
wrapper: margin-bottom 24 · role="progressbar" + aria-valuenow/min/max/label (GIỮ)
hàng nhãn: flex justify-between · 12/600 --muted-strong · margin-bottom 8
           (“3/10” trái · “30%” phải)   ← hiện text-muted 3,46:1 ❌
track:  height 8 · radius 999 · nền var(--line)   (đổi từ bg-canvas-soft để khớp 00/4.5)
fill:   height 8 · radius 999 · var(--hero-gradient) · width {progress}%
        transition width 300ms ease-out  → tắt khi prefers-reduced-motion
```

### B6. Card câu hỏi
```
card-surface · radius 20 · padding 24 · margin-bottom 24
eyebrow: 12/700 uppercase tracking .1em --muted-strong · margin-bottom 8 → “CÂU 3/10”
câu hỏi: H3 18/700 --ink · margin-bottom 20     (giữ `text-lg font-bold`)
fieldset/legend sr-only + role="radiogroup" aria-label (GIỮ)
danh sách đáp án: flex column · gap 8
```
**Mỗi đáp án (button `role="radio"`):**
```
width 100% · min-height 48 · padding 12px 16px · radius 12 · text 14/400 --ink
CHƯA chọn: background #ffffff · border 1px solid var(--line-control)   (3,27:1 ✅, đổi từ border-line 1,15:1 ❌)
           hover: background var(--canvas-soft) · border-color var(--portal)
ĐÃ chọn:   background linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)
           · border 1px solid transparent · chữ #ffffff (4,61:1 ✅)
           · KÈM icon ✓ 16px ở mép phải   ← không để màu là tín hiệu duy nhất
focus: outline 2px var(--portal) · outline-offset 2px
disabled khi đang nộp: opacity .55
```

### B7. Nút điều hướng
```
flex justify-between · gap 12 · margin-top 0 (nằm sau card, không mt thêm)
<768: 2 nút chia đều width (flex-1) — không để 1 nút dài 1 nút ngắn
TRÁI “← Quay lại”:  nút phụ — h 44 · px 20 · radius 12 · 14/600 · bg #fff · viền var(--line-control) · chữ --ink
                    disabled khi qIdx = 0
PHẢI “Tiếp theo →” / “Xem kết quả ✓”: nút chính — h 44 · px 20 · radius 12 · 14/600
                    nền cta-gradient + phủ 12% đen · chữ #fff
                    disabled khi chưa chọn đáp án (opacity .55, cursor not-allowed)
khi busy: text “Đang tính…” + icon spinner 16 · disabled cả 2 nút · aria-busy="true"
```

### B8. Card kết quả (nhánh B, `result` khác null) — đặt dưới nút điều hướng, `margin-top 24`
```
radius 20 · padding 32 (mobile 24) · text-align center
background-image: linear-gradient(105deg, rgba(27,42,94,.62) 0%, rgba(27,42,94,.40) 55%, rgba(27,42,94,.18) 100%), var(--hero-gradient)
margin-bottom 24
```
| Thành phần | Số đo |
|---|---|
| Eyebrow “KẾT QUẢ” | 12/700 uppercase tracking .12em · **`#ffffff` opacity 1** (đổi `text-white/75` ❌) |
| Tên kết quả (`result.label`) | **32/800 `#ffffff`** (giữ `text-2xl font-extrabold` = 24 → đổi thành 32 theo H2; mobile 26), margin-top 4 |
| Mô tả (`result.detail`) | **15/1.6 `#ffffff` opacity 1** (đổi `text-white/85` ❌), max-width 640, canh giữa, margin-top 8 |
| Chip “✓ Đã lưu” | **nền `#ffffff` · chữ `var(--portal-dark)` · 12/600 · h 24 · px 10 · radius 999** (đổi `bg-white/20 text-white` = 2,52:1 ❌), margin-top 16 |
| Lưới cực (`poles`) | 2 cột <640 · 3 cột ≥640 · gap 12 · margin-top 20 |
| Ô cực | nền `rgba(27,42,94,.50)` · viền `1px rgba(255,255,255,.22)` · radius 12 · padding 12 (đổi `bg-white/15` ❌) |
| Nhãn cực + điểm | hàng flex justify-between: nhãn **12/600 `#ffffff`**, điểm **14/700 `#ffffff` tabular-nums** |
| Thanh cực | track height 6 radius 999 `rgba(255,255,255,.25)`; fill = `POLE_COLOR[pole]`; **luôn kèm số text ở hàng trên** |
| Ghi chú bù trừ màu | 16 màu cực nằm ngoài bảng màu chính và có màu không đạt 3:1 trên nền tối (VD `#2563EB`). Vì **giá trị đã hiển thị bằng chữ**, thanh là phần phụ → thêm `box-shadow: inset 0 0 0 1px rgba(255,255,255,.55)` cho fill để tách viền. **Không đổi `POLE_COLOR`** (dữ liệu test khoa học). |

### B9. LỖI (bắt buộc — cả 2 nhánh)

**Lỗi khi mở bài / nộp bài (`error`):**
- **Không** được `return <ErrorBox/>` ngay từ đầu file (đang làm mất `PageHeader` + nhảy bố cục).
  → Luôn render `PageHeader` + `ErrorBox` bên dưới, kèm nút **“Thử lại”** (`secondary`, h 44)
  gọi lại `startTest(activeTest)` / `submitTest()`.
- Dịch lỗi tiếng Việt (mẫu chuẩn từ `Dashboard.tsx`, giữ nguyên cách làm):
  | Nội dung | Text hiển thị |
  |---|---|
  | `→ 401` | “Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để làm bài test.” |
  | `→ 403` | “Bạn cần đăng nhập bằng tài khoản học sinh để làm bài test.” |
  | mạng / timeout | “Không tải được câu hỏi, bạn thử lại sau nhé.” |
  | khác | giữ nguyên message + tiền tố “Có lỗi xảy ra: ” |

**Trạng thái rỗng:**
| Tình huống | Hiển thị |
|---|---|
| `questions` là `[]` | **`Empty`** “Bài test này chưa có câu hỏi, bạn quay lại sau nhé.” + nút secondary “Quay lại danh sách test” → `setQuestions(null); setActiveTest(null)`. *(Hiện tại `q = questions[qIdx]` sẽ `undefined` → crash — phải chặn.)* |
| `assessments` rỗng | chip “Chưa có kết quả” (B2) + card 3D vẫn hiện fallback 2D có sẵn của `DiscoverScene` |
| chưa chọn đáp án ở câu cuối | nút “Xem kết quả” `disabled` + dòng hướng dẫn 12 `--muted-strong`: “Chọn một đáp án để tiếp tục.” |

**Trạng thái tải:**
- Mở bài: 4 nút chuyển “Đang mở bài…” + `disabled` + spinner 16; khối giữ nguyên độ cao (không nhảy).
- Nộp bài: như B7 (`busy`).
- `assessments`: chip “Đang tải…” (B2). Không cần skeleton cho 2 việc này.

---

## C. RESPONSIVE

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| PageHeader | H1 22 | H1 24 | H1 24 | H1 24 |
| Card 3D | scene 300px cố định*, card padding 20 | scene 300* | scene 300* | scene 300* |
| Lưới 4 test | 1 cột | 2 cột, gap 24 | 4 cột, gap 24 | 4 cột, gap 24 |
| Card “Kết quả đã có” | chip wrap 2 dòng | wrap | 1 dòng | 1 dòng |
| Tiến độ | full width | full | full | full |
| Đáp án | full width, min-h 48 | full | full, max-width 720 | full, max-width 720 |
| Nút điều hướng | 2 nút chia đều flex-1 | chia đều | theo nội dung | theo nội dung |
| Card kết quả | padding 24, lưới cực 2 cột | 2 cột | 3 cột | 3 cột |

\* 300px cố định ở mọi cỡ do `height: 300` inline trong `three/DiscoverScene` — **xem mục E**
nếu P5 mở quyền thì mới đổi được.

---

## D. CHECKLIST ĐỔI (pane 2 tự đối chiếu)

| # | Vị trí | Hiện tại | Chuyển thành | Lý do |
|---|---|---|---|---|
| D1 | `(slide 12)` trong 2 PageHeader | text nội bộ | **xóa** khỏi text hiển thị | không thuộc UI |
| D2 | Mọi `text-muted` trong trang (mô tả card 3D, mô tả test, nhãn tiến độ, eyebrow) | 12–14px @3,46:1 ❌ | `--muted-strong` (5,01:1) / `--ink-soft` | 00/7.2 |
| D3 | Chip kết quả | 4 trạng thái gộp 1, lỗi bị nuốt | bảng 4 trạng thái (B2) + cờ `assessmentsError` | lỗi bị hiểu nhầm là “chưa có kết quả” |
| D4 | Ô badge “Đã làm” | `text-[11px]` + `emerald-600` | h 24 · 12/600 · `#047857` trên `#ECFDF5` + icon ✓ | 11<12px, 3,77:1 ❌ → 5,48:1 ✅ |
| D5 | Nút test card | `text-xs px-3 py-2 rounded-full` (~32px, radius pill) | **h 44 · radius 12 · 14/600** + gradient phủ 12% | 00/4.2 + 7.8 (target 44) + 7.4 |
| D6 | Grid test | `gap-4` cố định | `gap-4 md:gap-6` | 00/3 (16/24) |
| D7 | Tên test | `font-bold` không cỡ | 16/700 (`text-base font-bold`) | chốt số đo |
| D8 | Tiến độ track | `bg-canvas-soft` | `var(--line)` + nhãn 12/600 `--muted-strong` | 00/4.5 + 7.2 |
| D9 | Đáp án (radio) | `border-line` (1,15:1 ❌) · chọn = gradient không icon | viền `--line-control` (3,27:1) · chọn thêm icon ✓ · min-h 48 | 00/7.5 + 7.7 |
| D10 | Nút điều hướng | `rounded-full px-4 py-2` (~36px) | **h 44 · px 20 · radius 12**; phụ = secondary thật | 00/4.2 + 7.8 |
| D11 | Card kết quả | nền gradient không scrim, `white/75`, `white/85`, `bg-white/20` | + scrim navy, chữ opacity 1, chip nền trắng | 00/7.3 (2,52:1 ❌ → ≥6,4:1 ✅) |
| D12 | Ô cực | `bg-white/15` + chữ trắng 12px | nền `rgba(27,42,94,.5)` + viền trắng 22%, chữ trắng 100% | 00/7.3 |
| D13 | Lỗi | `return <ErrorBox/>` đầu file (mất PageHeader) | PageHeader + ErrorBox + nút Thử lại + dịch lỗi VN | 00/4.10, nhất quán trang khác |
| D14 | `questions = []` | crash `q.text` | `Empty` + nút quay lại | lỗi tiềm ẩn |
| D15 | Card 3D header chip | `px-3 py-1` ≈22px | h 24 | 00/4.3 |

**Không thay đổi:** API/state machine, `TESTS`/`POLE_*`, `DiscoverScene` + fallback 2D, `sr-only`
heading, `role=radiogroup/progressbar`, gradient 4 icon tile (trang trí, `aria-hidden`).

---

## E. YÊU CẦU MỞ QUYỀN SỬA `components/three/**` — **ĐỀ NGHỊ, KHÔNG QUYẾT ĐỊNH**
*(P5/điều phối quyết. Nếu KHÔNG mở quyền thì phần dưới nhánh “Không mở quyền” là những gì P2 code ngay.)*

| # | Đề nghị | Việc cần sửa trong `DiscoverScene.tsx` | Nếu KHÔNG mở quyền |
|---|---|---|---|
| E1 | Chiều cao scene responsive: **300px ≥768 / 240px <768** | bỏ `height: 300` inline, nhận prop `height` hoặc media query | **Giữ 300px mọi breakpoint** (P2 không đụng three/) |
| E2 | Fallback 2D đổi `text-muted` → `--muted-strong` (12px, 3,46:1 ❌) | trong `KhungDuPhongDiscover` | Bỏ qua — fallback 2D chỉ là lưới phụ, chấp nhận giữ nguyên |
| E3 | Màu cột rỗng mặc định `0x8a87a3` → dùng mã sáng hơn (`0xb2afc6`, S6) để thấy trên nền trắng | trong `taoSceneKetQua` | Bỏ qua — không ảnh hưởng chữ |

**Không đề nghị đổi** cấu trúc cảnh quan, màu 4 loại test (`0xf97316/0x8b5cf6/0xec4899/0xfbbf24`
— trùng hướng bảng màu), tốc độ xoay, `dprCap`, `prefersReducedMotion`.

---

## F. BẢNG ĐỐI CHIẾU SỐ ĐO (P2 đo bằng devtools, sai → báo pane 1)

| Phần tử | Số đo phải đúng |
|---|---|
| Card 3D | radius **20**, padding **24**, nội dung − scene = header **16** |
| `DiscoverScene` div | height **300** (inline) |
| Chip kết quả / chip “Đã làm” / chip “Đã lưu” | height **24**, padding-x **10**, font **12/600** |
| Icon tile test | **56×56**, radius **16**, emoji **24** |
| Tên test | **16/700** |
| Mô tả test | **12/400**, min-height **32** |
| Nút test card | height **44**, radius **12**, font **14/600**, width **100%** |
| Grid test | gap **16 (<768)** / **24 (≥768)**; cột 1/2/4 tại 390/768/1024 |
| Tiến độ | track height **8**, radius **999**, nhãn **12/600**, margin-bottom nhãn→track **8** |
| Card câu hỏi | padding **24**, eyebrow **12/700**, câu hỏi **18/700**, gap đáp án **8** |
| Đáp án | min-height **48**, padding **12/16**, radius **12**, chữ **14/400** |
| Nút điều hướng | height **44**, padding-x **20**, radius **12**, chữ **14/600**, gap **12** |
| Card kết quả | padding **32** (mobile 24), tiêu đề **32/800** (mobile 26), mô tả **15/1.6** |
| Ô cực | padding **12**, radius **12**, nhãn **12/600**, điểm **14/700**, gap lưới **12** |
| Khoảng cách khối | PageHeader→3D **24** · 3D→lưới test **32** · lưới test→card kết quả **24** |
