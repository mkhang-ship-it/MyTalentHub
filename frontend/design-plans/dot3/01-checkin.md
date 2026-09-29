# ĐẶC TẢ `/student/checkin` — `frontend/src/pages/student/Checkin.tsx` (Đợt 3 · file 01)

> ⚠️ **ẢNH `refs/01-checkin.svg` CHỈ ĐỂ XEM HÌNH DẠNG — chữ thắng ảnh.**
> Đọc `../dot1/00-he-thong-thiet-ke.md` trước (đặc biệt 4.3, 4.8–4.11, 7.1–7.8).
> **NGUYÊN TẮC ĐẦU FILE 00: CON SỐ LÀ CHUẨN, CLASS LÀ GỢI Ý.**
> **Không thêm token màu mới ở đợt này** — mọi màu đều là token/hợp chất đã có ở 00 (xem mục E).

**Phạm vi:** `frontend/src/pages/student/Checkin.tsx` (+ `ui.tsx`/`index.css` nếu cần class).
**CẤM:** sửa `frontend/src/components/qr/**` và `frontend/src/components/three/**`.

---

## ⚠️ RÀNG BUỘC SỐ 1 — MÃ QR (đọc trước, không được phá)

Checkin dùng **mã QR thật** do P2 viết tay: `maHoaQR` (ISO/IEC 18004) → `qrSvg.ts` → `<QrCode>`,
chu kỳ `CHU_KY_MA_GIAY = 120`. Ba ràng buộc kỹ thuật (KHÔNG phải sở thích thẩm mỹ):

| # | Ràng buộc | Nguồn | Hậu quả nếu sửa |
|---|---|---|---|
| QR1 | **Ô module ≥ 2px** — `Math.max(2, floor(kichThuoc / (n + leTrang*2)))` | `QrCode.tsx` dòng 48, `qrSvg.ts` dòng 21 (`throw` nếu `< 2`) | Mã không quét được, **code lỗi** |
| QR2 | **Lề trắng ≥ 4 module** (`leTrang = 4`) | `qrSvg.ts` dòng 22 | Mã không quét được |
| QR3 | Nền trắng đặc `#ffffff` + module `#111111`, không filter/transform/độ mờ | `qrSvg.ts` dòng 24–25 | Camera không đọc được |

**Số liệu ước tính để đối chiếu (P2 mở devtools đo lại, KHÔNG suy ra để sửa):**
- Check-in: `kichThuoc={184}` → mã ~58 ký tự URL (V4) → 41 module+ lề → ô ≈ **4px**, SVG ≈ **164px** (nếu V5: ≈180px). Cách xa ngưỡng → **an toàn, giữ 184.**
- Hộp QR trong thẻ passport dùng `kichThuoc={112}` (file 02): ô rơi đúng **2px — SÀN TỐI THIỂU**, tuyệt đối không giảm thêm.

**Những gì ĐƯỢC phép đổi (thẩm mỹ, không đụng 3 ràng buộc trên):** khung trắng quanh mã
(`figure` `bg-white p-3`), bo góc, chú thích, vị trí trong card, nền/gradient bên ngoài khung.
**Những gì CẤM:** sửa `kichThuoc`, `leTrang`, `mucSuaLoi`; CSS `transform: scale`, `width/height`
ghi đè kết quả `ketQua.rong`; `filter`, `opacity` lên SVG; cắt góc bằng `border-radius` lớn hơn
lề trắng; đặt mã trên nền màu **không** có khung trắng.

---

## ⚠️ RÀNG BUỘC SỐ 2 — NHẤT QUÁN VỚI 2 TRANG CÔNG KHAI

QR của học sinh chứa URL công khai `/checkin?code=...` → người quét mở `CheckinScan.tsx`.
Hai trang công khai (`CheckinScan`, `VerifyPassport`) **thuộc phạm vi đợt sau** nhưng phải cùng
ngôn ngữ thị giác → đặc tả chung ở **`03-trang-cong-khai.md`**. Quyết định chốt ở đây:
cùng H1 24/800, cùng card `radius 20 · padding 24 · max-width 448`, cùng `btn-primary`,
cùng `ErrorBox`/tone 4.3 — để người quét không thấy “hai sản phẩm”.

---

## A. Khung trang & trạng thái

Giữ nguyên: API `GET /passport/:id` (lấy mã nguồn), `GET /student/checkins`,
`POST /student/checkin?qr_code=…`, `layMaNguon/taoMaCheckin/tinhCuaSoHienTai/giayConLai`,
đồng hồ `setInterval 1000ms`, cờ `daDung`, `loiTiengViet`, mọi `data-testid`.

