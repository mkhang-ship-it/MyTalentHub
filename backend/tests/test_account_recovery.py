"""Kiểm thử quên mật khẩu + xác minh email.

CHẠY TRÊN DB RIÊNG (xem `tests/base.py`): test tạo tài khoản riêng
`test-recovery-*` và xoá sau mỗi test, nên không đụng tới 5 tài khoản demo.

Nguyên tắc quan trọng nhất được khoá ở đây: KHÔNG BAO GIỜ lộ email nào có
tài khoản. Kẻ dò email chỉ cần so sánh phản hồi giữa một email tồn tại và
một email không tồn tại. Nếu hai phản hồi khác nhau dù chỉ một dấu chấm câu,
endpoint đó tự tạo đường dò tài khoản.

Không có SMTP ở máy test nên thư được ghi ra `backend/outbox/*.html`; test đọc
file đó để lấy link, không bao giờ hard-code token.
"""
from __future__ import annotations

import os
import re
import unittest
from pathlib import Path

from .base import FTHttpTestCase

from app import mailer
from app.database import SessionLocal
from app.models import AuthToken, RefreshToken, User, VerificationToken
from app.security import _new_reset_pair, _new_verify_pair, hash_password, verify_password

OUTBOX = Path(__file__).resolve().parents[1] / "outbox"

#: Mật khẩu đạt yêu cầu của ResetPasswordIn (>= 8 ký tự, có hoa, có số).
GOOD_PASSWORD = "MatKhauMoi2026"


def _outbox(kind: str) -> list[Path]:
    if not OUTBOX.exists():
        return []
    return sorted(OUTBOX.glob(f"*-{kind}-*.html"), key=lambda p: p.stat().st_mtime)


def _latest_link(kind: str) -> str | None:
    files = _outbox(kind)
    if not files:
        return None
    m = re.search(r'href="(http[^"]+)"', files[-1].read_text(encoding="utf-8"))
    return m.group(1) if m else None


def _token_of(link: str) -> str:
    return re.search(r"token=([A-Za-z0-9_-]+)", link).group(1)


class RecoveryTestCase(FTHttpTestCase):
    """Nền: tạo tài khoản riêng, xoá sạch sau mỗi test."""

    def setUp(self):
        self.db = SessionLocal()
        self.email = "test-recovery@ftalenthub.edu.vn"
        self.db.query(User).filter(User.email == self.email).delete()
        self.db.commit()
        self.user = User(
            email=self.email,
            full_name="Người Dùng Thử Nghiệm",
            role="student",
            password_hash=hash_password("MatKhauCu2026"),
            email_verified=False,
        )
        self.db.add(self.user)
        self.db.commit()
        self.user_id = self.user.id

    def tearDown(self):
        # Dọn theo thứ tự để không vi phạm khoá ngoại: token -> auth -> user.
        self.db.query(VerificationToken).filter(
            VerificationToken.user_id == self.user_id
        ).delete(synchronize_session=False)
        self.db.query(AuthToken).filter(AuthToken.user_id == self.user_id).delete(
            synchronize_session=False
        )
        self.db.query(RefreshToken).filter(RefreshToken.user_id == self.user_id).delete(
            synchronize_session=False
        )
        self.db.query(User).filter(User.email == self.email).delete(
            synchronize_session=False
        )
        self.db.commit()
        self.db.close()

    def _request_reset(self) -> str:
        """Gọi forgot-password rồi lấy token từ thư thật trong outbox."""
        before = set(_outbox("reset"))
        status, _ = self.api.post(
            "/api/v1/auth/forgot-password", {"email": self.email}
        )
        self.assertEqual(status, 200)
        new = [p for p in _outbox("reset") if p not in before]
        self.assertTrue(new, "không có thư mới trong outbox")
        return _token_of(_latest_link("reset"))


class ForgotPasswordTests(RecoveryTestCase):
    def test_email_ton_tai_va_khong_ton_tai_tra_ve_giong_het(self):
        """Chống dò email tài khoản — kiểm thử quan trọng nhất nhóm này."""
        s1, b1 = self.api.post(
            "/api/v1/auth/forgot-password", {"email": self.email}
        )
        s2, b2 = self.api.post(
            "/api/v1/auth/forgot-password",
            {"email": "khong-ton-tai-abc@vidu.com"},
        )
        self.assertEqual(s1, s2)
        self.assertEqual(b1, b2)

    def test_email_khong_ton_tai_khong_gui_thu(self):
        """Email sai không được tạo thư — tránh bị lợi dụng để spam."""
        before = len(_outbox("reset"))
        self.api.post(
            "/api/v1/auth/forgot-password",
            {"email": "khong-ton-tai-abc@vidu.com"},
        )
        self.assertEqual(len(_outbox("reset")), before)

    def test_thu_co_link_dung_dinh_dang(self):
        self._request_reset()
        link = _latest_link("reset")
        self.assertIn("/dat-lai-mat-khau?token=", link)

    def test_file_thu_chi_ban_nguoi_dung_hay_doc(self):
        """Thư chứa link đặt lại mật khẩu nên phải 0600, không phải 644."""
        self._request_reset()
        path = _outbox("reset")[-1]
        self.assertEqual(
            oct(path.stat().st_mode & 0o777), "0o600",
            "file thư đang để quyền đọc cho mọi user trên máy",
        )

    def test_email_qua_ngan_bi_tu_choi(self):
        status, _ = self.api.post("/api/v1/auth/forgot-password", {"email": "a"})
        self.assertEqual(status, 422)

    def test_gui_lai_thu_giay_link_cu(self):
        """Yêu cầu lần 2 thì link cũ chết — thư cũ có thể nằm trong hộp thư."""
        token1 = self._request_reset()
        token2 = self._request_reset()
        self.assertNotEqual(token1, token2)
        status, _ = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token1, "new_password": GOOD_PASSWORD},
        )
        self.assertEqual(status, 400, "link cũ vẫn dùng được sau khi yêu cầu link mới")


