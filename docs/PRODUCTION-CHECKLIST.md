# Checklist trước khi lên production

Đánh dấu `[x]` khi xong. Mục nào chưa làm được thì nêu thẳng ở cuối file —
không giấu nợ kỹ thuật.

## 1. Biến môi trường bắt buộc

- [ ] `CORS_ORIGINS` — danh sách origin frontend cho phép, phân tách dấu phẩy
      (đọc trong `backend/app/security.py`; mặc định chỉ có
      `http://localhost:5173` và `http://127.0.0.1:5173`). Production phải đặt
      đúng domain thật, **không** để `*` (lưu ý: `main.py` hiện vẫn
      `allow_origins=["*"]` — phải sửa trước khi public).
- [ ] `TOKEN_TTL_DAYS` — hạn token (mặc định `7`).
- [ ] `LOG_LEVEL` — mức log (mặc định `INFO`; truyền vào compose qua
      `${LOG_LEVEL:-INFO}`, service đọc ở entrypoint uvicorn `--log-level`).
- [ ] `PBKDF2_ITERATIONS` — vòng băm mật khẩu (mặc định `240000`; máy yếu có
      thể hạ, máy khoẻ có thể tăng — đổi giá trị không làm vỡ hash cũ vì số
      vòng được lưu cùng hash).
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
- [ ] Cân nhắc đổi SQLite sang PostgreSQL, vì:
  - SQLite chỉ cho 1 writer tại một thời điểm — nhiều giáo viên chấm điểm cùng
    lúc dễ gặp `database is locked`;
  - Không có migration quản lý phiên bản (hiện chỉ có `_run_migrations()` dạng
    `ALTER TABLE` thử-sai lúc khởi động + `create_all`);
  - Backup/restore thủ công bằng copy file, khó point-in-time recovery.
  - Nếu đổi: chuyển sang Alembic, đưa `DB_URL` ra biến môi trường thay vì đường
    dẫn cứng trong `backend/app/config.py`.

## 4. Vận hành

- [ ] Chạy sau HTTPS (TLS terminate ở reverse proxy/load balancer, không để
      uvicorn nghe trực tiếp Internet).
- [ ] Giới hạn tài khoản đăng ký công khai: endpoint `POST /auth/register`
      hiện cho phép tự đăng ký mọi vai trò (kể cả `school`, `enterprise`) —
      production nên tắt đăng ký mở, duyệt tay, hoặc thêm captcha/email xác thực.
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
- [ ] Khoá CORS như mục 1 (bỏ `allow_origins=["*"]` trong `main.py`).

## 5. Những hạng mục CHƯA làm (nêu thẳng)


- [ ] Chưa có gửi email xác thực / quên mật khẩu (không có mã SMTP nào trong
      repo; đặt lại mật khẩu hiện chỉ làm tay trong DB).
- [ ] Chưa có quản lý ảnh/avatar upload (mới chỉ có trường `avatar_url` dạng
      chuỗi; không có endpoint `UploadFile`/multipart nào).
- [x] Chưa có theo dõi/log tập trung và dashboard cảnh báo → đã làm một nửa
      (P4 vòng 2): định dạng log + `ops/logrotate-ftalenthub.conf` xong (xem
      mục 4); còn thiếu dây nối Loki/CloudWatch, dashboard và cảnh báo 5xx.
- [ ] Chưa có kiểm thử tự động ở tầng giao diện: `frontend/tests/` hiện chỉ có
      `verify-portals.spec.cjs` dạng screenshot smoke bằng Playwright (đăng nhập
      4 cổng, chụp ảnh, assert URL), chưa có E2E đầy đủ cho luồng nghiệp vụ
      (đăng ký → chấm điểm → xem báo cáo), và chưa chạy trong CI (job frontend
      của CI hiện mới chỉ tsc/eslint/build).
- [ ] Chưa có kiểm thử tải (load test) cho các endpoint chấm điểm/đăng ký hoạt
      động vào giờ cao điểm.
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
- [ ] Cân nhắc giảm TTL xuống 1 ngày + refresh token riêng cho production
      (hiện access token sống 7 ngày, đánh cắp token = toàn quyền 7 ngày).

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
