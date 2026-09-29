# ĐẶC TẢ `/enterprise/sponsorships` — `frontend/src/pages/enterprise/Sponsorships.tsx` (Đợt 4 · file 03)

> PANE 1 chỉ thiết kế · **CHỮ THẮNG ẢNH · CON SỐ LÀ CHUẨN · CLASS LÀ GỢI Ý** (00/0.3).
> Nguồn sự thật: `../dot1/00-he-thong-thiet-ke.md` — đọc lại 4.2, 4.3, 4.5, 4.6, 4.7, 4.8–4.11, 5.2, 6, 7.
> Nguồn đã đọc (đọc-ghi, KHÔNG sửa): `pages/enterprise/Sponsorships.tsx` (606 dòng),
> `components/SponsorProjectCard.tsx` (123 dòng — **không nằm `three/**` → P2 sửa được ở Đợt 4**),
> `components/ui.tsx`, `index.css` (`hero-gradient`, `.scrim-navy`, `.input-control`, `.btn-*`),
> `Layout.tsx` (tone Doanh nghiệp `#C44296`).
>
> Trang này có sẵn: hộp thoại xác nhận có focus trap + Esc + trả focus (đúng 00/4.11 — **giữ nguyên
> phần logic**), toast `animate-slide-in` (đã có reduced-motion trong `index.css` — giữ), helper
> `dinhDangTien`/`tinhPhanTram`/`nhanNutTaiTro` (nghiệp vụ đúng — **không đổi**).

**Quyết định chung G1–G11 ở `README.md`.**

---

## A. TRẠNG THÁI TRANG (3 nhánh + 2 nhánh khối)

### A1. Đang tải (Skeleton — 00/4.9)
`aria-busy="true"` + chữ `Đang tải tài trợ…` 14/400 `--muted-strong`.

| Vị trí | Skeleton |
|---|---|
| PageHeader | 260×28 + 100%×14 |
| Banner tổng | 1 khung **100%×104** |
| Hàng bộ lọc | 2 khung **200×44** + 1 khung **120×44** |
| Lưới dự án | 3 khung **100%×300** (≥1280) / 2 (≥640) / 1 (còn lại) — số khung = số cột thật |
| Form tài trợ | 1 khung **100%×240** |
| Lịch sử | 1 khung **100%×240** (title + 4 dòng) |

### A2. Lỗi — **TÁCH 3 LOẠI (sửa lỗi thật đang có)**

| Loại | Hiện tại | **Chốt** |
|---|---|---|
| **Lỗi tải danh sách tài trợ** (`load()` → `error`) | `if (error) return <ErrorBox/>` → mất PageHeader + toàn trang | `PageHeader` + `<ErrorBox message retryLabel="Thử lại" onRetry={load}/>` dưới header; không render khối dữ liệu khi `data === null` |
| **Lỗi thao tác** — `handleDelete` catch đang `setError` → **bấm Xóa lỗi là mất cả trang** | `setError(...)` | **chuyển sang `showToast("error", …)`** (đã có sẵn), trang giữ nguyên. `error` chỉ còn dành cho `load()` |
| **Lỗi khối lưới dự án** (`loiDuAn`) | box tự làm: chữ **đỏ toàn bộ** `text-red-700` (00/4.10 cấm) + bọc trong `Card` thừa | thay bằng `<ErrorBox message="Chưa tải được danh sách dự án." retryLabel="Tải lại danh sách" onRetry={loadProjects} />` — **không bọc `Card`** (ErrorBox đã là hộp), đặt ngay dưới hàng bộ lọc |

- Lỗi form/mời/đạt mục tiêu → **toast** (đang đúng — giữ).
- Khi `loiDuAn`: banner dòng phụ đổi thành `"Chưa tải được danh sách dự án."` (không hiện “trên 0 dự án” — sai số liệu).

### A3. Rỗng (4 trường hợp)