class ResetPasswordTests(RecoveryTestCase):
    def test_dat_mat_khau_thanh_cong_bang_link_that(self):
        token = self._request_reset()
        status, data = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token, "new_password": GOOD_PASSWORD},
        )
        self.assertEqual(status, 200, data)
        self.db.expire_all()
        u = self.db.query(User).filter(User.id == self.user_id).one()
        self.assertTrue(verify_password(GOOD_PASSWORD, u.password_hash))
        self.assertTrue(
            u.password_hash.startswith("pbkdf2_sha256$"),
            "mật khẩu mới vẫn lưu bằng hash cũ không salt",
        )
        self.assertTrue(u.email_verified, "đổi mật khẩu phải xác nhận chủ sở hữu email")

    def test_dung_lai_link_da_dung_bi_tu_choi(self):
        """Link dùng một lần — dùng lại là dấu hiệu bị đánh cắp."""
        token = self._request_reset()
        first, _ = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token, "new_password": GOOD_PASSWORD},
        )
        self.assertEqual(first, 200)
        again, data = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token, "new_password": "MatKhauKhac2026"},
        )
        self.assertEqual(again, 400)
        self.assertIn("hết hạn", data["detail"])

    def test_doi_mat_khau_thu_hoi_phien_dang_mo(self):
        """Đổi mật khẩu phải đuổi phiên cũ, nếu không kẻ trộm phiên vẫn vào được."""
        # Dùng /auth/me vì endpoint này chỉ cần token hợp lệ, không cần dòng
        # Student/Teacher đi kèm — đúng thứ cần kiểm là token còn dùng được.
        token_old = self.api.login(self.email, "MatKhauCu2026")
        self.assertEqual(self.api.get("/api/v1/auth/me", token=token_old)[0], 200)

        token = self._request_reset()
        self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token, "new_password": GOOD_PASSWORD},
        )
        status, _ = self.api.get("/api/v1/auth/me", token=token_old)
        self.assertEqual(status, 401, "phiên cũ vẫn còn hiệu lực sau khi đổi mật khẩu")

        # Đăng nhập lại bằng mật khẩu mới thì vào được.
        self.assertEqual(
            self.api.post(
                "/api/v1/auth/login",
                {"email": self.email, "password": GOOD_PASSWORD},
            )[0],
            200,
        )
        # Mật khẩu cũ không còn dùng được.
        self.assertEqual(
            self.api.post(
                "/api/v1/auth/login",
                {"email": self.email, "password": "MatKhauCu2026"},
            )[0],
            401,
        )

    def test_token_khong_ton_tai_bi_tu_choi(self):
        status, data = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": "token-khong-ton-tai-123456", "new_password": GOOD_PASSWORD},
        )
        self.assertEqual(status, 400)
        self.assertIn("hết hạn", data["detail"])

    def test_mat_khau_yeu_bi_chan_bang_tieng_Viet(self):
        token = self._request_reset()
        for weak, hint in (("matkhauyeu", "chữ hoa"), ("MatKhauKhongSo", "chữ số")):
            status, data = self.api.post(
                "/api/v1/auth/reset-password",
                {"token": token, "new_password": weak},
            )
            self.assertEqual(status, 422, f"{weak!r} phải bị chặn")
            self.assertIn(hint, data["detail"])

    def test_reset_token_het_han_bi_tu_choi(self):
        from datetime import timedelta

        token, token_hash, _ = _new_reset_pair()
        self.db.add(VerificationToken(
            purpose="reset", token_hash=token_hash, user_id=self.user_id,
            expires_at=_utcnow() - timedelta(minutes=1),
        ))
        self.db.commit()
        status, _ = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token, "new_password": GOOD_PASSWORD},
        )
        self.assertEqual(status, 400)

    def test_dung_nhat_reset_cho_xac_minh_bi_tu_choi(self):
        """Hai loại token phải tách bạch, không lấn sang nhau."""
        token, token_hash, expires_at = _new_verify_pair()
        self.db.add(VerificationToken(
            purpose="verify", token_hash=token_hash, user_id=self.user_id,
            expires_at=expires_at,
        ))
        self.db.commit()
        status, _ = self.api.post(
            "/api/v1/auth/reset-password",
            {"token": token, "new_password": GOOD_PASSWORD},
        )
        self.assertEqual(status, 400, "token xác minh email dùng để reset mật khẩu được")


