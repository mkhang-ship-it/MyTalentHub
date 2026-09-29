# ĐẶC TẢ `/passport/:studentId` + hộp chi tiết (Đợt 3 · file 02)

> ⚠️ **ẢNH `refs/02-passport.svg` CHỈ ĐỂ XEM HÌNH DẠNG — chữ thắng ảnh.**
> Nguồn sự thật: `../dot1/00-he-thong-thiet-ke.md` (4.3, 4.8–4.11, 7.1–7.8).
> **CON SỐ LÀ CHUẨN, CLASS LÀ GỢI Ý. Không thêm token màu mới ở đợt này** (xem mục E).

**Phạm vi:** `frontend/src/pages/passport/Passport.tsx` + `PassportDetailDialog.tsx`
(+ `ui.tsx`/`index.css` nếu cần class). **CẤM:** sửa `components/qr/**`, sửa/thay `components/three/**`
(`PassportHoloCard`) — riêng `three/**` chờ Đợt 5 (file `04-de-xuat-dot5-3d.md`).

---

## ⚠️ RÀNG BUỘC SỐ 1 — MÃ QR TRÊN THẺ (giống file 01)

`PassportHoloCard` và hộp chi tiết đều chứa `<QrCode>` **thật** (URL công khai
`/passport/verify?code=…`). Áp dụng y nguyên 3 ràng buộc QR1–QR3 ở `01-checkin.md`
(ô module ≥2, lề ≥4 module, nền trắng đặc, không filter/scale/bo góc lớn hơn lề).

**Số liệu ước tính (P2 đo lại, không dùng để sửa):**
- Thẻ mặt trước: `kichThuoc={72}` (thumb) / `{88}` (dialog) → ô rơi vào **2px (sàn)** →
  SVG thực tế ≈ **82px > 72px yêu cầu** (công thức `Math.max(2, floor(...))` làm tròn lên).
  → **Hộp chứa QR phải cho phép SVG lớn hơn tham số** (dùng `shrink-0`, không `width/height` cứng).
- Hộp QR cột trái hộp chi tiết + mặt sau thẻ: `kichThuoc={112}` → ô = **2px sàn**, SVG ≈ 98–104px.
- **Tuyệt đối không giảm** `kichThuoc` ở 3 chỗ này (giảm là mất khả năng quét).

---

## ⚠️ RÀNG BUỘC SỐ 2 — KHUNG THẺ PHẢI ĐỌC ĐƯỢC BẰNG CSS THUẦN (chốt theo yêu cầu P5)

**Đã đối chiếu source `components/three/PassportHoloCard.tsx`: component này HIỆN LÀ THẺ 2D
THUẦN CSS** (gradient navy `#1B2A5E→#284B8C→#1B2A5E` + toàn bộ chữ/QR/số liệu là HTML —
không có WebGL trong file). Yêu cầu “khung thẻ có nền và chữ đọc được bằng CSS” **đã đạt**.

→ Đặc tả này **CHỐT** đó là bất biến, Đợt 5 không được phá:

| # | Bất biến khung thẻ passport |
|---|---|
| P1 | Nền thẻ = gradient navy **bằng CSS**, render ngay cả khi WebGL lỗi/không có |
| P2 | Mọi thông tin đọc được (tên, lớp, 3 số liệu, QR + mã, dòng chân thẻ) là **HTML text**, không vẽ lên canvas |
| P3 | WebGL (nếu Đợt 5 thêm) chỉ là **lớp trang trí tùy chọn** đặt sau/sau nội dung, không thay thế nội dung |
| P4 | `minHeight`: thumb **400px** / dialog **460px** — giữ nguyên ở mọi tình trạng (soi bằng devtools, sai số ≤2px) |
| P5 | Bấm/phím Enter/Space mở hộp chi tiết (`role="button"`, `aria-haspopup="dialog"`, focus ring) — GIỮ |

Cách kiểm (áp dụng ngay cả trước Đợt 5): DevTools → console →
`document.querySelectorAll('canvas').forEach(c=>c.getContext('webgl').getExtension('WEBGL_lose_context').loseContext())`
→ tải lại trang với `--disable-webgl` → trang passport vẫn thấy đủ P1–P4.

---

## A. Khung trang & trạng thái

Giữ nguyên: API `GET /passport/:studentId`, `FIELD_NAMES`, type `Passport`, cờ `detailOpen`,
cấu trúc mở/đóng hộp chi tiết, `PassportHoloCard` (không sửa).

