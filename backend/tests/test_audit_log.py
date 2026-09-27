"""Kiểm thử nhật ký thao tác nhạy cảm (`audit_logs`).

Trọng tâm không phải "có ghi dòng không" mà là hai điều có hậu quả thật:

1. **Bí mật không được lọt vào nhật ký.** Nhật ký thường được đọc bởi nhiều người
   hơn cả DB chính, nên mật khẩu lọt vào đó là lộ mật khẩu thật.
2. **Nhật ký không được làm hỏng chức năng đang gọi.** Mất một dòng nhật ký còn
   hơn là trả 500 cho người dùng khi họ đăng nhập.

Chạy trên DB riêng (xem `tests/base.py`).
"""
from __future__ import annotations

import json
import unittest
from datetime import timedelta

from fastapi.testclient import TestClient

from .base import FTHttpTestCase

from app.core.audit import _scrub, record_audit
from app.database import SessionLocal
from app.main import app
from app.models import AuditLog, User
from app.security import _utcnow, hash_password

EMAIL = "test-audit@ftalenthub.edu.vn"
PASSWORD = "MatKhauAudit2026"


class AuditScrubTests(unittest.TestCase):
    """Lọc trường nhạy cảm — chạy được không cần server."""

    def test_xoa_truong_nhay_cam(self):
        out = _scrub({"email": "a@b.vn", "password": "matkhau",
                      "new_password": "x", "token": "y", "note": "binh thuong"})
        self.assertEqual(out["email"], "a@b.vn")
        self.assertEqual(out["note"], "binh thuong")
        for k in ("password", "new_password", "token"):
            self.assertEqual(out[k], "[ẩn]", f"{k} phải được che")

    def test_khong_phan_biet_hoa_thuong(self):
        out = _scrub({"PassWord": "x", "TOKEN": "y", "Authorization": "z"})
        self.assertEqual(list(out.values()), ["[ẩn]"] * 3)

    def test_thuong(self):
        self.assertIsNone(_scrub(None))
        self.assertEqual(_scrub({}), {})


class AuditWriteTests(FTHttpTestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.db.query(User).filter(User.email == EMAIL).delete()
        self.db.commit()
        self.user = User(email=EMAIL, full_name="Khoan Audit", role="student",
                         password_hash=hash_password(PASSWORD))
        self.db.add(self.user)
        self.db.commit()
        self.user_id = self.user.id

    def tearDown(self):
        self.db.query(AuditLog).filter(AuditLog.user_id == self.user_id).delete(
            synchronize_session=False
        )
        self.db.query(User).filter(User.email == EMAIL).delete(
            synchronize_session=False
        )
        self.db.commit()
        self.db.close()

    def _logs(self, action: str | None = None):
        """Các dòng nhật ký thuộc RIÊNG test này.

        Lọc theo tên test chứ không theo tiền tố chung: nếu lọc `audit.%` thì
        dòng của test khác (hoặc sót lại từ lần chạy trước) làm test này fail
        oan. Mỗi test tự có không gian tên riêng nên độc lập hoàn toàn.
        """
        action = action or f"audit.{self._testMethodName}%"
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.action.like(action))
            .order_by(AuditLog.id.desc())
            .all()
        )

    def test_ghi_co_ban(self):
        record_audit(self.db, f"audit.{self._testMethodName}", user=self.user, target=("thing", 7),
                     detail={"count": 3})
        rows = self._logs()
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r.action, f"audit.{self._testMethodName}")
        self.assertEqual(r.user_id, self.user_id)
        self.assertEqual(r.role, "student")
        self.assertEqual(r.target_type, "thing")
        self.assertEqual(r.target_id, "7")
        self.assertEqual(json.loads(r.detail)["count"], 3)

    def test_mat_khau_khong_ba_ghi(self):
        record_audit(self.db, f"audit.{self._testMethodName}", user=self.user,
                     detail={"password": "MatKhauThat", "email": EMAIL})
        r = self._logs()[0]
        self.assertNotIn("MatKhauThat", r.detail)
        self.assertEqual(json.loads(r.detail)["password"], "[ẩn]")

    def test_mat_khau_khong_bao_lo_tham_chiem(self):
        """Toàn bảng audit không được chứa mật khẩu ở bất kỳ cột nào."""
        record_audit(self.db, f"audit.{self._testMethodName}", user=self.user,
                     detail={"token": "abc123", "password_hash": "pbkdf2$x"})
        for r in self.db.query(AuditLog).all():
            for col in ("action", "target_type", "target_id", "detail",
                        "ip", "user_agent", "request_id"):
                val = str(getattr(r, col) or "")
                self.assertNotIn("abc123", val, f"rò token vào cột {col}")
                self.assertNotIn("pbkdf2$", val, f"rò hash mật khẩu vào cột {col}")

    def test_ghi_hong_khong_lam_hong_request(self):
        """Nuốt lỗi DB thì `record_audit` không được ném lỗi ra ngoài."""
        class Boom:
            def add(self, *a, **k):
                raise RuntimeError("db hỏng")
            def commit(self):
                raise RuntimeError("db hỏng")
            def rollback(self):
                pass

        before = len(self._logs())
        # Không được ném ra — nếu ném thì test này FAIL ngay tại dòng này.
        record_audit(Boom(), f"audit.{self._testMethodName}", user=self.user)
        after = len(self._logs())
        self.assertEqual(
            after, before, "ghi hỏng vẫn phải không tạo thêm dòng nào"
        )

    def test_dung_id_int_cho_user(self):
        record_audit(self.db, f"audit.{self._testMethodName}", user=self.user_id)
        self.assertEqual(self._logs()[0].user_id, self.user_id)

    def test_don_dau(self):
        record_audit(self.db, f"audit.{self._testMethodName}")
        record_audit(self.db, f"audit.{self._testMethodName}")
        self.assertEqual(len(self._logs()), 2, "mỗi lần ghi phải là một dòng riêng")


