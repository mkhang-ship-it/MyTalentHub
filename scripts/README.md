# Kiểm thử FTalentHub

Bộ kiểm thử nằm ngay trong repo để chạy lại được bất cứ lúc nào — thay cho các
script tạm trong `/tmp`. **Chỉ dùng thư viện chuẩn** (`unittest`, `urllib`,
`sqlite3`, `argparse`) — không cài thêm package, không dùng `pytest`.

## 1. Yêu cầu

- Backend đang chạy tại `http://127.0.0.1:8001` (tự reload; **không cần restart**
  khi chạy test). Nếu máy bạn dùng `python` thay `python3`, thay `python3` → `python`.
- Frontend (nếu kiểm FE): `:5174`.
- Biến môi trường optional: `QA_BASE_URL` (đổi API base, mặc định
  `http://127.0.0.1:8001/api/v1`).

## 2. Chạy bộ kiểm thử backend (`unittest`)

```bash
# từ thư mục backend (khuyến nghị)
cd backend
python3 -m unittest discover -s tests -t . -v

# hoặc từ thư mục gốc repo
python3 -m unittest discover -s backend/tests -t backend -v
```

- **Backend chưa chạy → toàn bộ `skip`** với thông báo rõ ràng (không fail đỏ):
  output `OK (skipped=...)`.
- Phải ra `Ran N tests ... OK`.
- `tests/test_api_smoke.py` — kiểm thử khói: health, hợp đồng phân quyền
  (401/403/200), shape của profile/evaluations/recommendations/passport/teacher-me.
- `tests/test_business_rules.py` — quy tắc nghiệp vụ: tạo/xoá lớp (409/422),
  rubric chấm điểm, CRUD chứng chỉ, nhóm học tập + chỉ số gộp, phân công GVCN,
  đăng ký coach thiếu `specialty`. Test cuối (`test_zz_baseline_restored`)
  xác nhận `class_groups` về đúng **7 dòng gốc** (10A1, 10A2, 11B1, 11B2,
  12C1, 12C2, 12) và không còn dữ liệu `QA` sót.

## 3. Chạy nhanh 1 lệnh (`scripts/qa.py`)

```bash
python3 scripts/qa.py                # in bảng PASS/FAIL, exit 0 nếu tất cả PASS
python3 scripts/qa.py --json         # xuất JSON (mảng các {check, ok, detail})
python3 scripts/qa.py --base http://127.0.0.1:8001/api/v1
```

- ~10 giây, ~24 kiểm tra quan trọng nhất (hợp đồng phân quyền + shape dữ liệu
  + vệ sinh dữ liệu trong DB).
- **Exit code khác 0 khi có FAIL** (kể cả backend chết) — dùng được trong CI.
- `--json` chỉ xuất JSON ra stdout (không in bảng), vẫn giữ exit code.

## 3b. Đo hiệu năng mặt đọc (`scripts/loadtest.py`)

```bash
python3 scripts/loadtest.py                                # 20 req/endpoint, 4 luồng
python3 scripts/loadtest.py --requests 50 --concurrency 8  # tăng tải (đừng làm trên máy dùng chung)
python3 scripts/loadtest.py --json                         # xuất JSON
python3 scripts/loadtest.py --p95-max 800                  # đổi ngưỡng p95 (ms)
```

- Chỉ thư viện chuẩn (`urllib`, `statistics`, `ThreadPoolExecutor`), tự đăng
  nhập lấy token thật, đo 5 endpoint GET, báo median/p95/p99/max và lỗi theo
  endpoint. `--role student|teacher|school` ép mọi endpoint dùng 1 vai trò
  (403 lúc đó là bình thường — dùng để kiểm tra RBAC dưới tải).
- **Exit code khác 0 khi p95 vượt `--p95-max`** (mặc định 500ms).
- **Số đo phụ thuộc dữ liệu seed (~40 học sinh), KHÔNG đại diện production**
  — script luôn in cảnh báo này; đừng trích bảng số làm cam kết hiệu năng.

## 3c. Chạy trọn bộ như CI (`scripts/ci-local.sh`)

```bash
./scripts/ci-local.sh             # đủ 6 bước, dừng ngay khi bước đầu đỏ
./scripts/ci-local.sh --fast      # bỏ qua Playwright để lặp nhanh
./scripts/ci-local.sh --clean-env # mô phỏng "máy sạch" (giấu tạm backend/talenthub.db)
```

- Chạy đúng thứ tự CI: backend unittest → `qa.py` → `tsc` → `eslint src tests`
  → `vite build` → `playwright test` (chế độ cách ly `CI=true`, server riêng
  `:8101`/`:5175`, không đụng server dev `:8001`/`:5174`).
- Mỗi bước in thời gian chạy; cuối cùng in bảng tổng kết; exit khác 0 nếu bước
  nào đỏ. Trước bước Playwright, script kiểm tra không có tiến trình
  `playwright test` nào khác (hai bộ song song giẫm `test-results`).