| Nhánh | Điều kiện | Mục |
|---|---|---|
| Đang tải | `data === null && !error` | B6 |
| Lỗi | `error !== ""` | B6 |
| Bình thường | có data | B1–B5, B7 |
| Rỗng | 1 trong 3 danh sách = `[]` | B4 |

---

## B. TRANG `/passport/:studentId` — khối theo thứ tự màn hình

### B1. `PageHeader`
- title `Talent Passport` (H1 **24/800 mobile 22** `--ink`) · subtitle giữ nguyên
  (đã là `--muted-strong` nhờ `PageHeader`). `margin-bottom 24`.
- `reveal` GIỮ — nhưng **xem C3 (bug delay 3 giây)**.

### B2. Lưới chính
```
grid-cols-1 · lg:grid-cols-3 · gap-4 md:gap-6   (ĐỔI từ gap-6 cố định — 00/3)
cột trái (1): PassportHoloCard  ·  cột phải (2): 3 card nội dung (B3–B5)
```

### B3. Cột trái — `PassportHoloCard`
- Không đổi component. Bọc ngoài: `className="h-full"` + **khung min-height 400** (P4).
- Sửa trong phạm vi card (nếu P2 sửa được — component nằm ở `components/three/`, **nếu bị cấm
  thì chuyển các mục này sang Đợt 5**; đánh dấu rõ trong checklist):

| # | Thành phần | Hiện tại | Chuyển thành |
|---|---|---|---|
| a | dòng chân thẻ | `text-white/55` **10px** | `#ffffff` opacity 1 · **12px** |
| b | nhãn trong ô số liệu | `text-white/70` **10px** | `#ffffff` 1 · **12/500** |
| c | dòng phụ dưới tên | `text-white/70` 12px | giữ (5,09:1 ✅) — không đổi |
| d | khung QR | `bg-white/95` | nền đặc `#ffffff` |

> **Tính toán:** trắng/55 10px trên điểm sáng nhất card `#284B8C` → blend ≈ `#9EAECB`
> (L=0,419) trên nền L=0,074 → **(0,469)/(0,124) = 3,79:1 ❌** và 10px < 12px.
> Trắng 100% 12px trên `#284B8C` = **8,49:1 ✅**. Trắng/70 12px = 5,09:1 ✅ (giữ).

### B4. Cột phải — 3 card nội dung

**Chung cho cả 3 card:**
```
Card: card-surface · radius 20 · padding 24 (p-6 đã đúng)
hàng tiêu đề: icon 18 var(--portal) + gap 8 + h2 18/700 --ink · margin-bottom 12
   (hiện h2 `font-semibold` = 16 → đổi 18/700 theo 00/4.1)
BỎ className "shadow-soft hover:shadow-lift hover:-translate-y-0.5" (card không bấm được — 00/4.1)
GIỮ reveal, NHƯNG sửa revealDelay (C3)
khoảng cách các dòng bên trong: 8–12px (giữ space-y-2.5 = 10 → làm tròn 12: space-y-3)
```

**Card 1 — Giới thiệu & Sở thích**
- `bio`: 14/1.6 `--muted-strong` (đổi `text-muted` 3,46→5,01:1), GIỮ `line-clamp-3`.
- Chip sở thích: height **24** · radius **999** · 12/600 · nền `var(--portal-soft)` ·
  chữ `var(--portal-dark)` (**6,42:1** — thay `px-2.5 py-1` ≈22px), gap 8, margin-top 12.
- `bio` null → text `Chưa cập nhật giới thiệu.` (giữ) — trạng thái rỗng cấp 1.

**Card 2 — Chứng chỉ & Dự án (2 cột trong 1 hàng)**
```
grid-cols-1 md:grid-cols-2 gap-4   (giữ)
mỗi dòng: radius 12 · border 1px var(--line) · nền var(--canvas-soft) 50% · padding 10/12
tiêu đề dòng: 14/600 --ink · dòng phụ: 12 --muted-strong   (đổi text-muted-light 2,09 → 5,01:1)
dòng mô tả dự án: 12/1.4 --muted-strong · GIỮ line-clamp-2 · margin-top 4
rỗng: dùng component <Empty> (00/4.8) icon 32 + text — thay đoạn text rải hiện tại
      text: “Chưa có chứng chỉ.” / “Chưa tham gia dự án.”
```

