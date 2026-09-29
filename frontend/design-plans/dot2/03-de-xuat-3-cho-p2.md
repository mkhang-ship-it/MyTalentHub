# ĐỀ NGHỊ XỬ LÝ 3 CHỖ P2 BÁO (Đợt 2 · file 03)

> P2 báo 3 chỗ đặc tả chưa bao quát. File này nêu **đề xuất để P5/điều phối quyết**,
> kèm lý do và phạm vi ảnh hưởng. Pane 1 KHÔNG tự quyết thay. Chữ thắng ảnh.
> Ảnh tham chiếu không áp dụng cho file này.

---

## G1. `StatCard` — nhãn màu mờ + delta `emerald-600` (component chung `ui.tsx`)

**Hiện trạng (P2 đo được):** nhãn `text-muted` 12–13px = **3,46:1 ❌** (yêu cầu 4,5:1);
delta (VD `+12%`, `+30%`) `text-emerald-600` 12px = **3,77:1 ❌**.
`StatCard` đang dùng ở **5 trang**: `student/Dashboard` (đã có đặc tả Đợt 1),
`teacher/Overview`, `coach/Overview`, `school/Overview`, `enterprise/Overview`
(4 trang chưa có đặc tả — thuộc Đợt 4).

### Đề xuất G1 — GỘP VÀO ĐỢT 2 (khuyến nghị)
Đổi **1 lần trong `ui.tsx`**, không cần đặc tả trang mới vì mọi con số đã nằm ở
`00-he-thong-thiet-ke.md` mục 4.4:

| Thành phần | Chuyển thành |
|---|---|
| Nhãn (label) | 13/600 `var(--ink-soft)` (8,5:1 ✅) |
| Giá trị (value) | giữ nguyên `text-[28px] font-extrabold tabular-nums text-ink` |
| Delta dạng **số** (`typeof delta === "number"`) | màu theo dấu: `+` → `#047857` (5,48:1), `-` → `#B91C1C` (6,4:1), kèm icon ▲▼ 12px; `0` → `var(--muted-strong)` |
| Delta dạng **chuỗi** (VD `+12%`, “đang tăng”) | 12/600 `var(--muted-strong)` (5,01:1 ✅), giữ nguyên text |
| Ô icon | nền `var(--portal-soft)`, icon màu `var(--portal-dark)` (6,4:1 ✅) — **giữ đúng cách Đợt 1 đã làm** |

- **Lý do gộp:** (1) chỉ sửa `ui.tsx`, nằm trong phạm vi P2 được sửa;
  (2) để sang Đợt 4 thì 4 trang overview vẫn hiển thị chữ 3,46:1 suốt;
  (3) rủi thấp — không phụ thuộc dữ liệu/trang.
- **Cần P2 kiểm tra thêm:** kiểu dữ liệu `delta` ở `school/Overview`
  (`data.trends.students_delta`) — nếu là object thì ép về chuỗi mô tả theo nhánh chuỗi.
- **Không cần** sửa bất kỳ file trang overview nào.

**Phương án thay (nếu P5 không gộp):** để nguyên chờ Đợt 4 đặc tả 4 trang overview.

---

## G2. `Badge` — cao ≠ 24, chữ 600 chưa đồng bộ, chưa có tone chuẩn (component chung `ui.tsx`)

**Hiện trạng:** `Badge` cao ≈21–22px (padding `px-2.5 py-0.5` + chữ 12),
font-weight 500; tone hiện có (success/warn/info/danger/muted) dùng màu chưa
đối chiếu bảng 00/4.3. `Badge` đang dùng ở **3 trang**:
`school/Settings`, `student/Evaluations`, `enterprise/Overview`.

### Đề xuất G2 — GỘP VÀO ĐỢT 2 (khuyến nghị)
Cũng chỉ sửa `ui.tsx`, con số đã chốt sẵn ở `00-he-thong-thiet-ke.md` mục 4.3:

