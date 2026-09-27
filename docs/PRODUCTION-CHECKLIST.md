# Checklist trước khi lên production

Đánh dấu `[x]` khi xong. Mục nào chưa làm được thì nêu thẳng ở cuối file —
không giấu nợ kỹ thuật.

## 1. Biến môi trường bắt buộc (đồng bộ với code — xem `.env.example` đầy đủ)

- [ ] `CORS_ORIGINS` — danh sách origin frontend cho phép, phân tách dấu phẩy
      (đọc trong `backend/app/security.py`; mặc định chỉ có
      `http://localhost:5173` và `http://127.0.0.1:5173`). Production phải đặt
      đúng domain thật, **không** để `*` (lưu ý: `main.py` hiện vẫn
      `allow_origins=["*"]` — phải sửa trước khi public).
- [ ] `DATABASE_URL` — chuỗi kết nối SQLAlchemy (đọc trong
      `backend/app/config.py`; bỏ trống = SQLite). Sang PostgreSQL phải
      `pip install "psycopg[binary]"` thêm vì chưa có trong `requirements.txt`.
- [ ] `FRONTEND_URL` — URL frontend thật để dựng link mail (mặc định
      `http://127.0.0.1:5174` trong `routers/auth.py`).
- [ ] `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` —
      SMTP thật để gửi mail (mặc định rỗng = chế độ outbox, chỉ dùng dev/test).
- [ ] `MAIL_TO_OUTBOX` — production **bắt buộc `false`** (mặc định `true` khi
      không có `SMTP_HOST`). Để `true` ở production thì link đặt lại mật khẩu
      nằm trong `backend/outbox/` cho bất kỳ ai đọc đĩa/log cũng thấy.
- [ ] `ALLOW_PUBLIC_REGISTER` — production đặt **`false`** (mặc định `true`;
      `false` thì `POST /auth/register` trả 403).
- [ ] `ALLOW_UNVERIFIED_EMAIL` — production cân nhắc `false` (mặc định `true`
      để dev/CI không bị chặn).
- [ ] `ACCESS_TOKEN_TTL_MINUTES` (`60`) / `REFRESH_TOKEN_TTL_DAYS` (`30`) /
      `TOKEN_TTL_DAYS` (`7`, tương thích ngược) — hạn token.
- [ ] `VERIFY_TOKEN_TTL_MINUTES` (`1440`) / `RESET_TOKEN_TTL_MINUTES` (`30`) —
      hạn link xác minh email / đặt lại mật khẩu.
- [ ] `LOG_LEVEL` — mức log (mặc định `INFO`; truyền vào compose qua
      `${LOG_LEVEL:-INFO}`, service đọc ở entrypoint uvicorn `--log-level`).
- [ ] `PBKDF2_ITERATIONS` — vòng băm mật khẩu (mặc định `240000`; máy yếu có
      thể hạ, máy khoẻ có thể tăng — đổi giá trị không làm vỡ hash cũ vì số
      vòng được lưu cùng hash).
- [ ] `CONTACT_EMAIL` — email liên hệ hiển thị trong app (mặc định
      `bgh@ftalenthub.edu.vn`).
- [ ] `VITE_API_PROXY` — (chỉ lúc dev) URL backend cho Vite proxy `/api`
      (ví dụ `http://127.0.0.1:8001`); khi chạy qua nginx trong Docker thì
      không cần vì nginx đã proxy `/api` về service `api`.

## 2. Tài khoản và dữ liệu

- [ ] Đổi toàn bộ mật khẩu demo (`demo123`) của 5 tài khoản:
      `hs01@ftalenthub.edu.vn`, `nguyen.van.hung@ftalenthub.edu.vn`,
      `hlv.boi@ftalenthub.edu.vn`, `bgh@ftalenthub.edu.vn`, `hr@techfpt.vn`.
- [ ] Xoá tài khoản thử nghiệm (tài khoản tạo tay lúc kiểm thử, token còn hạn
      trong `auth_tokens`).
- [ ] Quyết định giữ hay seed lại DB: DB demo chứa ~40 học sinh giả — không được
      mang lên production.

## 3. Cơ sở dữ liệu
- [x] Sao lưu `backend/talenthub.db` trước mỗi lần nâng cấp: dùng
      `scripts/backup.sh` (sqlite3 `.backup` online + nén `.db.gz` vào
      `backend/backups/`, giữ 7 bản mới nhất, tự kiểm integrity sau khi sao
      lưu; khôi phục bằng `bash scripts/backup.sh --restore <file.db.gz>` —
      chỉ thay DB khi integrity đạt, giữ bản `.bak` để lui). **Không dùng `cp`
      trực tiếp lên DB đang chạy** — cp lúc server đang ghi sẽ tạo bản hỏng.