**Card 3 — Hoạt động trải nghiệm**
```
mỗi dòng: radius 12 · border 1px var(--line) · nền canvas-soft 50% · padding 12/16
          BỎ hover:bg-canvas-soft/80 + transition (dòng không bấm được — 00/4.1)
trái: title 14/600 --ink · phụ 12 --muted-strong (lĩnh vực · vai trò)
phải: “{hours}h” 14/700 --portal-dark tabular-nums   ← ĐỔI từ text-portal
rỗng: <Empty icon CalendarDays> “Chưa tham gia hoạt động nào.”
```
> **Tính toán:** `text-portal #C44296` trên nền dòng `canvas-soft 50%` (≈`#FCF9F5`, L=0,950):
> (1,000)/(0,230) = **4,34:1 ❌** (cần 4,5 cho 14px) — worst case mọi role đều xem được `/passport/:id`.
> `--portal-dark #9A2E5E` trên cùng nền = (1,000)/(0,146) = **6,84:1 ✅**.
> *Lưu ý: icon 18px màu `--portal` vẫn giữ (4,34 ≥ 3:1 với icon ✅ — chỉ chữ mới đổi).*

### B5. Chân trang
- `text-muted-light` 12 → **`--muted-strong`** (2,09 → 5,01:1) · icon 13 · gap 8 · margin-top 24.

### B6. Trạng thái tải & lỗi

| Trạng | Hiển thị |
|---|---|
| Đang tải | **Skeleton theo bố cục thật** (00/4.9) thay spinner: khối trái `Skeleton h-[400px] radius 20`; cột phải 3 khối `Skeleton` `h-[168px]/[200px]/[200px]` radius 20 + gap 16; kèm label “Đang tải hồ sơ…” 14 `--muted-strong` · `aria-busy` |
| Lỗi | **Không** `return <ErrorBox>` (đang làm mất PageHeader) → render `PageHeader` + `<ErrorBox retryLabel="Thử lại" onRetry={reload}/>` + dịch lỗi: `→401` “Phiên đăng nhập đã hết hạn…”, `→403` “Bạn cần đăng nhập để xem hồ sơ này.”, `→404` “Không tìm thấy hồ sơ học sinh này.”, mạng “Không tải được hồ sơ, bạn thử lại sau nhé.” |
| Rỗng từng danh sách | `<Empty>` như B4 (không dùng text trần) |

### B7. Hộp chi tiết `PassportDetailDialog` — 2 cột

**Khung hộp:**
```
overlay: background rgba(27,42,94,.45) + backdrop-filter blur(8px)     ← 00/4.11
         (hiện bg-ink/75 — tối hơn chuẩn; đổi cho nhất quán, overlay không mang chữ nên không tính tương phản)
hộp:     max-width 896 (max-w-4xl) · radius 20 (ĐỔI rounded-2xl=16) · nền #ffffff
         padding 20 (<lg) / 24 (lg) · max-height 92vh · shadow 2xl
lưới:    grid-cols-1 → lg: [420px | 1fr] · gap 0, cột trái có border-right var(--line)
```
> **Quyết định chốt:** `00/4.11` ghi hộp thoại `max-width 560px` — áp cho **hộp thoại thông báo/
> hành động**. Hộp chi tiết passport là **biến thể “hộp thoại lớn” 896px** vì cần 2 cột
> (thẻ 420 + nội dung) — 560 không đủ (420 + nội dung tối thiểu ~360 = 780 > 560).
> **Không sửa file 00** (chỉ ghi trong dot3) — báo P5 cân nhắc bổ sung biến thể này vào 00/4.11.

**Cột trái (thẻ + QR):**
```
padding 20/24 · nền var(--canvas-soft) 40% · cuộn dọc khi cao quá 92vh
Thẻ: The2D = PassportHoloCard(size="dialog", minHeight 460) + mặt sau tĩnh (GIỮ)
     vùng bấm: role="button" tabIndex=0 Enter/Space + focus ring (GIỮ — P5)
nút “Xem toàn màn hình”: h 44 · radius 999 · padding-x 16 · 13/600 · viền var(--line-control)
     · icon Maximize2 14 · nền #ffffff   (hiện ≈30px — sai target 44 của 00/7.8)
dòng chú thích 12/1.4 --muted-strong (hiện text-muted-light 2,09 ❌)
hộp QR: radius 12 · border 1px var(--line) · nền #ffffff · padding 12
     · QrCode kichThuoc={112} KHÔNG ĐỔI · dòng 12 --muted-strong: “Cập nhật …” + mô tả
```

