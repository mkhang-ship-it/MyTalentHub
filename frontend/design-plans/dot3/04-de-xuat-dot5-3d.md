# TIÊU CHÍ KIỂM CHO 7 COMPONENT `components/three/` (Đợt 3 · file 04)

> ⚠️ File này **CHỈ nêu tiêu chí + cách kiểm** — **KHÔNG thiết kế lại scene**, không đổi camera/màu model/hình học.
> Nguồn: `../dot1/00-he-thong-thiet-ke.md` (4.11, 7) + `02-passport.md` (mục ⚠️ Số 2, P1–P5).
> **CON SỐ LÀ CHUẨN, CLASS LÀ GỢI Ý.** Không thêm token màu mới.
> **Phạm vi Đợt 3: KHÔNG sửa `frontend/src/**` — kể cả `three/**`.** Mọi sửa `three/**` phải do **P5 mở quyền** (giống mục E của `dot2/01`). File này là đề nghị + tiêu chí để P5 quyết và Đợt 5 thi hành.

---

## MỤC 1 — TRẠNG THÁI THẬT CỦA 7 COMPONENT (đã đọc source, 29/09)

### 1.1 Bảng đối chiếu

| # | Component | Dùng ở trang | Cơ chế hiển thị | Fallback 2D hiện có | Nguồn (đã đọc) |
|---|---|---|---|---|---|
| 1 | `SkillOrbit.tsx` | `/student` (Dashboard) | WebGL qua `SceneCanvas` · frame height **320**/min 280 | ✅ `SkillOrbitFallback` (prop `fallback`) | dòng 163–171 |
| 2 | `DiscoverScene.tsx` | `/student/discover` | WebGL qua `SceneCanvas` · frame height **300**/min 280 (mọi breakpoint — chốt `dot2/01` D1) | ✅ `KhungDuPhongDiscover` (dòng 131–179) | dòng 165–184 |
| 3 | `RobotMascot.tsx` | nội bộ của #4 | WebGL qua `SceneCanvas` + pre-check `canRender3D` (chỉ ≥1024px) | ✅ `RobotFallback` + `data-robot-state` | dòng 100, 237–269 |
| 4 | `TalentConstellation.tsx` | `/` (Landing, khung `h-[460px]`, ẩn <1024) | **re-export của #3** (không phải scene riêng) | ✅ kế thừa từ #3 | dòng 1–31 |
| 5 | `PortalCard3D.tsx` | `/` (Landing, lưới 4 thẻ) | **CSS 3D thuần** (`perspective` + `preserve-3d` + tilt `onPointerMove`) — **không WebGL** | không cần (không canvas) — reduced-motion ✅ tự tắt tilt | dòng 24–51 |
| 6 | `PassportHoloCard.tsx` | `/passport/:studentId` + hộp chi tiết | **CSS 2D thuần** (gradient navy + HTML text + `<QrCode>`) — **không WebGL, không canvas** | không cần theo nguồn (xem 1.2) | dòng 28 (chú thích), toàn file |
| 7 | `DataNetwork.tsx` | `/talents` (enterprise) | **SVG 2D thuần** — **không WebGL, không canvas** | đã có 2 đường lui: reduced-motion → `<ul>`; chưa cuộn tới → placeholder; dữ liệu rỗng → `role="status"` | dòng 174–218 |

**Hạ tầng đi kèm (không tính là component nhưng là nơi fallback sống):** `SceneCanvas.tsx` (state machine
`idle/loading/running/paused/failed/unsupported/lost` → `showFallback`, dòng 34), `SceneFallback.tsx`,
`useSceneRuntime.ts` (dprCap clamp dòng 110, `SceneUnsupportedError → "unsupported"` dòng 127–166,
`webglcontextlost/restored` dòng 250–251), `types.ts`.

### 1.2 ⚠️ GHI NHẬN + ĐỐI CHIẾU NHẬN ĐỊNH CỦA P5 (đọc kỹ)

**Lệnh P5 giao:** *"`PassportHoloCard` + `DataNetwork` hiện CHƯA có fallback 2D nên WebGL lỗi là trang trắng."*

**Đối chiếu với source đọc được (29/09):**