- [ ] CẢNH BÁO BẢO MẬT: file backup chứa **mật khẩu băm của mọi tài khoản**
      (kể cả 5 demo). `backup.sh` đã tự `chmod 600` mọi file tạo ra — giữ
      nguyên, không nới quyền; **không commit file backup lên kho mã, không
      đưa lên nơi chia sẻ công khai** (lưu ý: `*.db.gz` hiện chưa có trong
      `.gitignore` — đừng `git add` thư mục `backend/backups/`).
- [ ] `DATABASE_URL` hỗ trợ PostgreSQL (P4 vòng 3): code đã đọc biến này
      (`config.py`: bỏ trống = SQLite, đặt URL là chuyển qua, `CONNECT_ARGS`
      tách riêng cho SQLite) — nhưng production còn thiếu: `pip install
      "psycopg[binary]"` (chưa có trong `requirements.txt`), chuyển migration
      nhẹ `_run_migrations()` sang Alembic, và backup point-in-time thay vì
      copy file. Chưa kiểm chứng chạy thật với Postgres.
  - SQLite chỉ cho 1 writer tại một thời điểm — nhiều giáo viên chấm điểm cùng
    lúc dễ gặp `database is locked`;
  - Không có migration quản lý phiên bản (hiện chỉ có `_run_migrations()` dạng
    `ALTER TABLE` thử-sai lúc khởi động + `create_all`);
  - Backup/restore thủ công bằng copy file, khó point-in-time recovery.
  - Nếu đổi: chuyển sang Alembic, đưa `DB_URL` ra biến môi trường thay vì đường
    dẫn cứng trong `backend/app/config.py`.

## 4. Vận hành

- [x] HTTPS (P4 vòng 3): TLS kết thúc ở reverse proxy ngoài hoặc ở chính nginx
      bằng `frontend/nginx.tls.conf` (redirect 80→443, chứng thư mount ngoài,
      HSTS + đủ security header, `client_max_body_size 5m` cho import CSV);
      bản dev `frontend/nginx.conf` giữ chạy HTTP trần + rate limit login.
      Chi tiết chọn mô hình + kiểm tra header xem `docs/DEPLOY.md` mục 1 và 4.
- [x] Quên mật khẩu / xác minh email (vòng 3, đã có trong code — P4 kiểm chứng
      luồng): `POST /auth/forgot-password` (email không tồn tại vẫn 200 chung
      chung, không lộ), `POST /auth/reset-password` (hạn `RESET_TOKEN_TTL_MINUTES`
      = 30 phút), `GET /auth/verify-email` + `POST /auth/verify-email/resend`.
      Production phải đặt SMTP thật + `MAIL_TO_OUTBOX=false` + `FRONTEND_URL`
      đúng domain (xem CẢNH BÁO ở mục 1 và `docs/DEPLOY.md` mục 3–4).
- [x] Giới hạn tài khoản đăng ký công khai — ĐÃ CÓ: `ALLOW_PUBLIC_REGISTER=false`
      trong `backend/app/config.py` khiến `POST /auth/register` trả 403 kèm thông
      điệp tiếng Việt (`routers/auth.py`). Production đặt `false` rồi duyệt tay,
      hoặc thêm captcha/email xác thực.
- [x] Đặt rate limit ở tầng reverse proxy cho `/auth/login`:
      `frontend/nginx.conf` có `limit_req_zone` 5 req/phút/IP + burst 5,
      vượt quá trả **429** (`limit_req_status 429`), chỉ áp cho
      `location = /api/v1/auth/login` để không chặn nhầm endpoint khác giờ cao
      điểm. Đây là lớp thứ hai sau chặn 5 lần sai/10 phút trong code.