**Cột phải (panel chi tiết):**
```
padding 20/24 · space-y 24 (space-y-6) · cuộn dọc
hàng đầu: h2 18/700 --ink “Talent Passport” + dòng 14 --muted-strong “Tên · Lớp · Khối”
          + nút ĐÓNG 44×44 radius 999 viền var(--line-control) icon 16   (hiện h-9 w-9 = 36 ❌ 7.8)
mỗi section: h3 14/700 --ink + icon 16 var(--portal) + margin-bottom 8–12  (GIỮ)
```

| Section | Số đo (mới) | Hiện tại → Lý do |
|---|---|---|
| Giới thiệu & Sở thích | bio 14/1.6 `--muted-strong`; chip h24 r999 12/600 `--portal-soft`/`--portal-dark` | `text-muted` ❌, chip ≈22px |
| **Điểm số nổi bật** (3 ô) | ô: radius 12 · padding 10 · nền `--portal-soft`; giá trị **18/800 `var(--portal-dark)`**; nhãn **12/500 `--muted-strong`** | giá trị `text-portal`/`text-portal-dark` **trộn**: nhãn `text-[10px] text-muted` ❌ 10px + 3,46:1 |
| Kỹ năng | tên 14 `--ink-soft` · điểm `{level}/10` 14 `--muted-strong` · thanh h **8** r999 track **`var(--line)`** · gap dọc **16** (gap-y-3=12 → 16 theo 00/4.5) | track `bg-canvas-soft`, điểm `muted-light` 2,09 ❌, gap 12 ≠ 16 |
| **Huy hiệu** (màu từ DB) | chip: nền **`#ffffff`** · viền **1.5px màu `b.color`** (trang trí) · chữ **12/600 `--ink`** · icon `b.icon` 12 · radius 999 · h24 | `color: b.color` trên nền `${b.color}1A` — **màu DB không kiểm soát được tương phản** → chữ `--ink` 12,32:1 ✅ bất chấp màu |
| Chứng chỉ / Dự án | như B4 (14/600 `--ink`, 12 `--muted-strong`, radius 12, padding 10/12) | `muted-light` 2,09 ❌ |
| Hoạt động | như B4, “{hours}h” 14/700 **`--portal-dark`** | `text-portal` 4,34:1 ❌ → 6,84:1 ✅ |

> **Tính toán ô điểm:** `--portal #C44296` trên `--portal-soft #FBEFF7` (L=0,888) =
> (0,938)/(0,230) = **4,07:1 ❌** cho chữ 18px extrabold (18 < 18,66px → chưa được coi là chữ lớn,
> cần 4,5). `--portal-dark` trên `--portal-soft` = **6,42:1 ✅** (00/1.2).
> *(Scope học sinh `#A1458F` = 5,05:1 ✅ nhưng `/passport/:id` xem được mọi role → chốt theo worst case.)*

**Chế độ toàn màn hình (Esc thoát trước, rồi đóng hộp — GIỮ logic):**
```
overlay: rgba(27,42,94,.75) + blur(12px)      (hiện bg-ink/85)
hàng đầu: nhãn 12/600 #ffffff opacity 1 (hiện white/70 — giữ được nhưng chốt opacity 1)
           + nút “Quay lại” 44×44 radius 999 viền rgba(255,255,255,.4) nền rgba(27,42,94,.45) icon 16
thẻ: max-width 460 canh giữa (GIỮ)
chú thích dưới: 12/400 #ffffff opacity 1 (hiện white/60 ❌ — xem tính toán)
```
> **Tính toán overlay:** trắng/60 12px trên nền lợp `ink 85%` phủ canvas (L=0,085) →
> blend (L=0,490) → **(0,540)/(0,135) = 4,01:1 ❌**. Với navy **0,75** phủ canvas
> (L=0,114) + trắng 100% → **(1,05)/(0,164) = 6,42:1 ✅** (worst case = nền canvas sáng nhất).

