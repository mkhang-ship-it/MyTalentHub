"""AUTH — login theo vai trò (student/teacher/coach/school/enterprise).

Hash mật khẩu PBKDF2 (`app.security`); hash cũ sha256("fth_" + password) vẫn
được chấp nhận để đăng nhập và tự nâng cấp trong cùng lần đó.
Access token hạn ngắn (ACCESS_TOKEN_TTL_MINUTES, mặc định 60 phút) + refresh
token hạn dài (REFRESH_TOKEN_TTL_DAYS, mặc định 30 ngày), xoay vòng mỗi lần
dùng. Đăng ký công khai tắt được bằng ALLOW_PUBLIC_REGISTER=false.
Chống dò mật khẩu: 5 lần sai / 10 phút.
Accounts seed: hs01@ftalenthub.edu.vn / nguyen.van.hung@ftalenthub.edu.vn /
hlv.boi@ftalenthub.edu.vn / bgh@ftalenthub.edu.vn / hr@techfpt.vn — password `demo123`.
"""
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
    RefreshToken,
    Student,
    Teacher,
    School,
    Enterprise,
    User,
)
from ..schemas import LoginIn, RegisterIn
from ..security import (
    REGISTER_CLOSED_MESSAGE,
    WRONG_CREDENTIALS_MESSAGE,
    clear_login_failures,
    create_refresh_token_table,
    hash_password,
    login_wait_seconds,
    new_access_expiry,
    new_refresh_expiry,
    public_register_enabled,
    rate_limit_message,
    record_login_failure,
    refresh_token_hash,
    resolve_token_user,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Giữ tên cũ để `seed.py` (`from .routers.auth import hash_password`) không vỡ.
__all__ = ["router", "hash_password", "verify_password"]


def _issue_token_pair(db: Session, user: User) -> tuple[str, str, str]:
    """Cấp cặp (access token, refresh token, refresh_expires_at ISO).

    Đảm bảo bảng refresh_tokens tồn tại (phòng khi main.py chưa đấu nối
    `create_refresh_token_table`). Chỉ lưu hash của refresh token.
    """
    create_refresh_token_table()
    access = secrets.token_hex(24)
    db.add(AuthToken(token=access, user_id=user.id, expires_at=new_access_expiry()))
    refresh = secrets.token_hex(32)
    db.add(RefreshToken(
        token_hash=refresh_token_hash(refresh),
        user_id=user.id,
        expires_at=new_refresh_expiry(),
    ))
    db.commit()
    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == refresh_token_hash(refresh))
        .first()
    )
    return access, refresh, row.expires_at.isoformat() if row else ""


def _revoke_refresh_tokens(db: Session, user_id: int) -> None:
    """Thu hồi toàn bộ refresh token còn hiệu lực của user (logout / lộ token)."""
    from ..security import _utcnow

    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": _utcnow()}, synchronize_session=False)


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


@router.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """Đăng ký tài khoản mới + cấp ngay cặp token (giữ shape cũ + thêm refresh).

    Production tắt đăng ký mở bằng ALLOW_PUBLIC_REGISTER=false → 403.
    """
    if not public_register_enabled():
        raise HTTPException(403, REGISTER_CLOSED_MESSAGE)
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

    # Cấp cặp token (giữ nguyên các trường cũ để client cũ vẫn chạy).
    token, refresh_token, refresh_expires_at = _issue_token_pair(db, user)

    info = _profile_ids(user, db)
    return {
        "token": token,
        "refresh_token": refresh_token,
        "refresh_expires_at": refresh_expires_at,
        "user": {
            "id": user.id,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            **info,
        },
    }


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """Đăng nhập + cấp cặp token (giữ nguyên các trường cũ + thêm refresh)."""
    email = payload.email.lower().strip()

    # Chống dò mật khẩu: vượt ngưỡng → 429 (không tiết lộ email có tồn tại).
    wait_s = login_wait_seconds(email)
    if wait_s > 0:
        raise HTTPException(429, rate_limit_message(wait_s))

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        record_login_failure(email)
        # Luôn trả 401 giống nhau — không tiết lộ email có tồn tại hay không.
        # Lần sai thứ 6 trở đi bị chặn ngay ở đầu hàm (429).
        raise HTTPException(401, WRONG_CREDENTIALS_MESSAGE)

    clear_login_failures(email)

    # Tự nâng cấp hash cũ sang PBKDF2 trong cùng lần đăng nhập đúng mật khẩu.
    from ..security import is_new_hash_format

    if not is_new_hash_format(user.password_hash):
        user.password_hash = hash_password(payload.password)
        db.flush()

    token, refresh_token, refresh_expires_at = _issue_token_pair(db, user)

    info = _profile_ids(user, db)
    return {
        "token": token,
        "refresh_token": refresh_token,
        "refresh_expires_at": refresh_expires_at,
        "user": {
            "id": user.id,
            "role": user.role,
            "full_name": user.full_name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            **info,
        },
    }


