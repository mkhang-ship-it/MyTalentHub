# Kiến trúc FTalentHub

Tài liệu tiếng Việt mô tả hệ thống ở mức đủ để người mới tham gia hiểu và vận
hành. Mã nguồn là chân lý cuối cùng; tài liệu này chỉ tóm tắt quyết định thiết kế.

## 1. Tổng quan và luồng request

```
Trình duyệt (React SPA)
  │  fetch("/api/v1/...") + header Authorization: Bearer <token>
  ▼
Vite dev proxy (chỉ lúc dev)  ──hoặc──  nginx proxy /api (khi chạy Docker)
  │  VITE_API_PROXY trỏ tới backend
  ▼
FastAPI (backend/app/main.py, prefix /api/v1)
  ├─ routers/auth, student, teacher, school, enterprise, passport, ai
  ├─ SQLAlchemy 2.0 ORM (DeclarativeBase trong database.py)
  ▼
SQLite: backend/talenthub.db (tạo bằng create_all + migration nhẹ lúc khởi động)
```

- Mọi response API đều là JSON dưới prefix `/api/v1`.
- Health check: `GET /api/v1/health` → `{"status": "ok", ...}` (dùng cho Docker
  HEALTHCHECK và kiểm tra nhanh backend sống hay chết).
- Backend chạy dev ở **cổng 8001**: `python -m uvicorn app.main:app --port 8001`
  (chạy từ thư mục `backend`). Frontend dev ở **cổng 5174**
  (`VITE_PORT=5174`), proxy `/api` về backend qua `VITE_API_PROXY`
  (xem `frontend/vite.config.ts`; mặc định trong file là 5173/8000 nên khi chạy
  dev **bắt buộc** đặt biến môi trường — xem README.md mục Xử lý sự cố).

## 2. Năm cổng và endpoint chính

| Cổng (role) | Prefix | Endpoint chính |
|---|---|---|
| Học sinh (`student`) | `/student` | `overview`, `profile`, `recommendations` (gợi ý nhóm), `evaluations` (có `reviewer_role`), `assessments` + `assessments/compute`, `activities` + `activities/{id}/register`, `checkin`/`checkins`, `badges`, `certificates` (CRUD) |
| Giáo viên (`teacher`) | `/teacher` | `me`, `overview`, `classes` (CRUD lớp chủ nhiệm), `classes/{id}/students`, `activities` (CRUD sân chơi), `evaluations` (chấm rubric), `my-students` |
| Huấn luyện viên (`coach`) | `/teacher` (chung) | Dùng chung endpoint giáo viên nhưng bị chặn ở tác vụ GVCN (`/teacher/classes` trả 403 cho coach); xem được sân chơi của mình, chấm điểm được |
| Nhà trường (`school`) | `/school` | `overview`, `teachers`, `class-groups` (CRUD), `classes`, `coaches`, `study-groups` (CRUD + `/{id}/members`), `analysis`, `talent-analysis`, `reports`, `import/students` + `import/template` |
| Doanh nghiệp (`enterprise`) | `/enterprise` | `overview`, `talents`, `invite`, `internships` (CRUD + `/{id}/applicants`), `projects`, `sponsorships` (CRUD) |
| Chung | `/auth`, `/passport`, `/ai` | `auth/register`, `auth/login`, `auth/me`, `auth/logout`, `auth/logout-all`; `passport/{student_id}` (Talent Passport); `ai/analyze`, `ai/roadmap`, `ai/chat`, `ai/suggestions` (gọi Gemini/Anthropic từ backend) |

Phân quyền đã siết: thiếu `Authorization` → **401**; token hợp lệ nhưng sai vai
trò → **403**; đúng vai trò → **200**. Mọi kiểm thử đều gửi token.

## 3. Mô hình dữ liệu (30 bảng)

Nhóm bảng chính trong `backend/app/models.py`:

- **Người dùng**: `users` (id, role, full_name, email unique, password_hash) +
  `auth_tokens` (token, user_id, expires_at). Hồ sơ theo vai trò dùng **cùng id**
  với `users.id`: `students`, `teachers`, `schools`, `coaches`, `enterprises`.
- **Lớp và nhóm**: `class_groups` (name unique, grade, homeroom_teacher_id),
  `teacher_class_assignments`, `study_groups` (name, field, grade, coach_id),
  `study_group_members` (group_id, student_id).
- **Năng lực**: `skills`, `student_skills` (level 0–10), `talent_assessments`
  (test_type, result_json), `test_questions`, `badges`, `student_badges`,
  `talent_passports`, `certificates`, `ai_suggestions`.
- **Hoạt động và đánh giá**: `activities` (teacher_id, field, status...),
  `activity_registrations`, `check_ins`, `evaluations` (teacher_id, student_id,
  rubric 40/20/20/20), `projects`, `project_members`.
- **Doanh nghiệp**: `internship_posts`, `internship_applications`,
  `sponsorships`, `interview_invitations`.

