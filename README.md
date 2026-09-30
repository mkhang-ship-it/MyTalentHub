# FTalentHub

Nền tảng phát hiện và phát triển năng lực cho học sinh, với **5 cổng vai trò**:
Học sinh, Giáo viên, Huấn luyện viên, Nhà trường và Doanh nghiệp — kèm Talent
Passport, gợi ý nhóm học tập theo năng khiếu, chấm điểm rubric và gợi ý AI.

## Công nghệ

- **Backend**: FastAPI + SQLAlchemy 2.0 + SQLite (`backend/talenthub.db`), prefix
  API `/api/v1`. Gọi Gemini/Anthropic từ backend cho gợi ý năng khiếu và lộ trình.
- **Frontend**: React 18 + Vite 6 + TypeScript + Tailwind, React Router,
  `lucide-react`, Three.js cho một số khối trực quan.
- **Kiểm thử**: `unittest` thư viện chuẩn cho backend, `scripts/qa.py` kiểm nhanh,
  `tsc` + `eslint` + `vite build` cho frontend.
- **Vận hành**: Dockerfile multi-stage + `docker-compose.yml` (nginx proxy `/api`),
  CI trên GitHub Actions.

## Yêu cầu

- Python **3.12+** (repo đang dùng 3.12).
- Node.js **20+** (Vite 6 yêu cầu Node 20.19+).
- SQLite đi kèm Python, không cần cài thêm.
- (Optional) Docker, nếu muốn chạy bằng `docker compose`.

## Cài đặt và chạy ở máy

Cách nhanh nhất — một script dựng cả hai (chờ healthy rồi mới in URL):

```bash
./scripts/dev.sh
# Backend : http://localhost:8001 · Frontend: http://localhost:5174
# Nhấn Ctrl+C để dừng sạch cả hai (không để tiến trình mồ côi).
# Cổng bị chiếm? BACKEND_PORT=8009 FRONTEND_PORT=5179 ./scripts/dev.sh
# Dừng từ terminal khác: ./scripts/dev-stop.sh
```

Lần đầu cần chuẩn bị một lần (tạo venv + cài phụ thuộc + seed DB):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed   # tạo DB + dữ liệu demo (chỉ cần chạy lần đầu)
cd ..
./scripts/dev.sh
```

<details>
<summary>Cách thủ công (không dùng script)</summary>

```bash
# 1. Backend — cổng 8001
cd backend
source .venv/bin/activate   # hoặc python3 -m venv .venv && pip install -r requirements.txt nếu chưa có
python -m uvicorn app.main:app --port 8001
# Kiểm tra: http://127.0.0.1:8001/api/v1/health → {"status": "ok", ...}

# 2. Frontend — cổng 5174 (mở terminal khác, ở gốc repo)
cd frontend
npm install   # chỉ lần đầu
VITE_PORT=5174 VITE_API_PROXY=http://127.0.0.1:8001 npm run dev -- --host 127.0.0.1
# Mở: http://localhost:5174
```

</details>

Giải thích hai biến của frontend (xem `frontend/vite.config.ts`):

- `VITE_PORT` — cổng dev server (mặc định trong file là 5173; dự án dùng 5174).
- `VITE_API_PROXY` — URL backend để Vite proxy mọi request `/api` tới
  (mặc định trong file là `http://127.0.0.1:8000`; backend dev chạy 8001 nên
  **bắt buộc** đặt `VITE_API_PROXY=http://127.0.0.1:8001`, nếu không trang đăng
  nhập sẽ lỗi — xem mục Xử lý sự cố).

## Biến môi trường (backend)

Mọi biến đều có mặc định trong code — thiếu `.env` app vẫn chạy. Mẫu đầy đủ
xem `.env.example` ở gốc repo.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origin frontend cho phép, phân tách dấu phẩy. Không bao giờ để `*` khi kèm credentials. |
| `ACCESS_TOKEN_TTL_MINUTES` | `60` | Hạn access token (phút). Hết hạn thì client gọi `POST /auth/refresh` đổi cặp mới, không bắt đăng nhập lại. |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Hạn refresh token (ngày). Mỗi lần dùng sẽ xoay vòng: token cũ bị thu hồi, dùng lại token đã xoay → 401 và cả họ token bị thu hồi (chống đánh cắp). |
| `TOKEN_TTL_DAYS` | `7` | Tương thích ngược cho token đời cũ. |
| `ALLOW_PUBLIC_REGISTER` | `true` | Dev/demo giữ `true`. Production đặt `false` để `POST /auth/register` trả 403 (chỉ tạo tài khoản bằng tay/seed). |
| `PBKDF2_ITERATIONS` | `240000` | Vòng băm PBKDF2-SHA256. Đổi giá trị không vỡ hash cũ vì số vòng lưu cùng hash. |
| `LOG_LEVEL` | `INFO` | Mức log uvicorn. |

## Tài khoản demo (mật khẩu đều là `demo123`)

| Vai trò | Email | Vào cổng |
|---|---|---|
| Học sinh | `hs01@ftalenthub.edu.vn` | `/student` |
| Giáo viên | `nguyen.van.hung@ftalenthub.edu.vn` | `/teacher` |
| Huấn luyện viên | `hlv.boi@ftalenthub.edu.vn` | `/coach` |
| Nhà trường | `bgh@ftalenthub.edu.vn` | `/school` |
| Doanh nghiệp | `hr@techfpt.vn` | `/enterprise` |

## Cấu trúc thư mục

