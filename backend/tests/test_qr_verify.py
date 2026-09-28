"""Xác thực mã QR check-in + xác minh passport công khai — unittest chuẩn, KHÔNG pytest.

Chạy:   cd backend && python -m unittest discover -s tests -t .
Bao phủ yêu cầu của pane điều phối:
  - mã sai định dạng bị từ chối
  - mã cũ hết hạn bị từ chối
  - mã đã dùng rồi bị từ chối (chống tái sử dụng)
  - mã hợp lệ được nhận
  - endpoint xác minh công khai chạy được KHÔNG cần token
Dọn dẹp: mọi dòng checkins do test tạo đều mang tiền tố "FTH:" (seed dùng
"QR-..."), tearDown xoá đúng các dòng đó nên chạy lặp vẫn xanh.
"""
from __future__ import annotations

import json
import os
import sqlite3
import time
import unittest
import urllib.error
import urllib.request

BASE = os.environ.get("QA_BASE_URL", "http://127.0.0.1:8001/api/v1").rstrip("/")
from .base import TEST_DB as DB_PATH

PASSWORD = "demo123"
EMAIL_HS01 = "hs01@ftalenthub.edu.vn"
EMAIL_HS02 = "hs02@ftalenthub.edu.vn"
CHU_KY = 120


def call(method: str, path: str, token: str | None = None, body=None, timeout: float = 20):
    """Gọi API, trả về (status_code, payload). Lỗi mạng lan ra ngoài cho caller xử lý."""
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=timeout) as res:
            raw = res.read().decode()
            return res.status, (json.loads(raw) if raw.strip() else None)
    except urllib.error.HTTPError as exc:
        try:
            raw = exc.read().decode()
        finally:
            exc.close()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


def db_execute(sql: str, params: tuple = ()) -> None:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    try:
        conn.execute(sql, params)
        conn.commit()
    finally:
        conn.close()


def dang_nhap(email: str) -> str:
    status, payload = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
    assert status == 200, f"đăng nhập {email} thất bại: HTTP {status} {payload}"
    return payload["token"]


def ma_passport_cua(email: str, token: str) -> str:
    """Lấy mã passport (TP-...) của học sinh qua endpoint có token (giữ nguyên hợp đồng cũ)."""
    status, ho_so = call("GET", "/student/profile", token)
    assert status == 200, f"lấy hồ sơ {email} thất bại: HTTP {status} {ho_so}"
    status, ho_chieu = call("GET", f"/passport/{ho_so['id']}", token)
    assert status == 200, f"lấy passport {email} thất bại: HTTP {status} {ho_chieu}"
    return ho_chieu["qr_code"]


