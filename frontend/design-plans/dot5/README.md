# ĐỢT 5 — VÒNG CUỐI: 7 COMPONENT 3D + 2 QUYẾT ĐỊNH P2 NHƯỜNG LẠI

> **Quy tắc**: chữ thắng ảnh · con số là chuẩn · class chỉ là gợi ý. Mọi khẳng định kèm **cách đo**;
> chỗ nào chưa đo được ghi **CHƯA ĐO**. Pane 1 chỉ thiết kế — **không sửa `frontend/src/**`, không git,
> không cài package**. Sửa đặc tả chỉ ở 2 việc P2 nhường (ghi rõ trong từng file dot4).
> Nguồn đã đọc: `components/three/*` (đủ 10 file), `dot3/04` (T1–T5), `dot4/10` (phân viên),
> `dot4/01·02·03`, lệnh `/tmp/fth-reports/p1.md`.

## 1. MỤC LỤC

| File | Nội dung |
|---|---|
| `01-hai-quyet-dinh-p2.md` | Quyết định (1) radar 11,6px ở 1024 · (2) `gap-8` mobile — số đo, chốt, file đã sửa |
| `02-bang-trang-thai-t1-t5.md` | Bảng trạng thái T1–T5 cho từng component + bằng chứng đo được |
| `03-thu-tuu-va-phieu-sua.md` | Thứ tự ưu tiên theo mức hạ lưu + phiếu sửa từng component (kèm cách kiểm sau sửa) |
| `04-datanetwork-va-cac-e.md` | Chốt E1–E3 (dot2) + E1–E10 (dot4) + E11 mới — CÒN / BỎ / ĐÃ XONG + phiếu sửa |

## 2. PHƯƠNG PHÁP ĐO (tái lập được — nền tảng cho mọi con số trong 5 file)

- **Công cụ**: Playwright 1.63 + Chromium (đã có sẵn trong `frontend/`, **không cài thêm**).
  Script: `/tmp/fth-dot5/measureA–G.mjs` · số thô: `resultsA–G.json` · ảnh: `shots/*.png`.
- **Đăng nhập**: `POST /api/v1/auth/login` (mật khẩu `demo123`, tài khoản demo README) → token gán
  `localStorage.fth_token` bằng `addInitScript` (đúng cách `AuthContext` đọc).
- **5 kiểu kịch bản**, mỗi trang chạy trong **context trình duyệt riêng**:

  | # | Kích hoạt | Cách làm |
  |---|---|---|
  | 1 | Bình thường | viewport 1440/1024/768/390, `deviceScaleFactor: 1` |
  | 2 | DPR 3 | `deviceScaleFactor: 3` → đọc `canvas.width / getBoundingClientRect().width` |
  | 3 | Reduced-motion | `contextOptions.reducedMotion: 'reduce'` → chụp 2 lần khung cách 700ms, so `Buffer.equals` |
  | 4 | WebGL tắt hẳn | `addInitScript`: `HTMLCanvasElement.prototype.getContext` trả `null` với mọi type chứa `"webgl"` |
  | 5 | Mất context giữa chừng | dán `canvas.getContext('webgl2'||'webgl').getExtension('WEBGL_lose_context').loseContext()` rồi đọc `[data-scene-state]` |

- **Đọc số**: `getBoundingClientRect()`, `svg.viewBox.baseVal`, `getComputedStyle`, `getBBox()`,
  `document.getAnimations()`, `document.querySelectorAll('[data-scene-state]')`, `grep -n` nguồn.
- **Pass/fail**: theo `dot3/04` Mục 2 (T1–T5).
- **Lưu ý về ảnh**: trong phiên làm việc này, đọc lại file ảnh thỉnh thoảng trả nội dung trộn
  (kết luận **không** dùng ảnh) → **mọi chốt số lấy từ JSON**; ảnh `shots/` chỉ để người xem tay.

## 3. HAI QUYẾT ĐỊNH CỦA P2 (tóm tắt — chứng cứ đầy đủ ở `01`)

