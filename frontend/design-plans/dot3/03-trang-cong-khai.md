# ĐẶC TẢ 2 TRANG CÔNG KHAI — `/checkin` + `/passport/verify` (Đợt 3 · file 03)

> ⚠️ **ẢNH `refs/03-trang-cong-khai.svg` CHỈ XEM HÌNH DẠNG — chữ thắng ảnh.**
> Nguồn: `../dot1/00-he-thong-thiet-ke.md`. **CON SỐ LÀ CHUẨN, CLASS LÀ GỢI Ý. Không thêm token mới.**

> ## 📌 TRẠNG THÁI PHẠM VI (đọc trước)
> Hai trang này **KHÔNG thuộc đợt code 3** (P5 chưa giao). File này làm 2 việc:
> 1. **Mô tả** `pages/passport/CheckinScan.tsx` và `pages/passport/VerifyPassport.tsx` theo yêu cầu
>    của lệnh P5 (đã đọc source).
> 2. **Chốt ngôn ngữ thị giác dùng chung** để người quét QR thấy CÙNG một sản phẩm — bất kể
>    khi nào P5 đưa 2 trang này vào đợt code, chỉ cần làm theo file này, không cần hỏi lại.
>
> Nếu P5 muốn đưa vào đợt code → thêm lệnh; pane 1 không tự đưa vào.

---

## A. Vì sao phải chốt ở đây (kết nối với file 01/02)

Mã QR sinh trong ứng dụng **luôn chứa URL công khai** (`maCheckin.ts · noiDungMaQR`):
- mã check-in `FTH:…` → `{gốc công khai}/checkin?code=…` → mở **`CheckinScan.tsx`**
- mã passport `TP-1001` → `{gốc công khai}/passport/verify?code=…` → mở **`VerifyPassport.tsx`**

Người quét (ban tổ chức, giáo viên, doanh nghiệp) **không đăng nhập**, mở trên điện thoại.
Hai trang này hiện dùng: card `max-w-md`, H1 `text-xl`, nút `cta-gradient` trần (3,67:1 ❌),
ô nhập viền `border-line-strong` (1,39:1 ❌), text `--muted` 12–14px (3,46:1 ❌),
hộp đỏ/đổng màu đỏ toàn bộ chữ — **khác hẳn hệ portal** → người quét thấy “hai sản phẩm”.

**Quyết định chốt:** 2 trang công khai dùng lại đúng khung của portal:

| Thành phần | Chuẩn dùng chung (nguồn) |
|---|---|
| Nền trang | `var(--canvas)` · card `max-width 448` · radius **20** · padding **24** · `--shadow-card` |
| Eyebrow | 12/700 uppercase `--muted-strong` (VD “FTalentHub · Điểm danh công khai”) |
| H1 | **24/800** (mobile 22) `--ink` — 00/2 |
| Mô tả | 14/1.6 `--muted-strong` |
| Ô nhập | `.input-control` (h44 · radius 12 · viền `--line-control` 3,27:1 · placeholder `--muted-strong`) — 00/4.6 |
| Nút chính | **`btn-primary`** (gradient phủ 12% đen = **4,61:1**, h44, radius 12) — 00/7.4 |
| Lỗi | `<ErrorBox>` (icon ⚠ 18 `#B91C1C` + chữ 14/500 `--ink`) — 00/4.10 |
| Thành công | tone thành công 4.3: nền `#ECFDF5` · chữ `#047857` · radius 12 · padding 16 · icon 18 |
| Link cuối | 14/600 `--portal` (trên trắng = **4,60:1 ✅** — giữ) |

---

## B. `/checkin` — `pages/passport/CheckinScan.tsx` (điểm danh công khai)

### B1. Khối theo thứ tự màn hình
1. **Card trung tâm** (max-width 448, radius 20, padding 24, nền `--surface`).
2. **Eyebrow** `FTalentHub · Điểm danh công khai` 12/700 uppercase `--muted-strong`
   *(cũ: `text-muted` 12px = 3,46:1 ❌)*.
3. **H1** `Điểm danh hoạt động` **24/800** `--ink`
   *(cũ: `text-xl` = 20px extrabold — lệch thang chữ 00/2)* · margin-top 4.
4. **Mô tả** 14/1.6 `--muted-strong` *(cũ `text-muted` ❌)* · margin-top 4.
5. **Label** `Mã điểm danh` **13/600** `--ink` (00/2 “Nhãn”) + `htmlFor` (GIỮ) · margin-top 16.
6. **Ô nhập mã** `.input-control` — h44 · radius 12 · viền `--line-control` · font **14 mono**
   `--ink` *(cũ: `border border-line-strong` = **1,39:1 ❌** → 3,27:1 ✅)* ·
   placeholder 14 `--muted-strong` · `data-testid="o-nhap-ma"` **GIỮ** · autocomplete off.
