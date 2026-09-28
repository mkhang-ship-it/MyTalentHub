# Deploy FTalentHub lên Render — hướng dẫn chi tiết

Viết ngày 2026-09-28, sau khi 5 job CI đều xanh (trong đó có `Docker build` build
thật cả hai image).

**Trước khi bắt đầu:** mọi thứ trong `render.yaml` đã được commit và CI kiểm tra.
Bạn không cần sửa code để deploy được.

---

## 0. Hiểu trước kiến trúc, để không bất ngờ

Hệ thống gồm **hai service**:

```
                    Trình duyệt
                         │
                         ▼
              ┌─────────────────────┐
              │  fth-web  (nginx)   │   ← domain bạn chia sẻ
              │  · phục vụ React    │
              │  · chuyển tiếp /api  │
              └──────────┬──────────┘
                         │  FTH_API_UPSTREAM
                         ▼
              ┌─────────────────────┐
              │  fth-api  (uvicorn) │   ← không mở ra internet
              │  FastAPI + SQLite   │
              └─────────────────────┘
```

**Vì sao không tách frontend thành static site?** Vì
`frontend/src/api/client.ts` gọi cứng đường dẫn tương đối `/api/v1` trên chính
origin của trang, và file đó không được sửa. Nếu frontend nằm ở domain khác,
`/api/v1` sẽ trỏ về static site — nơi không có backend — và mọi lời gọi sẽ 404.
Nên nginx làm **origin duy nhất** mà trình duyệt thấy, rồi chuyển tiếp `/api`.

Lợi ích: không phải xử lý CORS, không sửa một dòng frontend nào, và giữ được cơ
chế `X-Forwarded-For` mà nhật ký kiểm tra dùng để lấy IP người dùng.

---

## 1. Tạo tài khoản Render

1. Vào <https://render.com> → **Get Started** → đăng ký bằng GitHub
   (chọn GitHub sẽ nhanh hơn vì repo đã nằm trên đó).
2. **Không cần thẻ tín dụng** cho gói free.

## 2. Tạo Blueprint (Render tự dựng cả hai service)

1. Vào Dashboard → **New +** → **Blueprint**
2. Chọn repository `mkhang-ship-it/MyTalentHub`
3. Render sẽ hiện bảng tóm tắt **2 service**: `fth-api` và `fth-web`.
   Nếu Render không nhận ra `render.yaml`, kiểm tra Branch là `main`.
4. Bấm **Apply**.

Render bắt đầu build. Mất khoảng 5–10 phút cho lần đầu (cài dependency).

## 3. Sau khi deploy xong — làm đúng 2 việc

### 3a. Lấy URL của `fth-web`

Dashboard → **fth-web** → URL ở góc trên, dạng
`https://fth-web-xxxx.onrender.com`. **Đây là link bạn chia sẻ cho người khác.**

### 3b. Đặt `FRONTEND_URL` cho `fth-api`

Dashboard → **fth-api** → **Environment** → dòng `FRONTEND_URL` → điền URL ở
bước 3a → **Save Changes** → Render hỏi deploy lại thì chọn **Yes**.

Vì sao cần: link trong thư quên mật khẩu và xác minh email được dựng từ biến
này. Bỏ trống thì link sẽ trỏ về `localhost` và không dùng được.

## 4. Kiểm tra đã hoạt động

Mở trình duyệt, vào URL `fth-web`, đăng nhập bằng một trong 5 tài khoản demo
(mật khẩu đều `demo123`):

| Vai trò | Email | Trang vào |
|---|---|---|
| Học sinh | `hs01@ftalenthub.edu.vn` | `/student` |
| Giáo viên | `nguyen.van.hung@ftalenthub.edu.vn` | `/teacher` |
| HLV | `hlv.boi@ftalenthub.edu.vn` | `/coach` |
| Nhà trường | `bgh@ftalenthub.edu.vn` | `/school` |
| Doanh nghiệp | `hr@techfpt.vn` | `/enterprise` |

Lưu ý `hr@techfpt.vn` khác domain — không phải `hr@ftalenthub.edu.vn`.

**Lần mở đầu tiên sẽ chậm** khoảng 30–60 giây: service free bị ngủ sau 15 phút
không có lưu lượng, nên lần đầu phải khởi động lại.

## 5. Nếu cần người dùng thật nhận được thư

Mặc định `MAIL_TO_OUTBOX` **không được đặt**, nên thư được ghi vào
`backend/outbox/*.html` trong container thay vì gửi đi. Bạn có thể xem link
trong **Logs** của `fth-api`, nhưng người dùng thật sẽ không nhận được thư.

