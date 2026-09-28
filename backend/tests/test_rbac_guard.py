"""Kiểm thử khoá phân quyền /school/*, /enterprise/*, /passport/* (lô security).

Duyệt danh sách route TRỰC TIẾP từ `app.main:app` — KHÔNG hard-code tay:
mọi endpoint mới thêm vào 3 router này tự động được kiểm tra.

Hợp đồng:
- /school/*     → không token: 401; sai vai trò (student): 403; đúng vai trò: 200.
- /enterprise/* → không token: 401; sai vai trò (student): 403; đúng vai trò: 200.
- /passport/*   → không token: 401; BẤT KỲ token nào cũng 200 (hồ sơ công khai
  theo ý tưởng QR — quyết định từ lô 4, không có khái niệm "sai vai trò").
  NGOẠI LỆ (quyết định pane 2, có chủ đích): GET /passport/verify là endpoint
  CÔNG KHAI cho camera điện thoại (người quét không đăng nhập) nên không token
  vẫn 200 với mã đúng / 404 với mã sai, chứ không phải 401. Vòng lặp dưới đây
  bỏ qua route này; hợp đồng công khai được kiểm riêng ở test_qr_verify.py và
  test_passport_verify_is_public_by_design bên dưới.

Với POST/PUT/DELETE chỉ kiểm 401/403 (không gửi token đúng vai trò để tránh
ghi/xoá dữ liệu thật). Body gửi kèm là dict dùng chung, đủ field bắt buộc của
các schema (pydantic bỏ qua field thừa) để lỗi validation (422) không che mất
lỗi phân quyền (401/403) — guard chạy sau validation nên body phải hợp lệ thì
kết quả 401/403 mới chứng minh được guard hoạt động.

Chạy:   cd backend && python -m unittest discover -s tests -t . -v
Yêu cầu backend đang chạy tại http://127.0.0.1:8001 (đổi bằng QA_BASE_URL).
Nếu backend chưa chạy → skip toàn bộ (không fail đỏ).
"""
from __future__ import annotations

import json
import os
import re
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

# Body dùng chung cho POST/PUT: đủ field bắt buộc của mọi schema
# (InternshipPostIn.title, SponsorshipIn.project_id, InterviewInvitationIn.student_id,
#  StudentImportIn.content có mặc định, payload dict nhận mọi thứ).
WRITE_BODY = {
    "title": "RBAC kiểm thử",
    "project_id": 1,
    "student_id": 1,
    "student_ids": [],
    "content": "",
    "name": "RBAC",
    "grade": 10,
    "amount": 1000,
    "slots": 1,
    "message": "",
}

ROLE_OF_PREFIX = {
    "/api/v1/school": ("school", "student"),
    "/api/v1/enterprise": ("enterprise", "student"),
}


def discover_routes() -> list[tuple[str, str]]:
    """Liệt kê (method, path) của 3 router cần khoá, lấy từ app thật."""
    from app.main import app

    out: set[tuple[str, str]] = set()
    for route in app.routes:
        path = getattr(route, "path", "")
        methods = getattr(route, "methods", None) or set()
        if not path.startswith(("/api/v1/school", "/api/v1/enterprise", "/api/v1/passport")):
            continue
        for method in sorted(methods):
            if method in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                out.add((method, path))
    return sorted(out)


def concrete_path(template: str) -> str:
    """Thay {param} bằng id cụ thể, đồng thời bỏ tiền tố /api/v1 (BASE đã có).

    Passport dùng học sinh 1 (có hồ sơ thật), còn lại dùng 999999 (không tồn tại
    → guard vẫn phải chặn trước khi tra DB)."""
    if "/passport/" in template:
        filled = re.sub(r"\{[^}]+\}", "1", template)
    else:
        filled = re.sub(r"\{[^}]+\}", "999999", template)
    assert filled.startswith("/api/v1/"), f"route thiếu tiền tố /api/v1: {template}"
    return filled[len("/api/v1"):]


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
                return res.status, raw  # CSV/template: trả thô, chỉ cần status
    except urllib.error.HTTPError as exc:
        try:
            raw = exc.read().decode()
        finally:
            exc.close()
        try:
            return exc.code, json.loads(raw)
        except ValueError:
            return exc.code, raw


