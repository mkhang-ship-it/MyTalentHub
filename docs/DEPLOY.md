# Triển khai production (1 container)

> **Hạ tầng đã đổi: 2 service → 1 service.** Bản cũ dựng `web` (nginx) + `api`
> (uvicorn) thành hai container. Cách đó **không dùng được trên Render**: Render
> tự tạo service web thành *Static Site* dù đã chọn runtime Docker, nên `/login`
> trả 404 và mọi `POST /api/v1/auth/login` đều 404. Chi tiết và cách sửa:
> [`docs/DEPLOY-RENDER.md`](DEPLOY-RENDER.md) (mục 0 kể lại bằng chứng).

Mô hình đang chạy trên production: **một container** (`Dockerfile.fullstack`)
chứa cả nginx lẫn uvicorn. nginx nghe :80, giữ `try_files` cho SPA, chuyển
`/api` xuống uvicorn :8001 trong cùng container. Ứng dụng không tự làm TLS —
Render kết thúc TLS và gửi xuống header `X-Forwarded-Proto`/`X-Forwarded-For`
(nginx đã gắn sẵn hai header này khi proxy `/api`).

Cấu hình nginx cho production là **`frontend/nginx.main.conf`** (phải có dòng
`include mime.types;` — thiếu dòng này thì mọi tài nguyên trả sai
`Content-Type` và trang trắng dù HTTP vẫn 200). `frontend/nginx.conf` là bản
dev, không dùng cho production.

## 1. Chọn mô hình TLS

- **Khuyên dùng — TLS kết thúc ở proxy ngoài** (Render / Cloudflare / ALB /
  Traefik / nginx hệ thống): dùng `frontend/nginx.main.conf` như cũ. Không cần
  chứng thư trong container.
- **TLS kết thúc ở chính nginx của app**: dùng `frontend/nginx.tls.conf`
  (redirect 80→443, chứng thư, HSTS) bằng cách mount đè lúc chạy, không cần
  sửa Dockerfile:
  ```bash
  docker run -d -p 80:80 -p 443:443 \
    -v $PWD/frontend/nginx.tls.conf:/etc/nginx/conf.d/default.conf:ro \
    -v /etc/letsencrypt:/etc/nginx/tls:ro \
    fth-app   # image dựng từ Dockerfile.fullstack
  ```
  Đổi `ssl_certificate*` trong file nếu cert không nằm ở `/etc/nginx/tls/`.
  Không commit key lên repo.

## 2. Thứ tự khởi động

Trong 1 container, `scripts/start-all-in-one.sh` tự chạy đúng thứ tự nên không
phải làm tay các bước dưới khi deploy; giữ lại để dựng tay khi debug.

1. Chuẩn bị volume DB (SQLite) hoặc database PostgreSQL + `DATABASE_URL`.
2. uvicorn lên trước, chờ healthy: `curl http://127.0.0.1:8001/api/v1/health`
   → `{"status":"ok",...}` (migration nhẹ + `create_all` chạy tự động).
3. Nạp dữ liệu lần đầu (DB mới): `docker compose exec app python -m app.seed`,
   hoặc đặt `AUTO_SEED_ON_EMPTY=true` để script tự nạp khi DB rỗng.
   Bỏ qua bước này trên DB production thật.
4. nginx lên sau, mở frontend, đăng nhập thử 1 tài khoản mỗi vai trò.
5. Chạy kiểm sau deploy ở mục 4.

Với `docker compose`: `docker compose up --build -d` — mặc định dựng **service
`app` duy nhất** (xem `docker-compose.yml`). Muốn tách thành 2 service như bản
cũ thì thêm `--profile tach`.

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
4. Nếu chỉ hỏng frontend: rollback image `fth-app`. Lưu ý frontend và API nằm
   chung một container nên **không rollback riêng được** như bản 2 service cũ.