| Thành phần | Chuyển thành |
|---|---|
| Khung | `inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold` → **cao 24, chữ 12/600** |
| success | nền `#ECFDF5` · chữ `#047857` (5,48:1) |
| info | nền `#EFF6FF` · chữ `#1D4ED8` |
| warn | nền `#FFF7ED` · chữ `#9A3412` |
| danger | nền `#FEF2F2` · chữ `#B91C1C` |
| muted | nền `var(--canvas-soft)` · chữ `var(--muted-strong)` (5,01:1) |
| default | tone `info`; thêm prop `tone` là **bắt buộc rõ ràng** (không suy diễn từ text) |
| icon | nếu có icon thì 12px, luôn kèm text (00/7.7) |

- **Lý do gộp:** cùng file `ui.tsx`, cùng đợt với G1, đổi 1 chỗ được 3 trang hưởng.
- **Rủi ro cần P2 rà:** 3 trang dùng `Badge` — kiểm tra không có chỗ nào đang
  dựa vào cao ≈22 để canh hàng (đo lại sau khi đổi sang 24).

**Phương án thay:** nếu P5 muốn tách → đưa vào đầu Đợt 4 (vì `school/Settings`
thuộc Đợt 4), nhưng `student/Evaluations` sẽ vẫn hiển thị chữ 500 + cao sai đến lúc đó.

---

## G3. Component 3D `components/three/**` — TÁCH THÀNH ĐỢT RIÊNG (khuyến nghị)

**Hiện trạng:** P2 **bị cấm** sửa `components/three/**`. 7 component 3D đang dùng:

| Component | Trang dùng | Đã có fallback 2D? |
|---|---|---|
| `DiscoverScene` | `student/Discover` (Đợt 2) | ✅ (khung lưới 2D nội bộ) |
| `SkillOrbit` | `student/Dashboard` (Đợt 1, đã code) | ✅ (bảng chữ 2D — Dashboard.tsx dòng 200 đã ghi chú) |
| `PortalCard3D`, `TalentConstellation` | `pages/Landing` (Đợt 1, đã code) | ✅ (đã chốt ở `01-trang-chu.md`: chỉ bọc ngoài, không sửa cảnh) |
| `PassportHoloCard` | `passport/Passport`, `PassportDetailDialog` (Đợt 3) | ⬜ |
| `DataNetwork` | `enterprise/Talents` (Đợt 4) | ⬜ |
| `RobotMascot`, `SceneCanvas` | dùng nội bộ | ✅ (`prefersReducedMotion`, `dprCap` đã có) |

### Đề xuất G3 — TÁCH thành **Đợt 5 (đợt 3D)**, sau Đợt 3–4
- **Lý do tách:** (1) P2 không được sửa `three/**` → mọi thay đổi phải do P5 mở quyền
  và chỉ định riêng; (2) không blocking giao diện 2D (chữ/tương tác 2D đã spec ở các đợt
  trước); (3) bộ tiêu chí riêng: fallback 2D khi WebGL lỗi, `prefers-reduced-motion`,
  `dprCap` ≤2, cảnh báo “WebGL không khả dụng”, giữ đúng kích thước khung.
- **Phạm vi đợt 3D đề xuất:** duyệt cả 7 component + `SceneCanvas`, đối chiếu với
  `00-he-thong-thiet-ke.md` mục 4.11 và mục E của `01-discover.md`, sau đó mới
  cho P2 sửa.
- **Ở Đợt 2:** chỉ có 1 đề nghị mở quyền cụ thể — **E1 trong `01-discover.md`**
  (chiều cao scene responsive 300/240px). Nếu P5 không mở → P2 giữ 300px mọi breakpoint.

---

## TÓM TẮT ĐỀ NGHỊ (chờ P5 chốt)

| Mã | Vấn đề | Đề xuất | Phạm vi sửa | Chặn Đợt 2? |
|---|---|---|---|---|
| G1 | `StatCard` label/delta sai tương phản | **Gộp Đợt 2** | `ui.tsx` | Không (nhưng nên gộp) |
| G2 | `Badge` cao 22 + chữ 500 | **Gộp Đợt 2** | `ui.tsx` | Không (nhưng nên gộp) |
| G3 | 7 component 3D chưa duyệt | **Tách Đợt 5** | `components/three/**` | Không (Đợt 2 đã có phương án không-đụng-three/) |