| Trường hợp | Thiết kế |
|---|---|
| `projects.length > 0` nhưng `filteredProjects.length === 0` (đang có filter) | `<Empty text="Không tìm thấy dự án phù hợp với bộ lọc." icon={<Search size={32}/>} action={<button className="btn-secondary h-9 px-3.5 text-[13px]">Bỏ lọc</button>}/>` — nút xóa `filterField` + `filterStatus` |
| `projects.length === 0` (không lỗi) | `<Empty text="Chưa có dự án nào kêu gọi tài trợ." icon={<Rocket size={32}/>} />` (không nút) |
| `data.length === 0` (lịch sử rỗng) | `<Empty text="Chưa có tài trợ nào — chọn dự án và bấm “Xác nhận tài trợ” để bắt đầu." icon={<HandCoins size={32}/>} />` (thay box tự làm `text-muted` 3,46 ❌) |
| `data = []` mà `projects > 0` | banner vẫn hiện (tổng = 0 đ) — dòng phụ `"trên N dự án"` vẫn đúng |

---

## B. MÔ TẢ KHỐI THEO THỨ TỰ MÀN HÌNH

### B0. Toast (fixed góc trên phải — xuất hiện trước trong DOM)

| # | Hiện tại | **Chốt** (00/4.11) |
|---|---|---|
| 1 | `rounded-xl` (17,6) · `px-4 py-3` · `shadow-lg` · rộng tự nhiên | **radius 16 · padding 16 · shadow `0 12px 32px rgba(51,50,77,.16)` · rộng 320px** (`calc(100vw - 32px)` < 400) |
| 2 | nền `bg-emerald-50` / `bg-red-50` + viền cùng họ + **toàn bộ chữ màu** | nền **`--surface`** · viền **`--line`** · chữ **`--ink`** (chữ màu là lỗi 4.10-style: màu chỉ dành cho icon/tiêu đề) |
| 3 | icon 18 kế thừa màu chữ | icon 18 **`#047857`** (thành công) / **`#B91C1C`** (lỗi) — giữ đúng màu, tách khỏi màu chữ |
| 4 | 1 dòng 14/500 | **tiêu đề = message 14/700 `--ink`** (không có mô tả → bỏ dòng 13/400, không bịa nội dung) |
| 5 | container `aria-live="polite"` + mỗi toast `role="alert"` | **giữ container `aria-live="polite"`**, **bỏ `role="alert"` trên từng toast** — tránh đọc kép (live region đã announce) |
| 6 | `animate-slide-in` + biến mất 4s | **giữ nguyên** (index.css đã có reduced-motion cho `.animate-slide-in`) |

### B1. Hộp thoại xác nhận (Dialog) — **giữ nguyên logic** (focus trap, Esc, trả focus)

| # | Hiện tại | **Chốt** |
|---|---|---|
| 1 | overlay `bg-black/50` | **`rgba(27,42,94,.45)`** (00/4.11 overlay) |
| 2 | panel `rounded-2xl` (17,6) · `p-6` · `max-w-md` | **radius 20 · padding 24 · max-width ≤560** (`max-w-md` = 448 ✅ giữ) |
| 3 | `h3 font-semibold` (16/600) | **18/700 `--ink`** (00/4.11) |
| 4 | body `text-sm text-muted` (3,46 ❌) | **14/400 `--ink-soft`** (8,50 ✅) |
| 5 | nút Hủy: `rounded-xl border-line text-muted px-4 py-2` (~40px, 2 lỗi màu) + `ring-slate-400` | **`btn-secondary`: h 44 · radius 12 · viền --line-control · chữ 14/600 --ink** · focus `outline 2px --portal / offset 2` (00/7.6 — bỏ ring-slate) |
| 6 | nút Xác nhận: `cta-gradient` trần (**3,67:1 ❌**) + `disabled:opacity-50` | **`btn-primary`: h 44 · radius 12 · 14/600 · nền --btn-primary-bg (4,61 ✅)** · disabled theo 00/4.2 (`.55` + attribute thật) |
| 7 | khoảng cách title→body→hàng nút (`mb-4/mb-6`) | title → body **16** · body → hàng nút **24** (00/4.11 “hành động cách 24px”) · gap 2 nút **8** |
| 8 | `role="dialog" aria-modal aria-labelledby` + focus trap + Esc + trả focus | **giữ nguyên 100%** — đúng 00/4.11 |