| Component | Nhận định trong lệnh P5 | Nguồn code nói gì | Kết luận theo source |
|---|---|---|---|
| `PassportHoloCard` | chưa có fallback 2D → trang trắng | dòng 28: *“thẻ 2D thuần CSS, không dùng three.js để nhẹ GPU”*; **không** import `three`/`SceneCanvas`/`canvas`; mọi thông tin là HTML text | **Không dùng WebGL** → không thể trắng vì WebGL. Yêu cầu “khung thẻ đọc được bằng CSS” **đã đạt** (đã chốt ở `02-passport.md` mục ⚠️ Số 2, bất biến P1–P5) |
| `DataNetwork` | tương tự | render `<figure>` + `<svg viewBox>` (dòng 161–262), **không** import `three`/`SceneCanvas`/`canvas`; có sẵn 2 đường lui (reduced-motion → danh sách text, chưa cuộn → placeholder) | **Không dùng WebGL** → không thể trắng vì WebGL |

**Cách kiểm 30 giây để P5 tự xác nhận (dán vào console trên 2 trang):**
```js
// 1) Ép WebGL hỏng:
document.querySelectorAll('canvas').forEach(c => { const gl = c.getContext('webgl'); gl && gl.getExtension('WEBGL_lose_context').loseContext(); });
// 2) Tải lại trang với Chrome flag: --disable-webgl
// 3) Mở /passport/:studentId và /talents → nếu 2 trang VẪN ĐỦ NỘI DUNG (không trắng)
//    thì nhận định trên cần P5 cập nhật; nếu TRẮNG → gửi lại bằng chứng cho pane 1.
```

**Kết luận của pane 1 (đề nghị P5 chốt):**
1. Nguy cơ “trang trắng vì WebGL” **không tồn tại** ở 2 component này theo source hiện tại.
2. Nguy cơ THẬT còn lại là: **Đợt 5 hoán cải chúng sang WebGL mà thiếu fallback** (vì nằm trong thư mục `three/`
   rất dễ bị hiểu nhầm) → tiêu chí T1 mục 2 áp cho cả 2 component này như một **hàng rào chặn**.
3. **Không dùng nhận định trên làm lý do sửa `PassportHoloCard`/`DataNetwork` trước khi P5 xác nhận lại.**

---

## MỤC 2 — 5 TIÊU CHÍ BẮT BUỘC (T1–T5) + CÁCH KIỂM

### T1 · Fallback 2D khi WebGL lỗi — KHÔNG vùng trắng, không vỡ bố cục
**Tiêu chí:**
- Mọi component WebGL (bảng 1.1 dòng 1, 2, 3/4) phải hiển thị **nội dung đọc được bằng HTML/CSS/SVG**
  khi state ∈ `failed | unsupported | lost` (đã có qua `SceneCanvas`).
- Hai component `PassportHoloCard` + `DataNetwork` (mục 1.2): **PHẢI GIỮ 2D thuần** — đây là hàng rào;
  nếu Đợt 5 đưa WebGL vào thì bắt buộc kèm `fallback` đúng chuẩn `SceneCanvas`.
- Không vùng trắng, không “spinner treo mãi”, không lỗi đỏ lòe ra UI.

**Cách kiểm (mỗi trang 1 lần):**
```js
document.querySelectorAll('canvas').forEach(c => { const gl = c.getContext('webgl'); gl && gl.getExtension('WEBGL_lose_context').loseContext(); });
```
tiếp theo mở Chrome với `--disable-webgl` → tải lại → lần lượt mở:
`/` (TalentConstellation · PortalCard3D) · `/student` (SkillOrbit) · `/student/discover` (DiscoverScene)
· `/passport/1` (PassportHoloCard) · `/talents` (DataNetwork).

**Chấm điểm:** hộp `data-scene-state="lost|unsupported|failed"` thấy fallback ✅ · đủ text/số liệu ✅
· cao-rộng khung lệch ≤2px (T5) · console không có lỗi uncaught ❌ nếu có.

### T2 · `prefers-reduced-motion` — dừng tự xoay/parallax, nội dung vẫn đủ
**Tiêu chí:** khi hệ điều hành bật “reduce motion”:
- `useSceneRuntime`: `animationEnabled=false` + `renderOnce()` (dòng 151–160, 369) → **không RAF loop**.
- `PortalCard3D`: `perspective: none` + `transformStyle: flat` + bỏ tilt (dòng 27–46).
- `DataNetwork`: chuyển SVG → **danh sách `<ul>` text** (dòng 209–216).
- CSS `index.css` (~dòng 299–303): `animation: none !important` cho `.reveal-*`, `.stagger-children`.
- Trạng thái riêng của panel/robot (`RobotMascot`) vẫn render được (2D/pose tĩnh).