class VerifyEmailTests(RecoveryTestCase):
    def _verify_token(self, purpose: str = "verify") -> str:
        pair = _new_verify_pair() if purpose == "verify" else _new_reset_pair()
        token, token_hash, expires_at = pair
        self.db.query(VerificationToken).filter(
            VerificationToken.user_id == self.user_id,
            VerificationToken.purpose == purpose,
        ).delete(synchronize_session=False)
        self.db.add(VerificationToken(
            purpose=purpose, token_hash=token_hash,
            user_id=self.user_id, expires_at=expires_at,
        ))
        self.db.commit()
        return token

    def test_xac_minh_thanh_cong(self):
        token = self._verify_token()
        status, _ = self.api.get(f"/api/v1/auth/verify-email?token={token}")
        self.assertEqual(status, 200)
        self.db.expire_all()
        self.assertTrue(
            self.db.query(User).filter(User.id == self.user_id).one().email_verified
        )

    def test_token_dung_hai_lan_thi_lan_sau_bao_loi(self):
        token = self._verify_token()
        self.api.get(f"/api/v1/auth/verify-email?token={token}")
        self.db.expire_all()
        # Lần hai vẫn trả 200 nhưng là trang báo lỗi, không phải trang thành công.
        import urllib.request

        with urllib.request.urlopen(
            f"{self.api.base_url}/api/v1/auth/verify-email?token={token}", timeout=20
        ) as r:
            html = r.read().decode()
        self.assertNotIn("đã được xác minh", html)

    def test_token_sai_tra_html_loi_khong_phai_500(self):
        status, _ = self.api.get("/api/v1/auth/verify-email?token=token-sai-12345")
        self.assertEqual(status, 200, "phải trả trang kết quả, không được lỗi server")

    def test_gui_lai_link_can_dang_nhap(self):
        status, _ = self.api.post("/api/v1/auth/verify-email/resend")
        self.assertEqual(status, 401)

    def test_gui_lai_link_cho_nguoi_da_dang_nhap(self):
        token = self.api.login(self.email, "MatKhauCu2026")
        status, data = self.api.post(
            "/api/v1/auth/verify-email/resend", token=token
        )
        self.assertEqual(status, 200, data)
        self.assertIn("hộp thư", data["message"])
        self.assertIsNotNone(_latest_link("verify"))

    def test_gui_lai_link_khi_da_xac_minh_thi_bao_da_xac_minh(self):
        self.user.email_verified = True
        self.db.commit()
        token = self.api.login(self.email, "MatKhauCu2026")
        status, data = self.api.post(
            "/api/v1/auth/verify-email/resend", token=token
        )
        self.assertEqual(status, 200)
        self.assertIn("trước đó", data["message"])


class MailerTests(unittest.TestCase):
    """Phần gửi thư không cần SMTP."""

    def test_chon_dung_phuong_thuc(self):
        self.assertIn(mailer.mail_transport(), ("smtp", "outbox"))

    def test_file_thu_ra_chao_voi_quyen_600(self):
        if mailer.SMTP_HOST:
            self.skipTest("máy này có SMTP_HOST, bỏ qua nhánh ghi outbox")
        path = mailer._write_to_outbox(
            "x@y.vn", "reset", "reset", '<a href="http://a/b">b</a>'
        )
        try:
            self.assertEqual(oct(os.stat(path).st_mode & 0o777), "0o600")
        finally:
            os.remove(path)

    def test_hong_gui_thu_khong_duoc_lo_email(self):
        """Gửi thư lỗi mà vẫn phải trả 200 — nếu trả 500 thì lộ ra email có tồn tại."""
        if mailer.SMTP_HOST:
            self.skipTest("cần cấu hình SMTP hỏng mới kiểm được nhánh này")
        original = mailer._write_to_outbox

        def boom(*a, **k):
            raise OSError("SMTP down")

        mailer._write_to_outbox = boom
        try:
            import app.routers.auth as auth_mod

            original_fn = auth_mod.send_reset_email
            auth_mod.send_reset_email = boom
            db = SessionLocal()
            email = "test-mailer-fail@ftalenthub.edu.vn"
            db.query(User).filter(User.email == email).delete()
            db.add(User(
                email=email, full_name="T", role="student",
                password_hash=hash_password("MatKhauCu2026"),
            ))
            db.commit()
            db.close()
            try:
                from .base import FTClient

                status, _ = FTClient().post(
                    "/api/v1/auth/forgot-password", {"email": email}
                )
                self.assertEqual(
                    status, 200, "lỗi gửi thư phải bị giấu, không được phép lộ email"
                )
            finally:
                db = SessionLocal()
                db.query(User).filter(User.email == email).delete()
                db.commit()
                db.close()
                auth_mod.send_reset_email = original_fn
        finally:
            mailer._write_to_outbox = original


def _utcnow():
    from app.security import _utcnow as f

    return f()


if __name__ == "__main__":
    unittest.main()
