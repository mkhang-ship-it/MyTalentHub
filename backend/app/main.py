"""FastAPI app — mount 5 routers (student/teacher/school/enterprise/passport)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, enterprise, passport, school, student, teacher

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FTalentHub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
app.include_router(auth.router, prefix=API)
app.include_router(student.router, prefix=API)
app.include_router(teacher.router, prefix=API)
app.include_router(school.router, prefix=API)
app.include_router(enterprise.router, prefix=API)
app.include_router(passport.router, prefix=API)


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "app": "FTalentHub", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "FTalentHub API — xem /docs cho tài liệu OpenAPI"}