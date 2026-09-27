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
import logging
import os
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..core.audit import record_audit
from ..database import get_db
from ..mailer import send_reset_email, send_verify_email
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
    VerificationToken,
)
from ..schemas import (
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
)
from ..security import (
    REGISTER_CLOSED_MESSAGE,
    WRONG_CREDENTIALS_MESSAGE,
    _hash_token,
    _new_reset_pair,
    _new_verify_pair,
    clear_login_failures,
    create_refresh_token_table,
    create_verification_token_table,
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

log = logging.getLogger("ftalenthub")

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
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    """Đăng nhập + cấp cặp token (giữ nguyên các trường cũ + thêm refresh)."""
    email = payload.email.lower().strip()

    # Chống dò mật khẩu: vượt ngưỡng → 429 (không tiết lộ email có tồn tại).
    wait_s = login_wait_seconds(email)
    if wait_s > 0:
        record_audit(db, "auth.login_blocked", detail={"reason": "rate_limited"},
                     request=request)
        raise HTTPException(429, rate_limit_message(wait_s))

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        record_login_failure(email)
        # Ghi nhật ký cả email lẫn IP: đây là dữ liệu quan trọng nhất khi điều tra
        # đăng nhập trái phép. Không ghi mật khẩu (và cũng không xác minh được mật
        # khẩu sai thì làm sao ghi — chỉ ghi email và IP).
        record_audit(
            db, "auth.login_fail",
            user=user,  # None nếu email không tồn tại
            detail={"email": email}, request=request,
        )
        # Luôn trả 401 giống nhau — không tiết lộ email có tồn tại hay không.
        # Lần sai thứ 6 trở đi bị chặn ngay ở đầu hàm (429).
        raise HTTPException(401, WRONG_CREDENTIALS_MESSAGE)

    record_audit(db, "auth.login_ok", user=user, detail={"email": email},
                 request=request)
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
    record_audit(db, "auth.logout", user=user)
    return {"ok": True}


@router.post("/logout-all")
def logout_all(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Đăng xuất mọi thiết bị: xoá toàn bộ access token + thu hồi refresh token."""
    token = _extract(authorization)
    _auth_token, user = resolve_token_user(db, token)
    n = db.query(AuthToken).filter(AuthToken.user_id == user.id).delete()
    _revoke_refresh_tokens(db, user.id)
    db.commit()
    # Sự kiện đáng nhớ khi điều tra truy cập trái phép: huỷ phiên ở bao nhiêu nơi.
    record_audit(db, "auth.logout_all", user=user, detail={"sessions_revoked": n})
    return {"ok": True}


def _extract(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    return authorization.removeprefix("Bearer ").strip()


# ---------------------------------------------- xác minh email / quên mật khẩu
# Cả hai luồng dùng chung bảng `verification_tokens` với cột `purpose`.
# Nguyên tắc chung: KHÔNG bao giờ tiết lộ email nào có tồn tại — thất bại và
# thành công trả về cùng một thông điệp, cùng mã HTTP. Nếu không, kẻ xấu dò
# email chỉ cần so sánh phản hồi là biết tài khoản nào có trong hệ thống.

_FORGOT_OK = "Nếu email này đã có tài khoản, chúng tôi đã gửi link đặt lại mật khẩu. Hãy kiểm tra hộp thư (kể cả thư rác)."
_VERIFY_OK = "Cảm ơn bạn, email đã được xác minh."

# Thông điệp chung cho mọi lỗi của link: người dùng không biết token sai,
# hết hạn hay đã dùng — và việc phân biệt ra cũng vô ích cho họ.
_LINK_INVALID = "Link không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link mới."


def _frontend_base() -> str:
    """Địa chỉ giao diện để dựng link trong thư (đọc từ env)."""
    return os.environ.get("FRONTEND_URL", "http://127.0.0.1:5174").rstrip("/")


def _issue_verification(db: Session, user: User, purpose: str) -> str:
    """Sinh token mới, vô hiệu các token cũ cùng purpose, trả link đầy đủ."""
    create_verification_token_table()
    # Mỗi lần yêu cầu chỉ giữ lại token mới nhất: token cũ đã gửi đi có thể
    # nằm trong hộp thư cũ, cho phép nó dùng lại là mở cửa cho kẻ đọc trộm.
    db.query(VerificationToken).filter(
        VerificationToken.user_id == user.id,
        VerificationToken.purpose == purpose,
        VerificationToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    pair = _new_verify_pair() if purpose == "verify" else _new_reset_pair()
    token, token_hash, expires_at = pair
    db.add(VerificationToken(
        purpose=purpose, token_hash=token_hash,
        user_id=user.id, expires_at=expires_at,
    ))
    db.commit()
    base = _frontend_base()
    return f"{base}/xac-minh-email?token={token}" if purpose == "verify" else \
           f"{base}/dat-lai-mat-khau?token={token}"


def _consume_verification(
    db: Session, token: str, purpose: str
) -> User:
    """Kiểm tra và đánh dấu đã dùng token, trả về user tương ứng.

    Đánh dấu `used_at` TRONG cùng lúc đọc để một link chỉ sửa được một lần, kể
    cả khi hai request đến cùng lúc.
    """
    create_verification_token_table()
    from ..security import _utcnow

    now = _utcnow()
    row = (
        db.query(VerificationToken)
        .filter(
            VerificationToken.token_hash == _hash_token(token),
            VerificationToken.purpose == purpose,
        )
        .first()
    )
    if row is None or row.used_at is not None or row.expires_at < now:
        raise HTTPException(400, _LINK_INVALID)
    row.used_at = now
    user = db.query(User).filter(User.id == row.user_id).first()
    if user is None:
        raise HTTPException(400, _LINK_INVALID)
    return user


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordIn, db: Session = Depends(get_db)):
    """Gửi link đặt lại mật khẩu.

    Luôn trả 200 với cùng thông điệp, kể cả khi email không tồn tại — xem
    `_FORGOT_OK`. Có giới hạn số lần gọi để không bị dùng để spam thư.
    """
    create_verification_token_table()
    wait = login_wait_seconds("reset:" + body.email)
    if wait:
        raise HTTPException(429, rate_limit_message(wait))

    record_login_failure("reset:" + body.email)
    user = (
        db.query(User)
        .filter(User.email == body.email.strip().lower())
        .first()
    )
    if user is not None:
        try:
            link = _issue_verification(db, user, "reset")
            send_reset_email(user.email, link)
        except Exception:  # noqa: BLE001
            # Không gửi được thư KHÔNG được lộ ra ngoài: nếu báo lỗi 500 thì
            # người gọi biết chắc email tồn tại (đã tìm thấy user rồi mới
            # gửi), tức là lộ thông tin dù đã cố giấu.
            log.exception("Gửi thư đặt lại mật khẩu thất bại cho %s", user.email)
    clear_login_failures("reset:" + body.email)
    return {"message": _FORGOT_OK}


@router.post("/reset-password")
def reset_password(body: ResetPasswordIn, request: Request, db: Session = Depends(get_db)):
    """Đặt mật khẩu mới bằng token trong link, rồi thu hồi mọi phiên đang mở.

    Thu hồi token là bắt buộc: nếu kẻ xấm có link và đã đăng nhập được trước
    đó, họ sẽ mất quyền truy cập ngay khi chủ tài khoản đổi mật khẩu.
    """
    user = _consume_verification(db, body.token, "reset")
    user.password_hash = hash_password(body.new_password)
    user.email_verified = True
    n = db.query(AuthToken).filter(AuthToken.user_id == user.id).delete()
    _revoke_refresh_tokens(db, user.id)
    db.commit()
    # Nhật ký KHÔNG ghi mật khẩu mới (record_audit tự lọc trường nhạy cảm) và
    # ghi số phiên bị thu hồi — con số này cho biết mức độ nghi vấn.
    record_audit(db, "auth.password_reset", user=user,
                 detail={"sessions_revoked": n}, request=request)
    return {"message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."}


@router.get("/verify-email")
def verify_email(token: str = Query(...), request: Request = None,
                 db: Session = Depends(get_db)):
    """Xác minh email qua link trong thư. Trả HTML tối giản để mở bằng trình duyệt."""
    try:
        user = _consume_verification(db, token, "verify")
        user.email_verified = True
        db.commit()
        record_audit(db, "auth.email_verified", user=user, request=request)
        return _result_page(_VERIFY_OK, ok=True)
    except HTTPException as exc:
        record_audit(db, "auth.email_verify_fail", request=request,
                     detail={"reason": str(exc.detail)[:80]})
        return _result_page(str(exc.detail), ok=False)


@router.post("/verify-email/resend")
def resend_verification(authorization: str | None = Header(default=None),
                        db: Session = Depends(get_db)):
    """Gửi lại link xác minh (người dùng đã đăng nhập nhưng email chưa xác minh)."""
    _auth_token, user = resolve_token_user(db, _extract(authorization))
    if user.email_verified:
        return {"message": "Email của bạn đã được xác minh trước đó."}
    try:
        link = _issue_verification(db, user, "verify")
        send_verify_email(user.email, link)
    except Exception:  # noqa: BLE001
        log.exception("Gửi lại thư xác minh thất bại cho %s", user.email)
    return {"message": "Đã gửi lại link xác minh. Hãy kiểm tra hộp thư."}


def _result_page(message: str, ok: bool) -> HTMLResponse:
    """Trang kết quả một nút, dùng khi mở link trực tiếp trên trình duyệt."""
    color = "#047857" if ok else "#b91c1c"
    return HTMLResponse(
        '<!doctype html><html lang="vi"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        "<title>FTalentHub</title></head>"
        '<body style="margin:0;min-height:100vh;display:flex;align-items:center;'
        'justify-content:center;background:#f4f6fb;font-family:system-ui,sans-serif">'
        '<div style="max-width:460px;background:#fff;padding:36px;border-radius:14px;'
        'border:1px solid #e5e7eb;text-align:center">'
        '<div style="font-size:20px;font-weight:700;margin-bottom:14px">FTalentHub</div>'
        f'<p style="color:{color};font-size:15px;line-height:1.6">{message}</p>'
        f'<a href="{_frontend_base()}" style="display:inline-block;margin-top:12px;'
        'background:#2563eb;color:#fff;text-decoration:none;padding:11px 22px;'
        'border-radius:10px;font-weight:600">Về trang chủ</a>'
        "</div></body></html>"
    )