**Cách kiểm:** DevTools → **Rendering → Emulate `prefers-reduced-motion: reduce`** →
Performance record 3 giây: không thấy vòng `requestAnimationFrame` chạy liên tục ·
Elements → chọn ô scene → `data-scene-state` là `paused`/`running` nhưng canvas không đổi hình ·
PortalCard3D: hover thẻ không còn tilt (`style="perspective: none"`).

### T3 · `dprCap` — số pixel bám trần ≤ 2, không đắt GPU
**Tiêu chí (nguồn `useSceneRuntime.ts`):**
- Clamp bắt buộc: `dprCap = Math.max(0.75, Math.min(config.dprCap ?? 1.5, 2))` (dòng 110) → **≤ 2**.
- Áp dụng thật: `renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap))` (dòng 354).
- Không scene nào được set `dprCap > 2` hay bypass clamp (hiện cả 3 scene đều `dprCap: 1.5` ✅).

**Cách kiểm:** DevTools → device toolbar chọn máy **DPR 3** (iPhone 14 Pro) → console:
```js
[...document.querySelectorAll('canvas')].map(c => ({ css: c.clientWidth, px: c.width, ratio: c.width / c.clientWidth }))
// Chấp nhận: ratio ≤ dprCap (1.5) hoặc tối đa 2. Violation: ratio ≈ 3.
```

### T4 · Cảnh báo khi WebGL không khả dụng — 1 lần, tiếng Việt, không lặp, không hù người dùng
**Trạng thái hiện tại:** `components/three/` **không có bất kỳ `console.*` nào** → WebGL hỏng thì
**im lặng**, chỉ có fallback + callback `onError` (mới được `RobotMascot` dùng qua `loadError`).

**Tiêu chí (đề nghị Đợt 5 thêm):**
- Mỗi `sceneId` cảnh báo **đúng 1 lần** khi vào state `unsupported | failed`:
  `console.warn('[FTalentHub] WebGL không khả dụng — hiển thị nội dung 2D cho scene "<sceneId>"')`.
- **Không lặp** theo re-render/StrictMode (dùng ref/`Set` đã cảnh báo).
- Người dùng chỉ thấy **fallback 2D** — không modal lỗi, không stack đỏ, không toast.
- Trạng thái vẫn ghi ra attribute `data-scene-state` (đã có, dùng cho test).

**Cách kiểm:** console filter `FTalentHub` → mở lại trang 3 lần vẫn **1 dòng/sceneId** ·
toggle `--disable-webgl` qua on/off không sinh lỗi uncaught · UI không hiện thông báo lỗi màu đỏ.

### T5 · Giữ đúng kích thước khung — không nhảy layout giữa trạng thái 3D/2D
**Khung chuẩn đo từ source (giữ nguyên, không đổi ở Đợt 5):**

| Component | Khung (số đo chuẩn) | Nguồn |
|---|---|---|
| `DiscoverScene` | height **300** · minHeight **280** · mọi breakpoint | `DiscoverScene.tsx` dòng 166 |
| `SkillOrbit` | height **320** · minHeight **280** | `SkillOrbit.tsx` dòng 164 |
| `SceneCanvas` (hạ tầng) | `minHeight 220`, `width/height 100%`, `overflow hidden`, đặt `absolute inset-0` trong frame trên | `SceneCanvas.tsx` dòng 40–47 |
| `TalentConstellation` (Landing) | khung cha `h-[460px]`, ẩn dưới 1024px (`canRender3D` min-width 1024) | `Landing.tsx` dòng 185–187 |
| `PortalCard3D` | lưới 4 thẻ (không canvas) — không đổi kích thước | `PortalCard3D.tsx` dòng 26 |
| `PassportHoloCard` | minHeight **400** (trang) / **460** (hộp) | `02-passport.md` P4 |
| `DataNetwork` | prop `height` → `minHeight`; không truyền → theo nội dung | `DataNetwork.tsx` dòng 165 |