def cua_so_hien_tai() -> int:
    return int(time.time() // CHU_KY)


class QrCheckinTest(unittest.TestCase):
    """Xác thực mã check-in ở endpoint có token + endpoint quét công khai."""

    @classmethod
    def setUpClass(cls):
        cls.token_hs01 = dang_nhap(EMAIL_HS01)
        cls.token_hs02 = dang_nhap(EMAIL_HS02)
        cls.ma_hs01 = ma_passport_cua(EMAIL_HS01, cls.token_hs01)
        cls.ma_hs02 = ma_passport_cua(EMAIL_HS02, cls.token_hs02)

    def tearDown(self):
        db_execute("DELETE FROM checkins WHERE qr_code LIKE 'FTH:%'")

    # -------------------------------------------------- endpoint có token
    def test_01_ma_sai_dinh_dang_bi_tu_choi(self):
        status, payload = call(
            "POST", "/student/checkin?qr_code=QR-GIA-MAO", self.token_hs01, body={}
        )
        self.assertEqual(status, 400)
        self.assertIn("không đúng định dạng", payload["detail"])

    def test_02_ma_cu_het_han_bi_tu_choi(self):
        ma_cu = f"FTH:{self.ma_hs01}:{cua_so_hien_tai() - 5}"
        status, payload = call(
            "POST", f"/student/checkin?qr_code={ma_cu}", self.token_hs01, body={}
        )
        self.assertEqual(status, 400)
        self.assertIn("hết hạn", payload["detail"])

    def test_03_ma_hop_le_duoc_nhan(self):
        ma_moi = f"FTH:{self.ma_hs01}:{cua_so_hien_tai()}"
        status, payload = call(
            "POST", f"/student/checkin?qr_code={ma_moi}", self.token_hs01, body={}
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])

    def test_04_ma_da_dung_bi_tu_choi(self):
        ma_moi = f"FTH:{self.ma_hs01}:{cua_so_hien_tai()}"
        status, _ = call("POST", f"/student/checkin?qr_code={ma_moi}", self.token_hs01, body={})
        self.assertEqual(status, 200)
        status, payload = call("POST", f"/student/checkin?qr_code={ma_moi}", self.token_hs01, body={})
        self.assertEqual(status, 409)
        self.assertIn("đã được dùng", payload["detail"])

    def test_05_ma_cua_hoc_sinh_khac_bi_tu_choi(self):
        ma_nguoi_khac = f"FTH:{self.ma_hs02}:{cua_so_hien_tai()}"
        status, payload = call(
            "POST", f"/student/checkin?qr_code={ma_nguoi_khac}", self.token_hs01, body={}
        )
        self.assertEqual(status, 403)

    # -------------------------------------------------- endpoint quét công khai (không token)
    def test_06_quet_cong_khai_ma_hop_le_duoc_nhan(self):
        ma_moi = f"FTH:{self.ma_hs02}:{cua_so_hien_tai()}"
        status, payload = call("POST", "/student/checkin/scan", body={"code": ma_moi})
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertIn("ho_ten", payload["hoc_sinh"])

    def test_07_quet_cong_khai_ma_sai_bi_tu_choi(self):
        status, _ = call("POST", "/student/checkin/scan", body={"code": "CHUOI-LA"})
        self.assertEqual(status, 400)

    def test_08_quet_cong_khai_ma_cu_bi_tu_choi(self):
        ma_cu = f"FTH:{self.ma_hs02}:{cua_so_hien_tai() - 5}"
        status, payload = call("POST", "/student/checkin/scan", body={"code": ma_cu})
        self.assertEqual(status, 400)
        self.assertIn("hết hạn", payload["detail"])

    def test_09_quet_cong_khai_ma_da_dung_bi_tu_choi(self):
        ma_moi = f"FTH:{self.ma_hs02}:{cua_so_hien_tai()}"
        status, _ = call("POST", "/student/checkin/scan", body={"code": ma_moi})
        self.assertEqual(status, 200)
        status, payload = call("POST", "/student/checkin/scan", body={"code": ma_moi})
        self.assertEqual(status, 409)


class VerifyCongKhaiTest(unittest.TestCase):
    """Endpoint xác minh passport công khai: không token, tối thiểu, mã sai không lộ gì."""

    @classmethod
    def setUpClass(cls):
        token = dang_nhap(EMAIL_HS01)
        cls.ma_hs01 = ma_passport_cua(EMAIL_HS01, token)

    def test_01_xac_minh_khong_can_token(self):
        status, payload = call("GET", f"/passport/verify?code={self.ma_hs01}")
        self.assertEqual(status, 200)
        self.assertTrue(payload["verified"])
        self.assertEqual(payload["qr_code"], self.ma_hs01)
        self.assertIn("full_name", payload)
        self.assertIn("class_name", payload)

    def test_02_xac_minh_khong_lo_du_lieu_nhay_cam(self):
        status, payload = call("GET", f"/passport/verify?code={self.ma_hs01}")
        self.assertEqual(status, 200)
        than = json.dumps(payload)
        for khoa_cam in ("email", "talent_score", "experience_hours", "skills", "badges"):
            self.assertNotIn(khoa_cam, than)

    def test_03_ma_sai_bi_tu_choi_khong_lo_thong_tin(self):
        status, payload = call("GET", "/passport/verify?code=MA-KHONG-TON-TAI")
        self.assertEqual(status, 404)
        than = json.dumps(payload)
        self.assertNotIn("email", than)
        self.assertIn("không đúng", payload["detail"])


if __name__ == "__main__":
    unittest.main()
