"""Migration index — unittest thư viện chuẩn, KHÔNG cần pytest, KHÔNG cần backend chạy.

Chạy:   cd backend && python -m unittest discover -s tests -t . -v
Kiểm tra trên DB tạm trong /tmp (tempfile) — KHÔNG chạm backend/talenthub.db:
  - ensure_indexes() tạo đủ index còn thiếu (4 index SCAN: activities.teacher_id,
    activities.status, class_groups.homeroom_teacher_id, auth_tokens.expires_at,
    cộng 10 index đã có được đảm bảo idempotent).
  - Chạy lần hai không sinh index trùng (đếm sqlite_master không đổi).
"""
from __future__ import annotations

import os
import tempfile
import unittest

from sqlalchemy import create_engine, text


class IndexMigrationTest(unittest.TestCase):
    """Idempotent + đầy đủ index trên DB tạm."""

    def _temp_engine(self):
        fd, path = tempfile.mkstemp(suffix=".db", prefix="ftest-index-")
        os.close(fd)
        self.addCleanup(lambda: os.path.exists(path) and os.remove(path))
        return create_engine(f"sqlite:///{path}")

    def test_ensure_indexes_creates_missing_and_idempotent(self):
        from app.database import Base, DESIRED_INDEXES, ensure_indexes

        import app.models  # noqa: F401  (đăng ký tables vào Base.metadata)

        eng = self._temp_engine()
        self.addCleanup(eng.dispose)
        Base.metadata.create_all(bind=eng)

        first = ensure_indexes(eng)
        self.assertEqual(
            len(first), len(DESIRED_INDEXES),
            f"ensure_indexes phải đảm bảo {len(DESIRED_INDEXES)} index",
        )
        with eng.connect() as conn:
            names = {
                r[0]
                for r in conn.execute(
                    text("SELECT name FROM sqlite_master WHERE type='index'")
                ).fetchall()
            }
        for name, _table, _column in DESIRED_INDEXES:
            self.assertIn(name, names, f"thiếu index {name}")
        # Bốn index từng gây SCAN toàn bảng phải tồn tại tường minh.
        for must in (
            "ix_activities_teacher_id",
            "ix_activities_status",
            "ix_class_groups_homeroom_teacher_id",
            "ix_auth_tokens_expires_at",
        ):
            self.assertIn(must, names, f"thiếu index vá SCAN: {must}")

        with eng.connect() as conn:
            n1 = conn.execute(
                text("SELECT count(*) FROM sqlite_master WHERE type='index'")
            ).fetchone()[0]
        second = ensure_indexes(eng)
        with eng.connect() as conn:
            n2 = conn.execute(
                text("SELECT count(*) FROM sqlite_master WHERE type='index'")
            ).fetchone()[0]
        self.assertEqual(first, second)
        self.assertEqual(
            n1, n2, f"chạy lần hai không được sinh trùng (trước {n1}, sau {n2})"
        )


if __name__ == "__main__":
    unittest.main()