7. **Dòng đánh giá hạn dùng** (`danhGia.thongDiep`, `aria-live="polite"`): 12/1.4 `--muted-strong`
   + icon ⚠ 12 `#9A3412` nếu `het-han`/`sai-dinh-dang`, icon ✓ 12 `#047857` nếu `hien-hanh`
   (00/7.7: không để màu là tín hiệu duy nhất) · margin-top 4.
8. **Nút `Xác nhận điểm danh`** → thay bằng class **`btn-primary`** (h44 · radius 12 · 14/600 ·
   gradient + 12% đen = **4,61:1**) + icon ScanLine 16 + gap 8 · width 100% · margin-top 12 ·
   `aria-busy` (GIỮ) · `data-testid="nut-xac-nhan"` **GIỮ** ·
   *(cũ: `cta-gradient` trần = `#F43F5E` trắng 14px **3,67:1 ❌** + `rounded-full` sai radius)*.
9. **Hộp lỗi** (`data-testid="diem-danh-loi"`) → `<ErrorBox>` chuẩn 00/4.10
   *(cũ: chữ đỏ toàn bộ `text-red-700` — 00/4.10 cấm)* · margin-top 12 · `role="alert"` GIỮ.
10. **Hộp thành công** (`data-testid="diem-danh-thanh-cong"`) → tone thành công 4.3
    (nền `#ECFDF5` · chữ `#047857` · radius 12 · padding 16 · icon 18) ·
    nội dung GIỮ: `{message}` đậm 14/700 + `{họ tên} · Lớp {lớp}` 14/400 · `role="status"` GIỮ.
11. **Link** `Về trang chủ FTalentHub` 14/600 `--portal` · margin-top 24 · canh giữa (GIỮ).

### B2. Trạng thái
| Trạng | Điều kiện | Hiển thị |
|---|---|---|
| **Rỗng** | URL không có `?code=` → ô trống | ô trống + placeholder hướng dẫn + nút **disabled** (opacity .55, `btn-primary:disabled`) + dòng “Thiếu mã trên đường dẫn — dán mã hoặc quét lại QR.” 12 `--muted-strong` |
| Hết hạn / sai định dạng | `danhGia.trangThai ≠ hien-hanh` | dòng B1.7 (icon + text) · nút vẫn enabled để gửi và nhận lỗi máy chủ |
| Lỗi máy chủ / mạng | `fetch` fail | hộp B1.9 · text giữ `detail` hoặc “Điểm danh chưa thành công, vui lòng thử lại.” |
| Bận | `dangGui` | label `Đang xác nhận...` + disabled + `aria-busy` (GIỮ) |
| Thành công | `ketQua` | hộp B1.10 — **không** thay card, chỉ thêm dưới nút |

### B3. Responsive
| | 390 | 768 | 1024 | 1440 |
|---|---|---|---|---|
| Card | 100% − 32 (px-4), padding 24 | 448 | 448, canh giữa | 448, canh giữa |
| Nội dung | 1 cột | 1 cột | 1 cột | 1 cột |

*(Trang công khai dùng cho điện thoại — 390 là breakpoint quan trọng nhất.)*

### B4. Checklist (nếu P5 đưa vào đợt code)
1. Eyebrow + mô tả: `--muted` → `--muted-strong` (3,46 → 5,01:1).
2. H1: `text-xl` → **24/800** (mobile 22).
3. Card: radius 16 → **20**, padding giữ 24.
4. Ô nhập: `border-line-strong` → `.input-control` (1,39 → 3,27:1), h44.
5. Nút: `cta-gradient` trần + `rounded-full` → **`btn-primary`** (3,67 → 4,61:1, radius 12).
6. Lỗi: div đỏ chữ đỏ → **`ErrorBox`**.
7. Thành công: `emerald-*` → tone thành công 4.3 (`#ECFDF5/#047857`).
8. Thêm dòng trạng thái rỗng (B2) — hiện chưa có.
9. **GIỮ nguyên:** mọi `data-testid`, logic `danhGiaMa`/`trichMaTuLienKet`, `fetch` endpoint
   công khai (không token), text tiếng Việt hiện có.

---

## C. `/passport/verify` — `pages/passport/VerifyPassport.tsx` (xác minh công khai)

### C1. Khối theo thứ tự màn hình
1. **Card** max-width 448 · radius **20** · padding 24 (như B).
2. **Eyebrow** `FTalentHub · Xác minh công khai` 12/700 `--muted-strong` *(cũ `text-muted` ❌)*.
3. **H1** `Xác minh Talent Passport` **24/800** `--ink` *(cũ `text-xl` ❌)* · margin-top 4.
4. **Mô tả** 14/1.6 `--muted-strong` · margin-top 4.
5. **3 nhánh trạng thái** (margin-top 24):

