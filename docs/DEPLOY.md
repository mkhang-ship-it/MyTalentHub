# Triển khai production (qua reverse proxy)

Hạ tầng chuẩn: client → reverse proxy (kết thúc TLS) → `web` (nginx, HTTP nội
bộ) + `api` (uvicorn :8001, chỉ nghe nội bộ). Ứng dụng không tự làm TLS — nó
chỉ cần nhận đúng header `X-Forwarded-Proto`/`X-Forwarded-For` mà proxy gửi
xuống (nginx đã gắn sẵn hai header này khi proxy `/api`).

## 1. Chọn mô hình TLS

- **Khuyên dùng — TLS kết thúc ở proxy ngoài** (Cloudflare / ALB / Traefik /
  nginx hệ thống): dùng `frontend/nginx.conf` (bản dev, không TLS) cho service
  `web` như cũ. Không cần chứng thư trong container.
- **TLS kết thúc ở chính nginx của app**: dùng `frontend/nginx.tls.conf`
  (redirect 80→443, chứng thư, HSTS) bằng cách mount đè lúc chạy, không cần
  sửa Dockerfile:
  ```bash
  docker run -d -p 80:80 -p 443:443 \
    -v $PWD/frontend/nginx.tls.conf:/etc/nginx/conf.d/default.conf:ro \
    -v /etc/letsencrypt:/etc/nginx/tls:ro \
    fth-web
  ```
  Đổi `ssl_certificate*` trong file nếu cert không nằm ở `/etc/nginx/tls/`.
  Không commit key lên repo.

## 2. Thứ tự khởi động

1. Chuẩn bị volume DB (SQLite) hoặc database PostgreSQL + `DATABASE_URL`.
2. Dựng `api` trước, chờ healthy: `curl http://127.0.0.1:8001/api/v1/health`
   → `{"status":"ok",...}` (migration nhẹ + `create_all` chạy tự động).
3. Nạp dữ liệu lần đầu (DB mới): `docker compose exec api python -m app.seed`.
   Bỏ qua bước này trên DB production thật.
4. Dựng `web`, mở frontend, đăng nhập thử 1 tài khoản mỗi vai trò.
5. Chạy kiểm sau deploy ở mục 4.

Với `docker compose`: `docker compose up --build -d` (thứ tự đã có
`depends_on` + healthcheck; xem `docker-compose.yml`).

## 3. Biến môi trường BẮT BUỘC ở production

Tất cả đã được đọc thật trong code (không có biến "kế hoạch"). Mặc định dưới
đây lấy từ `backend/app/config.py`, `backend/app/security.py`, `.env.example`.

| Biến | Mặc định trong code | Đặt ở production |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | origin frontend thật, phân tách dấu phẩy, **không `*`** |
| `ALLOW_PUBLIC_REGISTER` | `true` | **`false`** (chặn `POST /auth/register` mở → 403) |
| `ALLOW_UNVERIFIED_EMAIL` | `true` | cân nhắc `false` để bắt xác minh email |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | rỗng (chế độ outbox) | SMTP thật (`SMTP_FROM` mặc định `no-reply@ftalenthub.edu.vn`) |
| `MAIL_TO_OUTBOX` | `true` khi không có `SMTP_HOST` | **`false`** — xem CẢNH BÁO dưới |
| `FRONTEND_URL` | `http://127.0.0.1:5174` | URL frontend thật (link mail dựng từ biến này) |
| `DATABASE_URL` | SQLite `backend/talenthub.db` | URL PostgreSQL nếu chuyển đổi — **phải** `pip install "psycopg[binary]"` thêm vì chưa có trong `requirements.txt` |
| `ACCESS_TOKEN_TTL_MINUTES` | `60` | giữ hoặc siết theo chính sách |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | giữ hoặc siết theo chính sách |
| `VERIFY_TOKEN_TTL_MINUTES` | `1440` (24h) | giữ hoặc siết |
| `RESET_TOKEN_TTL_MINUTES` | `30` | giữ hoặc siết |
| `LOG_LEVEL` | `INFO` | `INFO` (muốn chi tiết: `DEBUG`) |
| `CONTACT_EMAIL` | `bgh@ftalenthub.edu.vn` | email liên hệ thật |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` | rỗng | đặt nếu dùng gợi ý AI, bỏ qua nếu không |
| `PBKDF2_ITERATIONS` | `240000` | giữ nguyên (đổi không vỡ hash cũ) |

`VITE_PORT` / `VITE_API_PROXY` chỉ dùng lúc dev (`npm run dev`); chạy qua
nginx trong Docker thì không cần vì nginx đã proxy `/api`.

> ⚠️ CẢNH BÁO — `MAIL_TO_OUTBOX=true` ở production: khi không có SMTP, mọi thư
> xác minh/quên mật khẩu được ghi thành file `.html` trong `backend/outbox/`.
> Link đặt lại mật khẩu là bí mật tuyệt đối — ai có link là đổi được mật khẩu,
> mà file outbox thì bất kỳ ai đọc được log/đĩa server cũng thấy. Production
> **bắt buộc** SMTP thật + `MAIL_TO_OUTBOX=false`. Kiểm tra sau deploy: không
> được còn file mới nào trong `backend/outbox/` sau khi gửi thử một mail.

## 4. Kiểm tra đã cấu hình đúng

1. **Quên mật khẩu end-to-end**: `POST /api/v1/auth/forgot-password`
   `{"email": "<tài khoản thật>"}` → phải 200 với thông điệp chung (không lộ
   email tồn tại hay không — đã kiểm chứng), hộp thư thật nhận được link mang
   host đúng `FRONTEND_URL`, `backend/outbox/` không có file mới, link đổi mật
   khẩu thành công rồi hết hạn sau `RESET_TOKEN_TTL_MINUTES`.
2. **Header bảo mật**: `curl -sI https://<domain>/` phải có `strict-transport-
   security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`;
   `curl -sI https://<domain>/api/v1/health` phải 200.
3. **Đăng ký đã khóa**: `POST /api/v1/auth/register` vai trò bất kỳ phải 403
   khi `ALLOW_PUBLIC_REGISTER=false`.
4. **CORS**: request từ origin lạ phải bị trình duyệt chặn (không phải `*`).

## 5. Lùi nhanh nếu hỏng

1. `docker compose down` (giữ volume — dữ liệu không mất).
2. Khôi phục DB nếu migration/seed làm hỏng dữ liệu:
   `bash scripts/backup.sh --restore backend/backups/<file.db.gz>`
   (chỉ thay khi integrity đạt, giữ bản `.bak`; xem `scripts/backup.sh`).
3. Chạy lại image/tag hoặc commit trước đó đã biết tốt, kiểm lại mục 4.
4. Nếu chỉ hỏng frontend: rollback mỗi service `web`, giữ `api` chạy.
