# Deploy FTalentHub lên Render — hướng dẫn chi tiết

Cập nhật 2026-09-29, sau khi deploy thật thành công và kiểm chứng từ bên ngoài.

---

## 0. ĐỌC TRƯỚC: Blueprint 2 service ĐÃ THẤT BẠI, đừng dùng lại

Cách deploy bằng Blueprint với **hai service** (`fth-api` + `fth-web`) đã được
thử và **không hoạt động**. Render tạo service web thành **Static Site** dù đã
chọn runtime Docker, và Static Site của Render phục vụ bằng nginx của chính nó
nên mất hết những gì `frontend/nginx.conf` khai.

Bằng chứng đã thu thập, không phải phỏng đoán:

| Kiểm tra | Kết quả | Nghĩa là |
|---|---|---|
| Bundle `/assets/index-*.js` | **khớp chính xác** bản build local | Render build **đúng code của ta** |
| `X-Frame-Options` | **không có** | Không phải nginx của ta |
| `GET /login` | **404** | Không có `try_files` |
| 6 lần `POST /api/v1/auth/login` | đều **404**, không có 429 | Không có `limit_req` |

Ba lần thử lại bằng cách tạo service tay cũng cho ra kết quả y hệt. Không còn cách
chẩn đoán từ bên ngoài nên cách đó bị bỏ hẳn.

**Cách đang dùng: MỘT service duy nhất, gộp frontend + backend vào cùng một
container.** Chỉ còn một chỗ có thể cấu hình sai, không cần proxy chéo, không cần
CORS, và tốn một nửa số giờ free-tier.

---

## 1. Kiến trúc: một service, một container

```
                    Trình duyệt
                         │
                         ▼
              ┌──────────────────────────────┐
              │  nginx  ·  nghe $PORT        │   ← domain bạn chia sẻ
              │  · phục vụ React (SPA)      │
              │  · try_files cho mọi route   │
              │  · chuyển tiếp /api ────────┼──┐
              └──────────────────────────────┘  │
                                                │ 127.0.0.1:$API_PORT
                                                ▼  (loopback — từ
              ┌──────────────────────────────┐    internet không
              │  uvicorn · FastAPI + SQLite  │◀───┘  chạm được)
              └──────────────────────────────┘
```

Image: **`Dockerfile.fullstack`** ở thư mục gốc. Ba tầng: cài dependency Python →
build React bằng `node:20-alpine` → chạy trên `nginx:stable` + venv Python.

Ba hệ quả có chủ đích:

- **Không cần CORS.** Trình duyệt chỉ nói chuyện với nginx, còn uvicorn chỉ nghe ở
  loopback nên không có gì từ internet chạm thẳng vào FastAPI được.
- **Không cần sửa một dòng frontend nào.** `src/api/client.ts` gọi cứng đường dẫn
  tương đối `/api/v1` trên chính origin của trang; nginx đáp ứng đúng đường đó.
- **Giữ được `X-Forwarded-For`** mà nhật ký kiểm tra dùng để lấy IP thật.

Lưu ý: base là `nginx:stable` nên Python trong image là **3.11** (Debian bookworm),
không phải 3.12. Backend không dùng cú pháp hay API nào chỉ có ở 3.12, và
`requirements.txt` không có gói nào bắt buộc 3.12.

## 2. Tạo service TAY (không dùng Blueprint)

1. Dashboard → **New +** → **Web Service**
2. Kết nối repository `mkhang-ship-it/MyTalentHub`

| Ô cần điền | Giá trị |
|---|---|
| Runtime | **Docker** |
| Dockerfile Path | `./Dockerfile.fullstack` |
| Docker Context | `.` (thư mục gốc) |
| Instance Type | Free |

**Không chọn "Static Site".** Chọn sai thì `/login` trả 404, `/api` trả 404, và
mọi request vẫn trả 200 — rất dễ tưởng là app hỏng.

Render build mất khoảng 5–10 phút cho lần đầu.

## 3. Sau khi có URL — đặt biến môi trường

Dashboard → service của bạn → **Environment**:

| Key | Value | Bắt buộc |
|---|---|---|
| `AUTO_SEED_ON_EMPTY` | `true` | **có** |
| `FRONTEND_URL` | `https://<tên-service>.onrender.com` | **có** |
| `GEMINI_API_KEY` | lấy ở <https://aistudio.google.com/apikey> | không |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | xem mục 5 | không |

Bấm **Save Changes** → Render hỏi deploy lại thì chọn **Yes**.

Vì sao `AUTO_SEED_ON_EMPTY` bắt buộc: đĩa của gói free là hệ thống file **tạm**,
nên database trống ở mỗi lần khởi động. Không bật thì không có tài khoản demo nào
để đăng nhập.

## 4. Kiểm chứng từ bên ngoài — 6 lệnh này đã chạy thật

```bash
U=https://<tên-service>.onrender.com
curl -s -o /dev/null -w '%{http_code}\n' "$U/"                        # mong đợi 200
curl -s -o /dev/null -w '%{http_code}\n' "$U/login"                   # mong đợi 200
curl -s "$U/api/v1/health"                                            # {"status":"ok",…}
curl -sI "$U/" | grep -i x-frame-options                              # X-Frame-Options: DENY
curl -sI "$U/assets/index-<hash>.js" | grep -i content-type           # application/javascript
curl -s -o /dev/null -w '%{http_code}\n' "$U/api/v1/school/classes"  # 401
```

