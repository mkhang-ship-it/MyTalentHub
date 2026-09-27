"""Bảo mật backend dùng chung — hash mật khẩu, hạn token, chống dò mật khẩu, CORS.

- Hash mới: `pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>` bằng
  `hashlib.pbkdf2_hmac` (thư viện chuẩn, không cài thêm package).
  Hash cũ `sha256("fth_" + password)` vẫn được `verify_password` chấp nhận
  để 5 tài khoản demo đăng nhập được; `auth.login` tự nâng cấp khi đúng.
- Token hết hạn: `AuthToken.expires_at` (UTC naive, như `func.now()` của SQLite).
  `resolve_token_user` là điểm tra duy nhất: thiếu token → 401 "Thiếu token",
  token lạ → 401 "Phiên đăng nhập không hợp lệ",
  token hết hạn → 401 EXPIRED_MESSAGE.
- Chống dò mật khẩu: bộ nhớ trong tiến trình, tối đa 5 lần sai / email / 10 phút.
"""
import hashlib
import hmac
import os
import secrets
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
INVALID_MESSAGE = "Phiên đăng nhập không hợp lệ"
MISSING_MESSAGE = "Thiếu token"
WRONG_CREDENTIALS_MESSAGE = "Email hoặc mật khẩu không đúng"

_NEW_PREFIX = "pbkdf2_sha256"
_LEGACY_PREFIX = "fth_"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------- hash
def pbkdf2_iterations() -> int:
    try:
        return max(1_000, int(os.environ.get("PBKDF2_ITERATIONS", "240000")))
    except (TypeError, ValueError):
        return 240000


def _legacy_hash(password: str) -> str:
    return hashlib.sha256(f"{_LEGACY_PREFIX}{password}".encode()).hexdigest()


def hash_password(password: str) -> str:
    """Hash mới PBKDF2-HMAC-SHA256, salt ngẫu nhiên 16 byte."""
    iters = pbkdf2_iterations()
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), iters)
    return f"{_NEW_PREFIX}${iters}${salt}${dk.hex()}"


def is_new_hash_format(stored: str) -> bool:
    return bool(stored) and stored.startswith(f"{_NEW_PREFIX}$")


def verify_password(password: str, stored: str) -> bool:
    """Đúng với cả hash mới; hash cũ (không có '$') so bằng công thức legacy."""
    if not stored:
        return False
    if "$" not in stored:
        return hmac.compare_digest(stored, _legacy_hash(password))
    try:
        prefix, iters_s, salt_hex, hash_hex = stored.split("$")
    except ValueError:
        return False
    if prefix != _NEW_PREFIX:
        return False
    try:
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iters_s)
        )
    except (TypeError, ValueError):
        return False
    return hmac.compare_digest(dk.hex(), hash_hex)


# ---------------------------------------------------------------- hạn token
def token_ttl_days() -> int:
    """Hạn token cũ (giữ để tương thích ngược) — access token mới dùng phút."""
    try:
        return max(1, int(os.environ.get("TOKEN_TTL_DAYS", "7")))
    except (TypeError, ValueError):
        return 7


def access_token_ttl_minutes() -> int:
    try:
        return max(1, int(os.environ.get("ACCESS_TOKEN_TTL_MINUTES", "60")))
    except (TypeError, ValueError):
        return 60


def refresh_token_ttl_days() -> int:
    try:
        return max(1, int(os.environ.get("REFRESH_TOKEN_TTL_DAYS", "30")))
    except (TypeError, ValueError):
        return 30


def new_access_expiry() -> datetime:
    return _utcnow() + timedelta(minutes=access_token_ttl_minutes())


def new_refresh_expiry() -> datetime:
    return _utcnow() + timedelta(days=refresh_token_ttl_days())


def new_token_expiry() -> datetime:
    """Alias cũ — access token mới cũng dùng hạn phút (client cũ vẫn chạy)."""
    return new_access_expiry()


def public_register_enabled() -> bool:
    """ALLOW_PUBLIC_REGISTER=false ở production để chặn đăng ký mở."""
    return os.environ.get("ALLOW_PUBLIC_REGISTER", "true").strip().lower() not in (
        "false", "0", "no", "off",
    )


REGISTER_CLOSED_MESSAGE = "Đăng ký công khai đã bị tắt, vui lòng liên hệ nhà trường để tạo tài khoản."


def token_is_expired(auth_token) -> bool:
    exp = getattr(auth_token, "expires_at", None)
    if exp is None:
        return False  # token legacy chưa backfill — coi như còn hạn
    return exp <= _utcnow()