### B2. `PageHeader`
- Bỏ **“(slide 31)”** → `"Đầu tư vào các dự án sáng tạo của học sinh sinh viên."` (G1)
- Bỏ comment `{/* Banner tổng (slide 31) */}` / `{/* Lưới dự án (slide 31) */}`.

### B3. Banner tổng

| # | Hiện tại | **Chốt** |
|---|---|---|
| 1 | nền `hero-gradient` trần, chữ 11–12px | **`background-image: var(--scrim-navy), var(--hero-gradient)`** (giống `dot3/01` C2) — chữ 12px trên gradient 2,5–3,4:1 ❌ → **≥5,37:1 ✅** (00/7.3) |
| 2 | radius `rounded-2xl` (17,6) · `p-5` · `mb-6` | **radius 20** · padding **20 (<768) / 24 (≥768)** · **margin-bottom 32** (00/5.2) |
| 3 | icon chip `bg-white/20` + icon trắng (2,52:1 ❌) | nền **`#ffffff` đặc** · icon **`--portal-dark`** (7,51 ✅) — đúng 00/7.3.3 · `h-12 w-12` giữ |
| 4 | label `text-[11px] text-white/75` | **12px · `#ffffff` (opacity 1)** · uppercase tracking giữ — 11px < 12 ❌ |
| 5 | số tiền `text-2xl sm:text-xl md:text-2xl` (20px ở sm) | **`text-2xl` (24/800) mọi cỡ** · `tabular-nums` giữ — trong vùng scrim, ≥4,5 ✅ |
| 6 | dòng phụ `text-xs text-white/80` | **12/400 `#ffffff`** + **đổi chữ cho đúng nghĩa con số**: `"Chỉ tính tài trợ đã duyệt · trên {projects.length} dự án"` (tổng chỉ cộng `status === "approved"` — nêu rõ để không hiểu nhầm) |
| 7 | `hover:shadow` trên `role="region"` | **bỏ hover** (khối không bấm được — G5) |
| 8 | animation `fadeUp` inline | **`.reveal-up`** (G4) |

### B4. Hàng bộ lọc dự án
```
flex flex-wrap gap-4 (16) · margin-bottom 16 · role="search" aria-label giữ
```

| # | Hiện tại | **Chốt** |
|---|---|---|
| 1 | 2 select `rounded-xl border-line pl-9/pr-8 py-2` (~40px, viền 1,39 ❌) | **`.input-control`** h44 r12 `--line-control`; icon Filter 16 giữ `--muted` (icon 3,46 ✅) |
| 2 | option trạng thái hiện **tiếng Anh thô** (`active/completed/pending/archived`) | **nhãn tiếng Việt**: `active → "Đang hoạt động"` · `completed → "Hoàn thành"` · `pending → "Đang chờ"` · `archived → "Đã lưu trữ"` (giá trị value giữ nguyên để `loadProjects` không đổi) |
| 3 | nút “Bỏ lọc” `rounded-xl border-line text-muted` (h~40 · 2 lỗi màu) + `ring-slate-400` | **`btn-secondary h-11 px-5`** (44 · r12 · `--line-control` · 14/600 `--ink`) · icon X 14 + gap 8 · focus `--portal` |

### B5. Lưới dự án + `SponsorProjectCard.tsx` (component sửa được)

**Phần trong `Sponsorships.tsx` (B5a):**

| # | Hiện tại | **Chốt** |
|---|---|---|
| 1 | lưới `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch` | giữ **1 cột <640 · 2 cột 640–1279 · 3 cột ≥1280** + đổi gap → **`gap-4 sm:gap-6`** (16/24 — 00/5.2) · `items-stretch` + `role="list"` **giữ** |
| 2 | lỗi/rỗng tự làm trong `<Card>` | thay bằng `ErrorBox` / `Empty` (A2, A3) — **không bọc Card** |

