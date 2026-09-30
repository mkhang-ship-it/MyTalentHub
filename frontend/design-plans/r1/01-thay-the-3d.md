# R1 — Thay thế từng khối 3D bằng 2D thật (cùng dữ liệu)

> Nguyên tắc: mỗi mục ghi (a) code hiện vẽ gì từ dữ liệu nào (đọc từ
> `frontend/src/components/three/*` + `frontend/src/pages/*`), (b) API thật từ
> `backend/app/routers/*`, (c) bản thay 2D hiện CÙNG dữ liệu, (d) mũi tên
> pixel. Nơi chưa đo ghi `CHƯA ĐO`.

## 1. SkillOrbit — `/student` (Dashboard.tsx:201)

- **Hiện tại vẽ gì:** `SkillOrbit.tsx:28-101` dựng sphere trung tâm (bán kính theo
  `talent_score`), 1 vành đai (bán kính theo `experience_hours`), tối đa 8 chấm
  sphere trên quỹ đạo (vị trí theo `level`), tối đa 4 hộp badge unlocked. Khung
  `height: 320, minHeight: 280` (`SkillOrbit.tsx:165`). Fallback 2D chỉ hiện khi
  WebGL hỏng.
- **Dữ liệu thật:** KHÔNG có endpoint riêng. `Dashboard.tsx:116-128` gom từ
  `GET /student/overview` → `activities[{field, hours}]` thành
  `skills[{name, level = clamp(round(hours),1,10)}]` + `unlocked_badges` +
  `talent_score` + `experience_hours`. Bằng chứng đo được: chỉ **2 nút**
  ("Nghệ thuật", "Kinh doanh") — tức học sinh mẫu chỉ có 2 field có giờ.
- **Mũi tên pixel:** 1046×320 = **334.720px** (@1440px) và 300×320 = **96.000px**
  (@390px) để vẽ 2 chấm. Cách đo: `getBoundingClientRect()` trên div bọc
  `.w-full` của `<SkillOrbit>` + đếm `orbitData.skills.length` trong console.
- **Bản thay 2D (chính thức):** xóa `SceneCanvas`, nâng fallback hiện tại thành
  component chính `SkillBars2D`:
  - Hàng 1: điểm năng lực (số tabular 32px) + giờ trải nghiệm + hạng — đã có ở
    hero/KPI, không lặp lại trong khối này.
  - Mỗi kỹ năng = 1 hàng 56px: tên trái (14 semibold), thanh track cao 8px,
    số phải `x/10` tabular. 2 kỹ năng = 112px + tiêu đề khối 48px + padding 32px
    = **~192px cao**.
  - Pixel mới @390px: 358×192 ≈ **68.736px** (tiết kiệm ~27kpx, −29%).
    @1440px: 1046×~160 ≈ **167kpx** (tiết kiệm ~168kpx, −50%).
  - Badge unlocked (nếu có): hàng chip `h-6` đã có ở Dashboard — không vẽ hộp 3D.
  - Trạng thái rỗng: giữ đúng empty hiện tại ("Hoàn thành đánh giá…").

## 2. DiscoverScene — `/student/discover` (Discover.tsx:168)

- **Hiện tại vẽ gì:** `DiscoverScene.tsx:55-129` dựng 1 sphere trung tâm + 1 vành
  đai + tối đa 4 cột `BoxGeometry` xếp vòng tròn, chiều cao cột
  `0.25 + (score/100)*1.15`, viên ngọc đỉnh to theo điểm. Khung
  `height: 300, minHeight: 280` (`DiscoverScene.tsx:174`).
- **Dữ liệu thật:** `GET /student/assessments` → `[{test_type, result, date}]`
  (`student.py:541`). `gomKetQua` (`DiscoverScene.tsx:33-52`) parse
  `result_json` → `{label type/holland, score 0–100}`, tối đa 4 mục, màu theo
  `MAU_THEO_TEST` (holland cam, mbti tím, disc hồng, mi vàng).
- **Mũi tên pixel:** 1046×300 = **313.800px** (@1440px), 300×300 = **90.000px**
  (@390px). Cách đo: như SkillOrbit, trên div bọc `<DiscoverScene>`.
- **Bản thay 2D (chính thức):** đưa `KhungDuPhongDiscover` (`DiscoverScene.tsx:132`)
  thành render chính `DiscoverBars2D` — hiện CÙNG 4 mục CÙNG màu CÙNG điểm:
  - Mỗi bài test = 1 hàng ≥ 48px (đạt quy tắc 44): tên trái `w-28` (12 semibold),
    thanh cao 8px màu đúng `MAU_THEO_TEST`, số phải `x/100` tabular.
  - 4 hàng × 48 + tiêu đề 48 + padding 32 = **~272px** khi đủ 4 bài; khi 0–2 bài
    chỉ ~120–170px (thấp hơn hẳn 300px 3D). Pixel @390px đủ 4 bài: 358×272 ≈
    **97kpx** (≈ bằng 3D) nhưng đọc được điểm chính xác; khi 2 bài ≈ **55kpx**
    (−39%). Lợi ích chính là đọc được số + bấm được, không phải chỉ tiết kiệm px.
  - Giữ chip 4 trạng thái (`chipKetQua`, Discover.tsx:141) và lưới badge kết quả
    `Badge tone="portal"` phía dưới nguyên vẹn.