class AuditPurgeTests(FTHttpTestCase):
    def test_don_dau_theo_ngay_giu(self):
        from app.core.audit import purge_old_audit_logs

        db = SessionLocal()
        try:
            old = AuditLog(action="audit.old",
                           created_at=_utcnow() - timedelta(days=400))
            fresh = AuditLog(action="audit.fresh", created_at=_utcnow())
            db.add_all([old, fresh])
            db.commit()
            n = purge_old_audit_logs(db, keep_days=180)
            db.commit()
            self.assertEqual(n, 1, "chỉ dòng cũ bị dọn")
            left = [a for a, in db.query(AuditLog.action).all()]
            self.assertIn("audit.fresh", left)
            self.assertNotIn("audit.old", left)
        finally:
            db.query(AuditLog).filter(
                AuditLog.action.in_(["audit.old", "audit.fresh"])
            ).delete(synchronize_session=False)
            db.commit()
            db.close()


class AuditEndpointTests(FTHttpTestCase):
    """GET /school/audit-log — chỉ nhà trường đọc được."""

    def setUp(self):
        self.db = SessionLocal()
        self.db.query(AuditLog).filter(AuditLog.action.like("audit.ep%")).delete(
            synchronize_session=False
        )
        self.db.commit()
        self.db.add(AuditLog(action="audit.ep_demo", role="student",
                            user_id=None, ip="1.2.3.4", detail='{"n": 1}'))
        self.db.commit()
        self.db.close()
        self.school = self.api.login("bgh@ftalenthub.edu.vn", "demo123")
        self.student = self.api.login("hs01@ftalenthub.edu.vn", "demo123")

    def tearDown(self):
        db = SessionLocal()
        db.query(AuditLog).filter(AuditLog.action.like("audit.ep%")).delete(
            synchronize_session=False
        )
        db.commit()
        db.close()

    def test_nha_truong_doc_duoc(self):
        status, data = self.api.get("/api/v1/school/audit-log?action=audit.ep",
                                    token=self.school)
        self.assertEqual(status, 200, data)
        self.assertGreaterEqual(data["total"], 1)
        self.assertTrue(any(i["action"] == "audit.ep_demo" for i in data["items"]))

    def test_hoc_sinh_bi_chan_403(self):
        status, _ = self.api.get("/api/v1/school/audit-log", token=self.student)
        self.assertEqual(status, 403)

    def test_khong_token_bi_401(self):
        status, _ = self.api.get("/api/v1/school/audit-log")
        self.assertEqual(status, 401)

    def test_loc_tien_to_action(self):
        status, data = self.api.get("/api/v1/school/audit-log?action=audit.ep",
                                    token=self.school)
        self.assertEqual(status, 200)
        for item in data["items"]:
            self.assertTrue(item["action"].startswith("audit.ep"))

    def test_ngay_sai_dinh_dang_bi_422(self):
        status, _ = self.api.get("/api/v1/school/audit-log?since=abc",
                                 token=self.school)
        self.assertEqual(status, 422)

    def test_limit_duoc_kep(self):
        status, data = self.api.get("/api/v1/school/audit-log?limit=9999",
                                    token=self.school)
        self.assertEqual(status, 422, "limit vượt trần phải bị chặn ở tầng query")

    def test_dang_nhap_binh_thuong_co_ghi_nhat_ky(self):
        """Đăng nhập qua HTTP thật thì nh��i thấy dòng nhật ký tương ứng."""
        self.api.post("/api/v1/auth/login",
                      {"email": "hs01@ftalenthub.edu.vn", "password": "demo123"})
        status, data = self.api.get("/api/v1/school/audit-log?action=auth.login_ok",
                                    token=self.school)
        self.assertEqual(status, 200)
        self.assertGreaterEqual(data["total"], 1)


if __name__ == "__main__":
    unittest.main()