**Phần trong `SponsorProjectCard.tsx` (B5b — sửa nhỏ, có lý do):**

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | thẻ ngoài | `rounded-xl` (17,6) | **radius 20** (00/4.1 — cùng `Card`) · `h-full` + hover-lift **giữ** (thẻ bấm được) |
| 2 | `h3` tiêu đề | `font-bold` (16/700) | **17/700 (<768) · 18/700 (≥768)** `--ink` (00/9 tiêu đề card) |
| 3 | dòng chủ nhiệm/số thành viên | `text-xs text-muted` (3,46 ❌) | **12/400 `--muted-strong`** (5,01 ✅) |
| 4 | chip “✨ Tiềm năng” | **mọi thẻ đều dán cùng 1 nhãn** (`pink-50`/`pink-600` 11px) → không truyền tin nào, 11px < 12 ❌, màu ngoài bảng | **thay bằng chip LĨNH VỰC** lấy từ dữ liệu `duAn.field` (đã có `FIELD_NAMES` trong file): `h 24 · radius 999 · 12/600 · nền --canvas-soft · viền 1px --line-strong · chữ --ink-soft` (tone trung tính 8,1 ✅, 00/4.3) · bỏ luôn `aria-label="Dự án tiềm năng"` (sai sự thật) |
| 5 | dòng tiền `X / Y đ` | `text-xs font-semibold text-ink` (12) | **13/600 `--ink-soft`** (00/4.5 nhãn trái) · `tabular-nums` |
| 6 | dòng % | `text-xs font-bold text-emerald-600` (**3,77:1 ❌** — 00/7.4 cấm) | **13/700 `--ink` `tabular-nums`** (00/4.5 nhãn phải) — % đã là tín hiệu chữ (00/7.7), không cần xanh |
| 7 | thanh tiến độ | track `bg-canvas-soft` + `shadow-inner` · fill `hero-gradient` · `hover:brightness-110` | track **`--line`** · bỏ `shadow-inner` · fill **`linear-gradient(90deg,#EC4899,#8B5CF6)`** (00/4.5 — `hero-gradient` không phải gradient tiến độ) · cao **8** giữ · **bỏ hover** trên fill · `role="progressbar" aria-*` **giữ nguyên** |
| 8 | pill “Đã đạt mục tiêu” | `bg-emerald-50 text-emerald-700 text-sm py-2` | 2 màu **đúng** tone thành công 00/4.3 → chỉ chốt **h 24 · radius 999 · 12/600** · `role="status"` giữ |
| 9 | dòng phụ (`dongPhu`) | `text-xs text-muted` (3,46 ❌) | **12/400 `--muted-strong`** · `min-h-5` **giữ** (bất biến: chân thẻ thẳng hàng) |
| 10 | nút “Tài trợ ngay” / “Tiếp tục tài trợ” | `rounded-full cta-gradient py-2` (~40px, **3,67:1 ❌**) | **`btn-primary` h 44 · radius 12 · 14/600 · nền --btn-primary-bg (4,61 ✅)** · `aria-label` theo `nhanNutTaiTro` **giữ** · `w-full` giữ |
| 11 | nút “Xem chi tiết” | `rounded-full border-line py-2` (40px, viền 1,39 ❌) | **h 44 · radius 12 · viền --line-control · 14/600 --ink** (00/4.2 phụ) |
| 12 | helper `dinhDangTien` / `tinhPhanTram` / `nhanNutTaiTro` | — | **KHÔNG ĐỔI** (nghiệp vụ + định dạng tiền đúng yêu cầu) |