**DỪNG LẠI ngay nếu `/login` trả 404** — nghĩa là Render lại tạo sai thành Static
Site; sửa Runtime / Dockerfile Path ở mục 2 rồi deploy lại.

Sau đó đăng nhập thử bằng một trong 5 tài khoản demo (mật khẩu đều `demo123`):

| Vai trò | Email | Trang vào |
|---|---|---|
| Học sinh | `hs01@ftalenthub.edu.vn` | `/student` |
| Giáo viên | `nguyen.van.hung@ftalenthub.edu.vn` | `/teacher` |
| HLV | `hlv.boi@ftalenthub.edu.vn` | `/coach` |
| Nhà trường | `bgh@ftalenthub.edu.vn` | `/school` |
| Doanh nghiệp | `hr@techfpt.vn` | `/enterprise` |

Lưu ý `hr@techfpt.vn` khác domain — **không phải** `hr@ftalenthub.edu.vn`.

Lần mở đầu tiên sẽ chậm khoảng 30–60 giây: service free bị ngủ sau 15 phút không
có lưu lượng.

## 5. Nếu cần người dùng thật nhận được thư

Mặc định `MAIL_TO_OUTBOX` **không được đặt**, nên thư được ghi vào
`backend/outbox/*.html` trong container thay vì gửi đi. Bạn có thể xem link
trong **Logs** của service, nhưng người dùng thật sẽ không nhận được thư.

Muốn gửi thật, tạo tài khoản SMTP (Gmail app password, Brevo, Mailgun…) rồi
đặt trong Dashboard → service của bạn → Environment:

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

Với bản demo, điều này có lợi: mỗi khách vào đều thấy dữ liệu mẫu sạch, không ai
thấy dữ liệu bẩn của người trước. Nhưng **đừng để ai nhập dữ liệu thật** vào bản
đang chạy miễn phí.

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
| `/login` trả **404** | Render tạo service thành Static Site | Sửa Runtime = Docker, Dockerfile Path = `./Dockerfile.fullstack`, Context = `.`; deploy lại. Nếu vẫn 404 thì đọc mục 0 |
| Mọi request trả 200 nhưng **trang trắng** | Thiếu `include mime.types` trong config nginx chính | Mọi file bị gán `text/plain`, trình duyệt từ chối chạy JS. Kiểm tra `curl -sI $U/assets/index-<hash>.js \| grep content-type` phải ra `application/javascript` |
| Container restart liên tục | `PORT` trùng `API_PORT` | nginx không bind được: `bind() failed (98: Address already in use)`. Hai cổng này **phải khác nhau** |
| Container restart liên tục | uvicorn chết lúc khởi động | Tab Logs có dòng `uvicorn đã chết trước khi sẵn sàng`, lỗi thật nằm ngay phía trên |
| **502** | App không nghe đúng cổng Render | Code đã đọc `$PORT`; nếu vẫn lỗi thì xem Logs xem app có khởi động không |
| Đăng nhập 401 dù đúng mật khẩu | Chưa seed | Thiếu `AUTO_SEED_ON_EMPTY=true`. Xem Logs có dòng `Seed xong: {...}` không |
| Bị chặn đăng nhập sau vài lần thử | Chống dò mật khẩu: 5 lần sai / 10 phút | Đúng thiết kế. Chờ hết 10 phút |
| Quên mật khẩu không nhận được thư | Chưa cấu hình SMTP | Xem mục 5, hoặc đọc link trong Logs |
| Sửa code không có hiệu lực | — | Render tự deploy lại khi push lên `main`. Theo dõi ở tab Events |

## 8. Chi phí và giới hạn của gói free — nói thẳng

- **$0**, không cần thẻ tín dụng.
- **750 giờ instance/tháng** cho cả workspace, **dùng chung** cho mọi service.
  Vì nay chỉ còn một service nên thực tế có ~750 giờ cho toàn hệ thống. Hết thì
  service free bị treo tới tháng sau.
- **512 MB RAM / 0,1 CPU**. Đủ cho bản demo, **có thể chậm** khi nhiều người dùng
  cùng lúc.
- **Toàn bộ app ngủ sau 15 phút** không có lưu lượng. Lần truy cập kế tiếp chậm
  30–60 giây. Đây là đặc tính của gói free, không phải lỗi cấu hình.
- **1 GB dung lượng** cho Postgres free (không dùng ở đây).

Muốn bỏ giới hạn ngủ và tăng tài nguyên: Starter web service 7 USD/tháng
(+7 USD/tháng nếu thêm Postgres).

## 9. Tự động deploy lần sau

Mỗi lần bạn `git push` lên `main`, Render tự build và deploy lại. Không cần làm
gì thêm.

Lưu ý: mỗi lần deploy lại là một lần ngủ kích hoạt → SQLite bị xoá → dữ liệu
nhập trong lúc thử sẽ mất. Hãy chạy `scripts/ci-local.sh` trước khi push để tránh
phải deploy lại nhiều lần:

```bash
bash scripts/ci-local.sh --fast
bash scripts/ci-local.sh --fast --clean-env   # bắt lỗi phụ thuộc dữ liệu cục bộ
```
