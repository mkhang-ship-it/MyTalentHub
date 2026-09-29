# ĐỢT 4 — ĐẶC TẢ 3 TRANG CUỐI (README)

> **PANE 1 chỉ thiết kế — không viết code sản phẩm, không sửa `frontend/src/**`, không git, không cài package.**
> Nguồn sự thật chung: `../dot1/00-he-thong-thiet-ke.md` (đọc lại 4.1–4.11, 5.2, 6, 7).
> Nhất quán với `../dot1/` `../dot2/` `../dot3/`. **CHỮ THẮNG ẢNH · CON SỐ LÀ CHUẨN · CLASS LÀ GỢI Ý** (00/0.3).
> **Không thêm token màu mới trong đợt này** — mọi màu là token/hợp chất đã có ở 00.

---

## 1. BẢNG LIỆT KÊ FILE

| File | Nội dung | Trạng thái |
|---|---|---|
| `01-school-analysis.md` | Đặc tả `/school/analysis` (`pages/school/Analysis.tsx`): 3 trạng thái · khối theo thứ tự màn hình (radar + 2 bảng + 2 biểu đồ) · **“rồi sao?” cho từng khối** · responsive · **sửa nhỏ trong `BieuDoCot`/`ThanhXepHang` (mục E, có lý do từng dòng)** · checklist **AN1–AN16** | ✅ |
| `02-enterprise-talents.md` | Đặc tả `/enterprise/talents` (`Talents.tsx`): tách lỗi trang/lỗi mời · bộ lọc 1/2/3 cột · bảng + danh sách thẻ · phân trang 44 · bố cục **xung quanh** `DataNetwork` · **mục E = 10 đề nghị sửa `DataNetwork` — CHỜ P5 mở quyền `three/**`** · checklist **TA1–TA16** | ✅ |
| `03-enterprise-sponsorships.md` | Đặc tả `/enterprise/sponsorships` (`Sponsorships.tsx` + `SponsorProjectCard.tsx`): toast/dialog/banner theo 00/4.11+7.3 · lưới dự án · form (đổi span cột có lý do số) · lịch sử + thẻ <768 · checklist **SP1–SP19** | ✅ |
| `10-de-xuat-dot5-phan-vien.md` | Việc còn lại của `PassportHoloCard` + `DataNetwork` theo T1–T5 · thứ tự ưu tiên 5 component còn lại + việc chung số 0 (T4 ở hạ tầng) · bảng tick ~15 phút · ranh giới “không thiết kế lại scene” | ✅ |
| `refs/01-school-analysis.svg` | Ảnh minh hoạ trang phân tích (1440) | ✅ |
| `refs/02-enterprise-talents.svg` | Ảnh minh hoạ trang tìm nhân tài (1440) | ✅ |
| `refs/03-enterprise-sponsorships.svg` | Ảnh minh hoạ trang tài trợ (1440) | ✅ |

Nguồn đã đọc (đọc-ghi, KHÔNG sửa): `pages/school/Analysis.tsx`, `pages/enterprise/Talents.tsx`,
`pages/enterprise/Sponsorships.tsx`, `components/chart/{BieuDoCot,ThanhXepHang}.tsx`,
`components/SponsorProjectCard.tsx`, `components/three/DataNetwork.tsx`, `components/ui.tsx`,
`index.css`, `tailwind.config.js`, `components/Layout.tsx`, `../dot1/00`, `../dot2/*`, `../dot3/*`.

---

## 2. 3 ĐIỀU LỆNH P5 YÊU CẦU — TRẢ LỜI Ở ĐÂU

