"""Cấu hình logging dùng chung — đọc mức từ env LOG_LEVEL (mặc định INFO).

Mọi dòng log đều có `request_id` (ngắn, mỗi request một mã) để truy vết:
middleware trong `errors.py` sinh mã và gắn vào contextvars trước khi request
chạy, filter dưới đây chèn mã đó vào từng bản ghi log.
"""
from __future__ import annotations

import contextvars
import logging
import os

# Mã truy vết của request đang chạy; "-" khi log ngoài request (seed, test...).
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "fth_request_id", default="-"
)


class RequestIdFilter(logging.Filter):
    """Chèn request_id hiện tại vào bản ghi log."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def setup_logging(level: str | None = None) -> None:
    """Cấu hình logging toàn ứng dụng. Gọi MỘT lần lúc khởi động (xem main.py)."""
    chosen = (level or os.environ.get("LOG_LEVEL", "INFO")).upper()
    logging.basicConfig(
        level=getattr(logging, chosen, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s [rid=%(request_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )
    for handler in logging.root.handlers:
        handler.addFilter(RequestIdFilter())
