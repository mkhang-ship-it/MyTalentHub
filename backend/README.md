# FTalentHub — backend (FastAPI + SQLite)

## Setup

```bash
cd talenthub/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # điền nếu cần
python -m app.seed      # tạo + seed SQLite (talenthub.db)
uvicorn app.main:app --reload --port 8000
```

## Structure

- `app/main.py` — FastAPI app, mount routers
- `app/database.py` — SQLAlchemy engine/session (SQLite `talenthub.db`)
- `app/models.py` — ORM models (4 cổng + Talent Passport)
- `app/schemas.py` — Pydantic schemas
- `app/seed.py` — seed dữ liệu mẫu theo slide (chạy `python -m app.seed`)
- `app/auth.py` — login/session đơn giản (token)
- `app/routers/` — 1 router / portal: `student.py`, `teacher.py`, `school.py`, `enterprise.py`, `passport.py`, `ai.py`

## Quy ước

- Base URL: `/api/v1`
- Toàn bộ response JSON UTF-8, tiếng Việt.
- Không auth cứng trừ `POST /api/v1/auth/login`; các router khác accept `?student_id=`/`?role=` cho demo.