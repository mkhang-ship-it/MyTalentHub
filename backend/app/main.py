"""FastAPI app — mount 6 routers (student/teacher/school/enterprise/passport/ai)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from starlette.routing import Mount

from .database import Base, engine
from .routers import auth, enterprise, passport, school, student, teacher
from .ai.router import router as ai_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FTalentHub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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