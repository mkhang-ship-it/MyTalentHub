# ĐỢT 3 — ĐẶC TẢ 2 TRANG: CHECK-IN + TALENT PASSPORT (README)

> **PANE 1 chỉ thiết kế — không viết code sản phẩm, không sửa `frontend/src/**`, không git, không cài package.**
> Nguồn sự thật chung: `../dot1/00-he-thong-thiet-ke.md` (đọc lại mục 4.3, 4.4, 4.8–4.11, 7.1–7.8).
> **CHỮ THẮNG ẢNH · CON SỐ LÀ CHUẨN · CLASS LÀ GỢI Ý** (quy tắc 00, mục 0.3).
> **Không thêm token màu mới trong đợt này** — mọi màu là token/hợp chất đã có ở 00.

---

## 1. BẢNG LIỆT KÊ FILE

| File | Nội dung | Trạng thái |
|---|---|---|
| `01-checkin.md` | Đặc tả `/student/checkin` (`pages/student/Checkin.tsx`): khối theo thứ tự màn hình, bảng số đo, checklist **C1–C19**, trạng thái QR/lịch sử/rỗng/lỗi, responsive 390/768/1024/1440, **mục ⚠️ ràng buộc QR** | ✅ |
| `02-passport.md` | Đặc tả `/passport/:studentId` (`pages/passport/Passport.tsx`) + **hộp chi tiết** (`PassportDetailDialog.tsx`, gồm cả chế độ toàn màn hình): checklist **P1–P24**, 6 bất biến khung thẻ **P1–P5**, trạng thái tải/lỗi/rỗng, responsive, bảng số đo | ✅ |
| `03-trang-cong-khai.md` | Mô tả 2 trang CÔNG KHAI `/checkin` (`CheckinScan.tsx`) và `/passport/verify` (`VerifyPassport.tsx`) + **ngôn ngữ thị giác dùng chung** với portal (đọc source theo yêu cầu P5) | ✅ — **KHÔNG thuộc phạm vi code Đợt 3** (chờ P5 giao) |
| `04-de-xuat-dot5-3d.md` | 5 tiêu chí kiểm **T1–T5** cho 7 component `components/three/` (fallback 2D · reduced-motion · dprCap ≤2 · cảnh báo WebGL 1 lần · giữ khung) + bảng trạng thái thật đã đọc source + cách kiểm dán được console | ✅ — chỉ tiêu chí, **không thiết kế lại scene** |
| `refs/01-checkin.svg` | Ảnh minh hoạ trang check-in (1440) | ✅ |
| `refs/02-passport.svg` | Ảnh minh hoạ trang passport + hộp chi tiết | ✅ |
| `refs/03-trang-cong-khai.svg` | Ảnh minh hoạ 2 trang công khai (390) | ✅ |

Nguồn đã đọc (đọc-ghi, KHÔNG sửa): `pages/student/Checkin.tsx`, `pages/passport/Passport.tsx`,
`PassportDetailDialog.tsx`, `shared.ts`, `CheckinScan.tsx`, `VerifyPassport.tsx`,
`components/qr/{QrCode,maCheckin,qrSvg}.tsx|ts`, `components/three/{PassportHoloCard,SceneCanvas,useSceneRuntime,DataNetwork,TalentConstellation,PortalCard3D}.tsx`, `components/ui.tsx`, `index.css`, `App.tsx`.

---

## 2. ⚠️ 3 RÀNG BUỘC QR — DÁN LẠI, PANES KHÁC KHÔNG ĐƯỢC PHÁ

Check-in và Passport dùng **mã QR THẬT** do pane 2 viết tay (`maHoaQR` ISO/IEC 18004 → `qrSvg.ts` → `<QrCode>`,
chu kỳ `CHU_KY_MA_GIAY = 120`). Đây là **ràng buộc kỹ thuật, không phải sở thích thẩm mỹ**:

| # | Ràng buộc | Nguồn code | Hậu quả nếu phá |
|---|---|---|---|
| **QR1** | **Ô module ≥ 2px** — `Math.max(2, Math.floor(kichThuoc / (n + leTrang*2)))`, `qrSvg.ts` `throw` nếu `< 2` | `QrCode.tsx` dòng 48 · `qrSvg.ts` dòng 21 | Mã **không quét được**, code lỗi |
| **QR2** | **Lề trắng ≥ 4 module** (`leTrang = 4`, `qrSvg.ts` `throw` nếu `< 4`) | `qrSvg.ts` dòng 22 | Mã **không quét được** |
| **QR3** | **Nền trắng đặc `#ffffff` + module `#111111`** — không filter, không opacity, không `transform: scale`, không `blur`, không đặt trên nền màu thiếu khung trắng | `qrSvg.ts` dòng 24–25 | Camera không đọc được |

**Cấm đổi:** `kichThuoc={184}` (check-in) · `kichThuoc={112}/{88}/{72}` (passport — ô đã rơi đúng **2px sàn**,
giảm là mất quét) · `leTrang` · `mucSuaLoi="M"` · ghi đè `ketQua.rong` bằng width/height CSS ·
bo góc lớn hơn lề trắng.
**Được đổi (thẩm mỹ):** khung trắng `figure bg-white p-3`, bo góc khung, chú thích, vị trí trong card,
nền/gradient bên ngoài khung.

**Chuỗi URL công khai (không đổi):** mã `FTH:…` → `/checkin?code=…` (mở `CheckinScan`) ·
mã `TP-1001` → `/passport/verify?code=…` (mở `VerifyPassport`) — cả 2 trang **không cần đăng nhập**.

