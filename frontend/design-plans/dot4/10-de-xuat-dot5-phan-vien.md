# ĐỀ XUẤT ĐỢT 5 — PHÂN VIÊN 3D CÒN LẠI: TIÊU CHÍ + THỨ TỰ ƯU TIÊN (Đợt 4 · file 10)

> Tiếp nối `../dot3/04-de-xuat-dot5-3d.md` (5 tiêu chí **T1–T5** + bảng trạng thái 7 component).
> File này **CHỈ nêu tiêu chí còn cần và thứ tự ưu tiên** — **không thiết kế lại scene, không sửa màu/ánh sáng/
> geometry, không mở rộng phạm vi**. Số liệu khung lấy từ dot1/dot2/dot3, đã chốt.
> Nguồn đã đọc: `components/three/{PassportHoloCard,DataNetwork,SceneCanvas,useSceneRuntime,SkillOrbit,DiscoverScene,RobotMascot,TalentConstellation,PortalCard3D}.tsx`, `dot3/04`, `dot3/02`.

---

## MỤC 1 — 2 COMPONENT ĐÃ “RA VIỆN” 3D: CÒN GÌ CẦN LÀM?

### 1.1 `PassportHoloCard` (đã bỏ 3D ở Đợt 3 — CSS 2D thuần, không WebGL, không canvas)

| Tiêu chí | Còn cần? | Việc cần làm (nếu có) |
|---|---|---|
| **T1** fallback 2D | **Không áp dụng trực tiếp** — component không có WebGL nên không thể “trắng vì WebGL”. | Chuyển thành **hàng rào**: giữ nguyên 2D thuần; nếu Đợt 5 đưa WebGL vào `PassportHoloCard` thì **bắt buộc** đi kèm fallback theo chuẩn `SceneCanvas` (`state failed/unsupported/lost` → nội dung HTML/CSS vẫn đủ). Không code gì ở hiện tại. |
| **T2** reduced-motion | **Áp dụng mức CSS** (nếu thẻ có transition/animation CSS) | **Kiểm 1 lần** ở `/passport/:studentId` + hộp chi tiết: bật reduced-motion (DevTools Rendering) → không còn hiệu ứng tự chạy; thẻ và QR hiện đủ ngay. Index.css đã có media query chung → chỉ cần xác nhận. |
| **T3** dprCap ≤2 | **Không** (không có canvas/WebGL) | — |
| **T4** cảnh báo WebGL 1 lần | **Không** (không WebGL) | — |
| **T5** giữ khung | **CÒN — áp dụng đầy đủ** | Khung thẻ đọc được bằng CSS thuần là **bất biến P1–P5** (`dot3/02`): minHeight **400 (<768) / 460 (≥768)** · nền gradient navy + mọi thông tin là HTML text · QR đúng 3 ràng buộc (module ≥2px, lề ≥4, nền `#ffffff`) · mở/đóng hộp chi tiết **không làm trang nhảy**. Cách kiểm: `getBoundingClientRect()` của thẻ trước/sau mount + trước/sau mở hộp → lệch ≤2px. |

**Kết luận PassportHoloCard:** việc còn lại chỉ là **1 lượt kiểm T2 + T5** (≈5 phút), không có việc code mới
trừ khi Đợt 5 chủ động đưa WebGL vào (lúc đó T1/T4 tự động bật trở lại).

### 1.2 `DataNetwork` (đọc lại ở Đợt 4 — SVG 2D thuần, không WebGL; đang chờ P5 quyết định ở `02` mục E)

