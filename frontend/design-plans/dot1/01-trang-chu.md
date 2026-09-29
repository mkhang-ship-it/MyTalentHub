# ĐẶC TẢ TRANG CHỦ `/` — `frontend/src/pages/Landing.tsx` (Đợt 1)

> ⚠️ **Ảnh tham chiếu `refs/01-trang-chu.svg` CHỈ ĐỂ XEM HÌNH DẠNG.**
> Mọi con số/màu/khoảng cách phải lấy từ file này. Khác nhau → file chữ thắng.
> Đọc `00-he-thong-thiet-ke.md` trước — mọi token, thang chữ, nhịp không gian, ngưỡng
> tương phản lấy từ đó, file này chỉ mô tả **bố cục từng khối theo thứ tự màn hình**.

**Phạm vi:** chỉ `frontend/src/pages/Landing.tsx` (+ `ui.tsx`/`index.css` nếu cần thêm class).
Không sửa `Layout.tsx`, không sửa route.

---

## A. Tổng quan khung

| Hạng mục | Giá trị |
|---|---|
| Nền trang | `var(--canvas)` `#fdf7f1` |
| Container | `max-w-[1152px] mx-auto px-5 md:px-6` |
| Cột | 12 cột ảo, gutter 24px; hero chia 7 / 5 (chữ / khối 3D) |
| Chiều cao section | xem từng khối; chênh lệch giữa section = 0 (section tự padding) |
| Font | "Be Vietnam Pro" (mặc định toàn app) |
| Trên 1440 | container giữ 1152, **không** kéo giãn; padding ngang trang ≥ 24px |

### Phần GIỮ NGUYÊN từ bản hiện tại (không code lại, không đổi)
1. `TalentConstellation` (khối 3D bên phải hero) và `PortalCard3D` (4 thẻ cổng) — **giữ nguyên component**,
   chỉ đổi lề/section bọc ngoài.
2. Toàn bộ dải gradient sẵn có trong file: hero `#1B2A5E→#27308E→#C44296`, 3 thẻ tính năng,
   khối số liệu, CTA cuối.
3. Cấu trúc 7 khối: nav → hero → thẻ portal → “Nền tảng đa cổng” → “Tại sao FTalentHub?” → CTA → footer.
4. Cơ chế `IntersectionObserver` + class `reveal` (chỉ thay easing/distance theo mục B.10).
5. Nội dung chữ (tiêu đề, mô tả, số liệu “4 cổng / 4 bộ / 6+ / QR tích hợp”).
6. `prefers-reduced-motion` block hiện có.

### Phần THAY ĐỔI so với bản hiện tại (xem mục D — danh sách lý do)

---

## B. MÔ TẢ TỪNG KHỐI (theo thứ tự màn hình)

### B1. Thanh điều hướng (nav) — sticky
- `position: sticky; top: 0; z-index: 50;`
- Cao: **64px** desktop (≥768) · **56px** mobile.
- Nền: `color-mix(in srgb, var(--canvas) 92%, transparent)` + `backdrop-filter: blur(12px)`;
  viền dưới `1px solid var(--line)`; shadow khi cuộn `0 1px 3px rgba(51,50,77,.06)`.
- Bên trong container 1152, `padding: 0 24px` (mobile 20), `align-items: center`.
- **Trái:** logo — `LogoMark size 40` (mobile 32) + `LogoWordmark compact`, gap 8px, radius 10 quanh nhóm.
- **Giữa (chỉ ≥768):** 3 link 14/600 `--ink-soft`, gap 32px, `padding: 8px 0`:
  “Vai trò”, “Tính năng”, “Giá trị”. Hover: `color: --ink` + gạch dưới 2px `--portal`
  (pseudo `after` mở rộng 0→100%, 150ms). Focus: outline 2px `--portal` offset 2.