**Tiêu chí:** cao/rộng tại trạng thái 3D OK ⇄ WebGL lỗi chênh **≤ 2px** · fallback nằm trọn trong khung
(`overflow: hidden` + overlay `absolute inset-0` đã có) · không che tiêu đề/lý thuyết ở phía trên ·
chú ý: overlay fallback hiện `pointerEvents: "none"` → **fallback chỉ đọc được**; nếu Đợt 5 thêm nút/xem chi tiết
bên trong fallback thì phải bỏ `pointerEvents: none` (riêng `KhungDuPhongDiscover` chỉ liệt kê → chấp nhận được).

**Cách kiểm:** chụp `getBoundingClientRect()` của khung trước khi ép WebGL hỏng (T1) và sau khi hỏng → so sánh.

---

## MỤC 3 — BẢNG CHECKLIST ĐỐI CHIẾU (P2/P5 tự tick sau khi test)

| Component | T1 fallback 2D | T2 reduced-motion | T3 dprCap ≤2 | T4 cảnh báo 1 lần | T5 giữ khung | Ghi chú |
|---|---|---|---|---|---|---|
| `SkillOrbit` | ☐ (`SkillOrbitFallback`) | ☐ (`prefersReducedMotion: true`) | ☐ (1.5) | ☐ (hiện chưa có) | ☐ (320/280) | |
| `DiscoverScene` | ☐ (`KhungDuPhongDiscover`) | ☐ (`prefersReducedMotion: true`) | ☐ (1.5) | ☐ (hiện chưa có) | ☐ (300/280 — **cấm đổi**, `dot2/01` D1) | |
| `RobotMascot` | ☐ (`RobotFallback`) | ☐ | ☐ (1.5) | ☐ (hiện chưa có) | ☐ (khung Landing 460) | pre-check <1024 → 2D |
| `TalentConstellation` | ☐ (kế thừa RobotMascot) | ☐ | ☐ | ☐ | ☐ (460) | re-export, không scene riêng |
| `PortalCard3D` | n/a (không WebGL) | ☐ (đã có: none/flat) | n/a | n/a | ☐ (lưới 4 thẻ) | CSS 3D |
| `PassportHoloCard` | ☐ **GIỮ 2D CSS thuần** (hàng rào — xem 1.2) | n/a (không animation tự chạy) | n/a | n/a | ☐ (400/460 — file 02 P4) | **cấm quay lại WebGL nếu thiếu fallback** |
| `DataNetwork` | ☐ **GIỮ SVG 2D thuần** (hàng rào — xem 1.2) | ☐ (đã có: `<ul>`) | n/a | n/a | ☐ (prop `height`) | |

---

## MỤC 4 — THỨ TỰ KIỂM ĐỀ XUẤT (1 lượt ~10 phút)
1. T3 trước (dễ nhất): device DPR 3 → console dán ở T3.
2. T2: bật reduced-motion ở OS hoặc DevTools Rendering → quan sát 5 trang.
3. T1: dán lệnh `WEBGL_lose_context` → 5 trang → tick fallback + trạng thái `data-scene-state`.
4. T1 lần 2: mở Chrome `--disable-webgl` → tải lại → 5 trang (kiểm tra trang trắng).
5. T5: `getBoundingClientRect()` trước/sau T1 → chênh ≤2px.
6. T4: đếm `console.warn` theo `sceneId` (mở lại 3 lần).

**Ghi lại kết quả bằng bảng Mục 3 → gửi P5 + pane 1.** Không đúng mục nào → ghi số đo thật vào cột
“Ghi chú” và báo pane 1 sửa đặc tả (không tự sửa đặc tả khi chưa có kết luận).

---

## MỤC 5 — RANH GIỚI
- **Không thiết kế lại scene**: giữ hình học/camera/màu model hiện tại; file này chỉ là tiêu chí + cách kiểm.
- **Không sửa `frontend/src/**` trong Đợt 3.** Mọi sửa `components/three/**` (kể cả thêm `console.warn`
  ở T4, đổi overlay `pointerEvents` ở T5, hay hoán cải `PassportHoloCard`/`DataNetwork`) cần **P5 mở quyền**
  và được ghi thành đợt riêng (Đợt 5 theo kế hoạch).
- Nếu Đợt 5 làm `PassportHoloCard` 3D trở lại → **bắt buộc** qua `SceneCanvas` + `fallback` HTML/CSS đúng
  5 tiêu chí T1–T5 + bất biến P1–P5 ở `02-passport.md` (khung thẻ có nền và chữ đọc được bằng CSS thuần).
