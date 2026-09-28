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

# CỔNG ĐỌC TỪ BIẾN MÔI TRƯỜNG `PORT`, KHÔNG hard-code.
#
# Render gán PORT (mặc định 10000) rồi chuyển traffic tới đúng cổng đó; tài liệu
# của họ khuyến nghị ràng buộc theo biến này. Ghi cứng 8001 thì ở máy chạy được
# nhưng trên Render sẽ 502 — và lỗi 502 khi deploy lần đầu rất dễ bị hiểu nhầm
# thành lỗi ứng dụng. `${PORT:-8001}` giữ nguyên cổng 8001 ở máy dev/compose
# (biến không set) và dùng cổng Render chỉ định khi deploy.
#
# `sh -c` cần thiết vì dấu `${...}` phải được shell mở rộng lúc chạy.
# `exec` để uvicorn thành tiến trình chính (PID 1) — nhờ vậy tín hiệu dừng của
# Render tới được đúng tiến trình cần dừng.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import os,sys,urllib.request; p=os.environ.get('PORT','8001'); sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{p}/api/v1/health', timeout=4).status == 200 else 1)"
CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