**Bắt buộc của hộp thoại (00/4.11):** focus trap (Tab quay vòng trong hộp, không thoát ra nền) —
**hiện CHƯA có** (chỉ focus nút đóng lúc mở) → P2 thêm; Esc đóng ✅ đã có; `aria-modal` ✅;
restore focus khi đóng ✅ đã có; click overlay đóng ✅ đã có.

---

## C. RESPONSIVE

### Trang
| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Lưới | 1 cột: thẻ trên → nội dung dưới | 1 cột (chưa `lg`) | **3 cột [1 \| 2]** | 3 cột, gap 24 |
| Thẻ passport | full width, min-h 400 | full | ~1/3 (≈340) | ~1/3 (≈430) |
| Card chứng chỉ/dự án | 1 cột | 1 cột | 2 cột (md) | 2 cột |
| Chân trang | xuống dòng, center | center | center | center |

### Hộp chi tiết
| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Hộp | 100% − 24 (p-3), radius 20 | 100% − 48 | **896** | 896 |
| Lưới trong hộp | 1 cột: thẻ → nút → QR → panel | 1 cột | 2 cột 420\|1fr | 2 cột |
| Panel chi tiết | cuộn trong 92vh | cuộn | cuộn (cột phải riêng) | cuộn |
| Điểm số 3 ô | 3 cột | 3 cột | 3 cột | 3 cột |
| Kỹ năng | 1 cột | 1–2 cột (`sm:grid-cols-2`) | 2 cột | 2 cột |
| Toàn màn hình | thẻ max 460, overlay .75 | max 460 | max 460 | max 460 |

---

## D. CHECKLIST THAY ĐỔI (đánh số)

### D-A · Trang
| # | Vị trí | Hiện tại | Chuyển thành | Lý do |
|---|---|---|---|---|
| P1 | Lưới chính | `gap-6` cố định | `gap-4 md:gap-6` | 00/3 |
| P2 | Tiêu đề 3 card | `font-semibold` 16 | **18/700** | 00/4.1 |
| P3 | **`revealDelay={3/4/5}`** | animation delay **3–5 giây** (`.reveal-up … both` → nội dung biến mất ~3–5s!) | **0,06 / 0,12 / 0,18** (giây) —revealDelay ≤ 0,3 | bug UX thật, đo bằng devtools |
| P4 | `<style>` nội tuyến trong `Passport.tsx` | keyframe `fadeUp/reveal` trùng `index.css`, `.anim-fade-up`/`.reveal` không nơi nào dùng | **xóa khối `<style>`** (P2 grep xác nhận trước) | dead code, dễ lệch token |
| P5 | Card có `hover:shadow-lift translate-y` | có | **bỏ** | 00/4.1 (không bấm được) |
| P6 | `bio` | `text-muted` 3,46 ❌ | `--muted-strong` 5,01 ✅ | 00/7.2 |
| P7 | Chip sở thích | `py-1` ≈22px | h24 · 12/600 | 00/4.3 |
| P8 | Dòng chứng chỉ/dự án/hoạt động, chân trang | `text-muted-light` **2,09:1** ❌ | `--muted-strong` **5,01:1** ✅ | 00/7.2 |
| P9 | `{hours}h` | `text-portal` 4,34:1 ❌ (nền canvas-soft 50%) | `--portal-dark` 6,84:1 ✅ | 00/1.2 |
| P10 | Dòng hoạt động | có hover | bỏ hover | 00/4.1 |
| P11 | Danh sách rỗng | text trần | component `Empty` + icon 32 | 00/4.8 |
| P12 | Đang tải | spinner | **Skeleton theo bố cục** | 00/4.9 |
| P13 | Lỗi | `return <ErrorBox>` mất PageHeader, message thô | PageHeader + ErrorBox + Thử lại + dịch VN | 00/4.10 |

