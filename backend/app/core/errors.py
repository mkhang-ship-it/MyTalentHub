"""Xử lý lỗi toàn cục + middleware log request.

Cách gắn (do P1 sửa `main.py`, module này chỉ cung cấp hàm sẵn sàng gọi):

    from .core.logging_conf import setup_logging
    from .core.errors import install_error_handlers, request_logging_middleware

    setup_logging()                      # 1. ngay sau import, trước khi tạo app
    app = FastAPI(...)
    install_error_handlers(app)          # 2. ngay sau khi tạo app
    app.middleware("http")(request_logging_middleware)  # 3. sau dòng 2

Mọi lỗi trả JSON có cấu trúc {"detail": "<tiếng Việt>", "code": "<mã>"}:
- HTTPException đang ném trong code được GIỮ NGUYÊN thông điệp.
- RequestValidationError (pydantic) → 422, dịch sang tiếng Việt có TÊN TRƯỜNG.
- Exception lạ → 500 với thông điệp chung, KHÔNG lộ traceback; log ERROR đầy đủ.
"""
from __future__ import annotations

import logging
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
# 404/405 của đường dẫn lạ do Starlette ném ra (fastapi.HTTPException chỉ là lớp
# con của nó), nên phải đăng ký handler trên LỚP CHA để bắt cả hai.
from starlette.exceptions import HTTPException as StarletteHTTPException

from .logging_conf import request_id_ctx

log = logging.getLogger("ftalenthub")

GENERIC_500_MESSAGE = "Đã có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau."

_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    422: "validation_error",
    500: "server_error",
}


def _code_for_status(status: int) -> str:
    return _CODES.get(status, f"http_{status}")


# Mặc định của Starlette (tiếng Anh) và bản dịch tiếng Việt tương ứng.
_STRELLETTE_DEFAULTS = {
    404: "Not Found",
    405: "Method Not Allowed",
}
_DEFAULT_DETAIL_VN = {
    404: "Không tìm thấy đường dẫn này.",
    405: "Phương thức không được hỗ trợ cho đường dẫn này.",
}


def _field_name(loc: tuple) -> str | None:
    """Lấy tên trường từ loc của pydantic (bỏ 'body'/'query'/'path' ở đầu)."""
    parts = [p for p in loc if isinstance(p, str) and p not in ("body", "query", "path")]
    return ".".join(parts) if parts else None


def _translate_validation_error(err: dict) -> str:
    """Dịch MỘT lỗi pydantic sang tiếng Việt, nêu tên trường và giá trị nhận."""
    field = _field_name(tuple(err.get("loc", ())))
    etype = str(err.get("type", ""))
    ctx = err.get("ctx") or {}
    prefix = f"trường '{field}' " if field else ""

    if etype == "missing":
        return f"thiếu {prefix.rstrip()}".replace("  ", " ")
    if etype == "string_too_long":
        got = len(str(err.get("input", "")))
        return f"{prefix}vượt quá {ctx.get('max_length')} ký tự (nhận {got} ký tự)"
    if etype == "string_too_short":
        return f"{prefix}quá ngắn, tối thiểu {ctx.get('min_length')} ký tự"
    if etype in ("int_parsing", "float_parsing"):
        return f"{prefix}phải là số (nhận '{err.get('input')}')"
    if etype == "greater_than":
        return f"{prefix}phải lớn hơn {ctx.get('gt')} (nhận '{err.get('input')}')"
    if etype == "greater_than_equal":
        return f"{prefix}phải lớn hơn hoặc bằng {ctx.get('ge')} (nhận '{err.get('input')}')"
    if etype == "less_than":
        return f"{prefix}phải nhỏ hơn {ctx.get('lt')} (nhận '{err.get('input')}')"
    if etype == "less_than_equal":
        return f"{prefix}phải nhỏ hơn hoặc bằng {ctx.get('le')} (nhận '{err.get('input')}')"
    if etype == "value_error":
        # Lỗi tự ném trong model_post_init — vốn đã là tiếng Việt.
        msg = str(err.get("msg", "")).removeprefix("Value error, ")
        return f"{prefix}{msg}" if field else msg
    return f"{prefix}{err.get('msg', 'không hợp lệ')}".strip()


async def _http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # Thông điệp do chính code ném ra thì giữ nguyên (đã là tiếng Việt).
    # Thông điệp mặc định do Starlette sinh (404/405) thì dịch sang tiếng Việt.
    detail = _DEFAULT_DETAIL_VN.get(exc.status_code)
    if detail is None or str(exc.detail) != _STRELLETTE_DEFAULTS.get(exc.status_code):
        detail = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail, "code": _code_for_status(exc.status_code)},
    )


async def _validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    parts = [_translate_validation_error(e) for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Dữ liệu không hợp lệ: " + "; ".join(parts) + ".",
            "code": "validation_error",
        },
    )


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Lỗi chưa xử lý %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": GENERIC_500_MESSAGE, "code": "server_error"},
    )


def install_error_handlers(app: FastAPI) -> None:
    """Đăng ký handler lỗi toàn cục cho app (giữ nguyên mọi HTTPException sẵn có)."""
    # Đăng ký trên lớp cha của Starlette: bắt được cả HTTPException của FastAPI
    # lẫn 404/405 mà Starlette tự sinh cho đường dẫn không tồn tại.
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_exception_handler(HTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)


async def request_logging_middleware(request: Request, call_next):
    """Log method, path, status, thời gian xử lý (ms) + request_id.

    TUYỆT ĐỐI không log header Authorization, mật khẩu hay body request —
    middleware này chỉ chạm vào method/path/status/thời gian.
    """
    rid = uuid.uuid4().hex[:8]
    token = request_id_ctx.set(rid)
    started = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
    finally:
        elapsed_ms = (time.perf_counter() - started) * 1000
        status = response.status_code if response is not None else 500
        if status >= 500:
            log.error("%s %s -> %s %.1fms request_id=%s", request.method, request.url.path, status, elapsed_ms, rid)
        else:
            log.info("%s %s -> %s %.1fms request_id=%s", request.method, request.url.path, status, elapsed_ms, rid)
        request_id_ctx.reset(token)
    response.headers["X-Request-ID"] = rid
    return response