### B6. Card “Tài trợ dự án mới / Chỉnh sửa”

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | Card + `h2` | có `hover:shadow` · `font-semibold` (16/600) | bỏ hover (G5) · **17/700 <768 · 18/700 ≥768** · icon Rocket 18 `--portal` giữ (4,60 ≥3 ✅) |
| 2 | Lưới form | `grid-cols-1 md:grid-cols-4 gap-3` · project `col-span-2` · amount `col-span-1` · conditions `col-span-4` · **submit `col-span-1` + `h-full`** | `gap-4` · **project `md:col-span-2` · amount `md:col-span-2`** (lấp đầy hàng 1) · conditions `md:col-span-4` · **submit `md:col-span-4 justify-self-end self-end`** — *lý do bằng số*: submit hiện nằm cột 1 của lưới 4 cột; tại 1024 cột = (696−48−48)/4 ≈ **150px**, trong khi nút (icon 15 + gap 8 + chữ “Xác nhận tài trợ” 14/600 ≈ 110 + padding 40) ≈ **173px → tràn**. Đưa sang hàng riêng canh phải: không bao giờ tràn ở mọi cỡ |
| 3 | label | `text-sm font-medium text-ink` (14/500) | **13/600 `--ink-soft` · margin-bottom 6** (00/4.6) |
| 4 | dấu `*` bắt buộc | `text-red-500` (3,76 ❌ ở 14px) | **`#B91C1C`** (6,4 ✅) · giữ `aria-required` + `required` |
| 5 | input/select | `px-3 py-2 rounded-xl border-line` (~40px, 1,39 ❌) | **`.input-control`** h44 r12 `--line-control` · placeholder 14 `--muted-strong` (class lo) · giữ `inputMode="numeric"` + `autoComplete="off"` |
| 6 | nút submit | `rounded-full cta-gradient … h-full` (3,67 ❌, cao bằng ô lưới → lệch đáy) | **`btn-primary` · h 44 · radius 12 · 14/600 · `self-end`** (đáy thẳng hàng ô nhập) · spinner + `aria-busy` giữ · disabled (`!projectId \|\| submitting`) giữ attribute thật, **bỏ `disabled:opacity-50`** |
| 7 | nút “Hủy chỉnh sửa” | `text-sm text-muted` (3,46 ❌) + `ring-slate-400` | **14/600 `--ink-soft` · underline khi hover** · focus `--portal` |
| 8 | dòng thông tin dự án đã chọn | `text-xs text-muted` (3,46 ❌) | **12/400 `--muted-strong`** + **bổ sung số liệu** (dùng helper có sẵn): `"Chủ {owner} · {n} thành viên · đã nhận {dinhDangTien(sponsored_total)}/{dinhDangTien(funding_goal)} ({tinhPhanTram(...)}%) · còn thiếu {dinhDangTien(max(0,goal−total))}."` · `aria-live="polite"` giữ |
| 9 | dòng chú thích cuối | `text-xs text-muted-light` (2,09 ❌) | **12/400 `--muted-strong`** |
| 10 | khoảng cách giữa 3 khối chính (banner → lưới → form → lịch sử) | `mb-6` (24) | **32** (00/5.2) |

### B7. Card “Lịch sử tài trợ”