- **Phải:**
  - ≥768: 2 nút — “Đăng ký” (secondary, h 40, px 16, radius 12, 14/600, viền `--line-control`)
    và “Đăng nhập” (nền `var(--portal)` = `#C44296`, chữ trắng 14/600, h 40, px 16, radius 12;
    hover `--portal-dark`), gap 8px.
  - **<768: CHỈ logo + nút “Đăng nhập” sm (h 36, px 14, 13/600).** (Bỏ `hidden md:flex` đối với
    nút Đăng nhập — bản hiện tại mobile **không có CTA nào**.)
- Không có hamburger cho Landing (trang chỉ có 3 anchor) — giữ gọn.

### B2. Hero (khối lớn đầu trang)
- Nền: `linear-gradient(105deg, #1B2A5E 0%, #27308E 46%, #C44296 100%)` (**giữ nguyên**)
  + **lớp scrim bắt buộc** chồng lên (mục 7.3):
  `linear-gradient(105deg, rgba(27,42,94,.62) 0%, rgba(27,42,94,.40) 55%, rgba(27,42,94,.18) 100%)`.
- Trang trí: 2 đốm bo tròn blur (cam `#F97316` ø 448 opacity .30 ở góc trên-trái, vàng `#FFC107`
  ø 384 opacity .30 góc dưới-phải) + 1 đốm trắng ø 128 opacity .20 — `pointer-events:none; aria-hidden`.
- Padding: `96px 0 112px` (≥1024) · `72px 0 88px` (768–1023) · `56px 0 72px` (<768).
- Bố cục trong container: **grid 2 cột `7fr / 5fr`, gap 48px** ở ≥1024; **1 cột** dưới 1024.
- **Cột trái (chữ):**
  1. **Eyebrow chip:** inline-flex, h 32, px 14, radius 999, gap 8,
     `background: rgba(255,255,255,.12)`, `border: 1px solid rgba(255,255,255,.28)`,
     chữ 12/700 `#ffffff`, icon `Sparkles` 14px. Text: “Hệ sinh thái tài năng đa lĩnh vực”. `margin-bottom: 24px`.
  2. **H1:** 56px/1.05/800/−0,02em `#ffffff` (mobile 36px, 768 → 44px), `margin-bottom: 24px`,
     3 dòng: “Discover Talent” / “Develop Skills” / “Create Future”.
     Dòng 2 tô `linear-gradient(90deg,#FFC107,#F97316)` + `background-clip:text` (**giữ nguyên**;
     tương phản trên nền navy 8,38:1 ✅ / 4,87:1 ✅). Không drop-shadow.
  3. **Đoạn dẫn:** 18px/1.65/400 `#ffffff` (opacity 1 — **không** dùng `text-white/80`), max-width 640,
     `margin-bottom: 32px`. (Nằm trong vùng scrim ≥0,40 → 4,5:1 ✅.)
  4. **3 nút**, gap 16px, `flex-wrap`:
     - “Bắt đầu ngay” → **lg chính**: h 52, px 32, radius 16, 15/700, nền `#ffffff`, chữ `#1B2A5E`,
       icon `ArrowRight` 18, shadow `0 12px 28px rgba(0,0,0,.22)`; hover `translateY(-2px)` + shadow to hơn.
     - “Đăng ký tài khoản” → **lg phụ trên nền tối**: h 52, px 32, radius 16, 15/700,
       `background: rgba(27,42,94,.45)`, `border: 1px solid rgba(255,255,255,.4)`, chữ `#ffffff`;
       hover `background: rgba(27,42,94,.62)`.
     - “Khám phá vai trò” (anchor `#vai-tro`) → như trên nhưng `background: transparent`.
     - Focus: `outline: 2px solid #fff; outline-offset: 2px`.
     - <768: 3 nút **full-width, xếp dọc** (width 100%, gap 12px).
