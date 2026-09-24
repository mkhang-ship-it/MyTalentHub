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
    ROLE_COACH,
    ROLE_ENTERPRISE,
    ROLE_SCHOOL,
    ROLE_STUDENT,
    ROLE_TEACHER,
    AuthToken,
    Coach,
    Student,
    Teacher,
    School,
    Enterprise,
    User,
)
from ..schemas import LoginIn, LoginOut, RegisterIn

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return hashlib.sha256(f"fth_{password}".encode()).hexdigest()


def _profile_ids(user: User, db: Session) -> dict:
    """profile_id theo vai trò (Student.id = User.id vì FK primary key)."""
    pid = user.id
    detail = None
    if user.role == ROLE_STUDENT:
        s = db.query(Student).filter(Student.id == user.id).first()
        detail = {
            "class_name": s.class_name,
            "grade": s.grade,
            "education_level": s.education_level,
        } if s else None
    elif user.role == ROLE_TEACHER:
        t = db.query(Teacher).filter(Teacher.id == user.id).first()
        detail = {
            "subject": t.subject,
            "education_level": t.education_level,
        } if t else None
    elif user.role == ROLE_COACH:
        c = db.query(Coach).filter(Coach.id == user.id).first()
        detail = {
            "specialty": c.specialty,
            "bio": c.bio,
        } if c else None
    elif user.role == ROLE_SCHOOL:
        sc = db.query(School).filter(School.id == user.id).first()
        detail = {
            "school_name": sc.school_name,
            "education_level": sc.education_level,
        } if sc else None
    return {"profile_id": pid, "detail": detail}


@router.post("/register", response_model=LoginOut)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(409, "Email đã được đăng ký")

    full_name = payload.full_name.strip()
    password_hash = hash_password(payload.password)
    role = payload.role

    # Create User
    user = User(
        role=role,
        full_name=full_name,
        email=email,
        password_hash=password_hash,
    )
    db.add(user)
    db.flush()  # get user.id

    # Create role-specific profile
    if role == "student":
        level = payload.education_level or "THPT"
        profile = Student(
            id=user.id,
            class_name=payload.class_name.strip(),
            grade=payload.grade,
            education_level=level,
        )
        db.add(profile)
    elif role == "teacher":
        level = payload.education_level_teacher or "THPT"
        profile = Teacher(
            id=user.id,
            subject=payload.subject.strip(),
            education_level=level,
        )
        db.add(profile)
    elif role == "coach":
        # Validate specialty before creating profiles
        if not payload.specialty or not payload.specialty.strip():
            raise HTTPException(422, "Chuyên môn không được để trống")
        # Tạo Coach profile
        coach_profile = Coach(
            id=user.id,
            specialty=payload.specialty.strip(),
            bio=(payload.bio or "").strip() or None,
        )
        db.add(coach_profile)
        # Tạo Teacher ẩn (để FK Activity.teacher_id, Evaluation.teacher_id hoạt động)
        level = payload.education_level_coach or "THPT"
        teacher_hidden = Teacher(
            id=user.id,
            subject=payload.specialty.strip(),
            education_level=level,
        )
        db.add(teacher_hidden)
    elif role == "school":
        level = payload.education_level_school or "THPT"
        profile = School(
            id=user.id,
            school_name=payload.school_name.strip(),
            education_level=level,
        )
        db.add(profile)
    elif role == "enterprise":
        profile = Enterprise(
            id=user.id,
            company_name=payload.company_name.strip(),
            industry=(payload.industry or "").strip(),
        )
        db.add(profile)

    db.commit()

    # Create auth token
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