| # | Vị trí | Hiện tại | **Chốt** |
|---|---|---|---|
| 1 | `h2` | 16/600 | **17/700 <768 · 18/700 ≥768** |
| 2 | dòng tóm tắt | **không có** | thêm 14/400 `--ink-soft`, `margin-bottom 12`: **`"{n} lượt tài trợ · đã duyệt {sum approved} · chờ duyệt {sum pending}."`** (tính từ `data` — trả lời “rồi sao?” của bảng) |
| 3 | `<table role="grid">` | có | **bỏ `role="grid"`** · wrapper `overflow-x-auto` + `role="region" aria-label tabIndex={0}` |
| 4 | `<thead>` | `text-muted-light text-xs uppercase … border-b border-line` | **12/700 `--muted-strong` · tracking .06em · border-b --line-strong · padding 10/12** · cột Số tiền/Trạng thái/Ngày/Thao tác `text-right` (Trạng thái giữ center nếu muốn — chốt: **right**) |
| 5 | ô Lĩnh vực | `text-muted` + `d.field.replace("_"," ")` + `capitalize` → **“Hoc thuat” thiếu dấu** | dùng **`FIELD_NAMES[d.field] ?? d.field`** (bản map có sẵn trong file) · màu **14/400 `--ink`** |
| 6 | ô Điều kiện | `text-muted-light max-w-xs truncate` (2,09 ❌) | **14/400 `--muted-strong`** · giữ `title` (rỗng → `"—"` 14 `--muted` — 00/4.7) |
| 7 | ô Ngày | `text-muted-light` | **14/600 `--muted-strong` `tabular-nums`** |
| 8 | ô Số tiền | `font-semibold text-ink` + icon DollarSign 12 | **14/600 `--ink` `tabular-nums` phải** · icon `--muted-strong` |
| 9 | Badge trạng thái | approved = `--portal-soft/--portal-dark` · pending = `bg-portal text-white` (sai tone) | **approved → tone thành công `#ECFDF5/#047857` (5,4 ✅)** · **pending → tone cảnh báo `#FFF7ED/#9A3412` (6,9 ✅)** — 00/4.3 gán tone theo nghĩa trạng thái; cả hai **h 24 · radius 999 · 12/600** + tiền tố chữ (7.7) |
| 10 | nút Sửa | `border-line px-2 py-1` (~30px, 1,39 ❌) | **≥768: 36×36 · radius 12 · viền --line-control** (00/4.2 sm) · **<768: 44×44** (00/7.8) · `aria-label` giữ |
| 11 | nút Xóa | `bg-red-50 text-red-600` + `ring-red-500` | tone nguy hiểm: nền **`#FEF2F2`** · chữ/icon **`#B91C1C`** (6,4 ✅) · hover: nền **`#B91C1C`** chữ **`#ffffff`** (đậm dần, đúng tinh thần 00/4.2) · **focus `--portal`** (00/7.6 — vòng focus không đổi theo màu nút) · size như mục 10 |
| 12 | hàng | `hover:-translate-y-0.5` | **bỏ translate** · hover `bg-portal-soft/40` · min-height 44 · padding 12 |
| 13 | `window.confirm` khi xóa | có | **GIỮ NGUYÊN** (hộp của trình duyệt có focus/keyboard sẵn; đổi sang hộp tùy biến là mở rộng phạm vi — xem mục “Chỗ không chắc”) |

---

## C. SỐ LIỆU & “RỒI SAO?”

| Khối | Con số thật | Câu trả lời “rồi sao?” |
|---|---|---|
| Banner | **tổng đã tài trợ (đã duyệt)** + số dự án | thấy quy mô → hành động tiếp là chọn dự án ở lưới dưới |
| Lưới dự án (`SponsorProjectCard`) | `đã nhận / mục tiêu` · `%` · `còn thiếu` (hoặc “Đã đạt mục tiêu”) | **nút theo tiến độ**: 0% → “Tài trợ ngay” · 1–99% → “Tiếp tục” · 100% → chặn (đã có nghiệp vụ) — số dẫn đến việc |
| Form (dòng thông tin dự án) | chủ · thành viên · đã nhận/mục tiêu · % · **còn thiếu** (mới) | biết chính xác số tiền cần trước khi bấm Xác nhận |
| Lịch sử | dòng tóm tắt **mới**: n lượt · đã duyệt X · chờ Y | biết được bao nhiêu tiền THẬT đã chạy |
| Progressbar `aria-valuenow` | % | giữ nguyên (7.7: % là chữ, không chỉ màu) |

---

## D. RESPONSIVE — 390 / 768 / 1024 / 1440

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Banner | 1 hàng (icon 48 + khối chữ, wrap được), padding 20 | 1 hàng, padding 24 | 1 hàng | 1 hàng |
| Bộ lọc | xếp chồng `flex-wrap` (2 select + nút, gap 16) | như 390 | như 390 | như 390 |
| Lưới dự án | **1 cột** | **2 cột** (gap 24) | 2 cột | **3 cột** |
| Form | **1 cột** (nút full-width) | **4 cột**: project(2) + amount(2) / conditions(4) / submit(4, canh phải) | như 768 (cột ≈150px — đã có phương án B6-2) | như 768 (cột ≈250px) |
| Lịch sử | **danh sách thẻ (D1)** | **bảng** 7 cột + region cuộn | bảng (không `min-w`, cột dài truncate + title) | bảng full |

