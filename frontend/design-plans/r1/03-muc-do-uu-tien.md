# R1 — Mức độ ưu tiên (10 việc, theo thứ tự làm)

> Thứ tự = tác động tới học sinh-mobile / công sức. Mỗi việc: thời gian làm,
> rủi ro, cách kiểm chứng. "Xong" = đo được bằng DevTools + đọc được dữ liệu
> thật, không phải "nhìn đẹp".

| # | Việc | Thời gian | Rủi ro | Kiểm chứng (cách đo) |
|---|---|---|---|---|
| T1 | Xóa `SceneCanvas` khỏi SkillOrbit, đưa `SkillBars2D` thành render chính (`/student`) | 0,5 ngày | Thấp — logic gom `skillTotals` (Dashboard.tsx:116) giữ nguyên, chỉ đổi render | @390px: khối ≤ 200px cao (đo `getBoundingClientRect`); 2 kỹ năng hiện tên + `x/10` đúng số `overview.activities`; không còn import `three` trong bundle trang |
| T2 | Xóa `SceneCanvas` khỏi DiscoverScene, đưa `DiscoverBars2D` thành render chính (`/student/discover`) | 0,5 ngày | Thấp — `gomKetQua` + `MAU_THEO_TEST` giữ nguyên | 0–4 hàng đúng `GET /student/assessments`; màu đúng 4 test; rỗng hiện "Hãy làm bài test đầu tiên"; không còn canvas 300px khi chưa có dữ liệu |
| T3 | Xóa tilt `PortalCard3D` (bỏ `perspective` + `onPointerMove/Leave`) | 2 giờ | Rất thấp | Quét chuột trên desktop không còn `transform: rotateY`; Tab-focus vẫn thấy ring; hộp chạm card > 44px |
| T4 | Xóa `TalentConstellation`/GLTF khỏi Landing, thay chip số liệu tĩnh | 0,5 ngày | Trung bình — hero công khai, cần giữ thẩm mỹ | Không còn request `.glb`/`three` (tab Network); hero desktop ≤ ~200px thay vì 460px; mobile thấy 4 chip giá trị |
| T5 | Sửa 3 hộp chạm vi phạm 44px: checkbox DataNetwork (`h-4`), nút phân trang enterprise (`h-11` đã 44 — xác minh lại), nút Sửa/Xóa chứng chỉ | 2 giờ | Thấp | Mọi phần tử bấm được `getBoundingClientRect` ≥ 44×44 @390px |
| T6 | QR Passport thumb 72 → 96, xóa vệt hover trên mobile | 2 giờ | Thấp — `QrCode` ô module vẫn ≥ 2px (`QrCode.tsx:48`) | Quét được bằng camera thường ở khoảng cách 15cm (thử tay 3 máy); nền trắng đặc còn nguyên; chiều cao thẻ đo lại (CHƯA ĐO trước khi sửa) |
| T7 | Áp thang mobile 00 (spacing/chữ/bo/bóng) cho 4 trang student dùng hằng ngày: Dashboard, Discover, Checkin, Badges | 1–2 ngày | Trung bình — chạm nhiều file, dễ lệch desktop | So ảnh @390px trước/sau; tổng chiều cao 4 trang giảm ≥ 1200px (đo `document.body.scrollHeight`); desktop `@md:` không đổi |
| T8 | Quy tắc "1 màn hình = 1 việc": thu gọn AI analysis/roadmap dưới "Xem thêm", đưa lịch sử test xuống sau CTA | 1 ngày | Trung bình — thay đổi thứ tự nội dung | CTA chính nằm trong  اولین 700px @390px (đo `offsetTop`); không mất nội dung (tìm được bằng tìm kiếm trang) |
| T9 | Giữ DataNetwork nguyên + thêm `tomTat` chữ cho mọi instance (enterprise đã có, school CHƯA ĐO) | 2 giờ | Thấp | Mọi `<DataNetwork>` có `tieuDe` + `tomTat`; `prefers-reduced-motion` rơi về `<ul>` đọc được |
| T10 | Đo lại toàn bộ và chốt sổ: diện tích 3D còn lại, chiều cao 11 trang @390px, bundle `three` | 0,5 ngày | Thấp | Bảng số mới thay số r1.md cũ: tổng 3D còn lại ≈ 0 (+ DataNetwork SVG không tính); tổng cao 11 trang < 23.867px; `three` chỉ còn trong CHƯA ĐO hoặc bị xóa hẳn |

**Không làm trong R1:** vẽ lại huy hiệu, thêm hiệu ứng mới, sửa `backend/app/*`,
đổi API, cài package, git commit.
