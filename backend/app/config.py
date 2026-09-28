"""FTalentHub — backend (FastAPI + SQLAlchemy 2.0).

Khởi tạo và seed DB:  python -m app.seed
Chạy server:          uvicorn app.main:app --reload --port 8000

Cấu hình đọc từ biến môi trường (xem .env.example), không hard-code:
  DATABASE_URL        — chuỗi kết nối SQLAlchemy. Mặc định SQLite trong thư mục
                        backend. Đặt sang PostgreSQL sẽ dùng driver psycopg.
  ...
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("ftalenthub")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "talenthub.db"


def _env_flag(name: str, default: bool = False) -> bool:
    """Đọc biến môi trường kiểu cờ: 1/true/yes/on đều là bật."""
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# --- kết nối CSDL ------------------------------------------------------------
# Ưu tiên DATABASE_URL từ env. Mặc định vẫn là SQLite để chạy mở chóng không
# cần cấu hình gì; đổi sang PostgreSQL chỉ việc đặt biến, không sửa code.
DB_URL = os.environ.get("DATABASE_URL") or f"sqlite:///{DB_PATH}"
DB_IS_SQLITE = DB_URL.startswith("sqlite")

# connect_args chỉ có ý nghĩa với SQLite. Truyền sang PostgreSQL sẽ kêu
# "invalid connect option" nên phải tách riêng — đây là chỗ dễ vỡ nhất khi
# chuyển đổi, nên tách thẳng thay vì để dev tự phát hiện.
CONNECT_ARGS = {"check_same_thread": False} if DB_IS_SQLITE else {}

#: Thử ping kết nối cũ trước khi dùng lại (bắt kết nối đã chết bởi proxy).
DB_PRE_PING = _env_flag("DB_PRE_PING", default=True)

#: Thời gian chờ khoá tối đa (PostgreSQL). Mặc định của PostgreSQL là chờ VÔ HẠN,
#: nên một transaction quên commit sẽ chặn mọi thao tác ghi khác mà không báo
#: lỗi. Giới hạn lại để lỗi hiện ra kèm câu lệết bị chặn.
DB_LOCK_TIMEOUT = os.environ.get("DB_LOCK_TIMEOUT", "10s")
DB_STATEMENT_TIMEOUT = os.environ.get("DB_STATEMENT_TIMEOUT", "60s")

# --- hành vi ứng dụng --------------------------------------------------------
# Bật ở CI hoặc test: không được chặn tài khoản chưa xác minh email.
ALLOW_UNVERIFIED_EMAIL = _env_flag("ALLOW_UNVERIFIED_EMAIL", default=True)

# Tự chạy `app.seed` khi CSDL còn trống.
#
# Mặc định TẮT, và đó là chủ ý: nếu mặc định bật thì lỡ xoá nhầm file DB ở máy
# dev, lần chạy kế tiếp sẽ âm thầm dựng lại dữ liệu mẫu — một kiểu mất dữ
# liệu tinh vi, khó phát hiện hơn nhiều so với lỗi rõ ràng.
#
# Bật ở nơi đĩa là hệ thống file TẠM (Render free), nơi mọi thứ mất sau mỗi
# lần service ngủ hoặc redeploy. Dữ liệu của dự án này hoàn toàn sinh được
# từ `app.seed` nên tái tạo lại lúc khởi động là giải pháp đúng.
# Bổ sung: chỉ seed khi bảng `users` còn RỖNG — đã có dữ liệu thì không đụng.
AUTO_SEED_ON_EMPTY = _env_flag("AUTO_SEED_ON_EMPTY", default=False)

# Cho phép đăng ký công khai. Production nên đặt "false".
ALLOW_PUBLIC_REGISTER = _env_flag("ALLOW_PUBLIC_REGISTER", default=True)

# --- gửi thư -----------------------------------------------------------------
# Không có SMTP thì thư ghi vào outbox/ để lấy link (chỉ dùng khi dev/test).
MAIL_OUTBOX = BASE_DIR / "outbox"
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "no-reply@ftalenthub.edu.vn")
# Thư ghi ra outbox khi không có SMTP. Production PHẢI đặt "false" để không
# rò rỉ link đặt lại mật khẩu vào log/đĩa.
MAIL_TO_OUTBOX = _env_flag("MAIL_TO_OUTBOX", default=not bool(SMTP_HOST))

# Địa chỉ gửi thư, dùng làm liên hệ trong phần chân trang và nơi gửi thông báo.
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "bgh@ftalenthub.edu.vn")

# --- bảo mật -----------------------------------------------------------------
# Số phút hợp lệ cho link xác minh email / đặt lại mật khẩu.
VERIFY_TOKEN_TTL_MINUTES = int(os.environ.get("VERIFY_TOKEN_TTL_MINUTES", "1440"))
RESET_TOKEN_TTL_MINUTES = int(os.environ.get("RESET_TOKEN_TTL_MINUTES", "30"))