Quan hệ đáng chú ý: `Activity.teacher_id` và `Evaluation.teacher_id` đều trỏ
tới `teachers.id` (kể cả khi người tạo/chấm là huấn luyện viên — xem mục 5).

## 4. Vì sao `Student.class_name` lưu chuỗi thay vì khoá ngoại (và hệ quả)

`students.class_name` là `String(40)` chứa tên lớp (ví dụ `"10A1"`), **không**
phải FK tới `class_groups.id`. Học sinh được "xếp lớp" bằng cách so khớp cặp
`(class_name, grade)` với `(ClassGroup.name, ClassGroup.grade)` — ví dụ
`list_classes` đếm học sinh bằng
`Student.class_name == c.name AND Student.grade == c.grade`.

Hệ quả phải nhớ khi sửa code:

1. **Đổi tên/khối lớp phải đồng bộ học sinh**: mọi endpoint rename lớp
   (`PUT /teacher/classes/{id}`, `PUT /school/class-groups/{id}`) đều phải
   update các `Student` khớp tên+khối cũ, nếu không học sinh "rơi khỏi lớp".
2. **Xoá lớp còn học sinh bị chặn 409** — vì xoá `ClassGroup` không kéo theo
   `Student` (không có FK cascade), để lại chuỗi `class_name` mồ côi.
3. **Tên lớp là unique toàn cục** (`ClassGroup.name` unique), không chỉ unique
   trong khối — trùng tên ở khối khác cũng 409.

## 5. Luồng xác thực token

1. `POST /auth/register` — validate theo role (ví dụ coach bắt buộc
   `specialty`), tạo `users` + dòng hồ sơ tương ứng, tạo token ngẫu nhiên
   (`secrets.token_hex(24)`) lưu vào `auth_tokens` kèm `expires_at`
   (mặc định 7 ngày, env `TOKEN_TTL_DAYS` trong `backend/app/security.py`).
   Mật khẩu hash PBKDF2-HMAC-SHA256 + salt 16 byte
   (env `PBKDF2_ITERATIONS`, mặc định 240000); hash cũ dạng
   `sha256("fth_" + password)` vẫn đăng nhập được và được tự nâng cấp lên
   PBKDF2 trong lần đăng nhập đúng mật khẩu đó.
2. `POST /auth/login` — kiểm tra email + mật khẩu; sai quá 5 lần trong 10 phút
   thì bị chặn chống dò (theo docstring `routers/auth.py`). Thành công thì cấp
   token mới và trả kèm `user` (gồm `role`, `profile_id`, `detail`).
3. Mọi request cần quyền gửi `Authorization: Bearer <token>`. Router tra
   `auth_tokens` → `users`, kiểm tra `expires_at` và `role`, rồi mới cho qua.
4. `GET /auth/me` trả user hiện tại; `POST /auth/logout` thu hồi token;
   `POST /auth/logout-all` thu hồi toàn bộ token của user.
5. Frontend lưu token vào `localStorage` (key `fth_token`, xem
   `frontend/src/api/client.ts`) và tự gắn vào mọi request.

## 6. Quyết định thiết kế đáng ghi lại

- **Huấn luyện viên có dòng `teachers` ẩn**: vì `Activity.teacher_id` và
  `Evaluation.teacher_id` là FK tới `teachers.id`, lúc đăng ký coach backend tạo
  thêm một dòng `teachers` cùng id (xem docstring class `Coach` trong
  `models.py`). Dòng ẩn này KHÔNG mang ý nghĩa GVCN — mọi truy vấn danh sách
  giáo viên (`GET /school/teachers`, `GET /teacher/classes`) đều phải lọc theo
  `User.role == "teacher"`, và coach bị 403 ở endpoint lớp chủ nhiệm.
- **GVCN lấy từ `ClassGroup.homeroom_teacher_id` làm nguồn chân lý**:
  `GET /school/teachers` suy ra `is_homeroom` từ phân công thực tế
  (`ClassGroup.homeroom_teacher_id` + `TeacherClassAssignment`), không tin cột
  `teachers.is_homeroom`. Gán/bỏ GVCN qua `POST/PUT /school/class-groups`.
- **Migration nhẹ lúc khởi động**: `database.py::_run_migrations()` chạy các
  `ALTER TABLE ... ADD COLUMN` dạng idempotent (bắt exception rồi bỏ qua nếu cột
  đã tồn tại) trước `create_all`. Đủ cho SQLite demo; lên production với
  PostgreSQL nên chuyển sang Alembic (xem `docs/PRODUCTION-CHECKLIST.md`).
- **Seed là nguồn dữ liệu demo duy nhất**: `python -m app.seed` (chạy từ thư
  mục `backend`) tạo ~40 học sinh, 5 tài khoản demo (mật khẩu `demo123`), kỹ
  năng, hoạt động, đánh giá rải 6 tháng cho KPI/trend. Chạy lại seed trên DB
  đang có dữ liệu có thể trùng email → cách làm sạch xem README.md mục Xử lý
  sự cố.