| Nhánh | Điều kiện | Hiển thị |
|---|---|---|
| **Đang tải** | `dangTai` | icon spinner 16 + text 14 `--muted-strong` “Đang xác minh mã…” · `aria-live="polite"` · `data-testid="xac-minh-dang-tai"` **GIỮ** · dùng `Loading` (00/4.9) hoặc skeleton 1 khối `h-[200px]` — chốt: **`Loading` + label** (đơn giản, đúng khối nhỏ) |
| **Thành công** | `ketQua` | hộp tone thành công 4.3 (nền `#ECFDF5` · radius 12 · padding 16) · tiêu đề icon BadgeCheck 18 `#047857` + 14/700 `#047857` “Đã xác minh” · `dl` 5 dòng: nhãn 14 `--muted-strong` (cũ `text-muted` ❌) / giá trị 14/600 `--ink` (giữ `font-mono` cho Mã thẻ) · `data-testid="xac-minh-thanh-cong"` **GIỮ** |
| **Lỗi** | `loi` | `<ErrorBox>` 00/4.10 (icon ⚠ + chữ 14/500 `--ink`) + dòng mẹo 12/1.4 `--muted-strong` *(cũ: `text-red-700` toàn bộ + `text-red-600` ❌)* · `role="alert"` · `data-testid="xac-minh-that-bai"` **GIỮ** |

6. **Link** `Về trang chủ FTalentHub` 14/600 `--portal` · margin-top 24 · canh giữa.

**Trạng thái rỗng:** URL thiếu `?code=` → nhánh lỗi với text có sẵn
“Đường dẫn thiếu mã xác minh. Vui lòng quét lại mã QR trên thẻ.” (GIỮ — đã đúng).

### C2. Responsive
Giống B3: card 100% − 32 tại 390 · 448 tại ≥768 · luôn 1 cột · `dl` 2 cột nhãn/giá trị
xếp chồng dưới 360px (nhãn lên dòng trên, giá trị dưới) — tránh tràn `Mã thẻ` (font-mono).

### C3. Checklist (nếu P5 đưa vào đợt code)
1. Eyebrow/mô tả/nhãn `dl`: `--muted` → `--muted-strong` (3,46 → 5,01:1).
2. H1: `text-xl` → **24/800**. Card radius 16 → **20**.
3. 3 hộp: `emerald-*` / `red-*` → tone 4.3 + `ErrorBox`.
4. Thêm `Loading` (đang là text trần) — 00/4.9.
5. **GIỮ:** logic fetch **không token**, 3 `data-testid`, dữ liệu tối thiểu (chỉ tên/lớp/trường —
   **không** thêm email/điểm số: ràng buộc riêng tư của trang), text mẹo.

---

## D. BẢNG ĐỐI CHIẾU SỐ ĐO (2 trang)

| Phần tử | Số đo |
|---|---|
| Card | max-width **448** · radius **20** · padding **24** · shadow `--shadow-card` |
| Eyebrow / H1 / mô tả | **12/700** uppercase · **24/800** (22 mobile) · **14/1.6** |
| Label ô nhập | **13/600** |
| Ô nhập / nút | height **44** · radius **12** · ô margin-top **16** (label→ô **4**) · nút margin-top **12** |
| Hộp lỗi / thành công | radius **12** · padding **16** · margin-top **12** · icon **18** |
| Link cuối | margin-top **24** · 14/600 |
| Khoảng cách dọc trong card | eyebrow→H1 **4** · H1→mô tả **4** · mô tả→ô **16** |

---

## E. MÀU — KHÔNG THÊM TOKEN MỚI

| Cặp | Cũ | Mới |
|---|---|---|
| `--muted` 12–14px (eyebrow, mô tả, nhãn dl, dòng đánh giá) | 3,46:1 ❌ | `--muted-strong` **5,01:1 ✅** |
| Trắng 14px trên `cta-gradient` (nút) | **3,67:1 ❌** | gradient phủ 12% đen (`btn-primary`) → **4,61:1 ✅** |
| Viền ô nhập `--line-strong` | **1,39:1 ❌** | `--line-control` **3,27:1 ✅** |
| Chữ đỏ toàn bộ hộp lỗi | mâu thuẫn 00/4.10 | icon đỏ + chữ `--ink` 14/500 (**12,32:1 ✅**) |
| `emerald-50/700`, `red-50/700` | màu ngoài bảng 00 | tone 4.3 `#ECFDF5/#047857` (5,4:1 ✅) + `#FEF2F2/#B91C1C` |