class RbacGuardTest(unittest.TestCase):
    """Mọi endpoint school/enterprise/passport đều chặn 401/403."""

    @classmethod
    def setUpClass(cls):
        try:
            status, _ = call("GET", "/health", timeout=5)
        except (urllib.error.URLError, OSError) as exc:
            raise unittest.SkipTest(f"Backend chưa chạy tại {BASE} — bỏ qua ({exc})")
        if status != 200:
            raise unittest.SkipTest(f"GET /health trả HTTP {status} — bỏ qua")

        cls.tokens: dict[str, str] = {}
        for role, email in ACCOUNTS.items():
            status, payload = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
            if status != 200 or not isinstance(payload, dict) or "token" not in payload:
                raise AssertionError(f"Đăng nhập {role} ({email}) thất bại: HTTP {status} {payload}")
            cls.tokens[role] = payload["token"]

        cls.routes = discover_routes()
        if not cls.routes:
            raise AssertionError("Không duyệt được route nào từ app.main:app")

    def test_school_endpoints_locked(self):
        routes = [(m, p) for m, p in self.routes if p.startswith("/api/v1/school")]
        self.assertTrue(routes, "phải có ít nhất 1 route /school/*")
        for method, template in routes:
            path = concrete_path(template)
            body = WRITE_BODY if method in ("POST", "PUT", "PATCH") else None
            with self.subTest(f"{method} {template}"):
                status, _ = call(method, path, None, body)
                self.assertEqual(status, 401, "không token phải là 401")
                status, _ = call(method, path, self.tokens["student"], body)
                self.assertEqual(status, 403, "token student phải là 403")
                if method == "GET" and "{" not in template:
                    status, _ = call(method, path, self.tokens["school"])
                    self.assertEqual(status, 200, "token school phải là 200")

    def test_enterprise_endpoints_locked(self):
        routes = [(m, p) for m, p in self.routes if p.startswith("/api/v1/enterprise")]
        self.assertTrue(routes, "phải có ít nhất 1 route /enterprise/*")
        for method, template in routes:
            path = concrete_path(template)
            body = WRITE_BODY if method in ("POST", "PUT", "PATCH") else None
            with self.subTest(f"{method} {template}"):
                status, _ = call(method, path, None, body)
                self.assertEqual(status, 401, "không token phải là 401")
                status, _ = call(method, path, self.tokens["student"], body)
                self.assertEqual(status, 403, "token student phải là 403")
                if method == "GET" and "{" not in template:
                    status, _ = call(method, path, self.tokens["enterprise"])
                    self.assertEqual(status, 200, "token enterprise phải là 200")

    def test_passport_requires_login_but_open_to_all_roles(self):
        routes = [
            (m, p)
            for m, p in self.routes
            if p.startswith("/api/v1/passport") and p != "/api/v1/passport/verify"
        ]
        self.assertTrue(routes, "phải có ít nhất 1 route /passport/*")
        for method, template in routes:
            path = concrete_path(template)
            with self.subTest(f"{method} {template}"):
                status, _ = call(method, path, None)
                self.assertEqual(status, 401, "không token phải là 401")
                for role in ("student", "teacher", "coach", "school", "enterprise"):
                    status, _ = call(method, path, self.tokens[role])
                    self.assertEqual(
                        status, 200,
                        f"token {role} phải xem được passport (hồ sơ công khai QR)",
                    )

    def test_passport_verify_is_public_by_design(self):
        """GET /passport/verify cố ý công khai: camera quét không cần đăng nhập.

        Không token + mã đúng → 200; không token + mã sai → 404 (chứ KHÔNG 401).
        Có token + mã đúng → 200 (token bị bỏ qua, không bắt buộc)."""
        status, ho_chieu = call("GET", "/passport/1", self.tokens["student"])
        self.assertEqual(status, 200)
        ma_dung = ho_chieu["qr_code"]
        status, _ = call("GET", f"/passport/verify?code={ma_dung}", None)
        self.assertEqual(status, 200, "mã đúng không cần token phải là 200")
        status, _ = call("GET", "/passport/verify?code=MA-KHONG-TON-TAI", None)
        self.assertEqual(status, 404, "mã sai không cần token phải là 404, không phải 401")
        status, _ = call("GET", f"/passport/verify?code={ma_dung}", self.tokens["teacher"])
        self.assertEqual(status, 200, "mã đúng kèm token vẫn là 200")

    def test_role_map_covers_all_prefixes(self):
        for _, template in self.routes:
            with self.subTest(template):
                self.assertTrue(
                    template.startswith(("/api/v1/school", "/api/v1/enterprise", "/api/v1/passport")),
                    f"route ngoài phạm vi kiểm tra: {template}",
                )


if __name__ == "__main__":
    unittest.main()
