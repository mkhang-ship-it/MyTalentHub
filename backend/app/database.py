import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DB_URL

os.makedirs(os.path.dirname(DB_URL.replace("sqlite:///", "")), exist_ok=True)

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def _run_migrations():
    """Lightweight ALTER TABLE for new columns (idempotent)."""
    with engine.connect() as conn:
        for table in ("students", "teachers", "schools"):
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN education_level VARCHAR(16) DEFAULT 'THPT'"))
                conn.commit()
            except Exception:
                conn.rollback()
                # column likely exists; ignore
        try:
            conn.execute(text("ALTER TABLE auth_tokens ADD COLUMN expires_at DATETIME"))
            conn.commit()
        except Exception:
            conn.rollback()
            # column likely exists; ignore
        try:
            # Token legacy (chưa có hạn) được gia hạn 7 ngày kể từ lúc migrate.
            conn.execute(text("UPDATE auth_tokens SET expires_at = datetime('now', '+7 days') WHERE expires_at IS NULL"))
            conn.commit()
        except Exception:
            conn.rollback()
        try:
            # Dọn token đã hết hạn 1 lần mỗi lần khởi động server.
            from .security import purge_expired_tokens

            purge_expired_tokens()
        except Exception:
            # Dọn dẹp thất bại không được chặn server khởi động.
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


#: Index cho cột khóa ngoại / cột hay lọc-sắp xếp trên các truy vấn nóng
#: (/student/*, /teacher/*, /school/*, /passport/*).
#: Tên theo quy ước SQLAlchemy `ix_<bảng>_<cột>` để không lệch với
#: `Base.metadata.create_all` trên DB mới. 10/14 mục đã tồn tại trong
#: DB hiện tại (do create_all đời mới); 4 mục còn thiếu gây SCAN toàn bảng:
#: activities.teacher_id, activities.status,
#: class_groups.homeroom_teacher_id, auth_tokens.expires_at.
DESIRED_INDEXES: tuple[tuple[str, str, str], ...] = (
    ("ix_activities_teacher_id", "activities", "teacher_id"),
    ("ix_activities_status", "activities", "status"),
    ("ix_activity_registrations_activity_id", "activity_registrations", "activity_id"),
    ("ix_activity_registrations_student_id", "activity_registrations", "student_id"),
    ("ix_evaluations_student_id", "evaluations", "student_id"),
    ("ix_evaluations_teacher_id", "evaluations", "teacher_id"),
    ("ix_evaluations_activity_id", "evaluations", "activity_id"),
    ("ix_class_groups_homeroom_teacher_id", "class_groups", "homeroom_teacher_id"),
    ("ix_teacher_class_assignments_teacher_id", "teacher_class_assignments", "teacher_id"),
    ("ix_teacher_class_assignments_class_group_id", "teacher_class_assignments", "class_group_id"),
    ("ix_study_group_members_group_id", "study_group_members", "group_id"),
    ("ix_study_group_members_student_id", "study_group_members", "student_id"),
    ("ix_users_role", "users", "role"),
    ("ix_auth_tokens_expires_at", "auth_tokens", "expires_at"),
)


def ensure_indexes(bind=None) -> list[str]:
    """Tạo các index còn thiếu một cách idempotent (chạy lại nhiều lần không sao).

    - Dùng `CREATE INDEX IF NOT EXISTS` nên lần chạy thứ hai không sinh trùng.
    - Mặc định tác động lên engine chính của app; truyền `bind` (Engine hoặc
      Connection) để migration/test trên bản sao DB tạm.
    - KHÔNG tự gọi từ main.py — người vận hành sẽ gọi tường minh.
    - Trả về danh sách tên index đã đảm bảo tồn tại.
    """
    target = bind if bind is not None else engine
    ensured: list[str] = []
    # Engine có .begin()/.connect(); Connection dùng trực tiếp.
    if hasattr(target, "connect"):
        with target.begin() as conn:
            for name, table, column in DESIRED_INDEXES:
                conn.execute(
                    text(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({column})")
                )
                ensured.append(name)
    else:
        for name, table, column in DESIRED_INDEXES:
            target.execute(
                text(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({column})")
            )
        try:
            target.commit()
        except Exception:
            pass
        for name, _table, _column in DESIRED_INDEXES:
            ensured.append(name)
    return ensured