| # | Yêu cầu | Trả lời |
|---|---|---|
| 1 | **LÀM NỔI số liệu thật, mỗi biểu đồ trả lời được “rồi sao?”** | Mỗi file có **mục C** (bảng: khối → con số → câu trả lời). Cụ thể: `01` **thêm 3 dòng kết luận mới** (radar: ưu tiên bồi dưỡng; bảng xếp hạng: khối cao/thấp + chênh; top HS: max/min/tổng giờ) — 2 biểu đồ `BieuDoCot`/`ThanhXepHang` đã có `tomTat`/`ghiChu` → **giữ nguyên props, không viết lại**; `02` dùng lại `tomTatNhanTai` + thêm nút “Bỏ bộ lọc”; `03` thêm dòng tóm tắt lịch sử + dòng “còn thiếu/số tiền đã nhận” trong form + banner nói rõ “chỉ tính đã duyệt” |
| 2 | **Trạng thái rỗng + lỗi tải cho cả 3 trang** | Mỗi file **mục A**: Skeleton theo 00/4.9 (kích thước từng khối) · lỗi tách theo cấp (trang / khối / thao tác — mục A2, sửa luôn 3 lỗi thật: `return <ErrorBox>` toàn trang, lỗi “Mời phỏng vấn” và lỗi “Xóa” làm mất trang) · rỗng dùng `Empty` 00/4.8 (kèm icon + action nơi có lọc) |
| 3 | **Responsive 390/768/1024/1440 + nói rõ breakpoint đổi lưới → danh sách dọc** | Mỗi file **mục D** có bảng 4 cột + 1 dòng “Chốt breakpoint”: **bảng → danh sách thẻ dọc khi `< 768px`** (00/4.7) ở cả 3 trang (01: 2 bảng · 02: bảng kết quả · 03: bảng lịch sử); lưới 2 cột nội dung đổi 1 cột `< 1024` (00/5.2); riêng bộ lọc `02` chốt **1 cột <768 · 2 cột 768–1279 · 3 cột ≥1280** (lý do đo ở B2-3) |

---

## 3. QUYẾT ĐỊNH CHUNG CỦA ĐỢT 4 (G1–G11 — áp cho cả 3 file)

| # | Quyết định | Số liệu / lý do |
|---|---|---|
| **G1** | Bỏ “(slide 25/29/31)” khỏi subtitle `PageHeader` + comment slide | slide là số liệu bên ngoài trang, không phải nội dung |
| **G2** | **Lỗi 3 cấp**: lỗi tải chính → `PageHeader + ErrorBox retry` (không thay cả trang) · lỗi khối → `ErrorBox` trong khối · lỗi thao tác → toast/chip trong dòng | sửa 3 bug thật: `Analysis`/`Talents`/`Sponsorships` đều `return <ErrorBox>` mất header; `handleInvite` & `handleDelete` dùng chung state lỗi với trang |
| **G3** | `<Loading/>` → `Skeleton` khớp bố cục + `aria-busy` + chữ “Đang tải…” | 00/4.9 |
| **G4** | Dọn `<style>` cục bộ ở cả 3 trang: bỏ `@keyframes fadeUp` trùng → dùng `.reveal-up` (index.css); **bỏ selector `*` trong media reduced-motion** (nó `!important` mọi animation của cả trang — index.css đã có reduced-motion riêng); keyframe riêng (drawRadar) phải kèm rule reduced-motion + **giá trị mặc định thấy được** (`stroke-dashoffset: 0`), nếu không đa giác bị ẩn | 00/7.8; `scaleIn` trong `Sponsorships` là keyframe chết (không JSX nào dùng) → bỏ |
| **G5** | Card/khối **không bấm được** → bỏ `hover:shadow` | 00/4.1 (hover-lift chỉ cho card/nút tương tác) |
| **G6** | Nhịp dọc: PageHeader → khối đầu **24** · khối ↔ khối **32** · hàng phụ trong khối **16** · grid gap **16 (<640) / 24 (≥640)** | 00/5.2 + dot1/02 D1 (đã chốt 32) |
| **G7** | Mọi control: viền **`--line-control` 3,27:1** · radius **12** · cao **44** (36 chỉ cho nút trong bảng dày ở ≥768 — 00/4.2 sm; 44 khi là trạng thái cảm ứng <768) · focus **`outline 2px --portal / offset 2`** — bỏ mọi `border-line`(1,39 ❌), `ring-slate-400`, `ring-red-500` | 00/4.2/7.5/7.6/7.8 |
| **G8** | Chữ 12–15px: `text-muted`(3,46 ❌) & `text-muted-light`(2,09 ❌) → **`--muted-strong`** (5,01 ✅); `--muted` chỉ giữ cho icon/gạch phân cách | 00/7.2 |
| **G9** | Link `text-portal` → **`text-portal-dark`**: tone Nhà trường `#9B6AB5` trắng = **3,76:1 ❌** → `#6E4390` = **7,32:1 ✅** (Doanh nghiệp `#C44296` = 4,60 ✅ nhưng chốt đồng nhất) | 00/7.1 — tính trực tiếp từ `Layout.tsx` |
| **G10** | Bảng: **bỏ `role="grid"`** (giữ semantic table thật) · wrapper cuộn thêm `role="region" aria-label tabIndex={0}` · hàng bỏ `hover:-translate-y`, chỉ giữ bg `--portal-soft` **40%** · header 12/700 `--muted-strong` + `--line-strong` | 00/4.7/7.6 |
| **G11** | **Bảng → danh sách thẻ khi `< 768`** (format 00/4.7: label 12/600 trái · giá trị 14/600 phải · gap 8 · padding 16 · radius 16) | xem mục 2 dòng 3 |

