"""AUTH — login theo vai trò (student/teacher/school/enterprise).

Demo: password hash = sha256("fth_" + password), token ngẫu nhiên lưu bảng auth_tokens.
Accounts seed: hs01@ftalenthub.edu.vn / nguyen.van.hung@ftalenthub.edu.vn /
bgh@ftalenthub.edu.vn / hr@techfpt.vn — password mặc định `demo123`.
"""
import hashlib
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    ROLE_ENTERPRISE,
    ROLE_SCHOOL,
    ROLE_STUDENT,
    ROLE_TEACHER,
    AuthToken,
    Student,
    Teacher,
    User,
)
from ..schemas import LoginIn, LoginOut

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(f"fth_{password}".encode()).hexdigest()


def _profile_ids(user: User, db: Session) -> dict:
    """profile_id theo vai trò (Student.id = User.id vì FK primary key)."""
    pid = user.id
    detail = None
    if user.role == ROLE_STUDENT:
        s = db.query(Student).filter(Student.id == user.id).first()
        detail = {"class_name": s.class_name, "grade": s.grade} if s else None
    elif user.role == ROLE_TEACHER:
        t = db.query(Teacher).filter(Teacher.id == user.id).first()
        detail = {"subject": t.subject} if t else None
    return {"profile_id": pid, "detail": detail}


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or user.password_hash != hash_password(payload.password):
        raise HTTPException(401, "Email hoặc mật khẩu không đúng")

    token = secrets.token_hex(24)
    db.add(AuthToken(token=token, user_id=user.id))
    db.commit()

    info = _profile_ids(user, db)
    return LoginOut(
        token=token,
        user={
            "id": user.id,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            **info,
        },
    )


@router.get("/me")
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = _extract(authorization)
    row = db.query(AuthToken, User).join(User, User.id == AuthToken.user_id).filter(AuthToken.token == token).first()
    if not row:
        raise HTTPException(401, "Phiên đăng nhập không hợp lệ")
    _auth_token, user = row
    info = _profile_ids(user, db)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            **info,
        },
    }


@router.post("/logout")
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = _extract(authorization)
    row = db.query(AuthToken).filter(AuthToken.token == token).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}


def _extract(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    return authorization.removeprefix("Bearer ").strip()