- [x] Chuẩn bị log cho thu thập tập trung (P4 — vòng 2):
  - Định dạng log đã chốt để parse (ghi trong `ops/logrotate-ftalenthub.conf`
    đầu file): access log uvicorn
    (`INFO: 127.0.0.1:port - "GET /path HTTP/1.1" 200`), vòng đời uvicorn
    (`Started server process / Uvicorn running on / Shutting down`), logger
    `ftalenthub` (`2026-09-27 17:14:14 INFO ftalenthub [rid=...] ...`) với mỗi
    request một dòng `METHOD path -> status X.Xms request_id=...` (5xx ở mức
    ERROR, response kèm header `X-Request-ID` để đối chiếu).
  - Có sẵn `ops/logrotate-ftalenthub.conf` (copy vào `/etc/logrotate.d/`,
    `copytruncate` vì uvicorn giữ fd mở) cho trường hợp gom log ra
    `/var/log/ftalenthub/*.log`. Mặc định dev.sh ghi ra
    `/tmp/ftalenthub-dev-{api,web}.log`, Docker ghi ra stdout.
- [ ] Nối log vào Loki/CloudWatch + đặt cảnh báo khi 5xx tăng đột biến (phần
      dây nối phía hạ tầng, chưa làm).
- [x] Khoá CORS — ĐÃ LÀM ở lô 4: `main.py` dùng `allow_origins=cors_origins()`
      (`backend/app/security.py`) thay vì `["*"]`; hàm này lọc bỏ mọi origin
      `"*"` và fallback về localhost khi env trống. Production vẫn phải đặt
      `CORS_ORIGINS` đúng domain thật (xem mục 1).

## 5. Những hạng mục CHƯA làm (nêu thẳng)


- [x] Gửi email xác thực / quên mật khẩu — ĐÃ CÓ ở vòng 3 (P4 kiểm chứng luồng):
      `POST /auth/forgot-password` (email lạ vẫn 200 chung chung, không lộ),
      `POST /auth/reset-password` (hạn `RESET_TOKEN_TTL_MINUTES` = 30 phút),
      `GET /auth/verify-email` + `POST /auth/verify-email/resend`, gửi thật qua
      SMTP (`backend/app/mailer.py`, cấu hình `SMTP_*` trong `config.py`);
      không SMTP thì ghi `backend/outbox/*.html` (chỉ dev/test — production bắt
      buộc SMTP thật + `MAIL_TO_OUTBOX=false`, xem CẢNH BÁO mục 1).
- [ ] Chưa có quản lý ảnh/avatar upload (mới chỉ có trường `avatar_url` dạng
      chuỗi; không có endpoint `UploadFile`/multipart nào).
- [x] Chưa có theo dõi/log tập trung và dashboard cảnh báo → đã làm một nửa
      (P4 vòng 2): định dạng log + `ops/logrotate-ftalenthub.conf` xong (xem
      mục 4); còn thiếu dây nối Loki/CloudWatch, dashboard và cảnh báo 5xx.
- [x] Kiểm thử tự động ở tầng giao diện — ĐÃ CÓ (P4 đếm thật trong code):
      `frontend/tests/` có 4 spec Playwright (`auth`, `navigation`,
      `password-reset`, `rbac`) nở thành **19 test** qua loop (auth 6 gồm 5 vai
      trò, navigation 7 gồm 5 luồng cổng, password-reset 3, rbac 3), chạy trong
      CI ở job "Giao diện (Playwright)" (`npx playwright test`, chromium
      headless). Còn thiếu: E2E đầy đủ cho luồng nghiệp vụ dài
      (đăng ký → chấm điểm → xem báo cáo); đo hiệu năng mặt đọc xem
      `scripts/loadtest.py`.
- [x] Kiểm thử tải (load test) — ĐÃ CÓ (P4 vòng 4): `scripts/loadtest.py`
      (thư viện chuẩn urllib + statistics + ThreadPoolExecutor, không cài gì)
      đo 5 endpoint mặt đọc, báo median/p95/p99/max và lỗi theo endpoint,
      exit khác 0 khi p95 vượt ngưỡng (`--p95-max`, mặc định 500ms) để dùng
      trong CI. Kết quả đo thật trên DB seed: p95 các endpoint 7–14ms
      (chi tiết xem báo cáo vòng 4). Số này KHÔNG đại diện production —
      script luôn in cảnh báo đó.
- [x] Chưa có chiến lược backup tự động cho SQLite (mới chỉ là checklist tay)
      → đã có `scripts/backup.sh` (P4 vòng 2: `.backup` online, nén `.db.gz`,
      giữ 7 bản, tự kiểm integrity); còn thiếu cron/systemd timer chạy định kỳ
      trên máy production.

## 6. Tình trạng token đăng nhập (P1 — lô security, đã kiểm chứng)