```
.
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, prefix /api/v1, health check
│   │   ├── config.py        # đường dẫn DB (backend/talenthub.db)
│   │   ├── database.py      # engine/session, migration nhẹ lúc khởi động
│   │   ├── models.py        # ~30 bảng ORM (users, students, coaches, ...)
│   │   ├── schemas.py       # validate request/response
│   │   ├── security.py      # hash PBKDF2, TTL token, CORS (đọc env)
│   │   ├── seed.py          # python -m app.seed → dữ liệu demo
│   │   ├── routers/         # auth, student, teacher, school, enterprise, passport
│   │   └── ai/              # gợi ý AI (Gemini/Anthropic)
│   ├── tests/               # unittest: test_api_smoke, test_business_rules
│   ├── requirements.txt
│   └── talenthub.db         # SQLite (tạo tự động, không commit)
├── frontend/
│   ├── src/                 # pages/ (5 cổng), components/, api/client.ts, auth/
│   ├── Dockerfile + nginx.conf  # build Vite, nginx phục vụ dist + proxy /api
│   └── package.json         # dev/build/preview/lint
├── scripts/
│   ├── qa.py                # kiểm nhanh PASS/FAIL (~10 giây)
│   └── README.md            # tài liệu kiểm thử chi tiết
├── docs/
│   ├── ARCHITECTURE.md      # luồng request, 5 cổng, mô hình dữ liệu, auth
│   └── PRODUCTION-CHECKLIST.md  # việc cần làm trước khi lên production
├── .github/workflows/ci.yml    # CI: backend unittest, frontend tsc/eslint/build, docker build
├── Dockerfile               # backend multi-stage (python:3.12-slim, non-root)
├── Dockerfile.fullstack     # 1 container: nginx + uvicorn (đang deploy Render)
└── docker-compose.yml       # mặc định 1 service `app`; `--profile tach` cho bản 2 service
```

## Chạy kiểm thử

```bash
# Backend unittest (từ GỐC repo)
python3 -m unittest discover -s backend/tests -t backend -v
# hoặc: cd backend && python3 -m unittest discover -s tests -t . -v

# Kiểm nhanh API (yêu cầu backend đang chạy ở :8001)
python3 scripts/qa.py
python3 scripts/qa.py --json   # xuất JSON

# Chất lượng frontend
cd frontend
npx tsc --noEmit
npx eslint src --max-warnings 0
npx vite build
```

Chi tiết xem `scripts/README.md` (bảng endpoint cần token, quy ước dọn dữ liệu
khi viết test mới).

## Chạy bằng Docker

```bash
docker compose up --build -d   # dựng + chạy nền (1 container: nginx + uvicorn)
docker compose logs -f         # xem log gộp
docker compose down            # dừng, GIỮ dữ liệu SQLite trong volume
```

Bản 2 service tách riêng (cũ) vẫn dựng được nếu thêm `--profile tach` — nhưng
**đừng dùng trên Render**: Render sẽ biến service web thành Static Site và
mọi request `/api` trả 404. Xem `docs/DEPLOY-RENDER.md`.

- Web: http://localhost:5173 (nginx phục vụ `dist`, proxy `/api` về backend —
  không cần `VITE_API_PROXY`).
- API: http://localhost:8001/api/v1/health.
- **Lần đầu phải nạp dữ liệu demo** (volume mới chứa DB trống — `create_all` chỉ
  tạo schema, chưa có tài khoản nào):
  ```bash
  docker compose exec app python -m app.seed
  ```
- Dữ liệu SQLite sống trong volume `ftalenthub-sqlite` nên restart không mất;
  `docker compose down -v` sẽ **xoá** volume (mất dữ liệu) — cân nhắc kỹ.
- Không có Docker thì bỏ qua mục này và chạy tay theo mục Cài đặt ở trên.

## Xử lý sự cố

1. **Cổng 8000 hay bị tiến trình khác chiếm** → dự án dùng cổng **8001** cho
   backend và **5174** cho frontend. Luôn chạy
   `python -m uvicorn app.main:app --port 8001` (từ `backend/`) và
   `VITE_PORT=5174 ... npm run dev` (từ `frontend/`). Kiểm tra cổng trống bằng
   `lsof -i :8001` / `lsof -i :5174` trước khi chạy.
2. **Lỗi 500 ở trang đăng nhập** → thường do thiếu `VITE_API_PROXY`: Vite mặc
   định proxy `/api` về `http://127.0.0.1:8000` (xem `frontend/vite.config.ts`)
   trong khi backend chạy 8001. Chạy lại frontend với
   `VITE_API_PROXY=http://127.0.0.1:8001 npm run dev`. Mở DevTools → tab Network
   để xác nhận request đi tới cổng 8001.
3. **Chạy lại DB từ seed**: dừng backend, xoá file DB rồi seed lại từ đầu
   (làm **mất toàn bộ** dữ liệu hiện có):
   ```bash
   cd backend
   rm -f talenthub.db
   python -m app.seed
   ```
   Nếu chỉ muốn kiểm tra nhanh mà không động vào DB, dùng
   `python scripts/qa.py` (chỉ đọc, không ghi).

## Tài liệu thêm

- `docs/ARCHITECTURE.md` — luồng request, 5 cổng và endpoint chính, mô hình dữ
  liệu, luồng xác thực token, các quyết định thiết kế (dòng `teachers` ẩn của
  huấn luyện viên, GVCN, `class_name` dạng chuỗi).
- `docs/PRODUCTION-CHECKLIST.md` — biến môi trường bắt buộc, đổi mật khẩu demo,
  SQLite → PostgreSQL, backup, HTTPS, và danh sách thẳng thắn những hạng mục
  chưa làm.
- `scripts/README.md` — cách chạy kiểm thử, bảng endpoint cần/không cần token.
