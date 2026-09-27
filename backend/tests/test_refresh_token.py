"""Kiểm thử refresh token — xoay vòng, chống dùng lại, hết hạn, logout thu hồi.

- Đổi token thành công: access + refresh mới đều khác cũ, access mới dùng được.
- Token cũ (đã xoay) không dùng lại được → 401 (kèm thu hồi cả họ khi tái dùng).
- Token hết hạn → 401 đúng thông điệp hết hạn.
- Logout thu hồi cả access lẫn refresh của user.

Mỗi test tự login lấy cặp riêng, không tạo user mới, không đụng test khác.
Chạy:   cd backend && python -m unittest discover -s tests -t . -v
Yêu cầu backend đang chạy tại http://127.0.0.1:8001 (đổi bằng QA_BASE_URL).
Nếu backend chưa chạy → skip toàn bộ (không fail đỏ).
"""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import unittest
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("QA_BASE_URL", "http://127.0.0.1:8001/api/v1").rstrip("/")
EMAIL = "hs01@ftalenthub.edu.vn"
PASSWORD = "demo123"
DB_PATH = Path(__file__).resolve().parents[1] / "talenthub.db"


def call(method: str, path: str, token: str | None = None, body=None, timeout: float = 20):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=timeout) as res:
            raw = res.read().decode("utf-8-sig")
            try:
                return res.status, (json.loads(raw) if raw.strip() else None)
            except ValueError:
                return res.status, raw
    except urllib.error.HTTPError as exc:
        try:
            raw = exc.read().decode()
        finally:
            exc.close()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


def login_pair():
    status, payload = call("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    assert status == 200, f"đăng nhập thất bại: HTTP {status} {payload}"
    assert payload.get("refresh_token"), f"login thiếu refresh_token: {payload}"
    return payload["token"], payload["refresh_token"]


def expire_refresh(refresh_token: str) -> None:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    try:
        conn.execute(
            "UPDATE refresh_tokens SET expires_at = datetime('now', '-1 day') WHERE token_hash = ?",
            (hashlib.sha256(refresh_token.encode()).hexdigest(),),
        )
        conn.commit()
    finally:
        conn.close()


def delete_refresh(refresh_token: str) -> None:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    try:
        conn.execute(
            "DELETE FROM refresh_tokens WHERE token_hash = ?",
            (hashlib.sha256(refresh_token.encode()).hexdigest(),),
        )
        conn.commit()
    finally:
        conn.close()


class RefreshTokenTest(unittest.TestCase):
    """Vòng đời refresh token: cấp → xoay → thu hồi."""

    @classmethod
    def setUpClass(cls):
        try:
            status, _ = call("GET", "/health", timeout=5)
        except (urllib.error.URLError, OSError) as exc:
            raise unittest.SkipTest(f"Backend chưa chạy tại {BASE} — bỏ qua ({exc})")
        if status != 200:
            raise unittest.SkipTest(f"GET /health trả HTTP {status} — bỏ qua")

    def test_login_issues_refresh_token(self):
        access, refresh = login_pair()
        self.assertTrue(access)
        self.assertTrue(refresh)
        self.assertNotEqual(access, refresh)
        status, _ = call("GET", "/auth/me", access)
        self.assertEqual(status, 200)

    def test_refresh_rotation_success(self):
        access1, refresh1 = login_pair()
        status, payload = call("POST", "/auth/refresh", body={"refresh_token": refresh1})
        self.assertEqual(status, 200, f"đổi token thất bại: {payload}")
        self.assertNotEqual(payload["token"], access1, "access mới phải khác cũ")
        self.assertNotEqual(payload["refresh_token"], refresh1, "refresh mới phải khác cũ")
        status, _ = call("GET", "/auth/me", payload["token"])
        self.assertEqual(status, 200, "access mới phải dùng được")

    def test_rotated_token_reuse_rejected(self):
        _, refresh1 = login_pair()
        status, payload = call("POST", "/auth/refresh", body={"refresh_token": refresh1})
        self.assertEqual(status, 200)
        refresh2 = payload["refresh_token"]
        # Dùng lại token cũ (đã xoay) → 401, không được cấp gì thêm.
        status, payload = call("POST", "/auth/refresh", body={"refresh_token": refresh1})
        self.assertEqual(status, 401, f"dùng lại token đã xoay phải 401: {payload}")
        self.assertNotIn("refresh_token", payload or {})
        # Token mới trong cùng họ cũng bị thu hồi (dấu hiệu đánh cắp).
        status, _ = call("POST", "/auth/refresh", body={"refresh_token": refresh2})
        self.assertEqual(status, 401, "họ token bị đánh cắp phải vô hiệu hoá toàn bộ")

    def test_expired_refresh_rejected(self):
        _, refresh = login_pair()
        expire_refresh(refresh)
        try:
            status, payload = call("POST", "/auth/refresh", body={"refresh_token": refresh})
            self.assertEqual(status, 401)
            self.assertIn("hết hạn", (payload or {}).get("detail", ""),
                          f"phải báo đúng thông điệp hết hạn: {payload}")
        finally:
            delete_refresh(refresh)

    def test_logout_revokes_both_tokens(self):
        access, refresh = login_pair()
        status, _ = call("POST", "/auth/logout", access)
        self.assertEqual(status, 200)
        status, _ = call("GET", "/auth/me", access)
        self.assertEqual(status, 401, "access sau logout phải 401")
        status, _ = call("POST", "/auth/refresh", body={"refresh_token": refresh})
        self.assertEqual(status, 401, "refresh sau logout phải 401")

    def test_unknown_refresh_rejected(self):
        status, _ = call("POST", "/auth/refresh", body={"refresh_token": "khong-ton-tai"})
        self.assertEqual(status, 401)
        status, _ = call("POST", "/auth/refresh", body={})
        self.assertEqual(status, 401, "thiếu refresh_token phải 401")


if __name__ == "__main__":
    unittest.main()