1. **Radar 11,6px @1024 → SỬA đặc tả `dot4/01` (không chấp nhận 11,6).**
   Đo đồng ý với P2: **11,58px** (viewBox 288 × scale 0,9653) → **sai 0,42px / −3,5%** so với chốt
   12,0 → vi phạm 00/7.1 (≥12). Nguyên nhân: đặc tả cũ tính cột hẹp nhất = 288 nhưng **đo thật = 278**
   (Layout pad 32 ở ≥1024 chứ không phải 24, cộng 2px viền card). Chốt mới: **SIZE 288→272**,
   RADIUS 88→83, clamp `[64,224]`→`[64,208]`, `[16,272]`→`[16,256]` → 1024 hiện **12,27px ✅**
   (dự kiến theo công thức — P2 đo lại sau khi code).
2. **`gap-8` mobile → SỬA đặc tả `dot4/03` D1 + `dot4/02` D1 (đổi thành `gap-2`).**
   `/student/checkin` **không tồn tại `gap-8`** (đo DOM @390: 0 phần tử; `grep` nguồn: 0 dòng) —
   P2 ghi nhầm trang. `gap-8` thật nằm ở **chân thẻ “Lịch sử tài trợ”** (`Sponsorships.tsx:673`,
   đo 32px giữa 2 nút 44×44 = 11,9% bề rộng thẻ) → chốt **8px**, đồng thời `dot4/02` D1 cũng đổi
   8px để khớp code thật (code đang `gap-2`, đo 8px).

## 4. KẾT QUẢ Ở MỨC CAO NHẤT (chi tiết ở 02/03/04)

- **T2 ✅ · T3 ✅ · T5 ✅ toàn tuyến** (giảm chuyển động, DPR clamp, giữ khung — số đo đủ ở 02).
- **T1 ✅ về cơ chế** (WebGL hỏng → fallback hiện, khung lệch **0,00px**, không trang trắng,
  không `pageerror`) — trừ **chất lượng fallback `SkillOrbit` ❌** (chữ **8px** + `slice(0,6)`
  cắt giữa tên: “Nghệ t”, “Kinh d”).
- **T4 ❌ cả 3 scene**: `grep console\.` trong `components/three/**` = **0 dòng**, runtime cũng
  **0 warn của mình** → đúng “việc chung số 0” ở `dot4/10` — phiếu sửa ở `03`.
- **`DataNetwork` (tách riêng)**: chữ svg ở **390 chỉ 10,01 / 7,90px ❌**; chưa cuộn → cuộn
  **nhảy khối +399,81px ❌**; E10 hết vai trò (đo 493,81px ≠ 1.883).

## 5. DANH SÁCH CHƯA ĐO (không suy đoán)

| # | Việc | Vì sao chưa đo | Ai đo / khi nào |
|---|---|---|---|
| 1 | Radar SIZE 272 → 12,27px@1024 | là **dự kiến** `12 × 278/272`, code chưa đổi | P2 đo lại (AN16 số 2) sau khi sửa `Analysis.tsx` |
| 2 | Node `SkillOrbit` 56px + chữ 12 (fit, không chồng) | dự kiến theo số học cung bán kính | P2 đo `getBoundingClientRect()` sau sửa |
| 3 | E7 hiển thị 12,64@390 / 20,72@1440 | cùng loại dự kiến | P2 đo sau sửa `DataNetwork` |
| 4 | E10 cực trị (dữ liệu 15 kỹ năng chung) | cần bộ lọc làm ra ≥15 kỹ năng chung | P2: `caoSvg = 56+46·K` → cao ≤ **1.288px** @560 (công thức, chưa có dữ liệu) |
| 5 | Robot “đánh chào/kéo” dưới reduced-motion | chỉ đọc được ở nguồn (`startLoop` chặn khi reduce) | P2: bật reduce → kéo/nhấn robot → có muốn cho 1 frame mồi không? (**không bắt buộc sửa**) |
| 6 | Hiệu năng GPU/CPU tổng (trace) | không nằm T1–T5, chưa chạy profile | đo gián tiếp: ≤1 WebGL context/trang (đo), pause offscreen (nguồn), dprCap 1,5 (đo) |
| 7 | `console.warn` T4 sau khi code | **chưa code** — hiện trạng 0 warn (đúng ❌ chờ phiếu `03/PS0`) | P2 code rồi đếm theo tiền tố `[FTalentHub]` |
