# FTalentHub — dự án mới từ đầu (React + FastAPI + SQLite)

Rebuild toàn bộ từ 35 slide (xem `../docs/slide-ocr/` + `../docs/PLAN.md`). Code cũ PHP đã xoá.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind, React Router, `lucide-react` icons.
- **Backend**: FastAPI + SQLAlchemy 2.0 + SQLite (`talenthub.db`), không cần MySQL.
- **AI**: call Gemini/Anthropic từ backend (`api/ai`) — gợi ý năng khiếu, lộ trình, phản hồi.

## Cấu trúc

```
talenthub/
  backend/
    app/
      config.py      # paths
      database.py    # engine/session (Base, get_db)
      models.py      # ~25 ORM tables (users, students, activities, evaluations, badges, passport, enterprise...)
      main.py        # FastAPI app + CORS + mount routers
      seed.py        # python -m app.seed  → tạo DB + dữ liệu mẫu
      routers/
        student.py    # HỌC SINH  (dashboard, hồ sơ, khám phá, hoạt động, check-in, huy hiệu)
        teacher.py    # GIÁO VIÊN (tổng quan, sân chơi, chấm điểm rubric, học viên)
        school.py     # NHÀ TRƯỜNG(KPI, phân tích năng lực, báo cáo, lớp & khối)
        enterprise.py # DOANH NGHIỆP(tổng quan, tìm nhân tài, thực tập, tài trợ)
        passport.py   # Talent Passport (QR, hồ sơ, chứng chỉ, CV)
  frontend/
    src/
      pages/student/  teacher/  school/  enterprise/  passport/
      components/  api/client.ts  App.tsx (router)  main.tsx
```

## Chạy thử

```bash
# backend
cd talenthub/backend
python3.12 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000   # http://127.0.0.1:8000/api/v1/health

# frontend
cd talenthub/frontend && pnpm install && pnpm dev   # http://localhost:5173
```