- **Cột phải (≥1024):** hộp `TalentConstellation`
  - `width: 380px`, `height: 460px`, `border-radius: 24px`,
    `background: rgba(255,255,255,.08)`, `border: 1px solid rgba(255,255,255,.25)`,
    `backdrop-filter: blur(8px)`, shadow `0 24px 60px rgba(0,0,0,.30)`.
  - **<1024 ẩn hoàn toàn** (`hidden lg:block`) — giữ nguyên hành vi hiện tại.
  - Nếu WebGL lỗi → `SceneFallback` (đã có trong codebase).

### B3. 4 thẻ cổng (PortalCard3D) — tràn lên hero
- Section: `margin-top: -72px`, `position: relative; z-index: 10`, container 1152.
- **Giữ nguyên component `PortalCard3D`.** Chỉ chốt phần section:
  - Nếu component tự lo lưới → bỏ padding-bottom hero thừa, đảm bảo hero `padding-bottom ≥ 112px`
    để 72px tràn không đè chữ.
  - Yêu cầu với component (nếu pane 2 đụng tới): 4 thẻ, gap 24 (mobile 16), radius 20,
    nền `--surface`, viền `--line`, shadow 2 lớp như mục 4.1, cao tối thiểu 168px,
    trong thẻ có dải màu cổng cao 6px trên cùng, tiêu đề 16/700 `--ink`, mô tả 13/400 `--ink-soft`.
- Responsive: **1 cột <640 · 2×2 640–1023 · 4 cột ≥1024.**

### B4. Section “Nền tảng đa cổng” (`id="tinh-nang"`)
- Padding section: `96px 0 0` (≥768) · `64px 0 0` (<768). `scroll-mt: 88px`.
- **Khối tiêu đề (canh giữa, margin-bottom 48px):**
  - Eyebrow 12/700 uppercase `letter-spacing .1em` màu `var(--portal-dark)` text “TÍNH NĂNG NỔI BẬT”, margin-bottom 12.
  - H2 32/1.2/800 `--ink` (mobile 26) text “Nền tảng đa cổng”, margin-bottom 12.
  - Mô tả 15/1.6 `--muted-strong`, max-width 640, canh giữa.
- **Lưới 3 thẻ**, gap 24 (mobile 16), mỗi thẻ:
  ```
  card-surface · radius 20 · overflow hidden · padding 0 · không padding chung
  [media]  height 192px (mobile 160) · nền gradient có sẵn của thẻ · icon 56px stroke 2 white
           + lớp radial-gradient trắng 10% phía trên
  [body]   padding 24 · title H3 18/700 --ink · margin 8 · desc 14/1.6 --ink-soft
  ```
- Hover: `translateY(-4px)` + shadow `0 16px 36px rgba(51,50,77,.12)` + media `scale(1.03)` (200ms).
- Focus (thẻ có link): outline 2px `--portal` offset −2.
- Responsive: **1 cột <768 (media 160px) · 3 cột ≥768 (media 192px).**
- Nội dung 3 thẻ **giữ nguyên** (Khám phá năng khiếu / Talent Passport / AI phân tích & gợi ý).

### B5. Section “Tại sao FTalentHub?” (`id="gia-tri"`)
- Padding: `96px 0 0` (≥768) · `64px 0 0` (<768). `scroll-mt: 88px`.
- Lưới **2 cột `1fr / 1fr`, gap 48px**, **1 cột <1024** (cột chữ trước, cột số liệu sau).
- **Cột trái:**
  - H2 32/800 `--ink` (mobile 26), margin-bottom 24.
  - 3 mục, gap 16px; mỗi mục là “card phẳng”:
    ```
    background: color-mix(in srgb, var(--canvas-soft) 60%, transparent)
    border: 1px solid var(--line) · radius 16 · padding 20
    title: 16/700 --ink · margin-bottom 4
    body:   14/1.6 --ink-soft
    ```
    (bản hiện tại chữ body dùng `--muted` 3,46:1 ❌ → đổi `--ink-soft` 8,50:1 ✅)
  - Không hover (không bấm được).
