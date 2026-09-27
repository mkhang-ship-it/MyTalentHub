"""Quy tắc nghiệp vụ FTalentHub — unittest thư viện chuẩn, KHÔNG cần pytest.

Chạy:   cd backend && python -m unittest discover -s tests -t . -v
Yêu cầu backend đang chạy tại http://127.0.0.1:8001 (đổi bằng biến QA_BASE_URL).

QUY ƯỚC DỌN DỮ LIỆU (mỗi test tự tạo → tự xoá trong tearDown):
  - Lớp học / nhóm học tập mang tiền tố "QA-"
  - Chứng chỉ mang tiền tố "QA " ở đầu tiêu đề
  - Tài khoản coach test: qa.coach@ftalenthub.edu.vn
Chạy 2 lần liên tiếp phải vẫn xanh và class_groups giữ đúng 7 dòng gốc
(10A1, 10A2, 11B1, 11B2, 12C1, 12C2, 12).
Chỉ được tạo file trong backend/tests — KHÔNG sửa file trong backend/app.
"""
from __future__ import annotations

import json
import os
import sqlite3
import unittest
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("QA_BASE_URL", "http://127.0.0.1:8001/api/v1").rstrip("/")
from .base import TEST_DB as DB_PATH
PASSWORD = "demo123"
PREFIX_CLASS = "QA-"
PREFIX_CERT = "QA "
EMAIL_COACH_TEST = "qa.coach@ftalenthub.edu.vn"
ORIGINAL_CLASS_GROUPS = ["10A1", "10A2", "11B1", "11B2", "12C1", "12C2", "12"]
ACCOUNTS = {
    "student": "hs01@ftalenthub.edu.vn",
    "teacher": "nguyen.van.hung@ftalenthub.edu.vn",
    "school": "bgh@ftalenthub.edu.vn",
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


def db_fetch(sql: str, params: tuple = ()) -> list[tuple]:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    try:
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()


def db_execute(sql: str, params: tuple = ()) -> None:
    conn = sqlite3.connect(DB_PATH, timeout=15)
    try:
        conn.execute(sql, params)
        conn.commit()
    finally:
        conn.close()


def sweep_leftovers() -> None:
    """Xoá mọi dữ liệu test QA sót — idempotent, an toàn gọi lặp lại.

    Bắt buộc gọi sau MỖI test (tearDown) để chạy 2 lần liên tiếp vẫn sạch,
    kể cả khi test fail giữa chừng.
    """
    db_execute(
        "DELETE FROM teacher_class_assignments WHERE class_group_id IN"
        " (SELECT id FROM class_groups WHERE name LIKE ?)",
        (f"{PREFIX_CLASS}%",),
    )
    db_execute("DELETE FROM class_groups WHERE name LIKE ?", (f"{PREFIX_CLASS}%",))
    db_execute(
        "DELETE FROM study_group_members WHERE group_id IN"
        " (SELECT id FROM study_groups WHERE name LIKE ?)",
        (f"{PREFIX_CLASS}%",),
    )
    db_execute("DELETE FROM study_groups WHERE name LIKE ?", (f"{PREFIX_CLASS}%",))
    db_execute("DELETE FROM certificates WHERE title LIKE ?", (f"{PREFIX_CERT}%",))

    # Tài khoản coach test (nếu lần chạy trước bị ngắt giữa chừng)
    sub = "(SELECT id FROM users WHERE email = ?)"
    db_execute(f"DELETE FROM auth_tokens WHERE user_id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute(f"DELETE FROM evaluations WHERE teacher_id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute(f"DELETE FROM activities WHERE teacher_id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute(f"DELETE FROM teacher_class_assignments WHERE teacher_id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute(f"DELETE FROM study_groups WHERE coach_id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute(f"DELETE FROM teachers WHERE id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute(f"DELETE FROM coaches WHERE id IN {sub}", (EMAIL_COACH_TEST,))
    db_execute("DELETE FROM users WHERE email = ?", (EMAIL_COACH_TEST,))

    # Dòng mồ côi trỏ nhóm đã không còn tồn tại
    db_execute("DELETE FROM study_group_members WHERE group_id NOT IN (SELECT id FROM study_groups)")


class BusinessRulesTest(unittest.TestCase):
    """Mỗi test độc lập, tự tạo dữ liệu riêng, tự dọn trong tearDown."""

    @classmethod
    def setUpClass(cls):
        try:
            status, _ = call("GET", "/health", timeout=5)
        except (urllib.error.URLError, OSError) as exc:
            raise unittest.SkipTest(f"Backend chưa chạy tại {BASE} — bỏ qua business rules ({exc})")
        if status != 200:
            raise unittest.SkipTest(f"GET /health trả HTTP {status} — bỏ qua business rules")

        cls.tokens: dict[str, str] = {}
        for role, email in ACCOUNTS.items():
            status, payload = call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
            if status != 200 or not isinstance(payload, dict) or "token" not in payload:
                raise AssertionError(f"Đăng nhập {role} ({email}) thất bại: HTTP {status} {payload}")
            cls.tokens[role] = payload["token"]

        # Chốt baseline talent_score học sinh 1 (test evaluation sẽ khôi phục)
        cls.baseline_score = db_fetch("SELECT talent_score FROM students WHERE id = 1")[0][0]
        # Dọn dữ liệu QA sót từ lần chạy trước (nếu có) trước khi bắt đầu
        sweep_leftovers()

    def setUp(self):
        self.created_eval_ids: list[int] = []

    def tearDown(self):
        # Dọn evaluation + talent_score trước (nếu test evaluation vừa chạy)
        for eval_id in self.created_eval_ids:
            db_execute("DELETE FROM evaluations WHERE id = ?", (eval_id,))
        if self.created_eval_ids:
            db_execute("UPDATE students SET talent_score = ? WHERE id = 1", (self.baseline_score,))
            self.created_eval_ids = []
        # Dọn mọi dữ liệu QA còn sót
        sweep_leftovers()

    # ---------------------------------------------------------- lớp học
    def test_class_create_validation(self):
        token = self.tokens["teacher"]
        name = f"{PREFIX_CLASS}trung-ten"
        status, created = call("POST", "/teacher/classes", token, {"name": name, "grade": 12})
        self.assertEqual(status, 200, f"tạo lớp QA phải 200: {created}")
        try:
            # trùng tên → 409
            status, payload = call("POST", "/teacher/classes", token, {"name": name, "grade": 12})
            self.assertEqual(status, 409, f"trùng tên phải 409: {payload}")
            # tên rỗng → 422
            status, payload = call("POST", "/teacher/classes", token, {"name": "   ", "grade": 12})
            self.assertEqual(status, 422, f"tên rỗng phải 422: {payload}")
            # khối ngoài allowed_grades của GV THPT (10-12) → 422
            status, payload = call("POST", "/teacher/classes", token, {"name": f"{PREFIX_CLASS}khoi-sai", "grade": 9})
            self.assertEqual(status, 422, f"khối 9 phải 422: {payload}")
        finally:
            # dọn bằng API trước; tearDown quét thêm một lần phòng hờ
            classes = call("GET", "/teacher/classes", token)[1] or []
            mine = next((c for c in classes if c["name"] == name), None)
            if mine:
                call("DELETE", f"/teacher/classes/{mine['id']}", token)

    def test_class_delete_rules(self):
        token = self.tokens["teacher"]
        classes = call("GET", "/teacher/classes", token)[1]
        self.assertIsInstance(classes, list)

        # lớp còn học sinh → 409 (không được xoá mất lớp có học sinh)
        with_students = next((c for c in classes if c["student_count"] > 0), None)
        self.assertIsNotNone(with_students, "cần ít nhất 1 lớp có học sinh để kiểm tra 409")
        status, payload = call("DELETE", f"/teacher/classes/{with_students['id']}", token)
        self.assertEqual(status, 409, f"lớp còn học sinh phải 409: {payload}")

        # lớp rỗng tự tạo → xoá được (200)
        name = f"{PREFIX_CLASS}lop-rong"
        status, created = call("POST", "/teacher/classes", token, {"name": name, "grade": 12})
        self.assertEqual(status, 200, f"tạo lớp rỗng phải 200: {created}")
        status, payload = call("DELETE", f"/teacher/classes/{created['id']}", token)
        self.assertEqual(status, 200, f"xoá lớp rỗng phải 200: {payload}")
        status, classes = call("GET", "/teacher/classes", token)
        self.assertNotIn(name, [c["name"] for c in classes], "lớp đã xoá không được còn trong danh sách")

    # ---------------------------------------------------------- rubric chấm điểm
    def test_evaluation_rubric_limits(self):
        token = self.tokens["teacher"]
        # vượt trần (chuyên môn 41 > 40) → 422
        status, payload = call("POST", "/teacher/evaluations", token, {"activity_id": 1, "student_id": 1, "chuyen_mon": 41})
        self.assertEqual(status, 422, f"vượt trần phải 422: {payload}")
        # điểm âm → 422
        status, payload = call("POST", "/teacher/evaluations", token, {"activity_id": 1, "student_id": 1, "sang_tao": -1})
        self.assertEqual(status, 422, f"điểm âm phải 422: {payload}")
        # hợp lệ 40/20/20/20 → 200, ghi id để tearDown dọn
        status, created = call(
            "POST",
            "/teacher/evaluations",
            token,
            {"activity_id": 1, "student_id": 1, "chuyen_mon": 40, "sang_tao": 20, "lam_viec_nhom": 20, "ky_luat": 20},
        )
        self.assertEqual(status, 200, f"điểm hợp lệ phải 200: {created}")
        self.assertIsInstance(created.get("id"), int)
        self.created_eval_ids.append(created["id"])

    # ---------------------------------------------------------- chứng chỉ
    def test_certificate_crud(self):
        token = self.tokens["student"]
        title = f"{PREFIX_CERT}kiem-thu-chung-chi"
        status, cert = call("POST", "/student/certificates", token, {"title": title, "issuer": "QA"})
        self.assertEqual(status, 201, f"tạo chứng chỉ phải 201: {cert}")
        cert_id = cert["id"]

        status, updated = call("PUT", f"/student/certificates/{cert_id}", token, {"title": f"{title} (sửa)"})
        self.assertEqual(status, 200, f"cập nhật chứng chỉ phải 200: {updated}")
        self.assertEqual(updated["title"], f"{title} (sửa)")

        # id không tồn tại → 404 (không có token nào khác để gọi, mọi request đều gửi token)
        status, payload = call("PUT", "/student/certificates/999999", token, {"title": "khong ton tai"})
        self.assertEqual(status, 404, f"PUT id không tồn tại phải 404: {payload}")

        status, _ = call("DELETE", f"/student/certificates/{cert_id}", token)
        self.assertEqual(status, 204, "xoá chứng chỉ phải 204")
        # nếu tearDown quét 'QA %' thì mọi chứng chỉ test đều được dọn sạch

    # ---------------------------------------------------------- nhóm học tập
    def test_study_group_lifecycle(self):
        token = self.tokens["school"]
        name = f"{PREFIX_CLASS}nhom-hoc-tap"
        status, group = call("POST", "/school/study-groups", token, {"name": name, "field": "ky_thuat", "grade": 10})
        self.assertEqual(status, 200, f"tạo nhóm phải 200: {group}")
        group_id = group["id"]

        # trùng tên → 409
        status, payload = call("POST", "/school/study-groups", token, {"name": name, "field": "ky_thuat"})
        self.assertEqual(status, 409, f"trùng tên nhóm phải 409: {payload}")

        # gán 2 học sinh → member_count == 2, avg_talent_score > 0
        student_ids = [r[0] for r in db_fetch("SELECT id FROM students WHERE talent_score > 0 ORDER BY id LIMIT 2")]
        self.assertEqual(len(student_ids), 2, "cần 2 học sinh có talent_score > 0")
        status, members = call("PUT", f"/school/study-groups/{group_id}/members", token, {"student_ids": student_ids})
        self.assertEqual(status, 200, f"gán thành viên phải 200: {members}")
        self.assertEqual(members.get("member_count"), 2)

        status, groups = call("GET", "/school/study-groups", token)
        self.assertEqual(status, 200)
        mine = next((g for g in groups if g["id"] == group_id), None)
        self.assertIsNotNone(mine, "nhóm vừa tạo phải có trong danh sách")
        self.assertEqual(mine.get("member_count"), 2)
        self.assertGreater(mine.get("avg_talent_score"), 0, "avg_talent_score phải > 0")

        # xoá nhóm → 200 và không còn dòng study_group_members trỏ nhóm
        status, payload = call("DELETE", f"/school/study-groups/{group_id}", token)
        self.assertEqual(status, 200, f"xoá nhóm phải 200: {payload}")
        orphans = db_fetch("SELECT count(*) FROM study_group_members WHERE group_id = ?", (group_id,))[0][0]
        self.assertEqual(orphans, 0, "study_group_members không được còn dòng trỏ nhóm đã xoá")

    # ---------------------------------------------------------- GVCN
    def test_homeroom_assignment(self):
        school = self.tokens["school"]
        status, teachers = call("GET", "/school/teachers", school)
        self.assertEqual(status, 200)
        target = next((t for t in teachers if not t["is_homeroom"]), None)
        self.assertIsNotNone(target, "cần ít nhất 1 giáo viên chưa chủ nhiệm để kiểm tra")

        status, cg = call(
            "POST",
            "/school/class-groups",
            school,
            {"name": f"{PREFIX_CLASS}gvcn", "grade": 10, "homeroom_teacher_id": target["id"]},
        )
        self.assertEqual(status, 200, f"tạo lớp có GVCN phải 200: {cg}")
        cg_id = cg["id"]
        try:
            status, teachers = call("GET", "/school/teachers", school)
            current = next(t for t in teachers if t["id"] == target["id"])
            self.assertTrue(current["is_homeroom"], "sau khi gán, is_homeroom phải là true")

            # bỏ phân công (null) → false
            status, payload = call("PUT", f"/school/class-groups/{cg_id}", school, {"homeroom_teacher_id": None})
            self.assertEqual(status, 200, f"bỏ phân công phải 200: {payload}")
            status, teachers = call("GET", "/school/teachers", school)
            current = next(t for t in teachers if t["id"] == target["id"])
            self.assertFalse(current["is_homeroom"], "sau khi bỏ phân công, is_homeroom phải là false")
        finally:
            call("DELETE", f"/school/class-groups/{cg_id}", school)  # dọn sớm, tearDown quét thêm

    # ---------------------------------------------------------- đăng ký coach
    def test_coach_register_validation(self):
        base = {"full_name": "QA HLV", "email": EMAIL_COACH_TEST, "password": PASSWORD, "role": "coach"}
        # thiếu specialty → 422
        status, payload = call("POST", "/auth/register", body=base)
        self.assertEqual(status, 422, f"thiếu specialty phải 422: {payload}")

        # đủ trường → 200/201 (setUpClass đã quét email này nên không thể 409)
        status, created = call(
            "POST",
            "/auth/register",
            body={**base, "specialty": "Bơi lội", "education_level_coach": "THPT"},
        )
        self.assertIn(status, (200, 201), f"đăng ký coach hợp lệ phải 200/201: {created}")
        user = created.get("user") if isinstance(created, dict) else None
        self.assertIsNotNone(user, f"phải trả về user: {created}")
        self.assertEqual(user.get("role"), "coach")
        uid = user.get("id")
        rows = db_fetch("SELECT count(*) FROM coaches WHERE id = ?", (uid,))[0][0]
        self.assertEqual(rows, 1, "bảng coaches phải có dòng cho tài khoản vừa tạo")
        # tearDown sẽ xoá auth_tokens / teachers / coaches / users của tài khoản này

    # ---------------------------------------------------------- baseline (chạy sau cùng)
    def test_zz_baseline_restored(self):
        """unittest sắp xếp test theo tên → 'zz' chạy cuối: dữ liệu gốc phải nguyên vẹn."""
        names = [r[0] for r in db_fetch("SELECT name FROM class_groups ORDER BY id")]
        self.assertEqual(
            names,
            ORIGINAL_CLASS_GROUPS,
            f"class_groups phải về đúng 7 dòng gốc, nhận được: {names}",
        )
        self.assertEqual(db_fetch("SELECT count(*) FROM class_groups")[0][0], 7)
        self.assertEqual(
            db_fetch("SELECT name FROM class_groups WHERE name LIKE ?", (f"{PREFIX_CLASS}%",)),
            [],
            "không được còn lớp QA- trong class_groups",
        )
        self.assertEqual(
            db_fetch("SELECT name FROM study_groups WHERE name LIKE ?", (f"{PREFIX_CLASS}%",)),
            [],
            "không được còn nhóm QA- trong study_groups",
        )
        self.assertEqual(
            db_fetch("SELECT count(*) FROM certificates WHERE title LIKE ?", (f"{PREFIX_CERT}%",))[0][0],
            0,
            "không được còn chứng chỉ QA trong certificates",
        )
        self.assertEqual(
            db_fetch("SELECT count(*) FROM users WHERE email = ?", (EMAIL_COACH_TEST,))[0][0],
            0,
            "không được còn tài khoản coach test",
        )
        self.assertEqual(
            db_fetch("SELECT talent_score FROM students WHERE id = 1")[0][0],
            self.baseline_score,
            "talent_score học sinh 1 phải được khôi phục nguyên vẹn",
        )


if __name__ == "__main__":
    unittest.main()