- Cờ `--clean-env` dùng để bắt lỗi "chạy được trên máy tôi nhưng fail trên CI"
  (test phụ thuộc file `backend/talenthub.db` mà file đó bị `.gitignore` nên
  không có trong kho mã). Script cảnh báo trước khi giấu, và LUÔN khôi phục
  file + kiểm md5 kể cả khi có bước đỏ (trap). Chế độ này bỏ qua `qa.py` vì
  `qa.py` cần DB thật đang chạy (vừa gọi server vừa đọc trực tiếp file).
- Đã dùng cờ này để xác nhận bản sửa trong dự án: `backend/tests/base.py` tự
  seed DB tạm bằng `app.seed` khi thiếu file, Playwright cách ly cũng tự seed
  — nên `--clean-env` phải xanh; đỏ nghĩa là lại có test mới phụ thuộc file
  cục bộ (ví dụ hiện tại: `tests/test_audit_log.py` đỏ do bug `self.user`
  trong chính test, không phải do thiếu DB — `ci-local.sh` chỉ báo, không sửa).

## 4. Endpoint nào cần token / không cần token

**Không cần token (công khai / demo):**

| Endpoint | Ghi chú |
|---|---|
| `GET /api/v1/health` | health check |
| `POST /api/v1/auth/login`, `POST /api/v1/auth/register` | xác thực |
| `GET /api/v1/passport/{id}` | Talent Passport demo |
| `GET /api/v1/school/overview`, `/school/analysis`, `/school/reports`, `/school/classes`, `/school/talent-analysis` | dữ liệu tổng hợp, hiện công khai |
| `GET /api/v1/teacher/overview`, `/teacher/activities`, `/teacher/my-students` | không token → fallback giáo viên demo |
| `POST /api/v1/teacher/evaluations` | không token → ghi cho GV mặc định (**test vẫn luôn gửi token**) |
| `GET /api/v1/student/*` (`overview`, `profile`, `evaluations`, `recommendations`, `activities`, `badges`, ...) | hiện công khai — **đang siết phân quyền**, mọi test luôn gửi token |

**Bắt buộc token (không token → 401):**

| Endpoint | Token đúng | Sai vai trò |
|---|---|---|
| `GET /api/v1/teacher/classes` | teacher (coach → 403) | 403 |
| `POST/PUT/DELETE /api/v1/teacher/classes*` | teacher | 403 |
| `GET /api/v1/teacher/me` | teacher hoặc coach | 403 |
| `GET /api/v1/school/teachers` | school | 403 |
| `GET /api/v1/school/class-groups` | school | 403 |
| `GET /api/v1/school/coaches` | school | 403 |
| `GET /api/v1/school/study-groups` + `POST/PUT/DELETE` | school | 403 |

**Hợp đồng test theo đúng thế này:** không `Authorization` → **401**;
token hợp lệ nhưng sai vai trò → **403**; đúng vai trò → **200**.
Vì một số endpoint đọc công khai cũ vẫn trả 200 khi thiếu token,
**mọi test phải luôn gửi token** — trừ case kiểm tra 401 có chủ đích.

Tài khoản demo (mật khẩu đều là `demo123`):

| Vai trò | Email |
|---|---|
| student | `hs01@ftalenthub.edu.vn` |
| teacher | `nguyen.van.hung@ftalenthub.edu.vn` |
| coach | `hlv.boi@ftalenthub.edu.vn` |
| school | `bgh@ftalenthub.edu.vn` |
| enterprise | `hr@techfpt.vn` |

## 5. Quy ước khi viết test mới

- Test phải **tự tạo dữ liệu riêng rồi tự dọn** trong `tearDown`/`addCleanup`
  để chạy 2 lần liên tiếp vẫn xanh:
  - lớp học / nhóm học tập đặt tên tiền tố **`QA-`**
  - chứng chỉ đặt tiêu đề tiền tố **`QA `** (kèm khoảng trắng)
  - tài khoản test dùng email `qa.coach@ftalenthub.edu.vn`
- Dọn bằng API trước; chỉ dùng `sqlite3` (thư viện chuẩn) để quét phòng hờ
  và kiểm baseline. File DB: `backend/talenthub.db`.
- **KHÔNG sửa file trong `backend/app`** — phát hiện bug ứng dụng thì ghi vào
  báo cáo, không tự sửa.
- **KHÔNG chạy `git checkout / restore / stash / reset / clean / commit / revert`**
  — chỉ `git status` / `git diff` để xem; coordinator tự commit.

## 6. Kiểm thử chất lượng Frontend

Bộ hiện có (không thêm test framework mới):

```bash
cd frontend
npx tsc --noEmit                 # TypeScript: 0 error
npx eslint src --max-warnings 0  # ESLint: 0 warning
npx vite build                   # Build: phải ra "✓ built in ..."
```

## 7. Chạy kiểm thử trong Docker (không cần cài Python/Node ở máy)

```bash
docker compose up --build -d   # dựng api + web nền
docker compose logs -f         # xem log gộp
docker compose exec api python -m unittest discover -s tests -t . -v
docker compose down            # dừng, GIỮ dữ liệu trong volume sqlite-data
```

- Web: http://localhost:5173 · API: http://localhost:8001/api/v1/health.
- `docker compose down -v` sẽ **xoá** volume (mất dữ liệu demo) — cân nhắc kỹ.