- **Cột phải — khối số liệu gradient:**
  ```
  background: linear-gradient(45deg, #A1458F 0%, #9B6AB5 52%, #27308E 100%)   /* giữ nguyên dải màu */
  + scrim: linear-gradient(105deg, rgba(27,42,94,.55) 0%, rgba(27,42,94,.30) 100%)
  border-radius: 24px · padding: 32px · box-shadow: 0 24px 60px rgba(51,50,77,.25)
  ```
  - Tiêu đề “Số liệu nổi bật” 20/800 `#ffffff`, margin-bottom 20.
  - Lưới 2×2, gap 16; mỗi ô:
    ```
    background: rgba(27,42,94,.50) · border: 1px solid rgba(255,255,255,.22) · radius 16 · padding 16
    value: 24/800 #ffffff tabular-nums     label: 12/600 #ffffff (opacity 1)
    ```
    (Bản hiện tại `bg-white/10` + `text-white/70` → nhãn chỉ ~2,5:1 ❌ → đổi như trên ≥ 4,5:1 ✅.)
  - Cạnh dưới: đường kẻ `1px rgba(255,255,255,.22)` + chú 14/1.6 `#ffffff`, margin-top 24, padding-top 24.
  - Responsive: **<768 padding 24, ô số liệu vẫn 2 cột** (giữ 2 cột, giảm gap xuống 12).

### B6. Khối kêu gọi hành động (CTA cuối)
- Section padding: `64px 0 96px` (≥768) · `48px 0 64px` (<768).
- Khối:
  ```
  background: linear-gradient(120deg, #A1458F 0%, #9B6AB5 50%, #27308E 100%)   /* giữ nguyên */
  + scrim: linear-gradient(105deg, rgba(27,42,94,.55) 0%, rgba(27,42,94,.28) 100%)
  border-radius: 32px · padding: 56px (tablet 40, mobile 24)
  box-shadow: 0 24px 60px rgba(51,50,77,.22)
  ```
- Bố cục: **2 cột `1.4fr / 1fr`, canh dưới, gap 32**; 1 cột <768.
  - Trái: H2 32/800 `#ffffff` (mobile 26) margin-bottom 12; mô tả 16/1.6 `#ffffff` (opacity 1), max-width 520.
  - Phải: 2 nút — “Đăng nhập ngay” (lg chính nền trắng chữ `#27308E`) và “Đăng ký tài khoản”
    (lg phụ nền `rgba(27,42,94,.45)` viền `rgba(255,255,255,.4)` chữ trắng); gap 16, `flex-wrap`,
    <768 → full-width xếp dọc.
- Trang trí: 2 đốm trắng blur `rgba(255,255,255,.10)` — `aria-hidden`.

### B7. Footer
- `border-top: 1px solid var(--line)`; nền `color-mix(in srgb, var(--canvas-soft) 40%, transparent)`.
- Padding 40px 0; container 1152; 2 hàng (canh giữa trên mobile):
  - Trái: “Team FPI Cần Thơ · Hệ sinh thái tài năng đa lĩnh vực” 12/500 `--muted-strong`.
  - Phải (≥768): 3 link 12/600 `--ink-soft` gap 24 — “Điều khoản”, “Quyền riêng tư”, “Liên hệ”
    (nếu chưa có route → `<a href="#">` giữ chỗ, pane 2 không tạo route mới).

---

## C. RESPONSIVE (đoạn tổng hợp — xem chi tiết ở từng khối)

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Nav | 56px, logo 32 + nút Đăng nhập sm | 64px, + 3 link, 2 nút | 64px đầy đủ | 64px, container 1152 căn giữa |
| Hero | 1 cột, padding 56/72, H1 36, 3 nút full-width dọc, **ẩn 3D** | 1 cột, padding 72/88, H1 44, nút xếp ngang, **ẩn 3D** | 2 cột 7/5, H1 56, 3D 380×460 | như 1024 |
| Thẻ cổng | `-mt` 40, 1 cột | 2×2, gap 16 | 4 cột, gap 24 | 4 cột |
| Tính năng | 1 cột, media 160, padding section 64 | 3 cột, media 160 | 3 cột, media 192 | 3 cột |
| Tại sao | 1 cột, gap 32 | 1 cột, gap 40 | 2 cột, gap 48 | 2 cột, gap 48 |
| CTA | 1 cột, padding 24, nút dọc | 1 cột, padding 40 | 2 cột, padding 56 | 2 cột |
| Footer | 1 hàng canh giữa, gap 16 | 1 hàng canh giữa | 2 hàng chống | 2 hàng chống |