**→ Chốt breakpoint “đổi từ lưới sang danh sách dọc”:**
- **Bảng lịch sử → danh sách thẻ dọc khi `< 768px`** (00/4.7).
- **Lưới dự án: 1 cột <640 · 2 cột 640–1279 · 3 cột ≥1280** (không đổi so với code — số liệu đã chốt).
- **Form: 1 cột <768 · 4 cột ≥768** (giữ cấu trúc cột, chỉ đổi span như B6-2).

### D1. Bảng lịch sử → danh sách thẻ (< 768)
```
card: radius 16 · border 1px --line · background --surface · padding 16 · margin-bottom 12
hàng 1: tên dự án 14/600 --ink (flex-1, wrap)  ……  badge trạng thái (B7-9)
hàng 2: “Lĩnh vực” …… FIELD_NAMES 14/600 --ink
hàng 3: “Số tiền” …… {dinhDangTien} 14/700 --ink tabular-nums
hàng 4: “Điều kiện” …… nội dung 14/400 --ink-soft (rỗng → “—”)
hàng 5: “Ngày” …… {created_at} 14/600 --muted-strong tabular-nums
chân:   justify-end gap-8 → 2 nút 44×44: Sửa (secondary) · Xóa (tone nguy hiểm, B7-11)
```

---

## F. CHECKLIST SP1–SP19

| # | Khối | Việc phải làm | Nguồn |
|---|---|---|---|
| SP1 | PageHeader + comment | Bỏ “(slide 31)” (subtitle + 2 comment) | G1 |
| SP2 | Lỗi | `error` → PageHeader + `ErrorBox retry onRetry`; **`handleDelete` lỗi → toast** (không `setError`); `loiDuAn` → `ErrorBox` bỏ bọc Card | 00/4.10, G2 |
| SP3 | Tải | `<Loading/>` → Skeleton đúng 6 khối (A1) + `aria-busy` + chữ | 00/4.9 |
| SP4 | Rỗng | 3 `Empty` (A3) + nút “Bỏ lọc” khi lọc rỗng | 00/4.8 |
| SP5 | `<style>` cục bộ | bỏ `fadeUp` trùng → `.reveal-up`; bỏ reset `*` reduced-motion; bỏ keyframe `scaleIn` chết (không JSX nào dùng) | 00/7.8, G4 |
| SP6 | Toast | radius 16 · padding 16 · rộng 320 · shadow chuẩn · nền `--surface` viền `--line` · icon màu riêng · tiêu đề 14/700 `--ink` · bỏ `role="alert"` từng toast | 00/4.11 |
| SP7 | Dialog | overlay navy .45 · radius 20 · title 18/700 · body `--ink-soft` · 2 nút `btn-secondary`/`btn-primary` h44 r12 · focus `--portal` · **giữ focus trap/Esc/trả focus** | 00/4.11/7.6 |
| SP8 | Banner | +`--scrim-navy` chồng `hero-gradient` · radius 20 · padding 20/24 · icon chip nền trắng+`--portal-dark` · label 12 trắng · số 24/800 · dòng phụ 12 trắng + “Chỉ tính đã duyệt” · bỏ hover · `reveal-up` | 00/7.3/5.2 |
| SP9 | Banner | khoảng cách khối chính = **32** (3 chỗ `mb-6` → `mb-8`) | 00/5.2 |
| SP10 | Bộ lọc | 2 select `.input-control` h44 · option trạng thái tiếng Việt · nút “Bỏ lọc” `btn-secondary h-11` · gap 16 | 00/4.6 |
| SP11 | Lưới dự án | gap → `gap-4 sm:gap-6`; lỗi/rỗng → `ErrorBox`/`Empty` không bọc Card | 00/5.2/4.8 |
| SP12 | `SponsorProjectCard` | B5b 1–9: radius 20 · title 17/18 · meta `--muted-strong` · **chip lĩnh vực thay “✨ Tiềm năng”** · dòng tiền 13/600–13/700 `--ink` · track `--line` fill gradient 00/4.5 · pill 24/600 · `dongPhu` `--muted-strong` | 00/4.1/4.3/4.5/7.4 |
| SP13 | Nút thẻ dự án | primary h44 r12 `btn-primary` (4,61) · secondary h44 r12 `--line-control` · bỏ `rounded-full`/`cta-gradient` trần | 00/4.2/7.4/7.8 |
| SP14 | Form | label 13/600 · `*` `#B91C1C` · `.input-control` 3 ô · span mới (project 2 + amount 2 / conditions 4 / submit 4 canh phải `self-end`) · submit `btn-primary` h44 · 2 dòng chú thích `--muted-strong` · dòng selected + số liệu mới | 00/4.6, B6-2 |
| SP15 | Lịch sử | dòng tóm tắt mới · bỏ `role="grid"` + region · header chuẩn · `FIELD_NAMES` · badge tone 4.3 · nút Sửa/Xóa 36 (44 ở <768) tone + focus `--portal` · bỏ translate hàng · **giữ `window.confirm`** | 00/4.3/4.7 |
| SP16 | Responsive | <768 lịch sử → **thẻ D1** · lưới 1/2/3 cột · form 1/4 cột | 00/4.7/5.2 |
| SP17 | Animation | mọi `style={{animation:"fadeUp…"}}` → class `reveal-up` (+ delay 0/0,06/0,12 nếu xếp tầng, không quá 0,3) | G4 |
| SP18 | Không đổi | `dinhDangTien`/`tinhPhanTram`/`nhanNutTaiTro`/logic đạt 100% chặn tài trợ/scrollIntoView/focus trap | — |
| SP19 | Đo | 4 cỡ 390/768/1024/1440: không tràn form (đặc biệt submit @1024), banner ≥5,37:1 với chữ 12, bảng ≥768 cuộn region | 00/7.1 |

