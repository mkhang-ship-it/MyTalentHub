"""Hạ tầng kiểm thử: DB riêng + server riêng cho test.

VÌ SAO CẦN FILE NÀY
-------------------
Trước đây các test bắn HTTP vào server đang chạy và dùng chung
`backend/talenthub.db`. Hai hậu quả đã xảy ra thật:

1. Test đổi mật khẩu làm hỏng tài khoản demo `hs01@` — `scripts/qa.py` sau đó
   fail vì đăng nhập không được.
2. Test đăng nhập sai nhiều lần chạm giới hạn 5 lần/10 phút, khiến lần chạy
   kế tiếp của chính bộ test trả 429.

Cả hai đều là hậu quả của việc test và ứng dụng thật dùng chung một CSDL. File
này tách hẳn: mỗi lần chạy test sẽ có

  - một bản sao DB riêng trong thư mục tạm,
  - một tiến trình uvicorn riêng ở cổng riêng trỏ tới bản sao đó.

Nhờ vậy test muốn gì cũng được, còn DB và server thật không bị đụng tới, dù
server thật có đang chạy hay không.

CÁCH DÙNG
---------
    from .base import BASE_URL, FTClient   # chỉ dùng urllib
    from .base import FTHttpTestCase       # lớp TestCase sẵn có client

Module này phải được import TRƯỚC mọi `app.*`, vì `app.config` đọc
`DATABASE_URL` một lần lúc import. Vì vậy `tests/__init__.py` import nó trước.
"""
from __future__ import annotations

import atexit
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DEV_DB = BACKEND_DIR / "talenthub.db"

#: Thư mục tạm chứa DB và log của lần chạy test này.
TMPDIR = Path(tempfile.mkdtemp(prefix="fth-test-"))
TEST_DB = TMPDIR / "test.db"

#: Cổng riêng cho server test. 8099 cố tình lệch khỏi 8001 (dev) để không đụng.
TEST_PORT = int(os.environ.get("FTH_TEST_PORT", "8099"))
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _prepare_db() -> None:
    """Tạo bản sao DB dev để test có dữ liệu thật mà không sửa dữ liệu gốc."""
    if DEV_DB.exists():
        shutil.copy2(DEV_DB, TEST_DB)
    else:
        TEST_DB.touch()


_prepare_db()

#: Env cho mọi tiến trình con (và cho chính tiến trình test nếu nó import app).
TEST_ENV = {
    **os.environ,
    "DATABASE_URL": f"sqlite:///{TEST_DB}",
    "LOG_LEVEL": "WARNING",
    "MAIL_TO_OUTBOX": "true",
    "FRONTEND_URL": f"{BASE_URL}/dat-lai-mat-khau",
    "ACCESS_TOKEN_TTL_MINUTES": "60",
    # Cho phép tài khoản chưa xác minh email đăng nhập: dữ liệu seed không có
    # email thật để xác minh, chặn thì không test được luồng nào cả.
    "ALLOW_UNVERIFIED_EMAIL": "true",
    # Ba test cũ (test_api_smoke, test_business_rules, test_rbac_guard) đọc
    # QA_BASE_URL và mặc định là :8001 — tức server ĐANG CHẠY THẬT. Đặt biến
    # này ở đây là chúng tự trỏ sang server test, không cần sửa từng file.
    "QA_BASE_URL": f"{BASE_URL}/api/v1",
}

# Đặt vào os.environ TRƯỚC khi bất kỳ `app.*` nào được import ở tầng module.
os.environ.update(TEST_ENV)

_server: subprocess.Popen | None = None


def _wait_healthy(timeout: float = 45.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(
                f"{BASE_URL}/api/v1/health", timeout=2
            ) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.4)
    return False


def start_server() -> None:
    """Dựng server test trên cổng riêng. Gọi tự động khi import module này."""
    global _server
    if _server is not None:
        return
    log = open(TMPDIR / "server.log", "wb")
    _server = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1", "--port", str(TEST_PORT),
        ],
        cwd=str(BACKEND_DIR),
        env=TEST_ENV,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    if not _wait_healthy():
        out = (TMPDIR / "server.log").read_text(errors="replace")[-1500:]
        _server.kill()
        raise RuntimeError(
            f"server test không lên ở {BASE_URL}.\n{out}\n"
            f"(DB test: {TEST_DB})"
        )


def stop_server() -> None:
    global _server
    if _server is not None and _server.poll() is None:
        _server.terminate()
        try:
            _server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _server.kill()
    _server = None


def cleanup() -> None:
    stop_server()
    shutil.rmtree(TMPDIR, ignore_errors=True)


atexit.register(cleanup)

# Dựng server ngay khi import: ba test cũ là `unittest.TestCase` thuần, không
# đi qua `FTHttpTestCase.setUpClass`, nên không có chỗ nào gọi `start_server()`
# cho chúng. Dựng sẵn ở đây thì mọi test đều thấy server khi bắt đầu.
start_server()


# --------------------------------------------------------------------- client
class FTClient:
    """Bọc urllib: trả (status, body-đã-parse), không ném lỗi khi 4xx/5xx.

    `urllib.error.HTTPError` là một ngoại lệ chứ không phải response — test phải
    tự bắt, dễ quên. Ở đây mọi lỗi HTTP đều thành giá trị trả về.
    """

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")

    def request(
        self, method: str, path: str, body: dict | None = None, token: str | None = None
    ) -> tuple[int, object]:
        url = f"{self.base_url}{path}"
        data = None
        headers = {}
        if body is not None:
            data = json_bytes(body)
            headers["Content-Type"] = "application/json"
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, _parse(r.read())
        except urllib.error.HTTPError as e:
            return e.code, _parse(e.read())
        except urllib.error.URLError as e:
            raise AssertionError(f"không gọi được {url}: {e}") from e

    def get(self, path: str, token: str | None = None):
        return self.request("GET", path, token=token)

    def post(self, path: str, body: dict | None = None, token: str | None = None):
        return self.request("POST", path, body=body, token=token)

    def login(self, email: str, password: str) -> str:
        status, data = self.post(
            "/api/v1/auth/login", {"email": email, "password": password}
        )
        if status != 200:
            raise AssertionError(f"đăng nhập {email} thất bại: {status} {data}")
        return data["token"]


def json_bytes(body: dict) -> bytes:
    import json

    return json.dumps(body).encode()


def _parse(raw: bytes):
    import json

    if not raw:
        return None
    try:
        return json.loads(raw)
    except ValueError:
        return raw.decode(errors="replace")


# ----------------------------------------------------------------- TestCase
class FTHttpTestCase(unittest.TestCase):
    """Lớp nền: có `self.api` (FTClient) và dọn token sau mỗi test."""

    api: FTClient

    @classmethod
    def setUpClass(cls):
        start_server()
        cls.api = FTClient()

    def tearDown(self):
        # Token tích tụ trong DB test cũng không sao (DB bị xoá khi kết thúc),
        # nhưng dọn thì lần chạy sau không bị ảnh hưởng bởi rate limit.
        from app.database import SessionLocal
        from app.models import AuthToken, RefreshToken

        try:
            db = SessionLocal()
            db.query(AuthToken).delete()
            db.query(RefreshToken).delete()
            db.commit()
            db.close()
        except Exception:  # noqa: BLE001 - dọn dẹp không được làm fail test
            pass