**Màu biểu đồ (00/6.1) áp dụng nhất quán:** 1 chuỗi dữ liệu → **`#1B2A5E` (S1)** · trục `#cfc6bc` · lưới dashed
`#ede7e1` · nhãn 12/600 `--ink-soft` · giá trị 12/700 `--ink` · **không** dùng `--portal` làm màu chuỗi khi nó
đang là màu nhấn trang. (`violet/orange/pink gradient` hiện có ở 2 biểu đồ đều ngoài bảng → sửa ở `01` mục E.)

---

## 4. ⚠️ ĐỀ NGHỊ MỞ QUYỀN `components/three/**` CHO ĐỢT 4 — **CHỜ P5 QUYẾT**

- Theo lệnh P5: muốn sửa **bản thân** `DataNetwork.tsx` thì phải ghi riêng, không viết như đã chốt →
  toàn bộ nằm ở **`02-enterprise-talents.md` mục E (E1–E10)**, kèm lý do + số đo.
- Nặng nhất: **E10** — `<svg viewBox="0 0 300 {cao}" class="h-auto w-full">` cao theo tỉ lệ bề rộng
  (ước lượng 1440 → **≈1.883px**, 1024 → **≈1.200px**, chưa đo devtools → P2 đo trước, console 1 dòng ở mục E).
- Phương án dự phòng P2 làm được NGAY KHÔNG CẦN mở quyền: bọc `max-w-[560px] mx-auto` quanh `<DataNetwork>`
  (`02` B6-6).
- **Đề nghị khác của đợt trước vẫn còn chờ:** Q8 (biến thể hộp thoại lớn 896 — `dot3/README`), Q13, Q16,
  G1/G2 (gộp `StatCard`+`Badge` — `dot2/03`), E1–E3 (mở `three/**` — `dot2/01`).

---

## 5. CHỖ NÀY CHƯA CHẮC (P5/P2 xác nhận giúp)

| # | Chỗ | Cần gì |
|---|---|---|
| 1 | **E10** (`DataNetwork` cao theo tỉ lệ) | P2 **đo thật** bằng console trước khi code theo hoặc báo sai — pane 1 chưa chạy được browser |
| 2 | **Radar 12px ở cột 1024** (`01` AN16): viewBox 288 đặt cho đúng chiều rộng cột hẹp nhất (696/2−48) — nhãn 2 dòng tiếng Việt có thể chạm nhau ở kỹ năng dài | P2 đo `getBBox()` mọi `<text>`; nếu chạm → báo pane 1 (giữ font 12, pane 1 xử lý bằng cách gộp nhãn — không tự giảm cỡ chữ) |
| 3 | **Nút trong bảng 36 hay 44**: 00/4.2 cho sm = 36, 00/7.8 đòi target ≥44 → Đợt 4 chốt **36 ở ≥768 (bàn phím/chuột), 44 ở <768 (cảm ứng)**; dot2 D5 từng chốt 44 cho nút test | P5 chốt 1 lần cho toàn dự án để các đợt nhất quán |
| 4 | **`window.confirm` khi xóa** (`03` B7-13): giữ (hộp trình duyệt đã có keyboard/focus) hay đổi sang hộp thoại tùy biến 00/4.11 | P5 chọn; pane 1 nghiêng về **giữ** để không mở rộng phạm vi Đợt 4 |
| 5 | Thay chip “✨ Tiềm năng” bằng **chip lĩnh vực** (`03` B5b-4): mọi thẻ đều dán nhãn “tiềm năng” → không truyền tin (00/4.3/7.7) | Nếu P5 thấy nhãn đó là yêu cầu nghiệp vụ (dữ liệu thật có trường `field` nhưng không có trường `tiềm năng`) → báo pane 1 |

---

## 6. QUY ƯỚC CŨ (giữ nguyên)

- Pane 1 chỉ thiết kế → pane 2 code → báo pane 5 để sang đợt sau. Pane 1 không git, không sửa `frontend/src/**`.
- Ảnh `refs/*.svg` chỉ tham khảo — **file chữ thắng ảnh · con số thắng class**.
- P2 đo bằng devtools, sai số → báo pane 1; **không tự sửa đặc tả** khi chưa có kết luận.