| Nhánh | Điều kiện | Mục |
|---|---|---|
| Đang tải mã QR | `maHienTai === "" && loiNguon === ""` | B6 |
| Lỗi mã nguồn | `loiNguon !== ""` | B6 |
| Bình thường | có mã | B1–B5 |
| Lỗi nộp check-in | `error !== ""` | B7 |
| Lịch sử: tải / rỗng / lỗi | theo `history`, `historyError` (mới) | B8 |

---

## B. MÔ TẢ KHỐI THEO THỨ TỰ MÀN HÌNH

### B1. `PageHeader`
- title `Check-in hoạt động` — H1 **24/800 (mobile 22)** `--ink`.
- subtitle: **bỏ “(slide 14)”** khỏi text hiển thị → `Quét mã QR tại buổi sinh hoạt để tự động cộng giờ trải nghiệm — thật nhanh, không cần giấy tờ.` (14/1.6 `--muted-strong`, `PageHeader` đã làm sẵn).
- `margin-bottom: 24` (do `PageHeader`).

### B2. Lưới 2 cột
```
grid-cols-1 · md:grid-cols-2 · gap-4 md:gap-6   (ĐỔI từ gap-6 cố định — 00/3: 16 mobile / 24 ≥768)
cột trái: thẻ QR (B3)   ·   cột phải: thông báo lỗi + lịch sử + cách hoạt động (B5–B8)
```
*Lý do đổi sang `md:`:* tại 768px, cột mỗi bên = (768 − 2×24 − 24)/2 = **348px** — vừa khung QR
184 + padding 48 (232px) với dư 116px cho cột phải; dùng `lg:` thì 768–1023 chỉ có 1 cột, phí chiều ngang.

### B3. Thẻ QR (cột trái) — khối chính
```
radius 20 (VIẾT rounded-[20px], KHÔNG rounded-2xl = 16) · padding 24 · text-align center
BỎ `interactive` (thẻ không phải vùng bấm — 00/4.1)
background-image: var(--scrim-navy), var(--hero-gradient)   ← THÊM scrim (00/7.3)
   (scrim-navy đã có sẵn trong index.css: navy .62 → .40 → .18 theo 105deg)
```
> **Tương phản (phép tính, giữ cách làm đợt 1):**
> - Chữ trắng/85 14px trên `#EF4580` (điểm giữa gradient): trắng 85% blend → `#FDE3EC` (L=0,830)
>   trên nền L=0,241 → **(0,880)/(0,291) = 3,02:1 ❌** (đang dùng `text-white/85`, `text-white/80`).
> - Sau khi phủ scrim `≥0,35` (00/7.3): trắng 14px trên điểm sáng nhất `#FF5A4E` → **≥5,37:1 ✅**
>   (0,40 → ~6,6:1; 0,62 → 8,42:1). Kết luận: **mọi chữ 12–18px trong thẻ phải nằm giữa vùng scrim
>   ≥0,35 → giới hạn `max-width: 384px` canh giữa** (hiện `max-w-sm`/`max-w-xs` đã đúng — GIỮ).