- [x] Token có hạn dùng: `AuthToken.expires_at` (UTC naive), login/register cấp
      mới với hạn `TOKEN_TTL_DAYS` (mặc định `7` ngày); migration trong
      `backend/app/database.py::_run_migrations()` thêm cột idempotent và backfill
      `+7 days` cho token legacy chưa có hạn.
- [x] Mọi nơi xác thực token đều từ chối token hết hạn bằng 401
      `"Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."` qua helper dùng
      chung `backend/app/security.py::resolve_token_user` (auth, school,
      enterprise, passport, student, teacher). Không token → 401 `"Thiếu token"`,
      token lạ → 401 `"Phiên đăng nhập không hợp lệ"`, sai vai trò → 403.
- [x] `POST /auth/logout-all` xoá toàn bộ token của user đang đăng nhập.
- [x] Dọn token hết hạn: `security.purge_expired_tokens()` chỉ xoá dòng có
      `expires_at` đã quá hạn (giữ nguyên token còn hiệu lực và token legacy),
      được gọi 1 lần mỗi lần khởi động server cuối `_run_migrations()`.
      Đã kiểm chứng: chèn 1 token hết hạn + 1 token còn hạn → purge xoá đúng 1.
- [x] Test tự động `backend/tests/test_rbac_guard.py` duyệt route từ
      `app.main:app` (không hard-code): 34 route /school/*, /enterprise/*,
      /passport/* đều 401 khi không token, 403 khi sai vai trò (passport: mọi
      vai trò đã đăng nhập đều 200 theo thiết kế QR công khai).
- [ ] Production vẫn nên đặt cron dọn `auth_tokens` định kỳ nếu server chạy
      liên tục nhiều tuần không restart (purge hiện chỉ chạy lúc khởi động).
- [x] Refresh token + TTL ngắn — ĐÃ CÓ: `routers/auth.py` cấp cặp access/refresh
      (chỉ lưu hash refresh trong bảng `refresh_tokens`,
      `security.py::new_refresh_expiry`), access token mặc định
      `ACCESS_TOKEN_TTL_MINUTES=60` (đọc thật trong `security.py`),
      refresh `REFRESH_TOKEN_TTL_DAYS=30`, `TOKEN_TTL_DAYS=7` chỉ còn tương thích
      ngược. Production siết thêm bằng env nếu muốn ngắn hơn.

## 7. Docker (P4 — chưa build thử được)

- [ ] Docker **CHƯA build thử được**: máy dev hiện tại không cài Docker
      (`which docker` rỗng) nên `Dockerfile`, `frontend/Dockerfile` và
      `docker-compose.yml` mới chỉ được kiểm tra cú pháp (đọc tay + CI),
      chưa từng build/run thật. Bắt buộc build thử thành công trên máy có
      Docker trước khi dùng để deploy.
- [ ] Lệnh kiểm chạy khi đã có Docker (từ gốc repo):
      `docker compose up --build -d` → chờ `docker compose ps` báo cả hai
      service healthy → `curl http://localhost:8001/api/v1/health` và mở
      http://localhost:5173 → nạp dữ liệu demo lần đầu
      `docker compose exec api python -m app.seed` → xong `docker compose down`
      (giữ volume) và xác nhận restart không mất dữ liệu.

## 8. Công cụ vận hành (P4 — vòng 1+2, đã xong và chạy thử)

- [x] `scripts/dev.sh` — một lệnh dựng backend `:8001` + frontend `:5174`
      (chờ healthy mới in URL, Ctrl+C dọn sạch, cổng ghi đè bằng
      `BACKEND_PORT`/`FRONTEND_PORT`, `VITE_API_PROXY` trỏ đúng backend).
- [x] `scripts/dev-stop.sh` — dừng đúng PID trong pidfile, quét và báo
      listener còn sót mà không tự kill (an toàn khi có server người khác).
- [x] `scripts/backup.sh` — sao lưu online, nén, giữ 7 bản, tự kiểm integrity
      (thất bại exit khác 0); ví dụ cron mỗi đêm:
      `0 2 * * * /path/to/repo/scripts/backup.sh >> /var/log/ftalenthub/backup.log 2>&1`
      (cron chưa được cài sẵn — tự thêm trên máy production).
- [x] Vòng 1 (Dockerfile multi-stage + compose + nginx proxy, CI 3 job, README
      viết lại, `docs/ARCHITECTURE.md`, `.gitignore` bổ sung) đã xong; riêng
      mục 7 Docker vẫn chưa build thử (máy không có Docker).