Muốn gửi thật, tạo tài khoản SMTP (Gmail app password, Brevo, Mailgun…) rồi
đặt trong Dashboard → fth-api → Environment:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<tài khoản gửi>
SMTP_PASSWORD=<mật khẩu ứng dụng>
SMTP_FROM=<địa chỉ gửi>
MAIL_TO_OUTBOX=false        ← BẮT BUỘC
```

**Cảnh báo bảo mật:** để `MAIL_TO_OUTBOX=true` ở production là **rò link đặt lại
mật khẩu** cho bất kỳ ai đọc được log server. Link đó là bí mật — ai có nó thì
đổi được mật khẩu của bạn.

## 6. Cảnh báo: dữ liệu sẽ mất

Đây là điểm quan trọng nhất cần hiểu trước khi demo cho ai.

Hệ thống file của web service miễn phí là **tạm**: mỗi lần service ngủ hoặc
redeploy là mất sạch, nên file SQLite bị xoá. Vì vậy `AUTO_SEED_ON_EMPTY=true` —
mỗi lần khởi động, CSDL trống sẽ được seed lại từ dữ liệu mẫu.

**Hệ quả:** dữ liệu người dùng nhập trong lúc demo (điểm số, CSV import, sân
chơi mới…) **sẽ mất** sau khi service ngủ khoảng 15 phút.

Với bản demo, điều này có lợi: mỗi khách vào đều thấy dữ liệu mẫu sạch, không
ai thấy dữ liệu bẩn của người trước. Nhưng **đừng để ai nhập dữ liệu thật** vào
bản đang chạy miễn phí.

Muốn giữ dữ liệu thật, có ba lựa chọn:

| Cách | Chi phí |
|---|---|
| Persistent disk của Render | 0,25 USD/GB/tháng |
| PostgreSQL của Render (Starter) | 7 USD/tháng |
| Postgres miễn phí của Render | **không dùng được** — hết hạn sau 30 ngày |

Khi dùng PostgreSQL, chỉ cần đặt biến (code đã hỗ trợ sẵn):

```
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/talenthub
```

## 7. Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| **502** | App không nghe đúng cổng Render | Đã sửa trong code (đọc `$PORT`). Nếu vẫn thấy, kiểm tra Logs xem app có khởi động không |
| Trang trắng, Console báo lỗi CORS | `CORS_ORIGINS` chưa đặt | Đặt `CORS_ORIGINS=https://fth-web-xxxx.onrender.com` |
| Đăng nhập báo "Email hoặc mật khẩu không đúng" dù đúng | Chưa seed — Logs có thể bị lỗi ghi `/app/data` | Xem Logs; Render free không cho persistent disk nên `/app/data` tạm ổn, nhưng hãy kiểm tra |
| Bị chặn đăng nhập sau vài lần thử | Chống dò mật khẩu: 5 lần sai / 10 phút | Đúng thiết kế. Chờ hết 10 phút |
| Quên mật khẩu không nhận được thư | Chưa cấu hình SMTP | Xem bước 5, hoặc đọc link trong Logs |
| Sửa code không có hiệu lực | — | Render tự deploy lại khi push lên `main`. Theo dõi ở tab Events |

## 8. Chi phí và giới hạn của gói free — nói thẳng

- **$0**, không cần thẻ tín dụng.
- **750 giờ instance/tháng** cho mỗi workspace. Đủ cho một bản demo; hết thì
  service free bị treo tới tháng sau.
- **512 MB RAM / 0.1 CPU** mỗi service. Đủ cho bản demo, **có thể chậm** khi
  nhiều người dùng cùng lúc.
- **Toàn bộ app ngủ sau 15 phút** không có lưu lượng. Lần truy cập kế tiếp chậm
  30–60 giây. Đây là đặc tính của gói free, không phải lỗi cấu hình.
- **1 GB dung lượng** cho Postgres free (không dùng ở đây).

Muốn bỏ giới hạn ngủ và tăng tài nguyên: Starter web service 7 USD/tháng
(+$7/tháng nếu thêm Postgres).

## 9. Tự động deploy lần sau

Mỗi lần bạn `git push` lên `main`, Render tự build và deploy lại. Không cần
làm gì thêm.

Lưu ý: mỗi lần deploy lại là một lần ngủ kích hoạt → SQLite bị xoá → dữ liệu
nhập trong lúc thử sẽ mất. Hãy chạy `scripts/ci-local.sh` trước khi push để
tránh phải deploy lại nhiều lần:

```bash
bash scripts/ci-local.sh --fast
bash scripts/ci-local.sh --fast --clean-env   # bắt lỗi phụ thuộc dữ liệu cục bộ
```