| Tiêu chí | Còn cần? | Việc cần làm |
|---|---|---|
| **T1** | **Không áp dụng trực tiếp** (SVG 2D). | **Hàng rào** như trên — nằm trong `three/**` nên rất dễ bị Đợt 5 “tân trang” sang WebGL mà quên fallback. |
| **T2** | **ĐÃ CÓ** — `matchMedia("(prefers-reduced-motion: reduce)")` → render `<ul>` danh sách “{tên} — có kỹ năng {kỹ năng}” (dòng 209–216) | **Kiểm 1 lần** tại `/enterprise/talents`: reduced-motion ON → danh sách text thay SVG, đủ số liệu. |
| **T3** | **Không** (không canvas) | — |
| **T4** | **Không** (không WebGL) | — |
| **T5** | **Áp dụng một phần — cần kiểm** | `figure` có `minHeight={height}` (280 ở talents); 3 trạng thái (chưa cuộn tới → placeholder · rỗng → `role="status"` · vẽ SVG) **không được** đổi chiều cao khối. Cách kiểm: `getBoundingClientRect().height` ở 3 trạng thái → chênh ≤2px. |

**Việc Đợt 4 đang chờ P5:** quyết định **có mở quyền sửa `three/**` cho Đợt 4 hay không** — danh sách 10 đề nghị
(E1–E10, đặc biệt **E10: SVG cao theo tỉ lệ ≈1.883px ở 1440**) nằm ở **`02-enterprise-talents.md` mục E**. Nếu mở
→ sửa theo đó; nếu không → chuyển sang đầu danh sách việc Đợt 5.

---

## MỤC 2 — THỨ TỰ ƯU TIÊN 5 COMPONENT CÒN LẠI

### 2.1 Tiêu chí xếp hạng (dùng để xếp, không phải để thiết kế lại)

1. **Rủi ro mất nội dung** khi WebGL lỗi (fallback đã thật sự chạy chưa).
2. **Tần suất thấy**: trang vào hằng ngày > trang vào ít lần.
3. **Việc còn thiếu** so với T1–T5 (thiếu nhiều → làm trước).
4. **Chi phí kiểm** (việc nào 1 lần kiểm ra kết quả thì xếp trước để có kết quả sớm).

### 2.2 Việc chung số 0 — làm TRƯỚC, 1 lần, lợi cho cả 3 scene (ưu tiên tuyệt đối)

| Việc | Nơi làm | Lý do |
|---|---|---|
| **T4 — cảnh báo WebGL 1 lần theo `sceneId`** (`console.warn("[FTalentHub] scene <id> fallback: <lý do>")`) | `useSceneRuntime.ts` (1 chỗ) | Hiện `components/three/**` **không có `console.*` nào** → thêm 1 lần ở runtime = **SkillOrbit + DiscoverScene + RobotMascot (kèm TalentConstellation) xong T4 cùng lúc**. Không đụng geometry. |
| Xác nhận lại T1/T3 của hạ tầng | `SceneCanvas.tsx` (state machine `failed/unsupported/lost → showFallback`, dòng 34) + dprCap clamp `useSceneRuntime.ts` dòng 110 | 2 việc này **đã viết sẵn** → chỉ tick checklist (`dot3/04` Mục 3), không code. |

### 2.3 Thứ tự ưu tiên

