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

- [ ] Sao lưu `backend/talenthub.db` trước mỗi lần nâng cấp (file SQLite duy
      nhất, copy file là xong).
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
- [ ] Đặt rate limit ở tầng reverse proxy cho `/auth/login` (hiện chỉ có chặn
      5 lần sai/10 phút trong code).
- [ ] Thu thập log tập trung (hiện log chỉ ra stdout của uvicorn) và đặt cảnh
      báo khi 5xx tăng đột biến.
- [ ] Khoá CORS như mục 1 (bỏ `allow_origins=["*"]` trong `main.py`).

## 5. Những hạng mục CHƯA làm (nêu thẳng)

- [ ] Chưa có gửi email xác thực / quên mật khẩu (không có mã SMTP nào trong
      repo; đặt lại mật khẩu hiện chỉ làm tay trong DB).
- [ ] Chưa có quản lý ảnh/avatar upload (mới chỉ có trường `avatar_url` dạng
      chuỗi; không có endpoint `UploadFile`/multipart nào).
- [ ] Chưa có theo dõi/log tập trung và dashboard cảnh báo.
- [ ] Chưa có kiểm thử tự động ở tầng giao diện: `frontend/tests/` hiện chỉ có
      `verify-portals.spec.cjs` dạng screenshot smoke bằng Playwright (đăng nhập
      4 cổng, chụp ảnh, assert URL), chưa có E2E đầy đủ cho luồng nghiệp vụ
      (đăng ký → chấm điểm → xem báo cáo), và chưa chạy trong CI (job frontend
      của CI hiện mới chỉ tsc/eslint/build).
- [ ] Chưa có kiểm thử tải (load test) cho các endpoint chấm điểm/đăng ký hoạt
      động vào giờ cao điểm.
- [ ] Chưa có chiến lược backup tự động cho SQLite (mới chỉ là checklist tay).
