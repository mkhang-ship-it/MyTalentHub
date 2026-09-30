# 03 — THỨ TỰ ƯU TIÊN THEO MỨC HẠ LƯU + PHIẾU SỬA TỪNG COMPONENT

> Tiêu chí xếp (lấy từ `dot4/10` mục 2.1, giữ nguyên): **(1)** rủi ro mất nội dung/ mất chữ >
> **(2)** tần suất vào trang > **(3)** thiếu tiêu chí T > **(4)** chi phí sửa (1 file + ít dòng =
> làm trước trong cùng mức hạ).
> “Mức hạ lưu” ở đây = **số người thật sự đọc sai/sai số** khi lỗi xảy ra, nhân tần suất trang.

---

## 1. THỨ TỰ CHUNG (bao gồm việc chung)

| # | Việc | Mức hạ lưu (số đo) | Vì sao đứng ở đây |
|---|---|---|---|
| **0** | **PS0 — T4: warn 1 lần ở `useSceneRuntime.ts`** | 3/3 scene đang **không cảnh báo gì** (grep 0 dòng, runtime 0 warn) → lỗi WebGL im lặng với dev; sửa **1 file** đóng T4 cho cả SkillOrbit + DiscoverScene + RobotMascot | Cao nhất vì **1 chạm sửa 3 scene** (chi phí nhỏ nhất × phạm vi lớn nhất); là cột ❌ duy nhất còn đỏ đều cả bảng |
| **1** | **PS1 — `SkillOrbit` fallback** | Chữ **8px** + `slice(0,6)`: người WebGL hỏng đọc được “Nghệ t/Kinh d” thay cho “Nghệ thuật/Kinh doanh” → **mất hẳn tên kỹ năng** với người sighted. Trang `/student` = **trang vào hằng ngày** (dot4/10: #1) | Mất chữ ở trang nhiều người dùng nhất; thiếu cả T4 (gộp PS0) + T1-chất lượng |
| **2** | **`DataNetwork` E-batch** (hàng tách riêng — nếu P5 gộp thì xếp #2, xem `04`) | Ở **390**: chữ svg = **10,01px** và **7,90px ❌ <12** → **mọi user mobile** (không chỉ lúc lỗi) đọc tên nhân tài/kỹ năng quá nhỏ; + 6 lỗi contrast E1–E6/E9 đã đo; + T5 nhảy **+399,81px** | Ảnh hưởng **đường đi bình thường** của nhiều người (ngang mức #1 về chữ, nhưng là 1 trang phụ hơn `/student`) |
| **3** | **PS2 — `DiscoverScene`** | 1 dòng `text-xs text-muted` = 3,46:1 ❌ ở fallback-empty; còn lại T1–T5 đạt đủ | Thiếu nhẹ nhất trong 3 scene người dùng; sửa 1 class |
| **4** | **PS3 — `RobotMascot` (+`TalentConstellation`)** | **0 việc riêng**: T1/T2/T3/T5 đạt đủ, thiếu T4 = việc #0 | Không có lỗi đo được → chỉ chờ PS0; 2 tên = 1 file nên không tách hạng |
| **5** | **PS4 — `SceneCanvas`** | **0 code bắt buộc**: overlay/canvas `pointerEvents:"none"` (đo nguồn dòng 54/64) → loại hẳn mục “đổi pointerEvents” của `dot3/04`; `minHeight 220` + 0,00px các lần đo | Việc còn lại = PS0 (đặt warn) + dọn optional tiếng Anh (không user-facing) |
| **6** | **PS5 — `PortalCard3D`** | Chỉ **1 lỗi**: mô tả 14px `text-muted` = 3,46:1 ❌; tilt/focus/T5 đo đạt hết | Trang landing thấy 1 lần, lỗi nặng nhất chỉ 1 dòng class |

**So với thứ tự `dot4/10` (SkillOrbit → DiscoverScene → Robot → Portal)**: 3 điểm đổi vì có số đo
mới — (a) **thêm PS0 lên đầu** (việc chung tự nó thành hạng 0); (b) **DataNetwork vào #2** nhờ
bằng chứng mobile 10,01px (khi đó nó chưa được đo, chỉ là E-list); (c) **Robot tụt xuống #4** vì
đo ra **không có việc riêng** (dot4/10 xếp nó #3 vì sợ thiếu T2 — nay T2 đã ✅ bằng `animEqual`).

**PassportHoloCard**: checklist xong ở lượt này (T2/T5 ✅, `02/3.7`) → **không xếp hạng, không code**.

---

## 2. PHIẾU SỬA (chữ — pane 2 code)

### PS0 · `components/three/useSceneRuntime.ts` — T4 cảnh báo 1 lần tiếng Việt

- **Nơi code (2 chỗ)**: `catch` của `mount()` (state `failed`/`unsupported`) và
  `contextLostHandler` (state `lost`) — ngay trước khi gọi `onState(...)`.
- **Module-scope**: `const daBaoCao = new Set<string>()` (theo phiên SPA — remount không warn lại).
- **Đúng 1 dòng, 1 lần/sceneId**:
  ````js
  if (!daBaoCao.has(sceneId)) {
    daBaoCao.add(sceneId);
    console.warn(`[FTalentHub] Scene "${sceneId}": WebGL không khả dụng (${lyDo}) — đang hiển thị nội dung dự phòng 2D.`);
  }
  ````
  `lyDo` ∈ `"không tạo được WebGL context"` (`failed`) · `"thiết bị không đủ cấu hình"` (`unsupported`) ·
  `"mất context"` (`lost`). Không hù người dùng (chỉ devtools), không lặp (Set), tiếng Việt.
- **Cách kiểm sau sửa**: tắt WebGL → mỗi trang đúng **1** warn; mở/đóng lại 3 lần trong cùng phiên
  SPA → vẫn 1 (Set không reset); đếm theo tiền tố `[FTalentHub]` (warn thư viện React Router/GL
  Driver không tính); F5 → 1 warn mới là đúng (một phiên mới).

### PS1 · `components/three/SkillOrbit.tsx` — fallback đủ chữ (T1-chất lượng)

| # | Dòng | Hiện tại (đo) | Sửa thành |
|---|---|---|---|
| 1 | 142 | `h-9 w-9` (36×36) + **`text-[8px]`** | **`h-14 w-14` (56×56)** + **`text-xs` (12px)** |
| 2 | 146 | `{skill.name.slice(0, 6)}` → “Nghệ t” | **`{skill.name}`** (bỏ cắt; `aria-label`/`title` giữ nguyên) |
| 3 | 133–136 | `orbitPct = 30 + …×8` (tối đa 38%) → comment “46,2% < 50%” | **`30 + …×6` (tối đa 36%)**; comment mới: *“bán kính tâm 36% + nửa node 56/2 = 12,7% → 48,7% < 50%”* |
| 4 | 113 | `text-xs text-muted` (12px, 3,46:1 ❌) | **`text-xs text-muted-strong`** (6,68:1 ✅) |

- **Số học chống chồng** (đo hình học cũ): tâm node cách nhau ≥ bán kính 30%×220 = **66px**
  (6 node góc 60° → khoảng cách trung tâm = 66–84 ≥ 56 ✅; 4 node = √2×r ≈ 93 ✅);
  tâm node trong cùng **+28 (nửa node) ≤ 48,7% < 50%** → không lọt khỏi vòng nét đứt.
- **Cách kiểm sau sửa** (`measureD.mjs`): node `rect` = 56×56 · `getComputedStyle(...).fontSize`
  = `12px` · `textContent` = **tên đầy đủ** · pairwise `getBoundingClientRect()` **không giao nhau** ·
  mất context → hull rect vẫn 1046×320 (lệch ≤2px).

### PS2 · `components/three/DiscoverScene.tsx` — 1 dòng (E2 của dot2)

- Dòng **141**: `text-xs text-muted` → **`text-xs text-muted-strong`** (3,46 → 6,68:1 ✅).
- **KHÔNG đổi `height: 300` (dòng 174)** — E1 khép lại: đo @390 hull **300×300**, `scrollWidth`
  390 = viewport → không tràn, khung vuông đủ thấy nội dung; đổi 240 chỉ hại để tiết kiệm 60px
  (xem `04` phần E1).
- **KHÔNG đổi màu cột xám 0x8a87a3** (dòng 82–85) — E3 khép lại: **3,44:1 ≥ 3:1** cho hình ảnh
  không phải chữ (tính WCAG từ RGB), và màu sáng hơn P2 từng đề nghị (`#b2afc6`) chỉ **2,13:1 ❌**.
- Cách kiểm: 12px trên nền fallback ≥4,5 (tính 6,68) — P2 kiểm bằng công cụ contrast 1 dòng.

### PS3 · `RobotMascot.tsx` / `TalentConstellation.tsx` — không code riêng

- T1/T2/T3/T5 đã ✅ (số ở `02`); thiếu T4 → xong khi **PS0**.
- **Giữ nguyên 2 quan sát** (không bắt buộc sửa, ghi để khỏi hồi nghi):
  1. Khi scene `lost`, hull `lost` nhưng `data-robot-state` vẫn `ready` (2 lớp trạng thái) —
     không ảnh hưởng người dùng vì `RobotFallback` vẫn hiện trong hull (đo: cả 2 lần rect 378×458).
  2. “Đánh chào/kéo” dưới reduce: `startLoop` chặn khi `reducedMotion` (nguồn) → robot không
     phản hồi chuyển động. **CHƯA ĐO runtime** — nếu P5 muốn thì cho 1 `renderOnce()` sau event;
     không ép trong vòng này (motion do người dùng khởi xướng, không phải tự chạy).

### PS4 · `components/three/SceneCanvas.tsx` — 0 code bắt buộc

- **Không sửa `pointerEvents`**: overlay dòng **64** và canvas dòng **54** đã `"none"` → mục
  “đổi overlay pointerEvents ở T5” của `dot3/04` **không còn việc gì**.
- Optional dọn (không user-facing, làm khi làm PS0): `SceneFallback.tsx:12` mặc định tiếng Anh
  “3D scene unavailable” là **dead path** (0 consumer ngoài `three/`; 3 chỗ đều truyền `fallback`)
  → đổi chuỗi tiếng Việt hoặc xóa nhánh mặc định.

### PS5 · `components/three/PortalCard3D.tsx` — 1 dòng

- Dòng **56**: `text-sm … text-muted` → **`text-sm … text-muted-strong`**
  (đo: `rgb(138,135,163)` 14px trên `#FFF` = **3,46:1 ❌** → 6,68:1 ✅).
- Giữ nguyên toàn bộ hành vi: tilt ±7°/`translateY(-4px)` (T5 ✅ — layout box 0px), ring focus
  2px white + 4px `--portal` (đã đạt cả 2 chế độ motion), lưới `grid-cols-1` @390 (đo 350×231).

---

## 3. BẢNG ĐỐI CHIẾU “SỬA Ở ĐÂU — KIỂM Ở ĐÂU”

| Phiếu | File(s) | Dòng | Cách kiểm sau sửa (số kỳ vọng) |
|---|---|---|---|
| PS0 | `useSceneRuntime.ts` | `mount` catch + `contextLostHandler` | 1 warn `[FTalentHub]`/sceneId/phiên · 3 scene ×3 lần mở = 3 |
| PS1 | `SkillOrbit.tsx` | 113 · 133–136 · 142 · 146 | node 56×56 · 12px · tên đủ · không chồng · hull 1046×320 lệch ≤2 |
| PS2 | `DiscoverScene.tsx` | 141 | contrast ≥4,5 · hull **vẫn 300** (390: 300×300) |
| PS3 | — | — | chỉ chạy lại PS0 |
| PS4 | (optional `SceneFallback.tsx` 12) | — | 0 việc bắt buộc |
| PS5 | `PortalCard3D.tsx` | 56 | contrast ≥4,5 · focus ring vẫn 4px `--portal` |
| E1–E6·E8·E9·E11 | `DataNetwork.tsx` | xem `04` | xem `04` |
| E7 | `DataNetwork.tsx` | 148–149 · 247–255 | chữ hiện **≥12px** @390 VÀ @1440 · bbox ∈ `[0,300]²` |