| # | Thành phần | Số đo (mới) | Hiện tại |
|---|---|---|---|
| 1 | `h2` “Check-in trải nghiệm” | **18/700** trắng, margin-top 0 | `text-lg font-bold` (đúng) |
| 2 | mô tả dưới h2 | **14/1.6** `#ffffff` opacity **1**, max-width 384 | `text-white/85` ❌ 3,02:1 |
| 3 | Khung QR | `figure` `bg-white` padding **12** radius **16**, margin-top **20**, inline-block | `p-3 rounded-2xl` ✓ (giữ) |
| 4 | `<QrCode kichThuoc={184} hienChu>` | **KHÔNG ĐỔI** tham số; không ghi đè kích thước | giữ |
| 5 | Chú thích trong figure (URL + hướng dẫn) | **12/1.4** `--muted-strong` (trên nền trắng: 5,01:1 ✅) | `text-slate-500/text-[11px]` ❌ (11px < 12) |
| 6 | `h3` “Mã QR của bạn” | **18/700** trắng | ✓ giữ |
| 7 | dòng hướng dẫn 12px | `#ffffff` opacity **1** · 12/1.4 · max-width 320 | `text-white/80` ❌ |
| 8 | **chip đếm ngược** `{conLai}s` | nền `#ffffff` đặc · chữ `var(--portal-dark)` · **14/700** `tabular-nums` · radius 999 · padding 2/8 | đang là chữ trắng bold trong đoạn ❌ (trắng trên gradient không có scrim cục bộ) |
| 9 | cảnh báo `daDung` | hộp tone **cảnh báo 4.3**: nền `#FFF7ED` · chữ `#9A3412` 14/600 · radius 12 · padding 12/16 · icon ⚠ 16 · width 100% max 384 · `role="status"` | `bg-amber-300/90 text-amber-950` (màu ngoài token) |
| 10 | ô nhập mã ban tổ chức | dùng `.input-control` (h **44** · radius 12 · viền `--line-control` 3,27:1 · chữ 14 `--ink`) · placeholder **14 `--muted-strong`** · max-width **320** · margin-top **16** | `py-2.5`≈40, `border-0`, placeholder màu mặc định |
| 11 | nút “Xác nhận check-in” | h **44** · radius **12** · 14/600 · width theo ô nhập (320) · margin-top **12** · gap icon 8 · icon 16 | `rounded-full` `py-2.5` ❌ (radius + cao sai) |
| 12 | **Nền nút trên gradient** (00/7.3.4) | `#ffffff` · chữ `#1B2A5E` (**13,65:1** ✅) | `text-ink` 12,32:1 ✅ (được, nhưng chốt theo 00) |
| 13 | nút disabled | nền `#ffffff` · chữ `--muted-strong` (5,01:1) · viền 1px `--line-control` · `cursor: not-allowed` · bỏ hover | `disabled:opacity-50` → chữ/bộ nền mờ ~2:1 ❌ |
| 14 | hộp kết quả `result` | tone **thành công 4.3**: nền `#ECFDF5` · chữ `#047857` 14/600 · radius 12 · padding 12/16 · icon ✓ 16 · `role="status" aria-live="polite"` · text `{message} · +{hours}h` | `bg-white/20` + chữ trắng ≈ **2,52:1** ❌ (00/7.3.3) |
| 15 | focus trên nền gradient | `outline: 2px solid #ffffff; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(27,42,94,.55)` (00/7.6) | `focus:ring-2 ring-white` (không có nền tối bù) |

### B4. Cột phải — hộp thông báo lỗi nộp
- `error` → `<ErrorBox message={error} />` **ở đầu cột phải** (giữ đúng chỗ hiện tại), `margin-bottom 16`.
- Không cần nút Thử lại (người dùng tự bấm lại nút check-in). Giữ nguyên `loiTiengViet`.

### B5. Card “Lịch sử check-in”
```
Card (card-surface · radius 20 · padding 24) · margin-bottom 16 (space-y-4 → gap-4 = 16)
hàng tiêu đề: icon History 18 var(--portal) + gap 8 + h3 18/700 --ink · margin-bottom 12
```
**4 trạng thái:**

| Trạng | Điều kiện | Hiển thị |
|---|---|---|
| Tải | `history === null` | 4 khối `Skeleton` `h-[56px] radius 12` + gap 8 (00/4.9) + dòng “Đang tải lịch sử…” 14 `--muted-strong` · vùng list `aria-busy` |
| **Lỗi (MỚI)** | fetch `/student/checkins` fail | `<ErrorBox message="Không tải được lịch sử check-in, bạn thử lại sau nhé." retryLabel="Thử lại" onRetry={loadHistory} />` — **bắt buộc tách lỗi với rỗng** |
| Rỗng | load OK, `length === 0` | `<Empty icon={<History 32/>} text="Chưa có lượt check-in nào — quét QR ở hoạt động đầu tiên để bắt đầu tích lũy giờ." action={nút secondary “Xem hoạt động đang mở” → /student/activities}>` (00/4.8) |
| Có dữ liệu | còn lại | danh sách dưới |

> Hiện tại `.catch(() => setHistory([]))` **nuốt lỗi → lỗi hiện thành “rỗng”** → đổi thành
> state `historyError: string` (giống pattern `dot2/02`).

**Dòng lịch sử (mỗi item):**
```
li: border 1px var(--line) · radius 12 · padding 10px 12px · gap 12 · min-height 56
    BỎ `interactive hover-lift` (không bấm được — 00/4.1)
    list: max-height 384 (max-h-96) overflow-y-auto · GIỮ role="list"
          + THÊM tabindex="0" aria-label="Danh sách check-in" (vùng cuộn có keyboard — 00/7.6)
avatar: 36×36 tròn · nền var(--portal-soft) · icon History 15 var(--portal-dark)
        (ĐỔI gradient `violet-500 → purple-700` — ngoài bảng màu 00/1)
trái : tên hoạt động 14/600 --ink (truncate) · ngày giờ 12 --muted-strong tabular-nums
phải: “+{hours_added}h” 14/700 --portal-dark tabular-nums
```
> **Tính toán:** `text-muted-light #b2afc6` 12px trên trắng: L=0,452 → (1,05)/(0,502) = **2,09:1 ❌**
> → `--muted-strong` = **5,01:1 ✅**. `text-pink-600 #DB2777` = 4,58:1 (chỉ vừa) nhưng là màu Tailwind
> ngoài bảng 00 → `--portal-dark #7E2F73` trên trắng = **8,26:1 ✅** (scope học sinh).

