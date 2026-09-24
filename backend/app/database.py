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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()