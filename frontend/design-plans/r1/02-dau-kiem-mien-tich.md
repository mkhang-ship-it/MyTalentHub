# R1 — Huy hiệu & chứng chỉ trên màn hình điện thoại

> Không làm mới artwork huy hiệu. Việc duy nhất: trả lời "nó có ý nghĩa gì"
> trong 1 màn hình điện thoại. API thật đọc từ `backend/app/routers/student.py`
> và `passport.py`; UI hiện tại đọc từ `Badges.tsx`, `Profile.tsx`,
> `Passport.tsx`, `PassportDetailDialog.tsx`.

## 1. Huy hiệu (badge) — ý nghĩa: TIẾN ĐỘ THĂNG CẤP

- **API thật:** `GET /student/badges` (`student.py:1048`) trả
  `{code, name, min_hours, icon, color, description, unlocked, current_hours,
  progress_pct}`. Quy tắc mở khóa: `experience_hours >= min_hours`
  (LevelProgression 10/50/100/200h, `student.py:471-480`).
- **Ý nghĩa trên mobile (1 câu):** "Bạn đang ở đâu trên đường tới huy hiệu tiếp
  theo" — con số duy nhất học sinh cần mỗi ngày là `current/min_hours` + `%`.
- **Dạng 2D chốt (giữ layout Badges.tsx:69-122, chỉ chỉnh mobile):**
  - Thanh tổng `unlocked/total` giữ nguyên (đã là 2D).
  - Mỗi huy hiệu khóa = 1 hàng: icon `Award` trong ô 40px + tên 16 bold +
    dòng `X/Y giờ` 12px + thanh cao 8px + `progress_pct`%. Nút duy nhất (nếu có)
    là "Xem sân chơi kiếm giờ" cao 44px.
  - Huy hiệu đã mở: giữ card gradient hiện tại nhưng bỏ `hover-lift` trên
    mobile; chip "Đã đạt" kèm `aria-label` (đã có) — màu không là tín hiệu duy
    nhất.
- **Cấm:** vẽ lại icon huy hiệu; hiện hộp 3D badge trong SkillOrbit (xóa cùng
  SkillOrbit 3D); hiện `%` mà thiếu `X/Yh` tuyệt đối.
- **Cách đo:** đếm `data.length`, `unlocked` từ response JSON; đo hộp chạm nút
  bằng `getBoundingClientRect` ≥ 44px.

## 2. Chứng chỉ — ý nghĩa: BẰNG CHỨNG XÁC THỰC

- **API thật:** nằm trong `GET /passport/{student_id}` → `certificates
  [{title, issuer, issued_at}]` (`passport.py:98-101`); CRUD của chính chủ:
  `POST /student/certificates` (201), `PUT /certificates/{id}`,
  `DELETE /certificates/{id}` (204) (`student.py:377-447`). Giấy của học sinh
  khác ở update/delete → 404 (không lộ tồn tại).
- **Ý nghĩa trên mobile (1 câu):** "Tờ giấy nào chứng minh được khi xin học
  bổng / thực tập / tuyển dụng" — 3 mẩu bắt buộc: tên + nơi cấp + ngày cấp.
- **Dạng 2D chốt (giữ layout Passport.tsx:115-129 + dialog 336-356):**
  - Mỗi chứng chỉ = 1 hàng: title 14 semibold + `issuer · issued_at` 12px.
    Không ảnh bìa, không carousel.
  - Trang Profile (chủ sở hữu): các nút Sửa/Xóa gom thành 1 nút "…" mở menu,
    mỗi mục menu cao 44px; xác nhận xóa bằng dialog (đã có `del` ở
    `Profile.tsx:170` — giữ logic, chỉ sửa chạm).
  - Trạng thái rỗng giữ nguyên câu "Chưa có chứng chỉ." + CTA 44px.
- **Cấm:** bắt nhập `issued_at` theo format lạ (giữ text tự do như backend đang
  nhận `str | None`); hiện chứng chỉ trong thẻ Passport mặt trước (thẻ chỉ giữ
  3 stat + QR để luôn ≤ 460px).
- **Cách đo:** kiểm tra response `certificates[]` rỗng/không; đo chiều cao khối
  chứng chỉ @390px bằng `getBoundingClientRect` trước/sau — mục tiêu không tăng.

## 3. Quy tắc chung hiển thị trên điện thoại

1. Số trước chữ sau: `12/50h`, `3/4 huy hiệu`, `85/100` — luôn kèm đơn vị.
2. Thanh tiến độ nào cũng có `role="progressbar"` + `aria-valuenow` (Badges đã
   đúng — nhân rộng sang kỹ năng/test).
3. Không cuộn ngang: lưới badge `1 cột` @390px (hiện `sm:grid-cols-2` đã đúng);
   bảng hoạt động mobile đã là thẻ dọc (giữ).
