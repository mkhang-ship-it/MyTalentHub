# FTalentHub API — Dockerfile backend (FastAPI + SQLite)
# Build từ GỐC repo:  docker build -f Dockerfile -t fth-api .
# Chạy lẻ:  docker run --rm -p 8001:8001 -v fth-sqlite:/app fth-api

# ---------- Stage 1: cài phụ thuộc ----------
FROM python:3.12-slim AS deps
WORKDIR /deps
COPY backend/requirements.txt .
# Chỉ cài runtime; không cần build-essential (toàn wheel cho cp312).
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- Stage 2: chạy ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY --from=deps /install /usr/local
# Copy toàn bộ thư mục backend (app/, seed, db mẫu nếu có).
COPY backend/ /app/
# Chạy bằng user không phải root.
RUN useradd -r -u 10001 -m appuser \
    && mkdir -p /app \
    && chown -R appuser:appuser /app
USER appuser
EXPOSE 8001
# HEALTHCHECK không cần curl: dùng urllib của thư viện chuẩn.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8001/api/v1/health', timeout=4).status == 200 else 1)"
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