Không có thanh cuộn ngang ở cả 4 cỡ; ảnh/3D không tràn container.

---

## D. DANH SÁCH THAY ĐỔI CỤ THỂ (pane 2 checklist)

| # | Vị trí | Hiện tại | Chuyển thành | Lý do (tỉ lệ tương phản) |
|---|---|---|---|---|
| D1 | Nav mobile | không có nút nào (`hidden md:flex`) | nút “Đăng nhập” sm luôn hiện | không có CTA trên mobile |
| D2 | Nav nút phụ | viền `border-line` | viền `--line-control #968D82` | 1,39:1 ❌ → 3,27:1 ✅ |
| D3 | Hero | không scrim | + `--scrim-navy` (7.3 của 00) | chữ 14–18px trên gradient 3,08–3,60:1 ❌ |
| D4 | Hero đoạn dẫn | `text-white/80` | `#ffffff` toàn phần opacity 1 | 80% trắng ≈ 3,1:1 ❌ |
| D5 | Hero nút phụ | `bg-white/10` viền `white/30` | nền `rgba(27,42,94,.45)` viền `rgba(255,255,255,.4)` | tăng nền tối sau chữ trắng |
| D6 | Hero H1 | `drop-shadow-sm`, tracking mặc định | bỏ drop-shadow, `tracking-[-0.02em]` | đồng bộ thang chữ mục 2 |
| D7 | Section tiêu đề | chỉ H2 + mô tả | + eyebrow “TÍNH NĂNG NỔI BẬT” | tạo nhịp thị giác mục |
| D8 | Thẻ tính năng | `p-6` chung, media `h-48` | media 192/160px + body `p-24` | tách media/body, chuẩn nhịp |
| D9 | Mục “Tại sao” | body `text-muted` | `--ink-soft` | 3,46:1 ❌ → 8,50:1 ✅ |
| D10 | Khối số liệu | `bg-white/10` + `text-white/70` | nền `rgba(27,42,94,.50)` + chữ trắng 100% | nhãn 12px 2,5:1 ❌ |
| D11 | CTA cuối | không scrim, chữ `white/80` | + scrim, chữ trắng 100% | như D3/D4 |
| D12 | Footer | 1 dòng duy nhất | + 3 link pháp lý (giữ chỗ) | cấu trúc footer thiếu |
| D13 | Toàn trang | body text đôi chỗ `text-muted` | `--ink-soft` / `--muted-strong` | mục 7.2 của 00 |

**Không thay đổi:** dải gradient, nội dung chữ, component 3D, thứ tự khối, `reveal` observer.

---

## E. CHECKLIST NHẬN NGHIỆM TRƯỚC KHI BÁO XONG
- [ ] 390 / 768 / 1024 / 1440: không tràn ngang, không đè chữ, 3D ẩn đúng chỗ.
- [ ] Tab lần lượt qua toàn bộ link/nút: vòng focus thấy rõ ở mọi nền (kể cả hero/CTA).
- [ ] Chữ phụ 12–15px không còn màu `--muted` (dùng `--ink-soft`/`--muted-strong`).
- [ ] Mọi chip/phiếu trên nền gradient là **nền đặc**, không `bg-white/20`.
- [ ] `prefers-reduced-motion: reduce` → hero không bay, `reveal` chỉ đổi opacity.
- [ ] Không hard-code `#C44296` ngoài token (Landing được dùng `var(--portal)`).
