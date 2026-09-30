# 02 — BẢNG TRẠNG THÁI T1–T5 CHO 7 COMPONENT 3D (+ 2 HÀNG TÁCH RIÊNG)

> Tiêu chí T1–T5 theo `dot3/04` Mục 2. Cách đo chung: `README/2` (5 kịch bản Playwright).
> Ký hiệu: ✅ đạt · ❌ chưa đạt · n/a không áp (file không dùng WebGL) · **(nguồn)** = bằng chứng
> đọc `src/**` (khi không tái lập được bằng thao tác trình duyệt) · **(dự kiến)** = chờ code rồi đo
> (liệt `README/5` CHƯA ĐO).
>
> Số thô: `/tmp/fth-dot5/resultsA–G.json`. Mỗi dòng “Bằng chứng” đều dẫn được về JSON/grep.

---

## 1. BẢNG CHÍNH — 7 COMPONENT

| Component (file) | Trang · khung | T1 fallback khi WebGL hỏng | T2 reduced-motion | T3 dprCap ≤2 | T4 cảnh báo 1 lần | T5 giữ khung | Tổng |
|---|---|---|---|---|---|---|---|
| **PortalCard3D** | `/` · lưới 4 thẻ, 264×253 (1440) / 350×231 (390) | **n/a** — CSS 3D thuần: `grep -c canvas` trong file = 0, không có WebGL để hỏng; 4 thẻ vẫn đủ chữ khi “WebGL hỏng” (bản chất là HTML) | ✅ — context `reduce`: `perspective` = `none`, `transformStyle` = `flat`, sau hover `transform` = **`none`** (bình thường: `matrix(1,0,0,1,0,-4)`) | **n/a** | **n/a** | ✅ — layout box **[0,253,264] không đổi** sau hover (offsetTop/Height/Width); rect visual lệch **−4px** đúng `translateY(-4px)` (nâng thẻ theo thiết kế, không reflow); Tab vào thẻ → ring **2px trắng + 4px `--portal`** (`boxShadow` đo đủ 4px, cả 2 chế độ motion) | T2/T5 ✅ · **1 lỗi chữ** → PS5 |
| **SkillOrbit** | `/student` · hull **1046×320** (=320 của dot1/02 ✓) | ✅ cơ chế: `loseContext()` → `data-scene-state` **`running → lost`** (800ms), fallback hiện đủ chữ (`innerText` = “60.7 Nghệ t Kinh d”); WebGL tắt → **`failed`** + rect **1046×320 không đổi 1px**. ❌ **chất lượng chữ**: node `text-[8px]` = **8px <12** (00/7.1) + `slice(0,6)` cắt giữa tên → đo `textContent` = “Nghệ t”/“Kinh d” (tên thật “Nghệ thuật”/“Kinh doanh” theo `aria-label`) | ✅ — `animEqual` **true** dưới `reduce` (2 ảnh chụp 700ms giống hệt), **false** khi bình thường (control) → dừng tự xoay đúng | ✅ — `deviceScaleFactor:3` → `canvas.width/rect.width` = **567/378 = 1,500** (≤2) | ❌ — **0** `console.warn` của ta (grep + runtime); 2 warn React Router + 2 warn GL Driver không thuộc `three/` | ✅ — mọi chuyển state rect lệch **0,00px** (320×1046 → 320×1046) | **2 cột ❌** → PS0 + PS1 (ưu tiên #1) |
| **TalentConstellation** | re-export `RobotMascot` (đọc `TalentConstellation.tsx`: `return <RobotMascot …/>`) — **không phải scene riêng** | — cùng số `RobotMascot` (1 file thật, 2 tên) | ✅ | ✅ | ❌ | ✅ | = RobotMascot, **không tách hạng kiểm** (đúng `dot4/10` mục 2.3) |
| **RobotMascot** | `/` · hull **378×458** (container `h-[460px]` − viền 1×2 ✓), ẩn `<1024` | ✅ 2 nhánh: **(a)** WebGL tắt → pre-check `canRender3D` → `data-robot-state` = **`fallback`** (không tạo canvas), rect 378×458 = y hệt lúc chạy; **(b)** mất context giữa chừng → hull `lost`, `RobotFallback` (svg trang trí `aria-hidden` — robot là hình trang trí nên fallback không có chữ là **đúng**). 390: rect **0×0** (container `hidden lg:block`) → không lỗ hổng bố cục | ✅ — `animEqual` **true** dưới `reduce` (cùng hull với Portal section) | ✅ — **1,500** @DPR3 | ❌ — chung PS0 | ✅ — mất context: **378×458 → 378×458 = 0,00px**; WebGL tắt: 0,00px | **1 cột ❌** (chung PS0) · quan sát thêm ở §3 |
| **DiscoverScene** | `/student/discover` · hull **1046×300** (=300 — **bất biến dot2 D1, không cho đổi**), @390 = **300×300** | ✅ — lose → **`lost`**, fallback “Kết quả đã có … Holland: … 0/100 · DISC: S 72/100 · Trí thông minh: … 72/100” (**đủ số liệu**); WebGL tắt → **`failed`**, rect **1046×300 không đổi** | ✅ — `animEqual` **true** dưới `reduce` / **false** khi thường | ✅ — **1,500** @DPR3 | ❌ — chung PS0 | ✅ — **0,00px** mọi chuyển state | **1 cột ❌** (chung PS0) · 1 lỗi chữ ở fallback → PS2 (E2) |
| **SceneCanvas** | hạ tầng (3 nơi dùng: SkillOrbit/DiscoverScene/RobotMascot — **0 chỗ ngoài `three/`**) | ✅ — nguồn: `showFallback` khi `idle/loading/failed/unsupported/lost` → **không bao giờ trống** (kể cả lúc đang load); runtime: `failed`/`lost` đo được; overlay `pointerEvents: "none"` (dòng 64) + canvas `pointerEvents: "none"` (dòng 54) → **loại hẳn việc “đổi pointerEvents ở T5” của `dot3/04`, không cần code** | ✅ — hạ tầng tôn trọng `reducedMotion` (số liệu ở từng scene) | ✅ — nguồn clamp `min(0.75, min(dprCap,2))` + **đo 1,500** | ❌ — **nơi code việc chung 0** (PS0) | ✅ — `minHeight: 220`; hull bất động mọi chuyển state (**0,00px** ×6 lần đo) | đạt, **cần PS0** · phụ: `SceneFallback` mặc định tiếng Anh “3D scene unavailable” (dòng 12) = **dead path** (0 consumer ngoài `three/`, 3 chỗ đều truyền `fallback`) → dọn được, không user-facing |
| **useSceneRuntime** | hạ tầng (449 dòng) | ✅ — `contextLost` → `onState("lost")` (**đo**), `contextrestored` → remount (nguồn); `failIfMajorPerformanceCaveat` → `unsupported` (nguồn) | ✅ — `matchMedia` đọc lúc mount **+ listener `change`** (nguồn) → bật/tắt reduced-motion khi đang mở trang có hiệu lực; `renderOnce` khi reduce (nguồn) | ✅ — clamp nguồn + **1,500 đo** | ❌ — `grep console\.` trong `components/three/**` = **0 dòng** → PS0 đặt warn ở đây (2 chỗ: `catch` của `mount()`, `contextLostHandler`) | ✅ — pause qua `IntersectionObserver` + `visibilitychange`, `disposeTree`/`renderer.dispose()` (nguồn); rect không đổi khi offscreen (hull số 0) | **1 cột ❌** → PS0 (ưu tiên #0) |

---

## 2. BẢNG CHUNG THEO TƯỚI TIÊU CHÍ (đọc nhanh)

| Tiêu chí | PortalCard3D | SkillOrbit | TalentConstellation | RobotMascot | DiscoverScene | SceneCanvas | useSceneRuntime |
|---|---|---|---|---|---|---|---|
| T1 fallback 2D | n/a | ✅ (cơ chế) / **❌ chữ 8px + cắt tên** | = robot | ✅ | ✅ | ✅ | ✅ |
| T2 reduced-motion | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| T3 dprCap ≤2 | n/a | ✅ 1,500 | ✅ | ✅ 1,500 | ✅ 1,500 | ✅ | ✅ |
| T4 warn 1 lần, tiếng Việt | n/a | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| T5 giữ khung (≤2px) | ✅ (0px layout) | ✅ **0,00px** | ✅ | ✅ **0,00px** | ✅ **0,00px** | ✅ **0,00px** | ✅ |

→ **T2 · T3 · T5 xanh toàn tuyến. T1 xong cơ chế, thiếu chất lượng chữ ở SkillOrbit. T4 đỏ cả 3 scene**
(chỉ 1 file sửa là hết: PS0).

---

## 3. BẰNG CHỨNG CHI TIẾT THEO KỊCH BẢN

### 3.1 Kịch bản 5 — mất context (`WEBGL_lose_context.loseContext()`)

| Trang | state trước → sau | hull rect trước → sau | fallback chữ sau lose | pageerror |
|---|---|---|---|---|
| `/` (Robot) | `running → lost` | 378×458 → 378×458 (**0,00px**) | “” — `RobotFallback` svg `aria-hidden` (hình trang trí, đúng) | 0 |
| `/student` (SkillOrbit) | `running → lost` | 1046×320 → 1046×320 (**0,00px**) | “60.7 Nghệ t Kinh d” | 0 |
| `/student/discover` | `running → lost` | 1046×300 → 1046×300 (**0,00px**) | “Kết quả đã có Holland: … 0/100 · DISC: S 72/100 · Trí thông minh: … 72/100” | 0 |

### 3.2 Kịch bản 4 — WebGL tắt hẳn (`getContext` trả `null`)

| Trang | state | rect so với lúc chạy bình thường | console |
|---|---|---|---|
| `/` | **không có hull** — `data-robot-state = "fallback"` (pre-check, không tạo canvas) | 378×458 → 378×458 (**0,00px**) | `console.error` từ **THREE** ×2 (“Error creating WebGL context”) — thư viện, chỉ hiện ở devtools; **pageerror = 0** |
| `/student` | `failed` | 1046×320 → 1046×320 (**0,00px**) | THREE error ×3 · pageerror 0 |
| `/student/discover` | `failed` | 1046×300 → 1046×300 (**0,00px**) | THREE error ×4 · pageerror 0 |

→ Không trang trắng, không vỡ layout, không lỗi uncaught ✅. **`console.warn` của `three/` = 0** → T4 ❌.

### 3.3 Kịch bản 3 — `prefers-reduced-motion: reduce`

| Trang | `matchMedia` đọc được | 2 ảnh chụp khung cách 700ms | Bình thường (control) |
|---|---|---|---|
| `/` | `reduce = true` | **giống hệt** → robot + tilt tắt | **khác nhau** → đang chuyển động |
| `/student` | `reduce = true` | **giống hệt** | khác nhau |
| `/student/discover` | `reduce = true` | **giống hệt** | khác nhau |

Portal ở reduce: `perspective: none`, `transformStyle: flat`, hover → `transform: none`.
CSS nền (ngoài phạm vi nhưng đo để đối chiếu): `page-transition` chạy 6 animation ở bình thường →
**0** dưới reduce (`resultsD.json`).

### 3.4 Kịch bản 2 — DPR 3 (T3)

`canvas.width / rect.width` = **1,500** cả 3 scene (378→567, 1046→1569, 1046→1569)
→ ≤2 ✅ · đúng bằng `dprCap 1.5` (nguồn) · **≤1 WebGL context mỗi trang** (mỗi trang 1 hull).

### 3.5 PortalCard3D — T5 + focus (chi tiết)

| Trạng thái | layout box (offsetTop/Height/Width) | rect visual | transform |
|---|---|---|---|
| Trước hover | **[0, 253, 264]** | y 698,45 · 264×253,25 | `none` |
| Sau hover (chuột giữa thẻ) | **[0, 253, 264]** — **0px thay đổi** | y 694,45 (**−4px**) · 264×253,25 | `matrix(1,0,0,1,0,-4)` |

- Focus (Tab, cả 2 chế độ motion, đo sau 600ms): `boxShadow` = `white 0 0 0 2px` +
  `rgb(196,66,150) 0 0 0 4px` + shadow nền → **ring 4px `--portal` thấy rõ** ✅
  (lần đo đầu ra ring 0px là ảnh hưởng transition 300ms, đã đo lại sau 600ms — ghi ở đây để P2
  không đo vội rồi kết luận sai).
- **Lỗi chữ (PS5)**: mô tả 14px `text-muted` → `rgb(138,135,163)` = **3,46:1 ❌** trên `#FFF`
  (thẻ `bg-surface`). CTA “Đăng nhập” `#A1458F` 14/700 → **5,57:1 ✅** (tính WCAG từ RGB đo).

### 3.6 Chất lượng fallback `SkillOrbit` (bằng chứng của ❌ T1)

| Node | `textContent` (= `innerText`) | `aria-label` | cỡ chữ | box |
|---|---|---|---|---|
| 1 | **“Nghệ t”** (cắt giữa từ) | `Nghệ thuật: 1/10` (đủ) | **8px** | 36×36 |
| 2 | **“Kinh d”** | `Kinh doanh: 1/10` | **8px** | 36×36 |

→ Mất thông tin **thị giác** (SR còn đủ nhờ `aria-label`, sighted không đọc được) + vi phạm 00/7.1.
Nguồn: `SkillOrbit.tsx:142` (`text-[8px]`) và **`:146` (`{skill.name.slice(0, 6)}`)**.
Trung tâm “60.7” 14/700 trắng trên gradient portal → 4,60:1 ✅ (giữ nguyên).

### 3.7 Hàng tách riêng (đã ra viện nhưng có số đo trong lần chạy này)

| Component | Trạng thái | Bằng chứng |
|---|---|---|
| **PassportHoloCard** (checklist `dot4/10` 2.4) | **T2 ✅ · T5 ✅ — xong 1 lượt kiểm, không code** | `/passport/1` (cần token — không token → `/login`): **0 canvas** (2D thuần); thẻ navy rect **349,33×670** đo 2 lần cách 800ms = **0px**; mở hộp chi tiết → `role=dialog` hiện, thẻ **vẫn 349,33×670**, `scrollHeight` 900 không đổi; animation: bình thường 6 (`page-transition`) → reduce **0** |
| **DataNetwork** (tách riêng — `dot4/04`) | **T2 ✅ · T5 ❌** (T1/T3/T4 n/a — không WebGL) | T2: reduce → `<ul>` danh sách thay svg, có đủ chữ (“Đặng Thanh Trúc — có kỹ năng …”). **T5: chưa cuộn = 560×321 → đã cuộn = 560×720,81 → nhảy +399,81px ❌** → **E11** ở `04` |

---

## 4. CÁCH P2 CHẠY LẠI BỘ NÀY SAU KHI CODE (~12 phút)

1. `node /tmp/fth-dot5/measureB.mjs` → mong đợi: `afterLoad.hulls[].state`, `animEqual`,
   `dpr ratio`, `rectBeforeLose/afterLose` (sau PS1: `innerText` node = tên đầy đủ, `fontSize` 12px).
2. Đếm warn: lọc `console.warn` bắt đầu bằng `[FTalentHub]` (sau PS0: đúng 1/lần tải/sceneId).
3. Radar: `node measureA.mjs` → `fontScreen ≥ 12` cả 4 viewport (sau sửa `dot4/01`).
4. DataNetwork: `node measureC.mjs` → `dnTruocCuon.rect ≈ dnSauCuon.rect` (≤2px, sau E11).