def purge_expired_tokens(db=None) -> int:
    """Xoá các token đã hết hạn khỏi `auth_tokens`. Trả về số dòng đã xoá.

    Chỉ xoá dòng có `expires_at` không NULL và đã quá hạn — token còn hiệu lực
    (và token legacy chưa backfill) được giữ nguyên. `db=None` → tự mở session.
    Được gọi 1 lần lúc khởi động server trong `database._run_migrations()`.
    """
    from .models import AuthToken

    close = False
    if db is None:
        from .database import SessionLocal

        db = SessionLocal()
        close = True
    try:
        n = (
            db.query(AuthToken)
            .filter(AuthToken.expires_at.isnot(None), AuthToken.expires_at <= _utcnow())
            .delete(synchronize_session=False)
        )
        db.commit()
        return n
    finally:
        if close:
            db.close()


def resolve_token_user(db, token: str):
    """Tra (AuthToken, User) theo token, kèm kiểm tra hết hạn.

    Lỗi đúng hợp đồng phân quyền (giữ nguyên từ lô 3):
    - token không tồn tại → 401 "Phiên đăng nhập không hợp lệ"
    - token hết hạn → 401 EXPIRED_MESSAGE
    """
    from fastapi import HTTPException

    from .models import AuthToken, User

    row = (
        db.query(AuthToken, User)
        .join(User, User.id == AuthToken.user_id)
        .filter(AuthToken.token == token)
        .first()
    )
    if not row:
        raise HTTPException(401, INVALID_MESSAGE)
    auth_token, user = row
    if token_is_expired(auth_token):
        raise HTTPException(401, EXPIRED_MESSAGE)
    return auth_token, user


# ---------------------------------------------------------------- refresh token
def refresh_token_hash(token: str) -> str:
    """Hash tra cứu refresh token — DB không bao giờ giữ token thật."""
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token_table() -> None:
    """Tạo bảng `refresh_tokens` nếu chưa có (idempotent, raw SQL).

    Đặt riêng ở đây (thay vì `database._run_migrations`, P2 đang sửa) để
    coordinator gọi 1 lần lúc khởi động từ `main.py`:
        from .security import create_refresh_token_table
        create_refresh_token_table()
    Ngoài ra `auth` tự gọi hàm này mỗi lần cấp token (đảm bảo-bảng-tồn-tại)
    nên luồng đăng nhập không vỡ kể cả khi main.py chưa được đấu nối.
    """
    from sqlalchemy import text

    from .database import engine

    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS refresh_tokens ("
            "id INTEGER NOT NULL PRIMARY KEY, "
            "token_hash VARCHAR(128) NOT NULL UNIQUE, "
            "user_id INTEGER NOT NULL REFERENCES users (id), "
            "expires_at DATETIME NOT NULL, "
            "revoked_at DATETIME, "
            "created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id "
            "ON refresh_tokens (user_id)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at "
            "ON refresh_tokens (expires_at)"
        ))


# ---------------------------------------------------------------- chống dò mật khẩu
_LOGIN_WINDOW_S = 600  # 10 phút
_LOGIN_MAX_FAILS = 5

_login_fails: dict[str, list[float]] = defaultdict(list)


def _prune_login_fails(email: str, now: float) -> list[float]:
    recent = [t for t in _login_fails.get(email, []) if now - t < _LOGIN_WINDOW_S]
    if recent:
        _login_fails[email] = recent
    else:
        _login_fails.pop(email, None)
    return recent


def login_wait_seconds(email: str) -> int:
    """Số giây còn phải chờ nếu email đã vượt ngưỡng; 0 nếu được phép thử."""
    now = time.monotonic()
    recent = _prune_login_fails(email, now)
    if len(recent) < _LOGIN_MAX_FAILS:
        return 0
    return max(1, int(_LOGIN_WINDOW_S - (now - recent[0])))


def record_login_failure(email: str) -> None:
    _login_fails[email].append(time.monotonic())


def clear_login_failures(email: str) -> None:
    _login_fails.pop(email, None)


def rate_limit_message(wait_s: int) -> str:
    return (
        "Bạn đã nhập sai quá nhiều lần, "
        f"vui lòng thử lại sau {wait_s} giây."
    )


# ---------------------------------------------------------------- CORS
DEFAULT_CORS_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")


def cors_origins() -> list[str]:
    """Đọc CORS_ORIGINS từ env (phân tách dấu phẩy). Không bao giờ trả '*'."""
    raw = os.environ.get("CORS_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"]
    return origins or list(DEFAULT_CORS_ORIGINS)
