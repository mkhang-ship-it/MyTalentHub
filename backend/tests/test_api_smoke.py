"""Kiểm thử khói API FTalentHub — unittest thư viện chuẩn, KHÔNG cần pytest.

Chạy:   cd backend && python -m unittest discover -s tests -t . -v
Yêu cầu backend đang chạy tại http://127.0.0.1:8001 (đổi bằng biến QA_BASE_URL).
Nếu backend chưa chạy → skip toàn bộ với thông báo rõ ràng (không fail đỏ).

Hợp đồng phân quyền: mọi request đều gửi Bearer token,
trừ các case kiểm tra 401 có chủ đích (không gửi header Authorization).
"""
from __future__ import annotations

import json
import os
import unittest
import urllib.error
import urllib.request

BASE = os.environ.get("QA_BASE_URL", "http://127.0.0.1:8001/api/v1").rstrip("/")
PASSWORD = "demo123"
ACCOUNTS = {
    "student": "hs01@ftalenthub.edu.vn",
    "teacher": "nguyen.van.hung@ftalenthub.edu.vn",
    "coach": "hlv.boi@ftalenthub.edu.vn",
    "school": "bgh@ftalenthub.edu.vn",
    "enterprise": "hr@techfpt.vn",
}


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


class ApiSmokeTest(unittest.TestCase):
    """Smoke: health, phân quyền 401/403/200, shape dữ liệu chính."""

    @classmethod
    def setUpClass(cls):
        try:
            status, _ = call("GET", "/health", timeout=5)
        except (urllib.error.URLError, OSError) as exc:
            raise unittest.SkipTest(f"Backend chưa chạy tại {BASE} — bỏ qua smoke test ({exc})")
        if status != 200:
            raise unittest.SkipTest(f"GET /health trả HTTP {status} — bỏ qua smoke test")

        cls.tokens: dict[str, str] = {}
        for role, email in ACCOUNTS.items():
            status, payload = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
            if status != 200 or not isinstance(payload, dict) or "token" not in payload:
                raise AssertionError(f"Đăng nhập {role} ({email}) thất bại: HTTP {status} {payload}")
            cls.tokens[role] = payload["token"]

    # ---------------------------------------------------------- health
    def test_health(self):
        status, payload = call("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(payload.get("status"), "ok")

    # ---------------------------------------------------------- phân quyền
    def test_teacher_classes_authorization(self):
        status, _ = call("GET", "/teacher/classes")
        self.assertEqual(status, 401, "không token phải là 401")
        status, _ = call("GET", "/teacher/classes", self.tokens["student"])
        self.assertEqual(status, 403, "token student phải là 403")
        status, payload = call("GET", "/teacher/classes", self.tokens["teacher"])
        self.assertEqual(status, 200, "token teacher phải là 200")
        self.assertIsInstance(payload, list)

    def test_school_endpoints_authorization(self):
        for path in ("/school/teachers", "/school/study-groups"):
            with self.subTest(path=path):
                status, _ = call("GET", path)
                self.assertEqual(status, 401, f"{path}: không token phải là 401")
                status, _ = call("GET", path, self.tokens["student"])
                self.assertEqual(status, 403, f"{path}: token student phải là 403")
                status, payload = call("GET", path, self.tokens["school"])
                self.assertEqual(status, 200, f"{path}: token school phải là 200")
                self.assertIsInstance(payload, list)

    # ---------------------------------------------------------- student
    def test_student_profile_certificates_have_id(self):
        status, profile = call("GET", "/student/profile", self.tokens["student"])
        self.assertEqual(status, 200)
        self.assertIsInstance(profile.get("certificates"), list)
        for cert in profile["certificates"]:
            self.assertIsInstance(cert.get("id"), int, f"chứng chỉ thiếu id: {cert}")

    def test_evaluations_reviewer_role(self):
        status, evals = call("GET", "/student/evaluations", self.tokens["student"])
        self.assertEqual(status, 200)
        self.assertIsInstance(evals, list)
        for item in evals:
            self.assertIn(
                item.get("reviewer_role"),
                ("teacher", "coach"),
                f"reviewer_role không hợp lệ: {item}",
            )

    def test_recommendations_are_deterministic(self):
        status1, first = call("GET", "/student/recommendations", self.tokens["student"])
        status2, second = call("GET", "/student/recommendations", self.tokens["student"])
        self.assertEqual(status1, 200)
        self.assertEqual(status2, 200)
        self.assertIn("based_on", first)
        self.assertIn("suggestions", first)
        self.assertIsInstance(first["suggestions"], list)
        for item in first["suggestions"]:
            pct = item.get("match_pct")
            self.assertIsInstance(pct, int, f"match_pct phải là số nguyên: {item}")
            self.assertGreaterEqual(pct, 0)
            self.assertLessEqual(pct, 100)
        self.assertEqual(first, second, "gợi ý nhóm phải tất định (2 lần gọi giống hệt)")

    # ---------------------------------------------------------- teacher / coach
    def test_teacher_me_shapes(self):
        status, me = call("GET", "/teacher/me", self.tokens["teacher"])
        self.assertEqual(status, 200)
        self.assertIsInstance(me.get("allowed_grades"), list)
        self.assertTrue(me.get("allowed_grades"), "teacher phải có allowed_grades")

        status, me = call("GET", "/teacher/me", self.tokens["coach"])
        self.assertEqual(status, 200)
        self.assertEqual(me.get("role"), "coach")
        self.assertIs(me.get("is_coach"), True)

    # ---------------------------------------------------------- passport + school
    def test_passport_and_school_classes(self):
        status, _ = call("GET", "/passport/1", self.tokens["student"])
        self.assertEqual(status, 200)
        status, classes = call("GET", "/school/classes", self.tokens["school"])
        self.assertEqual(status, 200)
        for key in ("grades", "classes", "top_classes"):
            self.assertIn(key, classes, f"/school/classes thiếu '{key}'")


if __name__ == "__main__":
    unittest.main()