@router.post("/refresh")
def refresh(payload: dict, db: Session = Depends(get_db)):
    """Đổi refresh token còn hạn thành cặp token MỚI (xoay vòng).

    Body: {"refresh_token": "..."}. Dòng cũ bị đánh dấu đã xoay; dùng lại dòng
    đã xoay/hết hiệu lực = dấu hiệu đánh cắp → thu hồi cả họ refresh token của
    user đó rồi mới trả 401, để token lọt ra ngoài cũng vô dụng.
    """
    from ..security import EXPIRED_MESSAGE, INVALID_MESSAGE, _utcnow

    create_refresh_token_table()
    presented = (payload or {}).get("refresh_token") or ""
    if not isinstance(presented, str) or not presented.strip():
        raise HTTPException(401, INVALID_MESSAGE)

    row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == refresh_token_hash(presented.strip()))
        .first()
    )
    if not row:
        raise HTTPException(401, INVALID_MESSAGE)
    if row.revoked_at is not None:
        # Dùng lại token đã xoay/thu hồi → nghi đánh cắp: thu hồi cả họ.
        _revoke_refresh_tokens(db, row.user_id)
        db.commit()
        raise HTTPException(401, INVALID_MESSAGE)
    if row.expires_at <= _utcnow():
        raise HTTPException(401, EXPIRED_MESSAGE)

    user = db.query(User).filter(User.id == row.user_id).first()
    if not user:
        raise HTTPException(401, INVALID_MESSAGE)

    # Xoay vòng: thu hồi dòng cũ, cấp cặp mới trong cùng transaction.
    row.revoked_at = _utcnow()
    access = secrets.token_hex(24)
    db.add(AuthToken(token=access, user_id=user.id, expires_at=new_access_expiry()))
    new_refresh = secrets.token_hex(32)
    db.add(RefreshToken(
        token_hash=refresh_token_hash(new_refresh),
        user_id=user.id,
        expires_at=new_refresh_expiry(),
    ))
    db.commit()
    new_row = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == refresh_token_hash(new_refresh))
        .first()
    )
    return {
        "token": access,
        "refresh_token": new_refresh,
        "refresh_expires_at": new_row.expires_at.isoformat() if new_row else "",
    }


@router.get("/me")
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    token = _extract(authorization)
    _auth_token, user = resolve_token_user(db, token)
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
    """Đăng xuất: xoá access token hiện tại + thu hồi cả họ refresh token."""
    token = _extract(authorization)
    auth_token, user = resolve_token_user(db, token)
    db.delete(auth_token)
    _revoke_refresh_tokens(db, user.id)
    db.commit()
    return {"ok": True}


@router.post("/logout-all")
def logout_all(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Đăng xuất mọi thiết bị: xoá toàn bộ access token + thu hồi refresh token."""
    token = _extract(authorization)
    _auth_token, user = resolve_token_user(db, token)
    db.query(AuthToken).filter(AuthToken.user_id == user.id).delete()
    _revoke_refresh_tokens(db, user.id)
    db.commit()
    return {"ok": True}


def _extract(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    return authorization.removeprefix("Bearer ").strip()