| # | Component | Trang · khung (đã chốt — KHÔNG đổi) | Hiện trạng | Tiêu chí còn lại so với T1–T5 | Việc cần làm ở Đợt 5 | Vì sao xếp đây |
|---|---|---|---|---|---|---|
| **1** | `SkillOrbit` | `/student` · frame **320**/min 280 (dot1/02) | fallback ✅ `SkillOrbitFallback` | T4 (chung) · T1/T2/T3/T5 **chưa tick** | 1 lượt checklist Mục 3 `dot3/04` + T4 từ việc chung 0 | Trang vào **hằng ngày** của người dùng chính; thiếu nhiều tiêu chí chưa kiểm |
| **2** | `DiscoverScene` | `/student/discover` · frame **300**/min 280 (dot2 D1 — mọi breakpoint) | fallback ✅ `KhungDuPhongDiscover` (dòng 131–179) | T4 (chung) · T1/T2/T3/T5 chưa tick | như #1 | Cũng là trang người dùng, nhưng tần suất thấp hơn Dashboard; **khung 300 là bất biến Đợt 2 — không cho đổi khi kiểm** |
| **3** | `RobotMascot` **(kiểm chung `TalentConstellation`)** | Landing · `TalentConstellation` re-export từ RobotMascot, khung `h-[460px]`, **ẩn <1024** (dot3/04) | fallback ✅ `RobotFallback` + pre-check `canRender3D` (chỉ ≥1024) | T4 (chung) · T2 (hiệu ứng robot) · T1/T3/T5 chưa tick | 1 lượt checklist **cho cả 2 tên** (vì là 1 file thật) ≥1024px | Landing thấy 1 lần/thăm; **TalentConstellation không phải scene riêng → không tách hạng kiểm** (tiết kiệm, tránh ghi trùng) |
| **4** | `PortalCard3D` | Landing · lưới 4 thẻ (CSS 3D) | **không WebGL** — reduced-motion ✅ tự tắt tilt | T2 đã ✅ · T1/T3/T4 **không áp** · còn T5 nhẹ: 4 thẻ không nhảy khi tilt/hover + focus thấy rõ (00/7.6) | Kiểm 1 lần: hover/tilt không đổi kích thước thẻ; bàn phím focus tới từng thẻ | Không có rủi ro mất nội dung (không canvas) → ưu tiên thấp; chỉ còn kiểm hành vi |
| **5** | *(không phải scene riêng)* `TalentConstellation` | — | re-export `RobotMascot.tsx` (dòng 1–31) | — | **Gộp vào #3**, không xếp hạng riêng | Tránh đếm 2 lần trong bảng `dot3/04` Mục 3 |

### 2.4 Bảng tick nhanh cho P2/P5 (mỗi dòng 1 lần kiểm, tổng ≈15 phút)

| Việc | Trang mở | Cách | Tiêu chí |
|---|---|---|---|
| T4 (việc chung 0) | 3 trang có scene | mở/close 3 lần, đếm `console.warn` theo `sceneId` | đúng 1 lần/`sceneId` |
| T1 | `/` · `/student` · `/student/discover` | dán lệnh `WEBGL_lose_context` (dot3/04 Mục 2) + Chrome `--disable-webgl` | fallback hiện, đủ text, `data-scene-state` đúng, console không lỗi đỏ |
| T2 | 3 trang trên + `/passport/:id` + `/enterprise/talents` | DevTools → Rendering → Emulate `prefers-reduced-motion` | hiệu ứng tắt, nội dung/number đủ |
| T3 | trang có scene, device DPR 3 | console dán ở T3 (dot3/04) | `dpr ≤ 2` |
| T5 | trước/sau mỗi lần T1 | `getBoundingClientRect()` khung trước & sau | lệch **≤2px** |
| T5 riêng `DataNetwork` | `/enterprise/talents` | đo `figure` ở 3 trạng thái (chưa cuộn/rỗng/vẽ) | cao không đổi |

**Ghi kết quả vào bảng Mục 3 của `dot3/04` → gửi P5 + pane 1.** Sai số → ghi số đo thật, **không tự sửa đặc tả**
khi chưa có kết luận (quy tắc 3 chốt ở dot3).

---

## MỤC 3 — RANH GIỚI CỦA FILE NÀY

1. **Không thiết kế lại scene**: không đổi màu, ánh sáng, camera, geometry, thời lượng animation, khung
   (320/300/460/280…), thứ tự render, hay nội dung scene.
2. Việc duy nhất có thể phải code ở hạ tầng là **T4 (console.warn 1 lần)** — nằm ở `useSceneRuntime.ts`,
   không phải scene; nếu P5 giao thì ghi vào lệnh Đợt 5 kèm `sceneId`.
3. `PassportHoloCard` + `DataNetwork` **vẫn 2D thuần** — mọi đề nghị đưa WebGL vào 2 file này đều phải
   kèm fallback theo T1 và **trở lại pane 1** (xem `dot3/04` Mục 1.2 — chờ P5 xác nhận nhận định cũ).
4. Số liệu trích từ: `01` (frame SkillOrbit), `02`/D1 (DiscoverScene 300), `03`/04 (Landing 460, ẩn <1024),
   `02-passport` P1–P5 (khung thẻ passport).