### B6. Trạng thái QR (3 nhánh)

| Nhánh | Hiển thị |
|---|---|
| Đang tải (`maHienTai=""`, `loiNguon=""`) | khung trắng (B3.3) giữ nguyên kích thước, bên trong `Loading label="Đang tải mã QR của bạn..."` với chữ `--muted-strong` → **khung không nhảy layout** |
| Lỗi mã nguồn (`loiNguon`) | `<ErrorBox message={loiNguon} retryLabel="Thử lại" onRetry={reloadMaNguon}/>` (bọc trong nền trắng padding 12 radius 12, width 100% max 384) — **không** chỉ là text |
| Bình thường | `<QrCode>` như B3 |

*Đổi `useEffect` lấy mã nguồn thành hàm `reloadMaNguon` (useCallback) để nút Thử lại gọi lại —
lỗi 401 → text giữ nguyên “Phiên đăng nhập đã hết hạn…”.)*

### B7. Nút check-in & trạng thái bận
- `busy` → label `Đang xác nhận...` + spinner 16 + `disabled` + `aria-busy="true"` (đang đúng — GIỮ).
- Disabled khi `maHienTai === "" && qr.trim() === ""` (giữ nguyên logic) + styling B3.13.

### B8. Card “Cách hoạt động”
- **BỎ `interactive`** (card không bấm được — 00/4.1).
- h3 **18/700** `--ink` · margin-bottom 8.
- `ol` các dòng **14/1.6 `--muted-strong`** (đổi `text-muted` 3,46:1 ❌ → 5,01:1 ✅) · gap 8 ·
  marker `--portal` (giữ list-inside).
- Giữ `{CHU_KY_MA_GIAY / 60}` = 2 phút (động, không hard-code).

---

## C. RESPONSIVE

| Khối | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Lưới | 1 cột (QR trước, lịch sử sau) | **2 cột, gap 24** | 2 cột, gap 24 | 2 cột, gap 24 |
| Thẻ QR | width theo cột, padding 20, QR 184 | padding 24, QR 184 | QR 184 | QR 184 |
| Ô nhập + nút | max-width 320 (full nếu <320) | 320 | 320 | 320 |
| Lịch sử | max-height 384, cuộn | cuộn | cuộn | cuộn |
| Cách hoạt động | dưới lịch sử | cột phải | cột phải | cột phải |

Không tràn ngang ở 4 cỡ; QR 184 + padding 48 = 232px < 358px nội dung tại 390.

---

## D. CHECKLIST THAY ĐỔI (đánh số — pane 2 tự đối chiếu)

| # | Vị trí | Hiện tại | Chuyển thành | Lý do |
|---|---|---|---|---|
| C1 | `(slide 14)` trong subtitle | có | **xóa** | text nội bộ |
| C2 | Thẻ QR nền | `hero-gradient` trần | + `var(--scrim-navy)` chồng lên | 00/7.3 · 3,02→≥5,37:1 |
| C3 | Thẻ QR | `interactive rounded-2xl` | bỏ `interactive`, `rounded-[20px]` | 00/4.1 + số đo 20 |
| C4 | Chữ trắng/85, /80 | opacity <1 | **opacity 1** | blend 3,02:1 ❌ |
| C5 | `{conLai}s` | bold trắng trong đoạn | chip nền trắng + `--portal-dark` 14/700 | chip trên gradient phải nền đặc (00/7.3.3) |
| C6 | Cảnh báo `daDung` | `bg-amber-300/90` (ngoài token) | tone cảnh báo 4.3 `#FFF7ED/#9A3412` + icon ⚠ | 6,9:1 ✅ + 00/1 |
| C7 | Ô nhập | `border-0 py-2.5` ≈40, placeholder mặc định | `.input-control` h44 + placeholder `--muted-strong` | 00/4.6 + 7.8 |
| C8 | Nút check-in | `rounded-full py-2.5` | h44 · radius 12 · 14/600 | 00/4.2 + 7.8 |
| C9 | Nút disabled | `opacity-50` | nền trắng + chữ `--muted-strong` + viền `--line-control` | chữ vẫn đọc được |
| C10 | Hộp `result` | `bg-white/20` 2,52:1 ❌ | tone thành công 4.3 `#ECFDF5/#047857` + icon ✓ | 5,4:1 ✅ |
| C11 | Grid | `gap-6` cố định | `gap-4 md:gap-6` + `md:grid-cols-2` | 00/3 + tối ưu 768 |
| C12 | Lịch sử lỗi | `.catch → []` (hiện thành rỗng) | state `historyError` + `ErrorBox` + Thử lại | tách lỗi/rỗng |
| C13 | Lịch sử rỗng | div tự dựng, `text-muted-light` | `Empty` + icon + action link | 00/4.8 · 2,09→5,01:1 |
| C14 | Lịch sử loading | spinner `Loading` | 4 `Skeleton` `h-[56px]` + label | 00/4.9 |
| C15 | Dòng lịch sử | `interactive hover-lift`, avatar gradient violet, `muted-light`, `text-pink-600` | bỏ hover · avatar `--portal-soft`/`--portal-dark` · `--muted-strong` · `--portal-dark` | 00/4.1, 00/1 · 8,26:1 |
| C16 | Vùng cuộn lịch sử | không keyboard | `tabindex="0"` + aria-label | 00/7.6 |
| C17 | Card “Cách hoạt động” | `interactive`, `text-muted` | bỏ `interactive`, `--muted-strong` | 00/4.1 · 5,01:1 |
| C18 | Focus trên gradient | `ring-white` đơn | outline trắng + nền navy 0,55 (00/7.6) | thấy rõ focus |
| C19 | Trạng thái QR | `Loading` trần / text lỗi | khung trắng + Loading · ErrorBox + Thử lại | 00/4.9, 4.10 |

