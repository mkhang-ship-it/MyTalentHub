"""FastAPI app — mount 6 routers (student/teacher/school/enterprise/passport/ai)."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from starlette.routing import Mount

from .database import Base, SessionLocal, engine, _run_migrations, ensure_indexes
from .routers import auth, enterprise, passport, school, student, teacher
from .ai.router import router as ai_router
from .core.errors import install_error_handlers, request_logging_middleware
from .core.logging_conf import setup_logging  # noqa: F401
from .core.logging_conf import setup_logging
from .security import (
    cors_origins,
    create_audit_log_table,
    create_refresh_token_table,
    create_verification_token_table,
    purge_expired_tokens,
    purge_used_verification_tokens,
)
from .core.audit import purge_old_audit_logs
from .models import User

setup_logging()

log = logging.getLogger("ftalenthub")


def prepare_database() -> None:
    """Chuẩn bị CSDL: migration, bảng, index, dọn rác. Idempotent toàn bộ.

    VÌ SAO NẰM Ở ĐÂY, KHÔNG CHẠY LÚC IMPORT
    ---------------------------------------
    Trước đây khối DDL này chạy ngay ở mức module. Hai hậu quả thật:

    1. `import app.main` đã sửa database. Nhập module vốn phải là thao tác
       không có tác dụng phụ — làm vậy khiến mọi công cụ đọc mã (test, script,
       REPL) đều vô tình thay đổi dữ liệu chỉ vì import.
    2. Trên PostgreSQL, tiến trình thứ hai import `app.main` sẽ chạy
       `CREATE INDEX` trong khi tiến trình thứ nhất đang giữ khoá trên cùng
       bảng → chờ khoá vô hạn. Job CI PostgreSQL của dự án đã treo đúng
       lý do này. SQLite không có mô hình khoá như vậy nên không bao giờ lộ.

    Gọi trong lifespan nghĩa là chỉ server thật mới chuẩn bị CSDL, và chỉ một
    lần khi khởi động.
    """
    _run_migrations()
    Base.metadata.create_all(bind=engine)
    # Hai bảng này nằm ở security.py chứ không có trong Base.metadata.
    create_refresh_token_table()
    create_verification_token_table()
    create_audit_log_table()
    # Index cho các cột khóa ngoại / hay lọc.
    ensure_indexes()
    _auto_seed_if_empty()
    # Dọn dữ liệu hết hạn một lần lúc khởi phục, bảng không phình vô hạn.
    purge_expired_tokens()
    purge_used_verification_tokens()
    purge_old_audit_logs()


def _auto_seed_if_empty() -> None:
    """Tự seed khi CSDL còn trống, chỉ khi được bật tường minh.

    VÌ SAO CẦN
    ----------
    Nền tảng miễn phí (Render free) dùng hệ thống file TẠM: mọi thay đổi cục
    bộ trên đĩa mất khi service ngủ hoặc redeploy. Với SQLite, nghĩa là CSDL
    bị xoá sạch và mỗi lần khởi động lại sẽ là một database rỗng — ứng dụng
    trả 500 vì thiếu bảng dữ liệu.

    Dữ liệu của dự án này hoàn toàn sinh được từ `app.seed`, nên tái tạo lại
    lúc khởi động là giải pháp đúng thay vì cố gắng giữ đĩa.

    AN TOÀN — ba điều kiện phải đồng thời đúng:
      1. `AUTO_SEED_ON_EMPTY` phải được bật (mặc định TẮT). Nếu mặc định bật
         thì lỡ quên xoá file ở máy dev, lần chạy kế tiếp sẽ âm thầm dựng lại
         dữ liệu mẫu — một kiểu mất dữ liệu tinh vi, khó phát hiện.
      2. Bảng `users` phải RỖNG. Có dữ liệu rồi thì tuyệt đối không đụng tới,
         kể cả dữ liệu thật do người dùng nhập.
      3. Chỉ chạy một lần lúc khởi động, trong lifespan.
    """
    from .config import AUTO_SEED_ON_EMPTY

    if not AUTO_SEED_ON_EMPTY:
        return
    try:
        count = SessionLocal().query(User).count()
    except Exception:  # noqa: BLE001 - bảng chưa sẵn sàng thì thử lại sau
        log.exception("không đọc được số user để kiểm tra seed tự động")
        return
    if count > 0:
        return
    log.warning(
        "CSDL trống và AUTO_SEED_ON_EMPTY=true → chạy app.seed. "
        "Mọi thay đổi sẽ mất khi khởi động lại vì đĩa là hệ thống file tạm."
    )
    from .seed import run as seed_run

    seed_run()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Chuẩn bị CSDL lúc khởi động server, không phải lúc import module."""
    prepare_database()
    yield


app = FastAPI(title="FTalentHub API", version="1.0.0", lifespan=lifespan)

# Lỗi trả về luôn là JSON có cấu trúc {"detail", "code"} bằng tiếng Việt.
install_error_handlers(app)
# Log mỗi request kèm request_id và thời gian xử lý (không log token/mật khẩu).
# Đăng ký TRƯỚC CORS để CORSMiddleware nằm ngoài cùng — nhờ vậy cả response
# lỗi 500 vẫn mang header CORS, trình duyệt đọc được thay vì báo lỗi CORS.
app.middleware("http")(request_logging_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Workaround for FastAPI 0.141.1 include_router bug on Python 3.14
# Manually extract routes from routers and add with prefix using APIRoute for FastAPI response handling
def _include_router_with_prefix(router, prefix: str):
    """Manually include router routes with prefix (workaround for include_router bug)."""
    for route in router.routes:
        if isinstance(route, APIRoute):
            new_path = prefix + route.path
            app.router.routes.append(APIRoute(
                path=new_path,
                endpoint=route.endpoint,
                methods=route.methods,
                name=route.name,
                include_in_schema=route.include_in_schema,
                response_class=route.response_class,
                status_code=route.status_code,
                tags=route.tags,
                dependencies=route.dependencies,
                summary=route.summary,
                description=route.description,
                response_description=route.response_description,
                responses=route.responses,
                deprecated=route.deprecated,
                operation_id=route.operation_id,
                response_model_include=route.response_model_include,
                response_model_exclude=route.response_model_exclude,
                response_model_by_alias=route.response_model_by_alias,
                response_model_exclude_unset=route.response_model_exclude_unset,
                response_model_exclude_defaults=route.response_model_exclude_defaults,
                response_model_exclude_none=route.response_model_exclude_none,
                openapi_extra=route.openapi_extra,
            ))
        elif isinstance(route, Mount):
            app.router.routes.append(Mount(
                path=prefix + route.path,
                app=route.app,
                name=route.name,
            ))

API = "/api/v1"
_include_router_with_prefix(auth.router, API)
_include_router_with_prefix(student.router, API)
_include_router_with_prefix(teacher.router, API)
_include_router_with_prefix(school.router, API)
_include_router_with_prefix(enterprise.router, API)
_include_router_with_prefix(passport.router, API)
_include_router_with_prefix(ai_router, API)


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "app": "FTalentHub", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "FTalentHub API — xem /docs cho tài liệu OpenAPI"}