---

## G. BẢNG ĐỐI CHIẾU SỐ ĐO

| Thành phần | Số chuẩn |
|---|---|
| Banner | radius **20** · padding **20/24** · scrim `--scrim-navy` chồng `--hero-gradient` · label 12 · số **24/800** · icon chip 48 nền `#ffffff` icon `--portal-dark` |
| Ô nhập/select/form | h **44** · radius **12** · viền `--line-control` · label **13/600 `--ink-soft`** cách ô **6** |
| Nút | primary h44 r12 14/600 `--btn-primary-bg` (4,61) · secondary h44 r12 `--line-control`/`--ink` · nút icon bảng 36 (44 <768) radius 12 |
| Badge trạng thái | h **24** · radius **999** · 12/600 · thành công `#ECFDF5/#047857` · cảnh báo `#FFF7ED/#9A3412` · nguy hiểm `#FEF2F2/#B91C1C` |
| Thanh tiến độ | cao **8** · track `--line` · fill `linear-gradient(90deg,#EC4899,#8B5CF6)` · nhãn 13/600 + 13/700 |
| Toast | **320px** (`calc(100vw−32)` mobile) · radius **16** · padding **16** · shadow `0 12px 32px rgba(51,50,77,.16)` · viền `--line` |
| Dialog | overlay `rgba(27,42,94,.45)` · radius **20** · padding **24** · title **18/700** · hành động cách **24** |
| Lưới dự án | 1 cột <640 · 2 cột 640–1279 · 3 cột ≥1280 · gap **16/24** |
| Bảng (≥768) | header 12/700 `--muted-strong` + `--line-strong`, padding 10/12 · hàng 44/12 · cột số 14 phải `tabular-nums` |
| Thẻ <768 (lịch sử) | radius **16** · padding **16** · gap **8** · margin-bottom **12** · nút 44 |
| Khối chính | PageHeader → khối đầu **24** · khối ↔ khối **32** · hàng phụ **16** |