**KHÔNG ĐỔI (cấm phá):** mọi file `components/qr/**`; `kichThuoc={184}`, `leTrang`, `mucSuaLoi="M"`,
`hienChu`; `CHU_KY_MA_GIAY`, `maHienTai/cuaSo/conLai/daDung`; API; `data-testid`; đồng hồ 1s.

---

## E. MÀU — KHÔNG THÊM TOKEN MỚI

Đợt 3 dùng lại: `--muted-strong`, `--line-control`, `--scrim-navy`, `--btn-primary-bg` (đợt 1)
và hợp chất 4.3 (`#ECFDF5/#047857`, `#FFF7ED/#9A3412`). Bảng đối chiếu cũ → mới:

| Cặp | Cũ | Mới |
|---|---|---|
| Chữ trắng/85 14px trên `#EF4580` | 3,02:1 ❌ | trắng 100% + scrim 0,40 → **≥5,37:1 ✅** |
| Chữ trắng 12px `bg-white/20` trên gradient | 2,52:1 ❌ | `#047857` trên `#ECFDF5` → **5,4:1 ✅** |
| `--muted-light #b2afc6` 12px trên trắng | 2,09:1 ❌ | `--muted-strong` → **5,01:1 ✅** |
| `text-pink-600 #DB2777` 14/700 trên trắng | 4,58:1 (hợp lệ nhưng ngoài bảng 00) | `--portal-dark` → **8,26:1 ✅** |
| Nút disabled `opacity .50` | ~2:1 ❌ | trắng + `--muted-strong` → **5,01:1 ✅** |
| `amber-300/90 + amber-950` | ngoài bảng 00 | `#FFF7ED + #9A3412` → **6,9:1 ✅** |

---

## F. BẢNG ĐỐI CHIẾU SỐ ĐO (đo bằng devtools, sai → báo pane 1)

| Phần tử | Số đo |
|---|---|
| Thẻ QR | radius **20**, padding **24** (mobile 20), max-width cột |
| Khung QR figure | padding **12**, radius **16**, margin-top **20** |
| `<QrCode>` | `kichThuoc` **184** (không đổi), ô module ≥ **2** (thực tế ≈4), lề **4** module |
| Chú thích QR / hướng dẫn | **12px**, max-width **384** (dòng mô tả) / **320** (dòng hướng dẫn + ô nhập + nút) |
| Chip đếm ngược | height **24**, padding-x **8**, **14/700** tabular |
| Ô nhập | height **44**, radius **12**, margin-top **16** |
| Nút check-in | height **44**, radius **12**, **14/600**, margin-top **12** |
| Hộp daDung / result / lỗi | radius **12**, padding **12/16** (ErrorBox padding **16**), margin-bottom **16** |
| Card lịch sử / cách hoạt động | radius **20**, padding **24**, khoảng cách dọc **16** |
| Dòng lịch sử | min-height **56**, padding **10/12**, gap **12**, avatar **36**, radius **12**, list max-height **384** |
| Khoảng cách khối | PageHeader → lưới **24** · giữa các card cột phải **16** |