---

## 3. CÁC QUYẾT ĐỊNH THIẾT KẾ ĐÃ CHỐT (ĐỢT 3)

| # | Quyết định | Số liệu chốt |
|---|---|---|
| Q1 | **3 ràng buộc QR** ở mục 2 — nguyên trạng, không đụng `components/qr/**` | module ≥2 · lề ≥4 · nền `#ffffff` |
| Q2 | Thẻ QR check-in phủ **scrim navy** chồng `--hero-gradient` (00/7.3); chữ trắng opacity **1**, giới hạn trong vùng scrim (max-width 384 canh giữa) | cũ 3,02:1 ❌ → **≥5,37:1 ✅** |
| Q3 | Kết quả check-in + cảnh báo “Mã đã dùng” = **tone 4.3** (`#ECFDF5/#047857`, `#FFF7ED/#9A3412`), không dùng `bg-white/20`, không màu ngoài bảng | 2,52 ❌ → **5,4 / 6,9 ✅** |
| Q4 | Nút/ô nhập trên nền gradient: `h 44 · radius 12` (bỏ `rounded-full`), nền trắng chữ `#1B2A5E`, disabled = trắng + `--muted-strong` + viền `--line-control` (bỏ `opacity-50`) | **13,65 / 5,01:1 ✅** |
| Q5 | Lưới check-in đổi `gap-6` → `gap-4 md:gap-6` + **`md:grid-cols-2`** (tại 768 mỗi cột 348px) | 00/3 |
| Q6 | Lịch sử: **tách lỗi với rỗng** (`historyError` + `ErrorBox` + Thử lại), loading = **Skeleton** 4 dòng, rỗng = `Empty` + action link | 00/4.8–4.10 |
| Q7 | **Khung thẻ passport = bất biến P1–P5**: nền gradient navy bằng CSS, mọi thông tin là HTML text, WebGL chỉ là lớp trang trí tùy chọn, minHeight 400/460, giữ mở hộp bằng bấm/phím | `02` mục ⚠️ Số 2 |
| Q8 | Hộp chi tiết passport = biến thể **“hộp thoại lớn” max-width 896, radius 20, padding 20/24, max-height 92vh** (2 cột 420\|1fr) — **ngoại lệ có chủ đích** với 00/4.11 (560px áp cho hộp thoại thường). **Chưa sửa file 00** → báo P5 cân nhắc bổ sung biến thể |
| Q9 | Overlay: hộp = `rgba(27,42,94,.45)` + blur 8 (00/4.11); toàn màn hình = `rgba(27,42,94,.75)` + blur 12 để chữ trắng 12px đạt | 4,01 ❌ → **6,42:1 ✅** |
| Q10 | Chip **huy hiệu (màu từ DB)**: nền trắng + viền màu DB trang trí + **chữ `--ink` 12/600** — không kiểm soát được tương phản màu DB | **12,32:1 ✅** với mọi màu |
| Q11 | Chữ nhỏ dùng `--portal-dark` thay `--portal` trong 2 hộp điểm và dòng `{hours}h` | 4,07 / 4,34 ❌ → **6,42 / 6,84:1 ✅** |
| Q12 | Nhãn `text-[10px]`/`text-[11px]` → **tối thiểu 12px**; `--muted-light 2,09:1` → `--muted-strong 5,01:1` | 00/2, 7.2 |
| Q13 | **2 trang công khai** cùng khung portal (card 448 · radius 20 · padding 24 · H1 24/800 · `btn-primary` 4,61:1 · `ErrorBox`/tone 4.3) — đặc tả sẵn ở `03`, **chưa code, chờ P5 giao** | `03` mục A |
| Q14 | `revealDelay` đơn vị **giây, ≤ 0,3** — sửa bug thật `Passport.tsx` đang để **3–5 giây** (`{3}/{4}/{5}` → `0,06/0,12/0,18`) | checklist P3 |
| Q15 | 7 component `three/**`: **chỉ nêu 5 tiêu chí T1–T5 + cách kiểm** ở `04`; sửa `three/**` phải P5 mở quyền (giống mục E `dot2/01`) | `04` mục 5 |
| Q16 | Về nhận định P5 “`PassportHoloCard` + `DataNetwork` chưa có fallback 2D → WebGL lỗi là trang trắng”: **ghi nguyên nhận định + đối chiếu source** (cả 2 hiện là **2D thuần, không import WebGL/canvas**) + cách kiểm 30 giây → **đề nghị P5 xác nhận lại trước khi sửa** | `04` mục 1.2 |

---

## 4. CHỜ P5 / PANES KHÁC

1. **Q8** — chốt có đưa biến thể “hộp thoại lớn 896” vào `00/4.11` không.
2. **Q13** — 2 trang công khai có đưa vào đợt code nào không (đặc tả sẵn, không cần hỏi lại).
3. **Q16** — xác nhận lại nhận định về `PassportHoloCard`/`DataNetwork` (cách kiểm ở `04` mục 1.2).
4. Còn lại từ đợt 2: **G1/G2** (gộp `StatCard`+`Badge`) và **E1–E3** (mở quyền sửa `three/**`) vẫn chờ chốt.
5. P2 báo lại sau khi code: chạy checklist C1–C19 và P1–P24, đối chiếu bảng số đo (F ở `01`, F ở `02`)
   bằng devtools; sai số nào → báo pane 1 sửa đặc tả (không tự sửa code theo suy đoán).