### D-B · Hộp chi tiết
| # | Vị trí | Hiện tại | Chuyển thành | Lý do |
|---|---|---|---|---|
| P14 | Overlay hộp | `bg-ink/75` | `rgba(27,42,94,.45)` + blur 8 | 00/4.11 |
| P15 | Radius hộp | `rounded-2xl` = 16 | **20** | 00/4.11 |
| P16 | Nút đóng | 36×36 | **44×44** r999 viền `--line-control` | 00/7.8, 7.5 |
| P17 | Focus trap | chưa có | **thêm** (Tab quay vòng) | 00/4.11 |
| P18 | Nút “Xem toàn màn hình” | ≈30px | **h44** r999 13/600 | 00/7.8 |
| P19 | Ô điểm số | giá trị `text-portal` 4,07 ❌, nhãn 10px | giá trị `--portal-dark` **6,42 ✅**, nhãn 12/500 `--muted-strong` | 00/1.2 + min 12px |
| P20 | Thanh kỹ năng | track `canvas-soft`, gap 12, điểm `muted-light` | track **`--line`**, gap **16**, điểm `--muted-strong` | 00/4.5, 7.2 |
| P21 | Chip huy hiệu | `color`/`bg` theo DB (không kiểm soát tương phản) | nền trắng + viền màu DB + chữ `--ink` 12/600 | 12,32:1 ✅ mọi màu DB |
| P22 | `{hours}h`, dòng phụ, bio trong panel | `text-portal`/`muted-light`/`text-muted` | `--portal-dark` / `--muted-strong` | như P6–P9 |
| P23 | Chế độ toàn màn hình | overlay `ink/85`, chữ `white/60` 4,01 ❌ | overlay navy **.75** + chữ trắng 100% **6,42 ✅**, nút 44 | 00/7.3 |
| P24 | Thẻ trong hộp | QR `kichThuoc` 112/88 | **không đổi** (ô = 2px sàn) | QR1–QR3 file 01 |

**KHÔNG ĐỔI:** `PassportHoloCard` (P1–P5 bất biến), `QrCode` + mọi tham số, `The2D`,
mặt sau thẻ, cấu trúc 6 section, `FIELD_NAMES`, API, `data-testid`, thứ tự tab.

---

## E. MÀU — KHÔNG THÊM TOKEN MỚI

Dùng lại `--muted-strong`, `--line-control`, `--portal-soft/-dark`, `--line`, `--canvas-soft`
của `00/1.1` + 4.3. Bảng cũ → mới:

| Cặp | Cũ | Mới |
|---|---|---|
| Trắng/55 10px trên `#284B8C` (chân thẻ) | 3,79:1 ❌ (+10px <12) | trắng 100% 12px → **8,49:1 ✅** |
| `--muted-light` 12px trên trắng | 2,09:1 ❌ | `--muted-strong` → **5,01:1 ✅** |
| `--portal` 18/800 trên `--portal-soft` (ô điểm) | 4,07:1 ❌ | `--portal-dark` → **6,42:1 ✅** |
| `--portal` 14/700 trên dòng canvas-soft 50% | 4,34:1 ❌ | `--portal-dark` → **6,84:1 ✅** |
| Chữ `b.color` trên nền `${b.color}1A` (huy hiệu) | **không kiểm soát** (màu từ DB) | trắng + `--ink` → **12,32:1 ✅** |
| Trắng/60 12px trên overlay `ink/85` | 4,01:1 ❌ | trắng 100% + overlay navy .75 → **6,42:1 ✅** |
| Nhãn 10px (thẻ + panel) | <12px ❌ | 12px ✅ |

---

## F. BẢNG ĐỐI CHIẾU SỐ ĐO

| Phần tử | Số đo |
|---|---|
| Lưới trang | cột **1/1/3/3** tại 390/768/1024/1440 · gap **16/24** |
| `PassportHoloCard` | min-height **400** (trang) / **460** (hộp) · radius theo component (**16**) |
| Card nội dung | radius **20**, padding **24**, tiêu đề **18/700** + icon 18, margin-bottom **12** |
| Dòng dữ liệu | radius **12**, padding **10/12** (dự án/chứng chỉ) và **12/16** (hoạt động), gap dọc **12** |
| Chip (sở thích/huy hiệu) | height **24**, padding-x **10**, radius **999**, **12/600** |
| Hộp chi tiết | max-width **896**, radius **20**, padding **20/24**, max-height **92vh**, cột trái **420** |
| Nút đóng / toàn màn hình / Xem toàn màn hình | **44×44** · **44×44** · **h44**, radius **999** |
| Ô điểm số | radius **12**, padding **10**, giá trị **18/800**, nhãn **12/500** |
| Thanh kỹ năng | height **8**, radius **999**, track `--line`, gap dọc **16** |
| Overlay / toàn màn hình | `rgba(27,42,94,.45)` blur **8** / `rgba(27,42,94,.75)` blur **12** |
| QR | `kichThuoc` **72 / 88 / 112** (không đổi), ô ≥ **2**, lề **4** module |
