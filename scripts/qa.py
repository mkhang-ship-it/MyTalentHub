#!/usr/bin/env python3
"""QA nhanh FTalentHub — 1 lệnh, ~10 giây, in bảng PASS/FAIL.

Chạy:       python scripts/qa.py
Xuất JSON:  python scripts/qa.py --json
Exit code:  0 nếu tất cả PASS, khác 0 nếu có FAIL (kể cả khi backend chết).

Chỉ dùng thư viện chuẩn (urllib, json, sqlite3, argparse).
Yêu cầu backend đang chạy tại http://127.0.0.1:8001 (đổi bằng --base hoặc QA_BASE_URL).
Bộ kiểm thử đầy đủ hơn nằm ở backend/tests/ (python -m unittest ...).
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import textwrap
import urllib.error
import urllib.request
from pathlib import Path


def wrap(text: str, width: int) -> list[str]:
    """Ngắt dòng cho phần cảnh báo, không phụ thuộc thư viện ngoài."""
    return textwrap.wrap(text, width) or [""]

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "backend" / "talenthub.db"
PASSWORD = "demo123"
ACCOUNTS = {
    "student": "hs01@ftalenthub.edu.vn",
    "teacher": "nguyen.van.hung@ftalenthub.edu.vn",
    "coach": "hlv.boi@ftalenthub.edu.vn",
    "school": "bgh@ftalenthub.edu.vn",
    "enterprise": "hr@techfpt.vn",
}
ORIGINAL_CLASS_GROUPS = ["10A1", "10A2", "11B1", "11B2", "12C1", "12C2", "12"]


class Qa:
    def __init__(self, base: str, timeout: float):
        self.base = base.rstrip("/")
        self.timeout = timeout
        self.tokens: dict[str, str] = {}
        self.results: list[dict] = []
        self.warned: str | None = None

    def call(self, method: str, path: str, token: str | None = None, body=None):
        req = urllib.request.Request(self.base + path, method=method)
        req.add_header("Content-Type", "application/json")
        if token:
            req.add_header("Authorization", f"Bearer {token}")
        data = json.dumps(body).encode() if body is not None else None
        try:
            with urllib.request.urlopen(req, data, timeout=self.timeout) as res:
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

    def check(self, name: str, ok: bool, detail: str = "") -> bool:
        self.results.append({"check": name, "ok": bool(ok), "detail": detail})
        return bool(ok)

    def warn(self, message: str) -> None:
        """Ghi chú không tính vào PASS/FAIL (xem `run` — biến `warned`)."""
        self.warned = message

    def expect(self, name: str, actual, expected) -> bool:
        ok = actual == expected
        return self.check(name, ok, "" if ok else f"nhận {actual!r}, mong đợi {expected!r}")

    # ---------------------------------------------------------------- checks
    def run(self) -> bool:
        # 1. health
        try:
            status, payload = self.call("GET", "/health")
        except (urllib.error.URLError, OSError) as exc:
            self.check("GET /health", False, f"backend không phản hồi: {exc}")
            return False
        if not self.check("GET /health → 200", status == 200 and (payload or {}).get("status") == "ok", f"HTTP {status}"):
            return False  # backend chết thì các check sau vô nghĩa

        # 2. đăng nhập 5 tài khoản demo
        throttled: list[str] = []
        for role, email in ACCOUNTS.items():
            status, payload = self.call("POST", "/auth/login", body={"email": email, "password": PASSWORD})
            ok = status == 200 and isinstance(payload, dict) and "token" in payload
            # 429 không phải lỗi chức năng — đó là chống dò mật khẩu đang hoạt
            # động, và nó xảy ra khi ai đó vừa đăng nhập sai vài lần (hay một
            # bộ test cố tình thử sai). Gộp vào FAIL chung sẽ khiến người đọc
            # tưởng ứng dụng hỏng, nên tách thành cảnh báo riêng có chỉ dẫn.
            if status == 429:
                throttled.append(role)
            self.check(f"đăng nhập {role}", ok, f"HTTP {status}")
            if ok:
                self.tokens[role] = payload["token"]
        if throttled:
            self.warned = (
                f"Bị giới hạn đăng nhập (HTTP 429) cho: {', '.join(throttled)}. "
                "Đây không phải lỗi ứng dụng — giới hạn 5 lần sai / 10 phút đang "
                "chạy. Hãy đợi hết cửa sổ rồi chạy lại."
            )
        if len(self.tokens) < len(ACCOUNTS):
            return False  # thiếu token → không kiểm phân quyền được

        # 3. phân quyền: hợp đồng 401 / 403 / 200
        st = self.call("GET", "/teacher/classes")[0]
        self.expect("/teacher/classes không token → 401", st, 401)
        st = self.call("GET", "/teacher/classes", self.tokens["student"])[0]
        self.expect("/teacher/classes token student → 403", st, 403)
        st, payload = self.call("GET", "/teacher/classes", self.tokens["teacher"])
        self.expect("/teacher/classes token teacher → 200", st, 200)
        self.check("/teacher/classes là mảng", isinstance(payload, list), type(payload).__name__)

        st = self.call("GET", "/school/teachers")[0]
        self.expect("/school/teachers không token → 401", st, 401)
        st = self.call("GET", "/school/teachers", self.tokens["student"])[0]
        self.expect("/school/teachers token student → 403", st, 403)
        st = self.call("GET", "/school/teachers", self.tokens["school"])[0]
        self.expect("/school/teachers token school → 200", st, 200)

        st = self.call("GET", "/school/study-groups")[0]
        self.expect("/school/study-groups không token → 401", st, 401)
        st = self.call("GET", "/school/study-groups", self.tokens["school"])[0]
        self.expect("/school/study-groups token school → 200", st, 200)

        # 4. student
        st, profile = self.call("GET", "/student/profile", self.tokens["student"])
        certs_ok = st == 200 and isinstance(profile, dict) and all(
            isinstance(c.get("id"), int) for c in profile.get("certificates", [])
        )
        self.check("/student/profile 200 + mọi chứng chỉ có id", certs_ok, f"HTTP {st}")

        st, evals = self.call("GET", "/student/evaluations", self.tokens["student"])
        roles_ok = st == 200 and isinstance(evals, list) and all(
            e.get("reviewer_role") in ("teacher", "coach") for e in evals
        )
        self.check("/student/evaluations có reviewer_role ∈ {teacher, coach}", roles_ok, f"HTTP {st}")

        st1, r1 = self.call("GET", "/student/recommendations", self.tokens["student"])
        st2, r2 = self.call("GET", "/student/recommendations", self.tokens["student"])
        rec_ok = (
            st1 == 200
            and st2 == 200
            and isinstance(r1, dict)
            and "based_on" in r1
            and "suggestions" in r1
            and all(0 <= (x.get("match_pct") or -1) <= 100 for x in r1["suggestions"])
            and r1 == r2
        )
        self.check("/student/recommendations 200, match_pct 0..100, tất định", rec_ok, f"HTTP {st1}")

        # 5. teacher / coach / passport / school
        st, me = self.call("GET", "/teacher/me", self.tokens["teacher"])
        self.check(
            "/teacher/me teacher có allowed_grades",
            st == 200 and isinstance((me or {}).get("allowed_grades"), list) and me["allowed_grades"],
            f"HTTP {st}",
        )
        st, me = self.call("GET", "/teacher/me", self.tokens["coach"])
        self.check(
            "/teacher/me coach → role=coach, is_coach=true",
            st == 200 and (me or {}).get("role") == "coach" and (me or {}).get("is_coach") is True,
            f"HTTP {st}",
        )
        st = self.call("GET", "/passport/1", self.tokens["student"])[0]
        self.expect("/passport/1 → 200", st, 200)
        st, classes = self.call("GET", "/school/classes", self.tokens["school"])
        self.check(
            "/school/classes có grades/classes/top_classes",
            st == 200 and all(k in (classes or {}) for k in ("grades", "classes", "top_classes")),
            f"HTTP {st}",
        )

        # 6. vệ sinh dữ liệu (DB trực tiếp — chỉ đọc)
        try:
            conn = sqlite3.connect(DB_PATH, timeout=10)
            names = [r[0] for r in conn.execute("SELECT name FROM class_groups ORDER BY id").fetchall()]
            leftover_cg = conn.execute("SELECT count(*) FROM class_groups WHERE name LIKE 'QA-%'").fetchone()[0]
            leftover_sg = conn.execute("SELECT count(*) FROM study_groups WHERE name LIKE 'QA-%'").fetchone()[0]
            leftover_cert = conn.execute("SELECT count(*) FROM certificates WHERE title LIKE 'QA %'").fetchone()[0]
            leftover_coach = conn.execute(
                "SELECT count(*) FROM users WHERE email = 'qa.coach@ftalenthub.edu.vn'"
            ).fetchone()[0]
            conn.close()
        except (sqlite3.Error, OSError) as exc:
            self.check("đọc database", False, f"{exc}")
            return False
        self.check("class_groups đúng 7 dòng gốc", names == ORIGINAL_CLASS_GROUPS, f"{names}")
        self.check("không còn lớp/nhóm/chứng chỉ/tài khoản QA", 
                   leftover_cg + leftover_sg + leftover_cert + leftover_coach == 0,
                   f"class={leftover_cg} group={leftover_sg} cert={leftover_cert} coach={leftover_coach}")
        return True


def main() -> int:
    parser = argparse.ArgumentParser(description="QA nhanh FTalentHub (PASS/FAIL, ~10s)")
    parser.add_argument("--base", default=os.environ.get("QA_BASE_URL", "http://127.0.0.1:8001/api/v1"),
                        help="API base URL (mặc định: http://127.0.0.1:8001/api/v1)")
    parser.add_argument("--json", action="store_true", help="xuất kết quả JSON ra stdout (không in bảng)")
    parser.add_argument("--timeout", type=float, default=10.0, help="timeout mỗi request (giây)")
    args = parser.parse_args()

    qa = Qa(args.base, args.timeout)
    try:
        qa.run()
    except (urllib.error.URLError, OSError) as exc:
        qa.check("kết nối backend", False, str(exc))

    passed = sum(1 for r in qa.results if r["ok"])
    failed = len(qa.results) - passed

    if args.json:
        print(json.dumps(qa.results, ensure_ascii=False, indent=2))
    else:
        print(f"QA FTalentHub — {qa.base}")
        print("-" * 72)
        for r in qa.results:
            line = f"  {'PASS' if r['ok'] else 'FAIL'}  {r['check']}"
            if r["detail"]:
                line += f"  → {r['detail']}"
            print(line)
        print("-" * 72)
        print(f"KẾT QUẢ: {passed} pass, {failed} fail")
        if qa.warned:
            # In cảnh báo SAU kết quả để không lẫn với dòng PASS/FAIL.
            print()
            print("LƯU Ý:")
            for line in wrap(qa.warned, 68):
                print(f"  {line}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