## 3. Landing công khai — TalentConstellation + PortalCard3D (Landing.tsx:187,196)

- **TalentConstellation hiện tại:** `TalentConstellation.tsx` chỉ re-export
  `RobotMascot` (GLTF `/models/robot-mascot.glb`, xoay 0.25 rad/s + bob).
  Quan trọng: `RobotMascot.tsx:184-191` chỉ render 3D khi `min-width: 1024px`;
  mobile đã thấy fallback SVG. Khung hero `h-[460px]`, cột `lg:w-[380px]`
  (`Landing.tsx:186`) = **174.800px** @desktop, **0px** @mobile (ẩn `lg:block`).
- **PortalCard3D hiện tại:** đã là 4 card 2D (`PortalCard3D.tsx:29-63`); phần "3D"
  duy nhất là `perspective: 1000px` + nghiêng `rotateY/X ±7deg` theo chuột
  (`PortalCard3D.tsx:41-47`), tắt khi `prefers-reduced-motion`.
- **Bản thay 2D:**
  - Hero: xóa `TalentConstellation`/GLTF khỏi Landing, thay bằng khối tĩnh 2D
    (gradient + 4 chip số liệu đã có ở `#gia-tri`: 4 cổng / 4 bộ test / 6+ lĩnh
    vực / QR tích hợp) cao ~180px desktop (~68kpx, −61%) và ~200px mobile
    (thay vì 0 — chấp nhận tăng nhẹ để mobile thấy giá trị sản phẩm).
    Cách kiểm chứng: Lighthouse không còn request `.glb` + `three`.
  - PortalCard: xóa `perspective`, `onPointerMove/Leave` tilt; giữ nguyên grid
    `1/2/4 cột`, viền top màu theo vai trò, icon lucide. Toàn bộ card là `<Link>`
    nên hộp chạm > 44px đã đạt. Pixel giữ nguyên, bỏ GPU transform.

## 4. PassportHoloCard — `/passport/:id` (Passport.tsx:89) + dialog (PassportDetailDialog.tsx:54)

- **Hiện tại:** đã là thẻ CSS 2D thuần (`PassportHoloCard.tsx:28` "không dùng
  three.js"): gradient navy, bóng nhiều lớp, vệt sáng hover 2D, `minHeight 400`
  (thumb) / `460` (dialog). KHÔNG có canvas 3D nào → **giữ nguyên khung thẻ**,
  chỉ xóa vệt sáng `group-hover:translate-x` trên mobile (không có hover).
- **QR — đính chính số 82×82:** con số "82×82" trong đề bài KHÔNG khớp code.
  Cách đo: đọc props `kichThuoc` của `<QrCode>` — thumb = **72**
  (`PassportHoloCard.tsx:82`), dialog = **88** (`PassportHoloCard.tsx:82`),
  mặt sau + panel dialog = **112** (`PassportDetailDialog.tsx:82,211`).
  Công thức ô module (`QrCode.tsx:48`): `max(2, floor(kichThuoc/(modules+8)))`.
- **Kết luận QR:** nâng thumb **72 → 96** (quét thoải mái bằng camera thường,
  vẫn vừa hàng `bg-white p-2.5`), dialog giữ **112**. Nền trắng đặc đã đúng
  (ràng buộc QR3) — giữ nguyên. Chiều cao thẻ thumb tăng ~24px: CHƯA ĐO chính
  xác (cần đo lại bằng `getBoundingClientRect` sau khi sửa).

## 5. DataNetwork — `/enterprise/talents` (Talents.tsx:506)

- **Hiện tại:** đã là SVG 2D thật (`DataNetwork.tsx`): mạng lưỡng phân 2 cột
  (nhân tài `x=90`, kỹ năng `x=210`, viewBox 300×caoSvg), tối đa 5 nhân tài +
  kỹ năng thật của họ (`Talents.tsx:512-517` lấy `top_skills.slice(0,3)`),
  `tieuDe` + `tomTat` bằng chữ bắt buộc, lazy qua `IntersectionObserver`,
  `prefers-reduced-motion` rơi về `<ul>` chữ.
- **Dữ liệu thật:** `GET /enterprise/talents` (`enterprise.py:97`) → top5 +
  top_skills. Chi tiết field response CHƯA ĐO trong vòng này (chưa đối chiếu
  từng key).
- **Kết luận: GIỮ NGUYÊN.** Không tính vào diện tích 3D cần xóa. Việc duy nhất:
  bọc checkbox "chỉ hiện kỹ năng chung" trong label padding 44px (xem 03-T5)
  và giữ `max-w-[560px]`, `height={280}`.
